import { AppData, Driver, Weekend } from './models.js';
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

async function readPersistedParticipantRoster() {
  try {
    const storedData = await AppData.findOne().sort({ createdAt: -1 });
    const plainData = storedData ? storedData.toObject() : null;
    return resolveParticipantRoster(plainData?.users, participantSlots);
  } catch (error) {
    console.error(backendText.storage.readParticipantRosterError, error);
    return null;
  }
}

function normalizeUsersToRoster(users, roster) {
  /* v8 ignore start -- internal helper only receives arrays from sanitizeAppData */
  if (!Array.isArray(users)) {
    return [];
  }
  /* v8 ignore stop */

  if (!Array.isArray(roster) || roster.length !== participantSlots) {
    return users;
  }

  const usersByName = new Map(
    users.map((user) => [typeof user?.name === 'string' ? user.name.trim() : '', user]),
  );

  if (users.length === participantSlots && roster.every((name) => usersByName.has(name))) {
    return roster.map((name) => usersByName.get(name));
  }

  return users;
}

function sanitizeUser(user, fallbackName) {
  const name = typeof user?.name === 'string' && user.name.trim() ? user.name.trim() : fallbackName;
  const numericPoints = Number(user?.points);

  return {
    name,
    predictions: sanitizePrediction(user?.predictions),
    points: Number.isFinite(numericPoints) ? numericPoints : 0,
  };
}

