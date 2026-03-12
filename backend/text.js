import { appConfig } from './config.js';

function formatBackendText(template, replacements = {}) {
  return Object.entries(replacements).reduce((value, [key, replacement]) => {
    return String(value).split(`{${key}}`).join(String(replacement));
  }, String(template));
}

const defaultBackendText = {
  health: {
    okStatus: 'ok',
  },
  auth: {
    adminRequired: 'Admin authentication required',
    invalidPassword: 'Invalid password',
  },
  apiErrors: {
    readAppDataFailed: 'Failed to read app data',
    readDriversFailed: 'Failed to read drivers',
    readCalendarFailed: 'Failed to read calendar',
    readStandingsFailed: 'Failed to read standings',
    fetchResultsFailed: 'Failed to fetch results',
    apiNotFound: 'API Endpoint not found',
  },
  save: {
    participantsInvalidTemplate: 'Invalid participants list. Expected {participantSlots} participants.',
    participantsInvalidDetailsTemplate: 'Expected {participantSlots} participants, received {received}.',
    predictionsMissingDetails: 'At least one prediction is required for manual predictions save.',
    raceLockedDetailsTemplate:
      'Race {meetingKey} started at {startTime} and current predictions differ from stored data.',
    saveRouteFailureTemplate:
      '[Error Backend] POST {routePath} fallito [requestId={requestId}] [environment={environment}] [databaseTarget={databaseTarget}] [code={code}]',
  },
  database: {
    missingMongoUri: 'MONGODB_URI environment variable is not defined',
    mongoUriTargetMismatchTemplate:
      'MONGODB_URI targets "{uriDatabaseName}" but {environment} requires "{expectedDatabaseName}".',
    unexpectedConnectedDatabaseTemplate:
      'Connected to unexpected MongoDB database "{actualDbName}". Expected "{expectedDbName}".',
    connectedLogTemplate:
      '[Database] Connected to MongoDB Atlas - Environment: {environment} - Target: {connectedDatabaseName} - Resolved: {targetDatabaseName}',
    connectionErrorLog: '[Database] MongoDB connection error:',
  },
  storage: {
    defaultUserNameTemplate: 'Player {index}',
    unknownUserName: 'Unknown',
    readParticipantRosterError: 'Error reading participant roster from DB:',
    readAppDataError: 'Error reading app data from DB:',
    writeAppDataError: '[Storage Error] Error writing app data to DB:',
    writeAppDataPayloadLog: '[Storage Error] Data being written:',
    readDriversError: 'Error reading drivers from DB:',
    writeDriversError: 'Error writing drivers to DB:',
    readCalendarError: 'Error reading calendar from DB:',
    writeCalendarError: 'Error writing calendar to DB:',
    readStandingsError: 'Error reading standings from DB:',
    writeStandingsError: 'Error writing standings to DB:',
  },
  sync: {
    startBackground: '[Sync] Starting background synchronization...',
    driversSynchronizedTemplate: '[Sync] Drivers synchronized: {count}',
    calendarSynchronizedTemplate: '[Sync] Calendar synchronized: {count}',
    standingsSynchronizedTemplate: '[Sync] Standings synchronized: drivers={driversCount}, constructors={constructorsCount}',
    driverSyncWarning: '[Sync] Driver sync warning:',
    calendarSyncWarning: '[Sync] Calendar sync warning:',
    standingsSyncWarning: '[Sync] Standings sync warning:',
  },
  logs: {
    serverStarted: 'Backend server attivo su {origin}.',
    driverSyncFormulaOneFallback: 'Sync roster StatsF1 non disponibile. Uso Formula1.com con {count} piloti.',
  },
  errors: {
    driversUnavailable: 'Lista piloti non disponibile.',
    calendarUnavailable: 'Calendario non disponibile.',
    standingsUnavailable: 'Classifiche reali non disponibili.',
  },
  messages: {
    saveSuccess: 'Dati salvati correttamente.',
  },
};

const configuredBackendText =
  appConfig?.uiText && typeof appConfig.uiText === 'object' && appConfig.uiText.backend
    ? appConfig.uiText.backend
    : {};

const backendText = {
  ...defaultBackendText,
  ...configuredBackendText,
  health: {
    ...defaultBackendText.health,
    ...configuredBackendText.health,
  },
  auth: {
    ...defaultBackendText.auth,
    ...configuredBackendText.auth,
  },
  apiErrors: {
    ...defaultBackendText.apiErrors,
    ...configuredBackendText.apiErrors,
  },
  save: {
    ...defaultBackendText.save,
    ...configuredBackendText.save,
  },
  database: {
    ...defaultBackendText.database,
    ...configuredBackendText.database,
  },
  storage: {
    ...defaultBackendText.storage,
    ...configuredBackendText.storage,
  },
  sync: {
    ...defaultBackendText.sync,
    ...configuredBackendText.sync,
  },
  logs: {
    ...defaultBackendText.logs,
    ...configuredBackendText.logs,
  },
  errors: {
    ...defaultBackendText.errors,
    ...configuredBackendText.errors,
  },
  messages: {
    ...defaultBackendText.messages,
    ...configuredBackendText.messages,
  },
};

export { backendText, defaultBackendText, formatBackendText };
