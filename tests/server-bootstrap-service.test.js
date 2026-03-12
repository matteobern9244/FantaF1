import { describe, expect, it, vi } from 'vitest';
import {
  BackgroundSyncService,
  DatabaseConnectionService,
  ServerBootstrapService,
} from '../backend/server-bootstrap-service.js';

describe('server bootstrap services', () => {
  it('connects to the database and verifies the target name', async () => {
    const mongoose = {
      connect: vi.fn().mockResolvedValue(undefined),
      connection: { db: { databaseName: 'fantaf1_dev' } },
    };
    const service = new DatabaseConnectionService({
      mongoose,
      resolveMongoDatabaseName: vi.fn().mockReturnValue('fantaf1_dev'),
      verifyMongoDatabaseName: vi.fn(),
      backendText: { database: { missingMongoUri: 'missing', connectedLogTemplate: 'connected' } },
      formatBackendText: vi.fn().mockReturnValue('connected'),
      runtimeEnvironment: 'development',
      databaseTargetName: 'fantaf1_dev',
      mongoDatabaseNameOverride: undefined,
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await service.connectToDatabase('mongodb://localhost:27017/fantaf1', 'development');

    expect(mongoose.connect).toHaveBeenCalledWith('mongodb://localhost:27017/fantaf1', {
      dbName: 'fantaf1_dev',
    });
    logSpy.mockRestore();
  });

  it('runs background syncs and starts the app listener through the bootstrap service', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const backgroundSyncService = new BackgroundSyncService({
      syncDriversFromOfficialSource: vi.fn().mockResolvedValue([]),
      syncCalendarFromOfficialSource: vi.fn().mockResolvedValue([{ meetingKey: 'race-1' }]),
      syncStandingsFromOfficialSource: vi
        .fn()
        .mockResolvedValue({ driverStandings: [], constructorStandings: [], updatedAt: '' }),
      backendText: {
        sync: {
          startBackground: 'bg',
          driversSynchronizedTemplate: 'drivers',
          calendarSynchronizedTemplate: 'calendar',
          standingsSynchronizedTemplate: 'standings',
          driverSyncWarning: 'driver warning',
          calendarSyncWarning: 'calendar warning',
          standingsSyncWarning: 'standings warning',
        },
      },
      formatBackendText: vi.fn((template) => template),
      appConfig: {
        uiText: {
          backend: {
            errors: {
              driversUnavailable: 'drivers unavailable',
              calendarUnavailable: 'calendar unavailable',
              standingsUnavailable: 'standings unavailable',
            },
          },
        },
      },
    });
    const bootstrap = new ServerBootstrapService({
      databaseConnectionService: { connectToDatabase: vi.fn().mockResolvedValue(undefined) },
      backgroundSyncService,
      ensureAdminCredentials: vi.fn().mockResolvedValue(undefined),
      app: { listen: vi.fn((port, host, callback) => { callback(); }) },
      host: '0.0.0.0',
      port: '3001',
      backendText: { logs: { serverStarted: 'server' } },
      formatBackendText: vi.fn().mockReturnValue('server'),
    });

    await bootstrap.start({ mongoUri: 'mongodb://localhost:27017/fantaf1', nodeEnv: 'development' });
    await backgroundSyncService.run();

    expect(warnSpy).toHaveBeenCalledWith('drivers unavailable');
    expect(warnSpy).toHaveBeenCalledWith('standings unavailable');
    expect(logSpy).toHaveBeenCalledWith('server');
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
