import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as highlights from '../backend/highlights.js';
import {
  clearRaceResultsCache,
  fetchRaceResults,
  fetchRaceResultsWithStatus,
  parseDateRangeLabel,
  parseSeasonCalendarPage,
  resolveRacePhase,
} from '../backend/calendar.js';
import * as storage from '../backend/storage.js';

vi.mock('../backend/storage.js', () => ({
  readCalendarCache: vi.fn(),
  writeCalendarCache: vi.fn(),
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

function buildTableWithoutTbody(rows) {
  return `
    <table class="Table-module_table__cKsW2">
      ${rows.join('')}
    </table>
  `;
}

function buildYoutubeVideoRenderer({ videoId, title, authorName }) {
  return `{"videoRenderer":{"videoId":"${videoId}","title":{"runs":[{"text":"${title}"}]},"longBylineText":{"runs":[{"text":"${authorName}"}]},"navigationEndpoint":{"watchEndpoint":{"videoId":"${videoId}"}}}}`;
}

function buildYoutubeFeedXml(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">${entries.map((entry) => `
    <entry>
      <yt:videoId>${entry.videoId}</yt:videoId>
      <title>${entry.title}</title>
      <link rel="alternate" href="https://www.youtube.com/watch?v=${entry.videoId}" />
      <author>
        <name>${entry.authorName}</name>
        <uri>${entry.authorUrl ?? 'https://www.youtube.com/@skysportf1'}</uri>
      </author>
      <published>${entry.publishedAt ?? '2026-03-01T12:00:00+00:00'}</published>
    </entry>
  `).join('')}</feed>`;
}

function createFetchResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  });
}

function buildYoutubeOEmbedPayload({
  title,
  authorName = 'Sky Sport F1',
  authorUrl = 'https://www.youtube.com/@skysportf1',
}) {
  return JSON.stringify({
    title,
    author_name: authorName,
    author_url: authorUrl,
    provider_name: 'YouTube',
  });
}

