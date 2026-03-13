/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { fetchOfficialStandings } from '../src/utils/standingsApi';

describe('standings api client', () => {
  it('fetches official standings from the dedicated endpoint', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          driverStandings: [{ position: 1, driverId: 'pia', name: 'Oscar Piastri', team: 'McLaren', points: 99 }],
          constructorStandings: [{ position: 1, team: 'McLaren', points: 188 }],
          updatedAt: '2026-03-12T10:00:00.000Z',
        }),
    } as Response);

    await expect(fetchOfficialStandings()).resolves.toEqual({
      driverStandings: [{ position: 1, driverId: 'pia', name: 'Oscar Piastri', team: 'McLaren', points: 99 }],
      constructorStandings: [{ position: 1, team: 'McLaren', points: 188 }],
      updatedAt: '2026-03-12T10:00:00.000Z',
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/standings');
  });

  it('throws when the standings endpoint responds with a non-ok status', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({ ok: false } as Response);

    await expect(fetchOfficialStandings()).rejects.toThrow('Failed to fetch official standings');
  });
});
