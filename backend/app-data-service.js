import { appConfig } from './config.js';
import { backendText, formatBackendText } from './text.js';
import {
  buildWeekendStateFromUsers,
  createEmptyPrediction,
  getSelectedWeekendState,
  hydrateUsersForSelectedWeekend,
  sanitizePrediction,
  sanitizeWeekendStateByMeetingKey,
  upsertSelectedWeekendState,
} from './weekend-state.js';
import { resolveParticipantRoster } from './validation.js';

const participantSlots = Number.isFinite(Number(appConfig.participantSlots))
  ? Number(appConfig.participantSlots)
  : 3;

function createInitialUsers() {
  return Array.from({ length: participantSlots }, (_, index) => ({
    name: formatBackendText(backendText.storage.defaultUserNameTemplate, { index: index + 1 }),
    predictions: createEmptyPrediction(),
    points: 0,
  }));
}

function sanitizeRaceRecord(record) {
  const userPredictionsObj = record?.userPredictions instanceof Map
    ? Object.fromEntries(record.userPredictions)
    : (record?.userPredictions || {});

  const safeUserPredictions = Object.fromEntries(
    Object.entries(userPredictionsObj).map(([name, value]) => [
      name,
      {
        prediction: sanitizePrediction(value?.prediction),
        pointsEarned: Number.isFinite(Number(value?.pointsEarned)) ? Number(value.pointsEarned) : 0,
      },
    ]),
  );

  return {
    gpName: typeof record?.gpName === 'string' ? record.gpName : '',
    meetingKey:
      typeof record?.meetingKey === 'string' && record.meetingKey.trim()
        ? record.meetingKey.trim()
        : undefined,
    date: typeof record?.date === 'string' ? record.date : '',
    results: sanitizePrediction(record?.results),
    userPredictions: safeUserPredictions,
  };
}

class ParticipantRosterPolicy {
  constructor({ participantSlotsCount = participantSlots } = {}) {
    this.participantSlots = participantSlotsCount;
  }

  createInitialUsers() {
    return createInitialUsers();
  }

  normalizeUsersToRoster(users, roster) {
    if (!Array.isArray(users)) {
      return [];
    }

    if (!Array.isArray(roster) || roster.length !== this.participantSlots) {
      return users;
    }

    const usersByName = new Map(
      users.map((user) => [typeof user?.name === 'string' ? user.name.trim() : '', user]),
    );

    if (users.length === this.participantSlots && roster.every((name) => usersByName.has(name))) {
      return roster.map((name) => usersByName.get(name));
    }

    return users;
  }

  sanitizeUser(user, fallbackName) {
    const name = typeof user?.name === 'string' && user.name.trim() ? user.name.trim() : fallbackName;
    const numericPoints = Number(user?.points);

    return {
      name,
      predictions: sanitizePrediction(user?.predictions),
      points: Number.isFinite(numericPoints) ? numericPoints : 0,
    };
  }

  resolveIncomingRoster(incomingUsers, participantRoster) {
    return Array.isArray(participantRoster)
      ? participantRoster
      : resolveParticipantRoster(incomingUsers, this.participantSlots);
  }

  sanitizeUsers(incomingUsers, defaultUsers, participantRoster) {
    const resolvedIncomingRoster = this.resolveIncomingRoster(incomingUsers, participantRoster);

    if (incomingUsers.length >= this.participantSlots) {
      return this.normalizeUsersToRoster(
        incomingUsers.slice(0, this.participantSlots).map((user) =>
          this.sanitizeUser(user, user.name || backendText.storage.unknownUserName),
        ),
        resolvedIncomingRoster,
      );
    }

    if (incomingUsers.length > 0) {
      return this.normalizeUsersToRoster([
        ...incomingUsers.map((user) =>
          this.sanitizeUser(user, user.name || backendText.storage.unknownUserName),
        ),
        ...this.createInitialUsers().slice(incomingUsers.length),
      ], resolvedIncomingRoster);
    }

    return defaultUsers;
  }
}

class WeekendSelectionService {
  normalizeMeetingName(value) {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  getMeetingDateValue(weekend) {
    const rawValue = weekend?.startDate || weekend?.endDate || '';
    const parsedValue = Date.parse(rawValue);
    return Number.isNaN(parsedValue) ? Number.POSITIVE_INFINITY : parsedValue;
  }

  sortCalendarByDate(calendar) {
    return [...calendar].sort((firstWeekend, secondWeekend) => {
      const roundDelta = Number(firstWeekend.roundNumber) - Number(secondWeekend.roundNumber);
      if (Number.isFinite(roundDelta) && roundDelta !== 0) {
        return roundDelta;
      }

      return this.getMeetingDateValue(firstWeekend) - this.getMeetingDateValue(secondWeekend);
    });
  }

  getNextUpcomingMeeting(calendar) {
    const sortedCalendar = this.sortCalendarByDate(calendar);
    const now = Date.now();

    return (
      sortedCalendar.find((weekend) => {
        const endDateValue = Date.parse(weekend?.endDate || weekend?.startDate || '');
        if (Number.isNaN(endDateValue)) {
          return false;
        }

        return endDateValue >= now;
      }) ?? sortedCalendar[0]
    );
  }

  resolveSelectedMeeting(calendar, selectedMeetingKey, gpName) {
    if (!Array.isArray(calendar) || calendar.length === 0) {
      return null;
    }

    if (typeof selectedMeetingKey === 'string' && selectedMeetingKey.trim()) {
      const directMatch = calendar.find((weekend) => weekend.meetingKey === selectedMeetingKey.trim());
      if (directMatch) {
        return directMatch;
      }
    }

    const normalizedGpName = this.normalizeMeetingName(gpName);
    if (normalizedGpName) {
      const gpMatch = calendar.find((weekend) => (
        this.normalizeMeetingName(weekend.meetingName) === normalizedGpName ||
        this.normalizeMeetingName(weekend.grandPrixTitle) === normalizedGpName
      ));

      if (gpMatch) {
        return gpMatch;
      }
    }

    return this.getNextUpcomingMeeting(calendar);
  }
}

class AppDataSanitizer {
  constructor({
    rosterPolicy = new ParticipantRosterPolicy(),
    weekendSelectionService = new WeekendSelectionService(),
  } = {}) {
    this.rosterPolicy = rosterPolicy;
    this.weekendSelectionService = weekendSelectionService;
  }