describe('fetchRaceResults', () => {
  beforeEach(() => {
    clearRaceResultsCache();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.mocked(storage.writeCalendarCache).mockResolvedValue([]);
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
      if (url === 'https://www.formula1.com/en/results/2026/races/1234/test-gp/race-result') {
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
      if (url === 'https://www.formula1.com/en/results/2026/races/1234/test-gp/qualifying') {
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
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      'https://www.formula1.com/en/results/2026/races/1234/test-gp/race-result',
      expect.any(Object),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://www.formula1.com/en/results/2026/races/1234/test-gp/qualifying',
      expect.any(Object),
    );
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
      if (url === 'https://www.formula1.com/en/results/2026/races/1280/china/race-result') {
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

      if (url === 'https://www.formula1.com/en/results/2026/races/1280/china/sprint-results') {
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
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      'https://www.formula1.com/en/results/2026/races/1280/china/race-result',
      expect.any(Object),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://www.formula1.com/en/results/2026/races/1280/china/sprint-results',
      expect.any(Object),
    );
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

  it('keeps returning official results when the highlights lookup fails after race finish', async () => {
    vi.spyOn(highlights, 'resolveSkySportHighlightsVideo').mockRejectedValue(new Error('youtube offline'));
    vi.mocked(storage.readCalendarCache).mockResolvedValue([
      {
        meetingKey: '1279',
        meetingName: 'Australia',
        detailUrl: 'https://www.formula1.com/en/racing/2026/australia',
        isSprintWeekend: false,
        startDate: '2026-03-06',
        endDate: '2026-03-08',
        highlightsVideoUrl: '',
      },
    ]);

    global.fetch = vi.fn((url) => {
      if (url === 'https://www.formula1.com/en/results/2026/races/1279/australia/race-result') {
        return Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(
              buildResultsTable([
                buildTableRow(1, 63, 'George', 'Russell', 'RUS'),
                buildTableRow(2, 12, 'Kimi', 'Antonelli', 'ANT'),
                buildTableRow(3, 16, 'Charles', 'Leclerc', 'LEC'),
              ]),
            ),
        });
      }

      if (url === 'https://www.formula1.com/en/results/2026/races/1279/australia/qualifying') {
        return Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(buildResultsTable([buildTableRow(1, 4, 'Lando', 'Norris', 'NOR')])),
        });
      }

      return Promise.reject(new Error(`Unknown URL ${url}`));
    });

    await expect(
      fetchRaceResultsWithStatus('1279', new Date('2026-03-08T18:00:00Z')),
    ).resolves.toEqual({
      first: 'rus',
      second: 'ant',
      third: 'lec',
      pole: 'nor',
      racePhase: 'finished',
      highlightsVideoUrl: '',
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

  it('normalizes full driver names, skips malformed rows and refreshes expired cache entries', async () => {
    vi.mocked(storage.readCalendarCache).mockResolvedValue([
      {
        meetingKey: 'alias-race',
        meetingName: 'Alias GP',
        detailUrl: 'https://www.formula1.com/en/racing/2026/alias-gp',
        isSprintWeekend: false,
      },
    ]);

    const raceHtml = buildTableWithoutTbody([
      '<tr><td>1</td><td>4</td></tr>',
      '<tr><td>1</td><td>99</td><td>Mystery Racer</td></tr>',
      '<tr><td>2</td><td>23</td><td>Alex Albon</td></tr>',
      '<tr><td>3</td><td>87</td><td>Ollie Bearman</td></tr>',
      '<tr><td>4</td><td>16</td><td>Charles Leclerc</td></tr>',
    ]);
    const qualifyingHtml = buildTableWithoutTbody([
      '<tr><td>1</td><td>23</td><td>Alex Albon</td></tr>',
    ]);

    global.fetch = vi.fn((url) => {
      if (url.includes('race-result')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(raceHtml),
        });
      }

      if (url.includes('qualifying')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(qualifyingHtml),
        });
      }

      return Promise.reject(new Error('Unknown URL'));
    });

    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(0);

    await expect(fetchRaceResults('alias-race')).resolves.toEqual({
      first: '',
      second: 'alb',
      third: 'bea',
      pole: 'alb',
    });

    nowSpy.mockReturnValue(31_000);

    await fetchRaceResults('alias-race');

    expect(global.fetch).toHaveBeenCalledTimes(4);
    nowSpy.mockRestore();
  });

  it('throws error if race is not found', async () => {
    vi.mocked(storage.readCalendarCache).mockResolvedValue([]);
    await expect(fetchRaceResults('9999')).rejects.toThrow('Race not found');
  });

  it('parses plain fallback tables and ignores result pages without any table markup', async () => {
    vi.mocked(storage.readCalendarCache).mockResolvedValue([
      {
        meetingKey: 'fallback-table',
        meetingName: 'Fallback Table GP',
        detailUrl: 'https://www.formula1.com/en/racing/2026/fallback-table',
        isSprintWeekend: false,
      },
    ]);

    global.fetch = vi.fn((url) => {
      if (url.includes('race-result')) {
        return Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(
              `
                <table>
                  <tbody>
                    <tr><td>1</td><td>4</td><td>Lando Norris</td></tr>
                    <tr><td>2</td><td>1</td><td>Max Verstappen</td></tr>
                    <tr><td>3</td><td>16</td><td>Charles Leclerc</td></tr>
                  </tbody>
                </table>
              `,
            ),
        });
      }

      if (url.includes('qualifying')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('<section>Results not published yet</section>'),
        });
      }

      return Promise.reject(new Error('Unknown URL'));
    });

    await expect(fetchRaceResults('fallback-table')).resolves.toEqual({
      first: 'nor',
      second: 'ver',
      third: 'lec',
      pole: '',
    });
  });

  it('returns the race phase as live when the race started but official race classification is not published yet', async () => {
    vi.mocked(storage.readCalendarCache).mockResolvedValue([
      {
        meetingKey: 'live-race',
        meetingName: 'Live GP',
        detailUrl: 'https://www.formula1.com/en/racing/2026/live-gp',
        isSprintWeekend: false,
        raceStartTime: '2026-03-01T14:00:00Z',
      },
    ]);

    global.fetch = vi.fn((url) => {
      if (url.includes('race-result') || url.includes('qualifying')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('<table><tbody></tbody></table><p>No results available</p>'),
        });
      }

      return Promise.reject(new Error('Unknown URL'));
    });

    await expect(
      fetchRaceResultsWithStatus('live-race', new Date('2026-03-01T15:00:00Z')),
    ).resolves.toEqual({
      first: '',
      second: '',
      third: '',
      pole: '',
      racePhase: 'live',
      highlightsVideoUrl: '',
    });
  });

  it('returns the race phase as finished when official race classification is available', async () => {
    vi.mocked(storage.readCalendarCache).mockResolvedValue([
      {
        meetingKey: 'finished-race',
        meetingName: 'Finished GP',
        detailUrl: 'https://www.formula1.com/en/racing/2026/finished-gp',
        isSprintWeekend: false,
        raceStartTime: '2026-03-01T14:00:00Z',
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
          text: () => Promise.resolve(buildResultsTable([buildTableRow(1, 81, 'Oscar', 'Piastri', 'PIA')])),
        });
      }

      return Promise.reject(new Error('Unknown URL'));
    });

    await expect(
      fetchRaceResultsWithStatus('finished-race', new Date('2026-03-01T15:00:00Z')),
    ).resolves.toEqual({
      first: 'nor',
      second: 'ver',
      third: 'lec',
      pole: 'pia',
      racePhase: 'finished',
      highlightsVideoUrl: '',
    });
  });

  it('returns an existing highlights link for a finished race without running a public YouTube lookup', async () => {
    vi.mocked(storage.readCalendarCache).mockResolvedValue([
      {
        meetingKey: 'finished-race',
        meetingName: 'Finished GP',
        grandPrixTitle: 'FORMULA 1 FINISHED GP 2026',
        detailUrl: 'https://www.formula1.com/en/racing/2026/finished-gp',
        isSprintWeekend: false,
        raceStartTime: '2026-03-01T14:00:00Z',
        highlightsVideoUrl: 'https://www.youtube.com/watch?v=existing-skyf1',
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
          text: () => Promise.resolve(buildResultsTable([buildTableRow(1, 81, 'Oscar', 'Piastri', 'PIA')])),
        });
      }

      return Promise.reject(new Error(`Unknown URL ${url}`));
    });

    await expect(
      fetchRaceResultsWithStatus('finished-race', new Date('2026-03-01T15:00:00Z')),
    ).resolves.toEqual({
      first: 'nor',
      second: 'ver',
      third: 'lec',
      pole: 'pia',
      racePhase: 'finished',
      highlightsVideoUrl: 'https://www.youtube.com/watch?v=existing-skyf1',
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(storage.writeCalendarCache).not.toHaveBeenCalled();
  });

  it('looks up and persists the highlights link for a finished race when Sky Sport Italia F1 has published it', async () => {
    vi.mocked(storage.readCalendarCache).mockResolvedValue([
      {
        meetingKey: 'finished-race',
        meetingName: 'Australia',
        grandPrixTitle: 'FORMULA 1 AUSTRALIAN GRAND PRIX 2026',
        detailUrl: 'https://www.formula1.com/en/racing/2026/australia',
        isSprintWeekend: false,
        raceStartTime: '2026-03-01T14:00:00Z',
        highlightsVideoUrl: '',
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
          text: () => Promise.resolve(buildResultsTable([buildTableRow(1, 81, 'Oscar', 'Piastri', 'PIA')])),
        });
      }

      if (url.includes('/feeds/videos.xml?channel_id=')) {
        return Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(
              buildYoutubeFeedXml([
                {
                  videoId: 'skyf1-interview',
                  title: "F1, GP d'Australia, l'intervista a Leclerc dopo il podio",
                  authorName: 'Sky Sport F1',
                },
                {
                  videoId: 'skyf1-finished',
                  title: "F1, GP d'Australia, gli highlights della prima gara della stagione 2026 a Melbourne",
                  authorName: 'Sky Sport F1',
                },
              ]),
            ),
        });
      }

      if (url.includes('/oembed?') && url.includes('skyf1-interview')) {
        return createFetchResponse(
          buildYoutubeOEmbedPayload({
            title: "F1, GP d'Australia, l'intervista a Leclerc dopo il podio",
          }),
        );
      }

      if (url.includes('/oembed?') && url.includes('skyf1-finished')) {
        return createFetchResponse(
          buildYoutubeOEmbedPayload({
            title: "F1, GP d'Australia, gli highlights della prima gara della stagione 2026 a Melbourne",
          }),
        );
      }

      return Promise.reject(new Error(`Unknown URL ${url}`));
    });

    await expect(
      fetchRaceResultsWithStatus('finished-race', new Date('2026-03-01T15:00:00Z')),
    ).resolves.toEqual({
      first: 'nor',
      second: 'ver',
      third: 'lec',
      pole: 'pia',
      racePhase: 'finished',
      highlightsVideoUrl: 'https://www.youtube.com/watch?v=skyf1-finished',
    });

    expect(storage.writeCalendarCache).toHaveBeenCalledWith([
      expect.objectContaining({
        meetingKey: 'finished-race',
        highlightsVideoUrl: 'https://www.youtube.com/watch?v=skyf1-finished',
        highlightsLookupStatus: 'found',
        highlightsLookupSource: 'feed',
      }),
    ]);
  });

  it('persists a missing highlights lookup and skips repeated checks until the missing TTL expires', async () => {
    vi.mocked(storage.readCalendarCache).mockResolvedValue([
      {
        meetingKey: 'finished-race',
        meetingName: 'Australia',
        grandPrixTitle: 'FORMULA 1 AUSTRALIAN GRAND PRIX 2026',
        detailUrl: 'https://www.formula1.com/en/racing/2026/australia',
        isSprintWeekend: false,
        raceStartTime: '2026-03-01T14:00:00Z',
        highlightsVideoUrl: '',
        highlightsLookupStatus: '',
        highlightsLookupCheckedAt: '',
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
          text: () => Promise.resolve(buildResultsTable([buildTableRow(1, 81, 'Oscar', 'Piastri', 'PIA')])),
        });
      }

      if (url.includes('/feeds/videos.xml?channel_id=')) {
        return Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(buildYoutubeFeedXml([])),
        });
      }

      if (url.includes('/@skysportf1/search?query=')) {
        return Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(
              `{"contents":[${buildYoutubeVideoRenderer({
                videoId: 'wrong-channel',
                title: "F1, GP d'Australia, gli highlights della gara",
                authorName: 'Altro canale',
              })}]}`,
            ),
        });
      }

      if (url.includes('/oembed?') && url.includes('wrong-channel')) {
        return createFetchResponse(
          buildYoutubeOEmbedPayload({
            title: "F1, GP d'Australia, gli highlights della gara",
            authorName: 'Altro canale',
            authorUrl: 'https://www.youtube.com/@altrocanale',
          }),
        );
      }

      return Promise.reject(new Error(`Unknown URL ${url}`));
    });

    await expect(
      fetchRaceResultsWithStatus('finished-race', new Date('2026-03-01T15:00:00Z')),
    ).resolves.toEqual({
      first: 'nor',
      second: 'ver',
      third: 'lec',
      pole: 'pia',
      racePhase: 'finished',
      highlightsVideoUrl: '',
    });

    expect(storage.writeCalendarCache).toHaveBeenCalledWith([
      expect.objectContaining({
        meetingKey: 'finished-race',
        highlightsVideoUrl: '',
        highlightsLookupStatus: 'missing',
        highlightsLookupSource: '',
      }),
    ]);

    vi.clearAllMocks();
    clearRaceResultsCache();
    vi.mocked(storage.readCalendarCache).mockResolvedValue([
      {
        meetingKey: 'finished-race',
        meetingName: 'Australia',
        grandPrixTitle: 'FORMULA 1 AUSTRALIAN GRAND PRIX 2026',
        detailUrl: 'https://www.formula1.com/en/racing/2026/australia',
        isSprintWeekend: false,
        raceStartTime: '2026-03-01T14:00:00Z',
        highlightsVideoUrl: '',
        highlightsLookupStatus: 'missing',
        highlightsLookupCheckedAt: '2026-03-01T15:00:00.000Z',
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
          text: () => Promise.resolve(buildResultsTable([buildTableRow(1, 81, 'Oscar', 'Piastri', 'PIA')])),
        });
      }

      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    await expect(
      fetchRaceResultsWithStatus('finished-race', new Date('2026-03-01T18:00:00Z')),
    ).resolves.toEqual({
      first: 'nor',
      second: 'ver',
      third: 'lec',
      pole: 'pia',
      racePhase: 'finished',
      highlightsVideoUrl: '',
    });

    expect(storage.writeCalendarCache).not.toHaveBeenCalled();
  });

  it('reads the calendar only once when resolving results together with the race phase', async () => {
    vi.mocked(storage.readCalendarCache).mockResolvedValue([
      {
        meetingKey: 'single-read',
        meetingName: 'Single Read GP',
        detailUrl: 'https://www.formula1.com/en/racing/2026/single-read-gp',
        isSprintWeekend: false,
        raceStartTime: '2026-03-01T14:00:00Z',
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
          text: () => Promise.resolve(buildResultsTable([buildTableRow(1, 81, 'Oscar', 'Piastri', 'PIA')])),
        });
      }

      return Promise.reject(new Error('Unknown URL'));
    });

    await fetchRaceResultsWithStatus('single-read', new Date('2026-03-01T15:00:00Z'));

    expect(storage.readCalendarCache).toHaveBeenCalledTimes(1);
  });

  it('handles empty date fragments, missing images and fallback hero images when parsing the season page', () => {
    const year = new Date().getFullYear();

    expect(parseDateRangeLabel(undefined, year)).toEqual({
      startDate: '',
      endDate: '',
    });

    const calendar = parseSeasonCalendarPage(
      `
        <a href="/en/racing/${year}/pre-season-testing">
          <span>ROUND 0</span>
          <span>Ignored</span>
        </a>
        <a href="/en/racing/${year}/monaco">
          <span>ROUND 7</span>
          <span>Monaco</span>
          <img src="https://example.com/monaco-fallback.webp" />
        </a>
        <a href="/en/racing/${year}/spa">
          <span>ROUND 8</span>
          <span>Spa</span>
        </a>
      `,
      year,
    );

    expect(calendar).toEqual([
      expect.objectContaining({
        meetingKey: 'monaco',
        meetingName: 'Monaco',
        grandPrixTitle: `Monaco Grand Prix ${year}`,
        dateRangeLabel: '',
        heroImageUrl: 'https://example.com/monaco-fallback.webp',
        startDate: '',
        endDate: '',
      }),
      expect.objectContaining({
        meetingKey: 'spa',
        meetingName: 'Spa',
        grandPrixTitle: `Spa Grand Prix ${year}`,
        heroImageUrl: '',
      }),
    ]);
  });
});

