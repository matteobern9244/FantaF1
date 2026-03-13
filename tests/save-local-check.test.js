import { describe, expect, it, vi } from 'vitest';
import { runSaveSmoke, stableSerialize } from '../scripts/save-local-check.mjs';

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
          databaseTarget: 'fantaf1_dev',
        }),
      )
      .mockResolvedValueOnce(createJsonResponse(state))
      .mockResolvedValueOnce(createJsonResponse({ message: 'Dati salvati correttamente.' }))
      .mockResolvedValueOnce(createJsonResponse(state));

    const result = await runSaveSmoke({
      target: 'node-dev',
      baseUrl: 'http://127.0.0.1:3001',
      fetchImpl,
    });

    expect(result.health.databaseTarget).toBe('fantaf1_dev');
    expect(result.saveResult.message).toBe('Dati salvati correttamente.');
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(fetchImpl).toHaveBeenNthCalledWith(
      3,
      'http://127.0.0.1:3001/api/data',
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
          databaseTarget: 'fantaf1_dev',
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
      target: 'node-dev',
      baseUrl: 'http://127.0.0.1:3001',
      fetchImpl,
      ensureBackend,
    });

    expect(result.health.databaseTarget).toBe('fantaf1_dev');
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
        target: 'node-dev',
        baseUrl: 'http://127.0.0.1:3001',
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
          databaseTarget: 'fantaf1_dev',
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
        target: 'node-dev',
        baseUrl: 'http://127.0.0.1:3001',
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
          databaseTarget: 'fantaf1_dev',
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
        target: 'node-dev',
        baseUrl: 'http://127.0.0.1:3001',
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
          databaseTarget: 'fantaf1_dev',
        }),
      )
      .mockResolvedValueOnce(createJsonResponse(beforeState))
      .mockResolvedValueOnce(createJsonResponse({ message: 'Dati salvati correttamente.' }))
      .mockResolvedValueOnce(createJsonResponse(stabilizedState))
      .mockResolvedValueOnce(createJsonResponse({ message: 'Dati salvati correttamente.' }))
      .mockResolvedValueOnce(createJsonResponse(stabilizedState));

    const result = await runSaveSmoke({
      target: 'node-dev',
      baseUrl: 'http://127.0.0.1:3001',
      fetchImpl,
    });

    expect(result.beforeState).toEqual(stabilizedState);
    expect(result.afterState).toEqual(stabilizedState);
    expect(fetchImpl).toHaveBeenNthCalledWith(
      5,
      'http://127.0.0.1:3001/api/data',
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
      target: 'node-dev',
      baseUrl: 'http://127.0.0.1:3001',
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
          databaseTarget: 'fantaf1_porting',
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

    expect(result.health.databaseTarget).toBe('fantaf1_porting');
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
      startupEnv: {
        ASPNETCORE_ENVIRONMENT: 'Development',
        ASPNETCORE_URLS: 'http://127.0.0.1:3002',
        MONGODB_DB_NAME_OVERRIDE: 'fantaf1_porting',
      },
    }));
  });

  it('authenticates the staging target before posting the save payload', async () => {
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
          environment: 'staging',
          databaseTarget: 'fantaf1_porting',
        }),
      )
      .mockResolvedValueOnce(createJsonResponse(state))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name) => (name === 'set-cookie' ? 'fantaf1_admin_session=staging-cookie; Path=/; HttpOnly' : null),
        },
        text: async () => JSON.stringify({ isAdmin: true, defaultViewMode: 'admin' }),
      })
      .mockResolvedValueOnce(createJsonResponse({ message: 'Dati salvati correttamente.' }))
      .mockResolvedValueOnce(createJsonResponse(state));

    const result = await runSaveSmoke({
      target: 'csharp-staging-local',
      fetchImpl,
      ensureAdminCredential: vi.fn().mockResolvedValue(true),
    });

    expect(result.health.environment).toBe('staging');
    expect(fetchImpl).toHaveBeenNthCalledWith(
      4,
      'http://127.0.0.1:3003/api/data',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'fantaf1_admin_session=staging-cookie',
        },
      }),
    );
  });

  it('fails explicitly when the staging admin login does not return a session cookie', async () => {
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
          environment: 'staging',
          databaseTarget: 'fantaf1_porting',
        }),
      )
      .mockResolvedValueOnce(createJsonResponse(state))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: () => null,
        },
        text: async () => JSON.stringify({ isAdmin: true, defaultViewMode: 'admin' }),
      });

    await expect(
      runSaveSmoke({
        target: 'csharp-staging-local',
        fetchImpl,
        ensureAdminCredential: vi.fn().mockResolvedValue(true),
      }),
    ).rejects.toThrow('POST /api/admin/session non ha restituito un cookie di sessione admin valido.');
  });
});
