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
      .mockResolvedValueOnce(createJsonResponse(afterState));

    await expect(
      runSaveSmoke({
        baseUrl: 'http://127.0.0.1:3001',
        fetchImpl,
      }),
    ).rejects.toThrow('Lo stato letto dopo il salvataggio non coincide con il payload inviato.');
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
      baseUrl: 'http://127.0.0.1:3001',
      expectedEnvironment: 'ci',
      expectedDatabaseTarget: 'fantaf1_ci',
      fetchImpl,
    });

    expect(result.health.environment).toBe('ci');
    expect(result.health.databaseTarget).toBe('fantaf1_ci');
  });
});