describe('resolveRacePhase', () => {
  it('returns open before race start', () => {
    expect(
      resolveRacePhase(
        {
          meetingKey: 'race-1',
          raceStartTime: '2026-03-01T14:00:00Z',
        },
        { first: '', second: '', third: '', pole: '' },
        new Date('2026-03-01T13:59:59Z'),
      ),
    ).toBe('open');
  });

  it('returns live after race start when official race classification is still unavailable', () => {
    expect(
      resolveRacePhase(
        {
          meetingKey: 'race-1',
          raceStartTime: '2026-03-01T14:00:00Z',
        },
        { first: '', second: '', third: '', pole: 'pia' },
        new Date('2026-03-01T14:30:00Z'),
      ),
    ).toBe('live');
  });

  it('returns finished when official race classification is available', () => {
    expect(
      resolveRacePhase(
        {
          meetingKey: 'race-1',
          raceStartTime: '2026-03-01T14:00:00Z',
        },
        { first: 'nor', second: 'ver', third: 'lec', pole: 'pia' },
        new Date('2026-03-01T14:30:00Z'),
      ),
    ).toBe('finished');
  });

  it('returns open when the race has no usable timing metadata', () => {
    expect(
      resolveRacePhase(
        {
          meetingKey: 'race-1',
        },
        { first: '', second: '', third: '', pole: '' },
        new Date('2026-03-01T14:30:00Z'),
      ),
    ).toBe('open');
  });

  it('uses endDate as fallback timing metadata when raceStartTime is missing', () => {
    expect(
      resolveRacePhase(
        {
          meetingKey: 'race-1',
          endDate: '2026-03-01',
        },
        { first: '', second: '', third: '', pole: '' },
        new Date('2026-03-01T15:00:00Z'),
      ),
    ).toBe('live');
  });

  it('returns open when raceStartTime is invalid', () => {
    expect(
      resolveRacePhase(
        {
          meetingKey: 'race-1',
          raceStartTime: 'invalid-date',
        },
        { first: '', second: '', third: '', pole: '' },
        new Date('2026-03-01T15:00:00Z'),
      ),
    ).toBe('open');
  });
});
