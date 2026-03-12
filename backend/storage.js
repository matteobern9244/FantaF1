import { AppData, Driver, StandingsCache, Weekend } from './models.js';
import { backendText } from './text.js';
import { resolveParticipantRoster } from './validation.js';
import {
  AppDataRepository,
  AppDataSanitizer,
  ParticipantRosterPolicy,
  WeekendSelectionService,
} from './app-data-service.js';

const participantSlots = new ParticipantRosterPolicy().participantSlots;

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

const appDataSanitizer = new AppDataSanitizer({
  rosterPolicy: new ParticipantRosterPolicy(),
  weekendSelectionService: new WeekendSelectionService(),
});

const appDataRepository = new AppDataRepository({
  appDataModel: AppData,
  readCalendarCache: () => readCalendarCache(),
  readPersistedParticipantRoster: () => readPersistedParticipantRoster(),
  sanitizer: appDataSanitizer,
});

function createDefaultAppData(calendar = []) {
  return appDataSanitizer.createDefaultAppData(calendar);
}

function sanitizeAppData(value, calendar = [], options = {}) {
  return appDataSanitizer.sanitizeAppData(value, calendar, options);
}

async function readAppData(calendarPromise) {
  return appDataRepository.readAppData(calendarPromise);
}

async function writeAppData(appData, calendarPromise) {
  return appDataRepository.writeAppData(appData, calendarPromise);
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

async function readStandingsCache() {
  try {
    const standings = await StandingsCache.findOne({ cacheKey: 'current' });
    const plainStandings = standings ? standings.toObject() : null;

    return {
      driverStandings: plainStandings?.driverStandings ?? [],
      constructorStandings: plainStandings?.constructorStandings ?? [],
      updatedAt: plainStandings?.updatedAt ?? '',
    };
  } catch (error) {
    console.error(backendText.storage.readStandingsError, error);
    return {
      driverStandings: [],
      constructorStandings: [],
      updatedAt: '',
    };
  }
}

async function writeStandingsCache(standings) {
  try {
    await StandingsCache.findOneAndUpdate(
      { cacheKey: 'current' },
      {
        cacheKey: 'current',
        driverStandings: standings.driverStandings ?? [],
        constructorStandings: standings.constructorStandings ?? [],
        updatedAt: standings.updatedAt ?? '',
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
    return standings;
  } catch (error) {
    console.error(backendText.storage.writeStandingsError, error);
    return standings;
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
  readStandingsCache,
  writeStandingsCache,
  sanitizeAppData,
};
