import { afterEach, describe, expect, it, vi } from 'vitest';

describe('standings sync wrapper', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the module-level service wrapper for sync', async () => {
    vi.resetModules();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve('<table><tbody><tr><td>1</td><td>Oscar Piastri PIA</td><td>McLaren</td><td>99</td></tr></tbody></table>'),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve('<table><tbody><tr><td>1</td><td>McLaren</td><td>188</td></tr></tbody></table>'),
      });
    vi.stubGlobal('fetch', fetchMock);
    vi.doMock('../backend/storage.js', () => ({
      readDriversCache: vi.fn(() => Promise.resolve([{ id: 'pia', name: 'Oscar Piastri', team: 'McLaren', color: '#FF8700', avatarUrl: 'https://media.example.com/pia.webp' }])),
      readStandingsCache: vi.fn(() => Promise.resolve({ driverStandings: [], constructorStandings: [], updatedAt: '' })),
      writeStandingsCache: vi.fn((payload) => Promise.resolve(payload)),
    }));

    const { syncStandingsFromOfficialSource } = await import('../backend/standings.js');

    await expect(syncStandingsFromOfficialSource()).resolves.toEqual({
      driverStandings: [{
        position: 1,
        driverId: 'pia',
        name: 'Oscar Piastri',
        team: 'McLaren',
        points: 99,
        avatarUrl: 'https://media.example.com/pia.webp',
        color: '#FF8700',
      }],
      constructorStandings: [{
        position: 1,
        team: 'McLaren',
        points: 188,
        color: '#FF8700',
      }],
      updatedAt: expect.any(String),
    });
  });
});
