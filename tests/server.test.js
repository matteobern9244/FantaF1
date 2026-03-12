import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function flushPromises() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

async function loadServerModule({
  mongoUri = 'mongodb://localhost:27017/fantaf1',
  port = undefined,
  connectImpl = vi.fn(() => Promise.resolve()),
  listenImpl = vi.fn((port, host, callback) => {
    callback?.();
    return { close: vi.fn() };
  }),
  syncDriversImpl = vi.fn(() => Promise.resolve([{ id: 'ver' }])),
  syncCalendarImpl = vi.fn(() => Promise.resolve([{ meetingKey: 'race-1' }])),
  syncStandingsImpl = vi.fn(() =>
    Promise.resolve({
      driverStandings: [{ position: 1, driverId: 'pia', name: 'Oscar Piastri', team: 'McLaren', points: 99 }],
      constructorStandings: [{ position: 1, team: 'McLaren', points: 188 }],
      updatedAt: '2026-03-12T10:00:00.000Z',
    })),
  ensureAdminCredentialsImpl = vi.fn(() => Promise.resolve()),
  resolveMongoDatabaseNameImpl = vi.fn(() => 'fantaf1_dev'),
  verifyMongoDatabaseNameImpl = vi.fn(),
} = {}) {
  vi.resetModules();
  process.env.NODE_ENV = 'development';
  process.env.MONGODB_URI = mongoUri;
  if (port === undefined) {
    delete process.env.PORT;
  } else {
    process.env.PORT = port;
  }

  const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined);
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  const mongooseConnection = { db: { databaseName: 'fantaf1_dev' } };

  vi.doMock('mongoose', () => ({
    default: {
      connect: connectImpl,
      connection: mongooseConnection,
    },
      connect: connectImpl,
      connection: mongooseConnection,
  }));

  vi.doMock('../app.js', () => ({
    default: {
      listen: listenImpl,
    },
  }));

  vi.doMock('../backend/calendar.js', () => ({
    syncCalendarFromOfficialSource: syncCalendarImpl,
  }));

  vi.doMock('../backend/drivers.js', () => ({
    syncDriversFromOfficialSource: syncDriversImpl,
  }));

  vi.doMock('../backend/standings.js', () => ({
    syncStandingsFromOfficialSource: syncStandingsImpl,
  }));

  vi.doMock('../backend/auth.js', () => ({
    ensureAdminCredentials: ensureAdminCredentialsImpl,
  }));

  vi.doMock('../backend/config.js', () => ({
    appConfig: {
      server: { port: 3001 },
      uiText: {
        backend: {
          logs: {
            serverStarted: 'Server started at {{origin}}',
          },
          errors: {
            driversUnavailable: 'Piloti non disponibili',
            calendarUnavailable: 'Calendario non disponibile',
            standingsUnavailable: 'Classifiche reali non disponibili.',
          },
        },
      },
    },
    formatConfigText: vi.fn((template, values) => template.replace('{{origin}}', values.origin)),
  }));

  vi.doMock('../backend/database.js', () => ({
    MONGO_DATABASE_NAME_OVERRIDE_ENV_VAR: 'MONGODB_DB_NAME_OVERRIDE',
    determineExpectedMongoDatabaseName: vi.fn(() => 'fantaf1_dev'),
    normalizeRuntimeEnvironment: vi.fn(() => 'development'),
    resolveMongoDatabaseName: resolveMongoDatabaseNameImpl,
    verifyMongoDatabaseName: verifyMongoDatabaseNameImpl,
  }));

  await import('../server.js');
  await flushPromises();

  return {
    connectImpl,
    ensureAdminCredentialsImpl,
    errorSpy,
    exitSpy,
    listenImpl,
    logSpy,
    syncCalendarImpl,
    syncDriversImpl,
    syncStandingsImpl,
    verifyMongoDatabaseNameImpl,
    warnSpy,
  };
}

