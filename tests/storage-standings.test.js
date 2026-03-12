import { describe, expect, it, vi } from 'vitest';

describe('standings storage helpers', () => {
  it('reads standings from the cache document and falls back on read errors', async () => {
    vi.resetModules();
    const findOne = vi.fn()
      .mockResolvedValueOnce({
        toObject: () => ({
          driverStandings: [{ position: 1, driverId: 'pia', name: 'Oscar Piastri', team: 'McLaren', points: 99 }],
          constructorStandings: [{ position: 1, team: 'McLaren', points: 188 }],
          updatedAt: '2026-03-12T10:00:00.000Z',
        }),
      })
      .mockResolvedValueOnce({
        toObject: () => ({}),
      })
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('read failed'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.doMock('../backend/models.js', () => ({
      AppData: {},
      Driver: {},
      Weekend: {},
      StandingsCache: { findOne },
    }));

    const { readStandingsCache } = await import('../backend/storage.js');

    await expect(readStandingsCache()).resolves.toEqual({
      driverStandings: [{ position: 1, driverId: 'pia', name: 'Oscar Piastri', team: 'McLaren', points: 99 }],
      constructorStandings: [{ position: 1, team: 'McLaren', points: 188 }],
      updatedAt: '2026-03-12T10:00:00.000Z',
    });
    await expect(readStandingsCache()).resolves.toEqual({
      driverStandings: [],
      constructorStandings: [],
      updatedAt: '',
    });
    await expect(readStandingsCache()).resolves.toEqual({
      driverStandings: [],
      constructorStandings: [],
      updatedAt: '',
    });
    await expect(readStandingsCache()).resolves.toEqual({
      driverStandings: [],
      constructorStandings: [],
      updatedAt: '',
    });

    errorSpy.mockRestore();
  });

  it('writes standings to the cache document and falls back on write errors', async () => {
    vi.resetModules();
    const findOneAndUpdate = vi.fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('write failed'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.doMock('../backend/models.js', () => ({
      AppData: {},
      Driver: {},
      Weekend: {},
      StandingsCache: { findOneAndUpdate },
    }));

    const { writeStandingsCache } = await import('../backend/storage.js');
    const payload = {
      driverStandings: [{ position: 1, driverId: 'pia', name: 'Oscar Piastri', team: 'McLaren', points: 99 }],
      constructorStandings: [{ position: 1, team: 'McLaren', points: 188 }],
      updatedAt: '2026-03-12T10:00:00.000Z',
    };
    const partialPayload = {};

    await expect(writeStandingsCache(payload)).resolves.toEqual(payload);
    await expect(writeStandingsCache(partialPayload)).resolves.toEqual(partialPayload);
    await expect(writeStandingsCache(payload)).resolves.toEqual(payload);
    expect(findOneAndUpdate).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
