import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearRaceResultsCache, fetchRaceResults } from '../backend/calendar.js';
import * as storage from '../backend/storage.js';

vi.mock('../backend/storage.js', () => ({
  readCalendarCache: vi.fn(),
}));

function buildDriverCell(firstName, lastName, abbreviation) {
  return `
    <td class="Table-module_cell__3rpTC">
      <span class="flex gap-px-10 after:block after:bg-[red] after:w-px-10 after:h-full">
        <span class="DriverAvatar-module_driveravatar__CrhU8 DriverAvatar-module_sm__knPcV">
          <img src="https://media.formula1.com/image/upload/c_lfill,w_64/q_auto/v1740000000/common/f1/2026/team/${abbreviation.toLowerCase()}01/2026team${abbreviation.toLowerCase()}01right.webp" alt="" />
        </span>
        <span><span class="max-lg:hidden">${firstName}</span>&nbsp;<span class="max-md:hidden">${lastName}</span><span class="md:hidden">${abbreviation}</span></span>
      </span>
    </td>
  `;
}

function buildTableRow(position, number, firstName, lastName, abbreviation) {
  return `
    <tr class="Table-module_body-row__shKd-">
      <td>${position}</td>
      <td>${number}</td>
      ${buildDriverCell(firstName, lastName, abbreviation)}
      <td>Team</td>
      <td>57</td>
      <td>1:42:06.304</td>
      <td>25</td>
    </tr>
  `;
}

function buildResultsTable(rows) {
  return `
    <table class="Table-module_table__cKsW2">
      <thead>
        <tr>
          <th>Pos.</th>
          <th>No.</th>
          <th>Driver</th>
          <th>Team</th>
          <th>Laps</th>
          <th>Time / Retired</th>
          <th>Pts.</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join('')}
      </tbody>
    </table>
  `;
}

describe('fetchRaceResults', () => {
  beforeEach(() => {
    clearRaceResultsCache();
    vi.clearAllMocks();
  });

  it('parses the current Formula1.com results table markup for race and qualifying pages', async () => {
    const mockCalendar = [
      {
        meetingKey: '1234',
        meetingName: 'Test GP',
        detailUrl: 'https://www.formula1.com/en/racing/2026/test-gp',
        isSprintWeekend: false,
      },
    ];

    vi.mocked(storage.readCalendarCache).mockResolvedValue(mockCalendar);

    global.fetch = vi.fn((url) => {
      if (url.includes('race-result')) {
        return Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(
              buildResultsTable([
                buildTableRow(1, 4, 'Lando', 'Norris', 'NOR'),
                buildTableRow(2, 1, 'Max', 'Verstappen', 'VER'),
                buildTableRow(3, 16, 'Charles', 'Leclerc', 'LEC'),
              ]),
            ),
        });
      }
      if (url.includes('qualifying')) {
        return Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(
              buildResultsTable([
                buildTableRow(1, 81, 'Oscar', 'Piastri', 'PIA'),
                buildTableRow(2, 4, 'Lando', 'Norris', 'NOR'),
              ]),
            ),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const results = await fetchRaceResults('1234');
    
    expect(results).toEqual({
      first: 'nor',
      second: 'ver',
      third: 'lec',
      pole: 'pia',
    });
  });

  it('uses sprint-results as the bonus source during sprint weekends', async () => {
    vi.mocked(storage.readCalendarCache).mockResolvedValue([
      {
        meetingKey: '1280',
        meetingName: 'China',
        detailUrl: 'https://www.formula1.com/en/racing/2026/china',
        isSprintWeekend: true,
      },
    ]);

    global.fetch = vi.fn((url) => {
      if (url.includes('race-result')) {
        return Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(
              buildResultsTable([
                buildTableRow(1, 4, 'Lando', 'Norris', 'NOR'),
                buildTableRow(2, 81, 'Oscar', 'Piastri', 'PIA'),
                buildTableRow(3, 16, 'Charles', 'Leclerc', 'LEC'),
              ]),
            ),
        });
      }

      if (url.includes('sprint-results')) {
        return Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(buildResultsTable([buildTableRow(1, 1, 'Max', 'Verstappen', 'VER')])),
        });
      }

      return Promise.reject(new Error('Unknown URL'));
    });

    await expect(fetchRaceResults('1280')).resolves.toEqual({
      first: 'nor',
      second: 'pia',
      third: 'lec',
      pole: 'ver',
    });
  });

  it('returns empty fields when the official page reports no results available yet', async () => {
    vi.mocked(storage.readCalendarCache).mockResolvedValue([
      {
        meetingKey: '9998',
        meetingName: 'Future GP',
        detailUrl: 'https://www.formula1.com/en/racing/2026/future-gp',
        isSprintWeekend: false,
      },
    ]);

    global.fetch = vi.fn((url) => {
      if (url.includes('race-result') || url.includes('qualifying')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('<table><tbody></tbody></table><p>ErrorNo results available</p>'),
        });
      }

      return Promise.reject(new Error('Unknown URL'));
    });

    await expect(fetchRaceResults('9998')).resolves.toEqual({
      first: '',
      second: '',
      third: '',
      pole: '',
    });
  });

  it('reuses cached official results inside the TTL window', async () => {
    vi.mocked(storage.readCalendarCache).mockResolvedValue([
      {
        meetingKey: 'cache-race',
        meetingName: 'Cache GP',
        detailUrl: 'https://www.formula1.com/en/racing/2026/cache-gp',
        isSprintWeekend: false,
      },
    ]);

    global.fetch = vi.fn((url) => {
      if (url.includes('race-result')) {
        return Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(
              buildResultsTable([
                buildTableRow(1, 4, 'Lando', 'Norris', 'NOR'),
                buildTableRow(2, 1, 'Max', 'Verstappen', 'VER'),
                buildTableRow(3, 16, 'Charles', 'Leclerc', 'LEC'),
              ]),
            ),
        });
      }

      if (url.includes('qualifying')) {
        return Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(buildResultsTable([buildTableRow(1, 81, 'Oscar', 'Piastri', 'PIA')])),
        });
      }

      return Promise.reject(new Error('Unknown URL'));
    });

    await fetchRaceResults('cache-race');
    await fetchRaceResults('cache-race');

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('throws error if race is not found', async () => {
    vi.mocked(storage.readCalendarCache).mockResolvedValue([]);
    await expect(fetchRaceResults('9999')).rejects.toThrow('Race not found');
  });
});