  createDefaultAppData(calendar = []) {
    const selectedMeeting = this.weekendSelectionService.resolveSelectedMeeting(calendar);

    return {
      users: this.rosterPolicy.createInitialUsers(),
      history: [],
      gpName: selectedMeeting?.grandPrixTitle ?? selectedMeeting?.meetingName ?? '',
      raceResults: createEmptyPrediction(),
      selectedMeetingKey: selectedMeeting?.meetingKey ?? '',
      weekendStateByMeetingKey: {},
    };
  }

  sanitizeAppData(
    value,
    calendar = [],
    { preferPayloadSelectedWeekend = false, participantRoster = null } = {},
  ) {
    const defaultData = this.createDefaultAppData(calendar);
    const incomingUsers = Array.isArray(value?.users) ? value.users : [];
    const normalizedUsers = this.rosterPolicy.sanitizeUsers(
      incomingUsers,
      defaultData.users,
      participantRoster,
    );
    const history = Array.isArray(value?.history) ? value.history.map(sanitizeRaceRecord) : [];
    const selectedMeeting = this.weekendSelectionService.resolveSelectedMeeting(
      calendar,
      value?.selectedMeetingKey,
      typeof value?.gpName === 'string' ? value.gpName : '',
    );
    const fallbackGpName = typeof value?.gpName === 'string' ? value.gpName : defaultData.gpName;
    const fallbackMeetingKey =
      typeof value?.selectedMeetingKey === 'string'
        ? value.selectedMeetingKey
        : defaultData.selectedMeetingKey;
    const resolvedMeetingKey = selectedMeeting?.meetingKey ?? fallbackMeetingKey;
    const incomingWeekendStateByMeetingKey = sanitizeWeekendStateByMeetingKey(
      value?.weekendStateByMeetingKey,
    );
    const fallbackSelectedWeekendState = buildWeekendStateFromUsers(
      normalizedUsers,
      sanitizePrediction(value?.raceResults),
    );
    const hasPersistedSelectedWeekendState =
      typeof resolvedMeetingKey === 'string' &&
      resolvedMeetingKey.trim() &&
      Object.hasOwn(incomingWeekendStateByMeetingKey, resolvedMeetingKey);
    const selectedWeekendState =
      preferPayloadSelectedWeekend || !hasPersistedSelectedWeekendState
        ? fallbackSelectedWeekendState
        : getSelectedWeekendState(incomingWeekendStateByMeetingKey, resolvedMeetingKey);
    const weekendStateByMeetingKey = upsertSelectedWeekendState(
      incomingWeekendStateByMeetingKey,
      resolvedMeetingKey,
      hydrateUsersForSelectedWeekend(normalizedUsers, selectedWeekendState),
      selectedWeekendState.raceResults,
    );
    const hydratedUsers = hydrateUsersForSelectedWeekend(normalizedUsers, selectedWeekendState);

    return {
      users: hydratedUsers,
      history,
      gpName: selectedMeeting?.grandPrixTitle ?? selectedMeeting?.meetingName ?? fallbackGpName,
      raceResults: selectedWeekendState.raceResults,
      selectedMeetingKey: resolvedMeetingKey,
      weekendStateByMeetingKey,
    };
  }
}

class AppDataRepository {
  constructor({
    appDataModel,
    readCalendarCache,
    readPersistedParticipantRoster,
    sanitizer = new AppDataSanitizer(),
  }) {
    this.appDataModel = appDataModel;
    this.readCalendarCache = readCalendarCache;
    this.readPersistedParticipantRoster = readPersistedParticipantRoster;
    this.sanitizer = sanitizer;
  }

  async readAppData(calendarPromise) {
    const calendar = await (calendarPromise || this.readCalendarCache());

    try {
      const storedData = await this.appDataModel.findOne().sort({ createdAt: -1 });
      const plainData = storedData ? storedData.toObject() : null;
      return plainData ? this.sanitizer.sanitizeAppData(plainData, calendar) : this.sanitizer.createDefaultAppData(calendar);
    } catch (error) {
      console.error(backendText.storage.readAppDataError, error);
      return this.sanitizer.createDefaultAppData(calendar);
    }
  }

  async writeAppData(appData, calendarPromise) {
    const calendar = await (calendarPromise || this.readCalendarCache());
    const participantRoster = await this.readPersistedParticipantRoster();
    const sanitizedData = this.sanitizer.sanitizeAppData(appData, calendar, {
      preferPayloadSelectedWeekend: true,
      participantRoster,
    });

    try {
      await this.appDataModel.findOneAndUpdate({}, sanitizedData, {
        upsert: true,
        returnDocument: 'after',
      });
      return sanitizedData;
    } catch (error) {
      console.error(backendText.storage.writeAppDataError, error);
      console.error(backendText.storage.writeAppDataPayloadLog, JSON.stringify(sanitizedData, null, 2));
      throw error;
    }
  }
}

export {
  AppDataRepository,
  AppDataSanitizer,
  ParticipantRosterPolicy,
  WeekendSelectionService,
  createInitialUsers,
  sanitizeRaceRecord,
};
