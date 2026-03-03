import { AppData, Driver, Weekend } from './models.js';
import { appConfig } from './config.js';

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
  
  // Rule: We must always have exactly 3 players as per PROJECT.md.
  // We keep the names from the DB if present, otherwise fallback to defaults.
  let normalizedUsers;
  if (incomingUsers.length >= 3) {
    normalizedUsers = incomingUsers.slice(0, 3).map(user => sanitizeUser(user, user.name || 'Unknown'));
  } else if (incomingUsers.length > 0) {
    normalizedUsers = [
      ...incomingUsers.map(user => sanitizeUser(user, user.name || 'Unknown')),
      ...createInitialUsers().slice(incomingUsers.length)
    ];
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

  return {
    users: normalizedUsers,
    history,
    gpName: selectedMeeting?.grandPrixTitle ?? selectedMeeting?.meetingName ?? fallbackGpName,
    raceResults: sanitizePrediction(value?.raceResults),
    selectedMeetingKey: selectedMeeting?.meetingKey ?? fallbackMeetingKey,
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
    console.error('Error reading app data from DB:', error);
    return createDefaultAppData(calendar);
  }
}

async function writeAppData(appData, calendarPromise) {
  const calendar = await (calendarPromise || readCalendarCache());
  const sanitizedData = sanitizeAppData(appData, calendar);
  
  try {
    // Upsert the single document
    await AppData.findOneAndUpdate({}, sanitizedData, { upsert: true, new: true });
    return sanitizedData;
  } catch (error) {
    console.error('[Storage Error] Error writing app data to DB:', error);
    console.error('[Storage Error] Data being written:', JSON.stringify(sanitizedData, null, 2));
    throw error;
  }
}

async function readDriversCache() {
  try {
    const drivers = await Driver.find().sort({ name: 1 });
    return drivers.map(d => d.toObject());
  } catch (error) {
    console.error('Error reading drivers from DB:', error);
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
    console.error('Error writing drivers to DB:', error);
    return drivers;
  }
}

async function readCalendarCache() {
  try {
    const calendar = await Weekend.find().sort({ roundNumber: 1 });
    return calendar.map(w => w.toObject());
  } catch (error) {
    console.error('Error reading calendar from DB:', error);
    return [];
  }
}

async function writeCalendarCache(calendar) {
  try {
    await Weekend.deleteMany({});
    await Weekend.insertMany(calendar);
    return calendar;
  } catch (error) {
    console.error('Error writing calendar to DB:', error);
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
  writeAppData,
  readDriversCache,
  writeDriversCache,
  readCalendarCache,
  writeCalendarCache,
  sanitizeAppData,
};