describe('server entrypoint', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalMongoUri = process.env.MONGODB_URI;
  const originalPort = process.env.PORT;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.MONGODB_URI = originalMongoUri;
    process.env.PORT = originalPort;
    vi.restoreAllMocks();
  });

  it('starts the server, connects to MongoDB and runs background syncs', async () => {
    const context = await loadServerModule();

    expect(context.connectImpl).toHaveBeenCalledWith('mongodb://localhost:27017/fantaf1', {
      dbName: 'fantaf1_dev',
    });
    expect(context.verifyMongoDatabaseNameImpl).toHaveBeenCalledWith('fantaf1_dev', 'fantaf1_dev');
    expect(context.ensureAdminCredentialsImpl).toHaveBeenCalled();
    expect(context.listenImpl).toHaveBeenCalledWith('3001', '0.0.0.0', expect.any(Function));
    expect(context.syncDriversImpl).toHaveBeenCalled();
    expect(context.syncCalendarImpl).toHaveBeenCalled();
    expect(context.syncStandingsImpl).toHaveBeenCalled();
    expect(context.logSpy).toHaveBeenCalledWith(expect.stringContaining('[Database] Connected to MongoDB Atlas'));
    expect(context.logSpy).toHaveBeenCalledWith('[Sync] Drivers synchronized: 1');
    expect(context.logSpy).toHaveBeenCalledWith('[Sync] Calendar synchronized: 1');
    expect(context.logSpy).toHaveBeenCalledWith('[Sync] Standings synchronized: drivers=1, constructors=1');
  });

  it('warns when the background sync returns empty datasets', async () => {
    const context = await loadServerModule({
      syncDriversImpl: vi.fn(() => Promise.resolve([])),
      syncCalendarImpl: vi.fn(() => Promise.resolve([])),
      syncStandingsImpl: vi.fn(() => Promise.resolve({ driverStandings: [], constructorStandings: [], updatedAt: '' })),
    });

    expect(context.warnSpy).toHaveBeenCalledWith('Piloti non disponibili');
    expect(context.warnSpy).toHaveBeenCalledWith('Calendario non disponibile');
    expect(context.warnSpy).toHaveBeenCalledWith('Classifiche reali non disponibili.');
  });

  it('prefers the explicit PORT environment variable when starting the listener', async () => {
    const context = await loadServerModule({
      port: '4555',
    });

    expect(context.listenImpl).toHaveBeenCalledWith('4555', '0.0.0.0', expect.any(Function));
  });

  it('warns when the background sync throws runtime errors', async () => {
    const context = await loadServerModule({
      syncDriversImpl: vi.fn(() => Promise.reject(new Error('driver sync failed'))),
      syncCalendarImpl: vi.fn(() => Promise.reject(new Error('calendar sync failed'))),
      syncStandingsImpl: vi.fn(() => Promise.reject(new Error('standings sync failed'))),
    });

    expect(context.warnSpy).toHaveBeenCalledWith('[Sync] Driver sync warning:', 'driver sync failed');
    expect(context.warnSpy).toHaveBeenCalledWith('[Sync] Calendar sync warning:', 'calendar sync failed');
    expect(context.warnSpy).toHaveBeenCalledWith('[Sync] Standings sync warning:', 'standings sync failed');
  });

  it('exits when MongoDB is not configured', async () => {
    const context = await loadServerModule({
      mongoUri: '',
    });

    expect(context.exitSpy).toHaveBeenCalledWith(1);
    expect(context.errorSpy).toHaveBeenCalledWith(expect.objectContaining({
      message: 'MONGODB_URI environment variable is not defined',
    }));
  });

  it('exits when MongoDB connection fails', async () => {
    const context = await loadServerModule({
      connectImpl: vi.fn(() => Promise.reject(new Error('mongo failed'))),
    });

    expect(context.exitSpy).toHaveBeenCalledWith(1);
    expect(context.errorSpy).toHaveBeenCalledWith('[Database] MongoDB connection error:', expect.any(Error));
  });
});
