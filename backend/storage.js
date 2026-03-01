import fs from 'fs';
import path from 'path';
import { appConfig, projectRoot } from './config.js';

const storageDirectoryPath = path.join(projectRoot, appConfig.storage.directory);
const dataFilePath = path.join(storageDirectoryPath, appConfig.storage.dataFile);
const driversFilePath = path.join(storageDirectoryPath, appConfig.storage.driversFile);
const calendarFilePath = path.join(storageDirectoryPath, appConfig.storage.calendarFile);

function createEmptyPrediction() {
  return {
    first: '',
    second: '',
    third: '',
    pole: '',
  };
}

function createInitialUsers() {
  return appConfig.participants.map((name) => ({
    name,
    predictions: createEmptyPrediction(),
    points: 0,
  }));
}

function ensureDataDirectory() {
  fs.mkdirSync(storageDirectoryPath, { recursive: true });
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function sanitizePrediction(value) {
  return {
    first: typeof value?.first === 'string' ? value.first : '',
    second: typeof value?.second === 'string' ? value.second : '',
    third: typeof value?.third === 'string' ? value.third : '',
    pole: typeof value?.pole === 'string' ? value.pole : '',
  };
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
  const safeUserPredictions = Object.fromEntries(
    Object.entries(record?.userPredictions ?? {}).map(([name, value]) => [
      name,
      {
        prediction: sanitizePrediction(value?.prediction),
        pointsEarned: Number.isFinite(Number(value?.pointsEarned)) ? Number(value.pointsEarned) : 0,
      },
    ]),
  );

  return {
    gpName: typeof record?.gpName === 'string' ? record.gpName : '',
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
  if (!Array.isArray(calendar) || calendar.length === 0) {
    return null;
  }

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
  };
}

function sanitizeAppData(value, calendar = []) {
  const defaultData = createDefaultAppData(calendar);
  const incomingUsers = Array.isArray(value?.users) ? value.users : [];
  const normalizedUsers =
    incomingUsers.length > 0
      ? appConfig.participants.map((fallbackName) => {
          const matchingUser = incomingUsers.find((user) => user?.name === fallbackName);
          return sanitizeUser(matchingUser, fallbackName);
        })
      : defaultData.users;

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

  return {
    users: normalizedUsers,
    history,
    gpName: selectedMeeting?.grandPrixTitle ?? selectedMeeting?.meetingName ?? fallbackGpName,
    raceResults: sanitizePrediction(value?.raceResults),
    selectedMeetingKey: selectedMeeting?.meetingKey ?? fallbackMeetingKey,
  };
}

function readAppData(calendar = readCalendarCache()) {
  ensureDataDirectory();
  const storedData = readJsonFile(dataFilePath);
  return storedData ? sanitizeAppData(storedData, calendar) : createDefaultAppData(calendar);
}

function writeAppData(appData, calendar = readCalendarCache()) {
  ensureDataDirectory();
  const sanitizedData = sanitizeAppData(appData, calendar);
  fs.writeFileSync(dataFilePath, JSON.stringify(sanitizedData, null, 2));
  return sanitizedData;
}

function readDriversCache() {
  ensureDataDirectory();
  const storedDrivers = readJsonFile(driversFilePath);
  return Array.isArray(storedDrivers) ? storedDrivers : [];
}

function writeDriversCache(drivers) {
  ensureDataDirectory();
  fs.writeFileSync(driversFilePath, JSON.stringify(drivers, null, 2));
  return drivers;
}

function readCalendarCache() {
  ensureDataDirectory();
  const storedCalendar = readJsonFile(calendarFilePath);
  return Array.isArray(storedCalendar) ? storedCalendar : [];
}

function writeCalendarCache(calendar) {
  ensureDataDirectory();
  fs.writeFileSync(calendarFilePath, JSON.stringify(calendar, null, 2));
  return calendar;
}

export {
  createDefaultAppData,
  ensureDataDirectory,
  readAppData,
  writeAppData,
  readDriversCache,
  writeDriversCache,
  readCalendarCache,
  writeCalendarCache,
  sanitizeAppData,
};
