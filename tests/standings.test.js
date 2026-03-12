import fs from 'fs';
import { describe, expect, it, vi } from 'vitest';
import { appConfig } from '../backend/config.js';
import {
  normalizeTeamName,
  normalizeDriverName,
  parseStandingsRows,
  parseConstructorStandings,
  parseDriverStandings,
  StandingsService,
} from '../backend/standings.js';

const driversFixture = fs.readFileSync(
  new URL('./fixtures/formula1-standings-drivers.html', import.meta.url),
  'utf8',
);
const constructorsFixture = fs.readFileSync(
  new URL('./fixtures/formula1-standings-constructors.html', import.meta.url),
  'utf8',
);

describe('standings parsing and sync', () => {
  it('parses driver standings and enriches them with roster metadata', () => {
    const standings = parseDriverStandings(driversFixture, [
      {
        id: 'pia',
        name: 'Oscar Piastri',
        team: 'McLaren',
        color: '#FF8700',
        avatarUrl: 'https://media.example.com/piastri.webp',
      },
      {
        id: 'nor',
        name: 'Lando Norris',
        team: 'McLaren',
        color: '#FF8700',
        avatarUrl: 'https://media.example.com/norris.webp',
      },
    ]);

    expect(normalizeDriverName('Oscar Piastri PIA')).toBe('Oscar Piastri');
    expect(standings).toEqual([
      {
        position: 1,
        driverId: 'pia',
        name: 'Oscar Piastri',
        team: 'McLaren',
        points: 99,
        avatarUrl: 'https://media.example.com/piastri.webp',
        color: '#FF8700',
      },
      {
        position: 2,
        driverId: 'nor',
        name: 'Lando Norris',
        team: 'McLaren',
        points: 89,
        avatarUrl: 'https://media.example.com/norris.webp',
        color: '#FF8700',
      },
      {
        position: 3,
        driverId: '',
        name: 'Charles Leclerc',
        team: 'Ferrari',
        points: 71,
        avatarUrl: '',
        color: '#EF1A2D',
      },
    ]);
  });

  it('parses constructor standings and normalizes team aliases', () => {
    expect(parseConstructorStandings(constructorsFixture)).toEqual([
      { position: 1, team: 'McLaren', points: 188, color: '#FF8700' },
      { position: 2, team: 'Ferrari', points: 144, color: '#EF1A2D' },
      { position: 3, team: 'Red Bull', points: 121, color: '#0600EF' },
    ]);
  });

  it('normalizes raw text and falls back to the default team color for unknown teams', () => {
    expect(normalizeDriverName('Lewis&nbsp;Hamilton&nbsp;HAM')).toBe('Lewis Hamilton');
    expect(normalizeTeamName('  Red&nbsp;Bull Racing  ')).toBe('Red Bull');
    expect(
      parseDriverStandings(
        `
          <table>
            <tbody>
              <tr><td>1</td><td>Alice &amp; Bob ABC</td><td>Unknown &quot;Works&quot;</td><td>33</td></tr>
            </tbody>
          </table>
        `,
        [],
      ),
    ).toEqual([
      {
        position: 1,
        driverId: '',
        name: 'Alice & Bob',
        team: 'Unknown "Works"',
        points: 33,
        avatarUrl: '',
        color: appConfig.teamColors.default,
      },
    ]);
    expect(
      parseConstructorStandings(`
        <table>
          <tbody>
            <tr><td>5</td><td>Legacy &#39;Works&#39;</td><td>9</td></tr>
          </tbody>
        </table>
      `),
    ).toEqual([
      {
        position: 5,
        team: "Legacy 'Works'",
        points: 9,
        color: appConfig.teamColors.default,
      },
    ]);
  });

  it('ignores malformed standings rows and falls back when fetch responses are invalid', async () => {
    expect(
      parseStandingsRows(`
        <table>
          <tbody>
            <tr><td>Header</td><td>Ignore</td></tr>
            <tr><td>not-a-position</td><td>Driver</td><td>Team</td><td>10</td></tr>
            <tr><td>4</td><td>George Russell RUS</td><td>Mercedes</td><td>56</td></tr>
          </tbody>
        </table>
      `),
    ).toEqual([
      { position: 4, cells: ['4', 'George Russell RUS', 'Mercedes', '56'], points: 56 },
    ]);

    const invalidFetchService = new StandingsService({
      readDriversCacheImpl: vi.fn().mockResolvedValue([]),
      readStandingsCacheImpl: vi.fn().mockResolvedValue({
        driverStandings: [],
        constructorStandings: [],
        updatedAt: 'cached',
      }),
      writeStandingsCacheImpl: vi.fn(),
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('') })
      .mockResolvedValueOnce({ ok: false, text: () => Promise.resolve('') })
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('') });

    await expect(invalidFetchService.syncStandingsFromOfficialSource()).resolves.toEqual({
      driverStandings: [],
      constructorStandings: [],
      updatedAt: 'cached',
    });
    await expect(invalidFetchService.syncStandingsFromOfficialSource()).resolves.toEqual({
      driverStandings: [],
      constructorStandings: [],
      updatedAt: 'cached',
    });

    fetchSpy.mockRestore();
  });

  it('falls back to the cached standings when the sync fails', async () => {
    const writeStandingsCacheImpl = vi.fn();
    const service = new StandingsService({
      fetchHtmlImpl: vi.fn().mockRejectedValue(new Error('network')),
      readDriversCacheImpl: vi.fn().mockResolvedValue([]),
      readStandingsCacheImpl: vi.fn().mockResolvedValue({
        driverStandings: [{ position: 1, driverId: 'pia', name: 'Oscar Piastri', team: 'McLaren', points: 99 }],
        constructorStandings: [{ position: 1, team: 'McLaren', points: 188 }],
        updatedAt: '2026-03-12T09:00:00.000Z',
      }),
      writeStandingsCacheImpl,
    });

    await expect(service.syncStandingsFromOfficialSource()).resolves.toEqual({
      driverStandings: [{ position: 1, driverId: 'pia', name: 'Oscar Piastri', team: 'McLaren', points: 99 }],
      constructorStandings: [{ position: 1, team: 'McLaren', points: 188 }],
      updatedAt: '2026-03-12T09:00:00.000Z',
    });
    expect(writeStandingsCacheImpl).not.toHaveBeenCalled();
  });

  it('persists synchronized standings when both sources are valid', async () => {
    const fetchHtmlImpl = vi
      .fn()
      .mockResolvedValueOnce(driversFixture)
      .mockResolvedValueOnce(constructorsFixture);
    const writeStandingsCacheImpl = vi.fn().mockResolvedValue(undefined);
    const service = new StandingsService({
      fetchHtmlImpl,
      readDriversCacheImpl: vi.fn().mockResolvedValue([
        {
          id: 'pia',
          name: 'Oscar Piastri',
          team: 'McLaren',
          color: '#FF8700',
          avatarUrl: 'https://media.example.com/piastri.webp',
        },
      ]),
      readStandingsCacheImpl: vi.fn(),
      writeStandingsCacheImpl,
      now: () => new Date('2026-03-12T10:30:00.000Z'),
    });

    const standings = await service.syncStandingsFromOfficialSource();

    expect(standings.updatedAt).toBe('2026-03-12T10:30:00.000Z');
    expect(standings.driverStandings).toHaveLength(3);
    expect(standings.constructorStandings).toHaveLength(3);
    expect(writeStandingsCacheImpl).toHaveBeenCalledWith(standings);
  });

  it('falls back to cached standings when the fetched payload is structurally empty', async () => {
    const service = new StandingsService({
      fetchHtmlImpl: vi
        .fn()
        .mockResolvedValueOnce('<table><tbody></tbody></table>')
        .mockResolvedValueOnce(constructorsFixture),
      readDriversCacheImpl: vi.fn().mockResolvedValue([]),
      readStandingsCacheImpl: vi.fn().mockResolvedValue({
        driverStandings: [{ position: 1, driverId: '', name: 'Cached Driver', team: 'Cached Team', points: 1 }],
        constructorStandings: [{ position: 1, team: 'Cached Team', points: 1 }],
        updatedAt: 'cached',
      }),
      writeStandingsCacheImpl: vi.fn(),
    });

    await expect(service.syncStandingsFromOfficialSource()).resolves.toEqual({
      driverStandings: [{ position: 1, driverId: '', name: 'Cached Driver', team: 'Cached Team', points: 1 }],
      constructorStandings: [{ position: 1, team: 'Cached Team', points: 1 }],
      updatedAt: 'cached',
    });
  });
});
