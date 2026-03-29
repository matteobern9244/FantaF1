import { describe, expect, it, vi } from 'vitest';
import { runSaveSmoke, stableSerialize } from '../scripts/save-local-check.mjs';
import { DEFAULT_LOCAL_DATABASES } from '../scripts/local-runtime-targets.mjs';

function createJsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  };
}

describe('local save smoke runner', () => {
  it('round-trips the current payload against the local save API', async () => {
    const state = {
      users: [{ name: 'Player 1', predictions: { first: '', second: '', third: '', pole: '' }, points: 0 }],
      history: [],
      gpName: 'Australian Grand Prix 2026',
      raceResults: { first: '', second: '', third: '', pole: '' },
      selectedMeetingKey: '2026-australia',
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          status: 'ok',
          environment: 'development',
          databaseTarget: DEFAULT_LOCAL_DATABASES.csharpDevelopment,
        }),
      )
      .mockResolvedValueOnce(createJsonResponse(state))
      .mockResolvedValueOnce(createJsonResponse({ message: 'Dati salvati correttamente.' }))
      .mockResolvedValueOnce(createJsonResponse(state));

    const result = await runSaveSmoke({
      target: 'csharp-dev',
      baseUrl: 'http://127.0.0.1:3002',
      fetchImpl,
    });

    expect(result.health.databaseTarget).toBe(DEFAULT_LOCAL_DATABASES.csharpDevelopment);
    expect(result.saveResult.message).toBe('Dati salvati correttamente.');
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(fetchImpl).toHaveBeenNthCalledWith(
      3,
      'http://127.0.0.1:3002/api/data',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      }),
    );
  });

  it('bootstraps the local backend when the health endpoint is initially unreachable', async () => {
    const state = {
      users: [{ name: 'Player 1', predictions: { first: '', second: '', third: '', pole: '' }, points: 0 }],
      history: [],
      gpName: 'Australian Grand Prix 2026',
      raceResults: { first: '', second: '', third: '', pole: '' },
      selectedMeetingKey: '2026-australia',
    };
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce(
        createJsonResponse({
          status: 'ok',
          environment: 'development',
          databaseTarget: DEFAULT_LOCAL_DATABASES.csharpDevelopment,
        }),
      )
      .mockResolvedValueOnce(createJsonResponse(state))
      .mockResolvedValueOnce(createJsonResponse({ message: 'Dati salvati correttamente.' }))
      .mockResolvedValueOnce(createJsonResponse(state));
    const stopBackend = vi.fn().mockResolvedValue(undefined);
    const ensureBackend = vi.fn().mockResolvedValue({
      started: true,
      stop: stopBackend,
    });

    const result = await runSaveSmoke({
      target: 'csharp-dev',
      baseUrl: 'http://127.0.0.1:3002',
      fetchImpl,
      ensureBackend,
    });

    expect(result.health.databaseTarget).toBe(DEFAULT_LOCAL_DATABASES.csharpDevelopment);
    expect(ensureBackend).toHaveBeenCalledTimes(1);
    expect(stopBackend).toHaveBeenCalledTimes(1);
  });

  it('fails when health resolves to the wrong environment', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      createJsonResponse({
        status: 'ok',
        environment: 'production',
        databaseTarget: 'fantaf1',
      }),
    );

    await expect(
      runSaveSmoke({
        target: 'csharp-dev',
        baseUrl: 'http://127.0.0.1:3002',
        fetchImpl,
      }),
    ).rejects.toThrow('Smoke save consentito solo in development.');
  });

  it('fails with the backend error when POST /api/data is rejected', async () => {
    const state = {
      users: [],
      history: [],
      gpName: '',
      raceResults: {},
      selectedMeetingKey: '',
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          status: 'ok',
          environment: 'development',
          databaseTarget: DEFAULT_LOCAL_DATABASES.csharpDevelopment,
        }),
      )
      .mockResolvedValueOnce(createJsonResponse(state))
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            error: 'Invalid participants list. Expected 3 participants.',
            requestId: 'req-save',
          },
          400,
        ),
      );

    await expect(
      runSaveSmoke({
        target: 'csharp-dev',
        baseUrl: 'http://127.0.0.1:3002',
        fetchImpl,
      }),
    ).rejects.toThrow(
      'Richiesta POST /api/data fallita con 400: Invalid participants list. Expected 3 participants. (requestId: req-save)',
    );
  });

  it('fails when the state changes after the round-trip save', async () => {
    const beforeState = {
      users: [{ name: 'Player 1', predictions: { first: '', second: '', third: '', pole: '' }, points: 0 }],
      history: [],
      gpName: 'Australian Grand Prix 2026',
      raceResults: { first: '', second: '', third: '', pole: '' },
      selectedMeetingKey: '2026-australia',
    };
    const afterState = {
      ...beforeState,
      gpName: 'Changed Grand Prix',
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          status: 'ok',
          environment: 'development',
          databaseTarget: DEFAULT_LOCAL_DATABASES.csharpDevelopment,
        }),
      )
      .mockResolvedValueOnce(createJsonResponse(beforeState))
      .mockResolvedValueOnce(createJsonResponse({ message: 'Dati salvati correttamente.' }))
      .mockResolvedValueOnce(createJsonResponse(afterState))
      .mockResolvedValueOnce(createJsonResponse({ message: 'Dati salvati correttamente.' }))
      .mockResolvedValueOnce(
        createJsonResponse({
          ...afterState,
          gpName: 'Changed Grand Prix Again',
        }),
      );

    await expect(
      runSaveSmoke({
        target: 'csharp-dev',
        baseUrl: 'http://127.0.0.1:3002',
        fetchImpl,
      }),
    ).rejects.toThrow('Lo stato letto dopo il salvataggio non coincide con il payload inviato.');
  });

  it('retries once with the stabilized payload when background sync changes the canonical state mid-check', async () => {
    const beforeState = {
      users: [{ name: 'Player 1', predictions: { first: '', second: '', third: '', pole: '' }, points: 0 }],
      history: [],
      gpName: 'Australian Grand Prix 2026',
      raceResults: { first: '', second: '', third: '', pole: '' },
      selectedMeetingKey: '2026-australia',
    };
    const stabilizedState = {
      ...beforeState,
      gpName: 'Australian Grand Prix',
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          status: 'ok',
          environment: 'development',
          databaseTarget: DEFAULT_LOCAL_DATABASES.csharpDevelopment,
        }),
      )
      .mockResolvedValueOnce(createJsonResponse(beforeState))
      .mockResolvedValueOnce(createJsonResponse({ message: 'Dati salvati correttamente.' }))
      .mockResolvedValueOnce(createJsonResponse(stabilizedState))
      .mockResolvedValueOnce(createJsonResponse({ message: 'Dati salvati correttamente.' }))
      .mockResolvedValueOnce(createJsonResponse(stabilizedState));

    const result = await runSaveSmoke({
      target: 'csharp-dev',
      baseUrl: 'http://127.0.0.1:3002',
      fetchImpl,
    });

    expect(result.beforeState).toEqual(stabilizedState);
    expect(result.afterState).toEqual(stabilizedState);
    expect(fetchImpl).toHaveBeenNthCalledWith(
      5,
      'http://127.0.0.1:3002/api/data',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stabilizedState),
      }),
    );
  });

  it('serializes objects deterministically before comparing them', () => {
    expect(stableSerialize({ second: 2, first: 1 })).toBe(stableSerialize({ first: 1, second: 2 }));
  });

  it('supports CI-specific expected environment and database target values', async () => {
    const state = {
      users: [{ name: 'Player 1', predictions: { first: '', second: '', third: '', pole: '' }, points: 0 }],
      history: [],
      gpName: 'Australian Grand Prix 2026',
      raceResults: { first: '', second: '', third: '', pole: '' },
      selectedMeetingKey: '2026-australia',
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          status: 'ok',
          environment: 'ci',
          databaseTarget: 'fantaf1_ci',
        }),
      )
      .mockResolvedValueOnce(createJsonResponse(state))
      .mockResolvedValueOnce(createJsonResponse({ message: 'Dati salvati correttamente.' }))
      .mockResolvedValueOnce(createJsonResponse(state));

    const result = await runSaveSmoke({
      target: 'csharp-dev',
      baseUrl: 'http://127.0.0.1:3002',
      expectedEnvironment: 'ci',
      expectedDatabaseTarget: 'fantaf1_ci',
      fetchImpl,
    });

    expect(result.health.environment).toBe('ci');
    expect(result.health.databaseTarget).toBe('fantaf1_ci');
  });

  it('starts the integrated csharp runtime when the explicit target requires it', async () => {
    const state = {
      users: [{ name: 'Player 1', predictions: { first: '', second: '', third: '', pole: '' }, points: 0 }],
      history: [],
      gpName: 'Australian Grand Prix 2026',
      raceResults: { first: '', second: '', third: '', pole: '' },
      selectedMeetingKey: '2026-australia',
    };
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce(
        createJsonResponse({
          status: 'ok',
          environment: 'development',
          databaseTarget: DEFAULT_LOCAL_DATABASES.csharpDevelopment,
        }),
      )
      .mockResolvedValueOnce(createJsonResponse(state))
      .mockResolvedValueOnce(createJsonResponse({ message: 'Dati salvati correttamente.' }))
      .mockResolvedValueOnce(createJsonResponse(state));
    const ensureBackend = vi.fn().mockResolvedValue({
      started: true,
      stop: vi.fn().mockResolvedValue(undefined),
    });

    const result = await runSaveSmoke({
      target: 'csharp-dev',
      fetchImpl,
      ensureBackend,
    });

    expect(result.health.databaseTarget).toBe(DEFAULT_LOCAL_DATABASES.csharpDevelopment);
    expect(ensureBackend).toHaveBeenCalledWith(expect.objectContaining({
      healthUrl: 'http://127.0.0.1:3002/api/health',
      backendCommand: 'dotnet',
      backendArgs: [
        'run',
        '--project',
        'backend-csharp/src/FantaF1.Api/FantaF1.Api.csproj',
        '-c',
        'Release',
        '--no-launch-profile',
      ],
      startupEnv: expect.objectContaining({
        ASPNETCORE_ENVIRONMENT: 'Development',
        ASPNETCORE_URLS: 'http://127.0.0.1:3002',
        MONGODB_DB_NAME_OVERRIDE: DEFAULT_LOCAL_DATABASES.csharpDevelopment,
      }),
    }));
  });

  it('fails quickly when the backend process exits unexpectedly during startup', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('fetch failed'));
    const ensureBackendMock = vi.fn().mockRejectedValue(new Error('Il processo backend e\' terminato inaspettatamente con codice 1.'));

    await expect(
      runSaveSmoke({
        target: 'csharp-dev',
        fetchImpl,
        ensureBackend: ensureBackendMock,
      }),
    ).rejects.toThrow('Il processo backend e\' terminato inaspettatamente con codice 1.');
  });

  it('ignores shared local smoke overrides and keeps the canonical isolated database target', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          status: 'ok',
          environment: 'development',
          databaseTarget: DEFAULT_LOCAL_DATABASES.csharpDevelopment,
        }),
      )
      .mockResolvedValueOnce(createJsonResponse({
        users: [],
        history: [],
        gpName: '',
        raceResults: { first: '', second: '', third: '', pole: '' },
        selectedMeetingKey: '',
      }))
      .mockResolvedValueOnce(createJsonResponse({ message: 'Dati salvati correttamente.' }))
      .mockResolvedValueOnce(createJsonResponse({
        users: [],
        history: [],
        gpName: '',
        raceResults: { first: '', second: '', third: '', pole: '' },
        selectedMeetingKey: '',
      }));

    const result = await runSaveSmoke({
      target: 'csharp-dev',
      expectedDatabaseTarget: 'fantaf1',
      fetchImpl,
    });

    expect(result.health.databaseTarget).toBe(DEFAULT_LOCAL_DATABASES.csharpDevelopment);
  });

  it('fails when MONGODB_URI is missing from environment during backend bootstrap', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('fetch failed'));
    const ensureBackendMock = vi.fn().mockRejectedValue(new Error('Variabile d\'ambiente MONGODB_URI non definita. Verifica la configurazione del file .env.'));

    await expect(
      runSaveSmoke({
        target: 'csharp-dev',
        fetchImpl,
        ensureBackend: ensureBackendMock,
      }),
    ).rejects.toThrow('Variabile d\'ambiente MONGODB_URI non definita. Verifica la configurazione del file .env.');
  });
});