function sanitizeRaceRecord(record) {
  // Convert Mongoose Map to Object if needed, though simple access works
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

function normalizeMeetingName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getMeetingDateValue(weekend) {
  const rawValue = weekend?.startDate || weekend?.endDate || '';
  const parsedValue = Date.parse(rawValue);
  return Number.isNaN(parsedValue) ? Number.POSITIVE_INFINITY : parsedValue;
}

function sortCalendarByDate(calendar) {
  return [...calendar].sort((firstWeekend, secondWeekend) => {
    const roundDelta = Number(firstWeekend.roundNumber) - Number(secondWeekend.roundNumber);
    if (Number.isFinite(roundDelta) && roundDelta !== 0) {
      return roundDelta;
    }

    return getMeetingDateValue(firstWeekend) - getMeetingDateValue(secondWeekend);
  });
}

function getNextUpcomingMeeting(calendar) {
  const sortedCalendar = sortCalendarByDate(calendar);
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

function resolveSelectedMeeting(calendar, selectedMeetingKey, gpName) {
  if (!Array.isArray(calendar) || calendar.length === 0) {
    return null;
  }

  if (typeof selectedMeetingKey === 'string' && selectedMeetingKey.trim()) {
    const directMatch = calendar.find((weekend) => weekend.meetingKey === selectedMeetingKey.trim());
    if (directMatch) {
      return directMatch;
    }
  }

  const normalizedGpName = normalizeMeetingName(gpName);
  if (normalizedGpName) {
    const gpMatch = calendar.find((weekend) => {
      return (
        normalizeMeetingName(weekend.meetingName) === normalizedGpName ||
        normalizeMeetingName(weekend.grandPrixTitle) === normalizedGpName
      );
    });

    if (gpMatch) {
      return gpMatch;
    }
  }

  return getNextUpcomingMeeting(calendar);
}

function createDefaultAppData(calendar = []) {
  const selectedMeeting = resolveSelectedMeeting(calendar);

  return {
    users: createInitialUsers(),
    history: [],
    gpName: selectedMeeting?.grandPrixTitle ?? selectedMeeting?.meetingName ?? '',
    raceResults: createEmptyPrediction(),
    selectedMeetingKey: selectedMeeting?.meetingKey ?? '',
    weekendStateByMeetingKey: {},
  };
}

function sanitizeAppData(
  value,
  calendar = [],
  { preferPayloadSelectedWeekend = false, participantRoster = null } = {},
) {
  const defaultData = createDefaultAppData(calendar);
  const incomingUsers = Array.isArray(value?.users) ? value.users : [];
  const resolvedIncomingRoster = Array.isArray(participantRoster)
    ? participantRoster
    : resolveParticipantRoster(incomingUsers, participantSlots);
  
  // Rule: We must always have exactly 3 players as per PROJECT.md.
  // We keep persisted names when the roster is valid, otherwise fallback to neutral placeholders.
  let normalizedUsers;
  if (incomingUsers.length >= participantSlots) {
    normalizedUsers = normalizeUsersToRoster(
      incomingUsers.slice(0, participantSlots).map(user =>
        sanitizeUser(user, user.name || backendText.storage.unknownUserName),
      ),
      resolvedIncomingRoster,
    );
  } else if (incomingUsers.length > 0) {
    normalizedUsers = normalizeUsersToRoster([
      ...incomingUsers.map(user => sanitizeUser(user, user.name || backendText.storage.unknownUserName)),
      ...createInitialUsers().slice(incomingUsers.length),
    ], resolvedIncomingRoster);
  } else {
    normalizedUsers = defaultData.users;
  }

  const history = Array.isArray(value?.history) ? value.history.map(sanitizeRaceRecord) : [];
  const selectedMeeting = resolveSelectedMeeting(
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

async function readAppData(calendarPromise) {
  // Wait for calendar if it's a promise (handling the parallel fetch in server.js)
  const calendar = await (calendarPromise || readCalendarCache());
  
  try {
    const storedData = await AppData.findOne().sort({ createdAt: -1 });
    // Convert Mongoose document to plain object
    const plainData = storedData ? storedData.toObject() : null;
    return plainData ? sanitizeAppData(plainData, calendar) : createDefaultAppData(calendar);
  } catch (error) {
    console.error(backendText.storage.readAppDataError, error);
    return createDefaultAppData(calendar);
  }
}

async function writeAppData(appData, calendarPromise) {
  const calendar = await (calendarPromise || readCalendarCache());
  const participantRoster = await readPersistedParticipantRoster();
  const sanitizedData = sanitizeAppData(appData, calendar, {
    preferPayloadSelectedWeekend: true,
    participantRoster,
  });
  
  try {
    // Upsert the single document
    await AppData.findOneAndUpdate({}, sanitizedData, {
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

async function readDriversCache() {
  try {
    const drivers = await Driver.find().sort({ name: 1 });
    return drivers.map(d => d.toObject());
  } catch (error) {
    console.error(backendText.storage.readDriversError, error);
    return [];
  }
}

async function writeDriversCache(drivers) {
  try {
    // Delete all and rewrite to ensure cache is fresh and consistent with source
    // Alternatively, could use bulkWrite for upserts to be more efficient, 
    // but for < 30 drivers, this is fine and safer for data integrity.
    await Driver.deleteMany({});
    await Driver.insertMany(drivers);
    return drivers;
  } catch (error) {
    console.error(backendText.storage.writeDriversError, error);
    return drivers;
  }
}

async function readCalendarCache() {
  try {
    const calendar = await Weekend.find().sort({ roundNumber: 1 });
    return calendar.map(w => w.toObject());
  } catch (error) {
    console.error(backendText.storage.readCalendarError, error);
    return [];
  }
}

async function writeCalendarCache(calendar) {
  try {
    await Weekend.deleteMany({});
    await Weekend.insertMany(calendar);
    return calendar;
  } catch (error) {
    console.error(backendText.storage.writeCalendarError, error);
    return calendar;
  }
}

// Keep ensureDataDirectory for backward compatibility if imported elsewhere, 
// but it does nothing now.
function ensureDataDirectory() {}

export {
  createDefaultAppData,
  ensureDataDirectory,
  readAppData,
  readPersistedParticipantRoster,
  writeAppData,
  readDriversCache,
  writeDriversCache,
  readCalendarCache,
  writeCalendarCache,
  sanitizeAppData,
};
