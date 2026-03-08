import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RaceResultsCache, RaceResultsService } from '../backend/race-results-service.js';

function buildOfficialResultsBaseUrl(detailUrl = '', meetingKey = '') {
  const slug = String(detailUrl).split('/').at(-1);
  return `https://www.formula1.com/en/results/2026/races/${meetingKey}/${slug}`;
}

describe('RaceResultsCache', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns defensive copies and evicts expired entries', () => {
    const nowSpy = vi.spyOn(Date, 'now');
    const cache = new RaceResultsCache({ ttlMs: 30_000 });

    nowSpy.mockReturnValue(0);
    const storedResults = cache.set('race-1', {
      first: 'nor',
      second: 'ver',
      third: 'lec',
      pole: 'pia',
    });

    storedResults.first = 'mutated';

    expect(cache.get('race-1')).toEqual({
      first: 'nor',
      second: 'ver',
      third: 'lec',
      pole: 'pia',
    });

    nowSpy.mockReturnValue(31_000);
    expect(cache.get('race-1')).toBeNull();
  });

  it('clears cached entries explicitly', () => {
    const cache = new RaceResultsCache();

    cache.set('race-1', {
      first: 'nor',
      second: 'ver',
      third: 'lec',
      pole: 'pia',
    });
    cache.clear();

    expect(cache.get('race-1')).toBeNull();
  });
});

describe('RaceResultsService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('reads the calendar once, reuses cache, and persists highlights lookups for finished races', async () => {
    const readCalendarCache = vi.fn().mockResolvedValue([
      {
        meetingKey: 'race-1',
        meetingName: 'Australia',
        detailUrl: 'https://www.formula1.com/en/racing/2026/australia',
        isSprintWeekend: false,
        highlightsVideoUrl: '',
      },
    ]);
    const fetchHtmlImpl = vi
      .fn()
      .mockResolvedValueOnce('<race-html>')
      .mockResolvedValueOnce('<qualifying-html>');
    const persistRaceHighlightsLookup = vi.fn().mockResolvedValue([]);
    const service = new RaceResultsService({
      readCalendarCache,
      fetchHtmlImpl,
      buildOfficialResultsBaseUrl,
      parseRaceClassification: vi.fn().mockReturnValue({
        first: 'nor',
        second: 'ver',
        third: 'lec',
      }),
      parseBonusDriver: vi.fn().mockReturnValue('pia'),
      resolveRacePhase: vi.fn().mockReturnValue('finished'),
      resolveSkySportHighlightsVideo: vi.fn().mockResolvedValue({
        highlightsVideoUrl: 'https://www.youtube.com/watch?v=skyf1-finished',
        highlightsLookupCheckedAt: '2026-03-01T15:00:00.000Z',
        highlightsLookupStatus: 'found',
        highlightsLookupSource: 'feed',
      }),
      shouldLookupFinishedRaceHighlights: vi.fn().mockReturnValue(true),
      persistRaceHighlightsLookup,
    });

    await expect(service.fetchRaceResultsWithStatus('race-1', new Date('2026-03-01T15:00:00Z'))).resolves.toEqual({
      first: 'nor',
      second: 'ver',
      third: 'lec',
      pole: 'pia',
      racePhase: 'finished',
      highlightsVideoUrl: 'https://www.youtube.com/watch?v=skyf1-finished',
    });

    await expect(service.fetchRaceResults('race-1')).resolves.toEqual({
      first: 'nor',
      second: 'ver',
      third: 'lec',
      pole: 'pia',
    });

    expect(readCalendarCache).toHaveBeenCalledTimes(2);
    expect(fetchHtmlImpl).toHaveBeenCalledTimes(2);
    expect(persistRaceHighlightsLookup).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ meetingKey: 'race-1' })]),
      'race-1',
      expect.objectContaining({
        highlightsLookupStatus: 'found',
      }),
    );
  });

  it('uses sprint-results for sprint weekends and surfaces missing race errors', async () => {
    const service = new RaceResultsService({
      readCalendarCache: vi.fn().mockResolvedValue([
        {
          meetingKey: 'sprint-race',
          meetingName: 'China',
          detailUrl: 'https://www.formula1.com/en/racing/2026/china',
          isSprintWeekend: true,
        },
      ]),
      fetchHtmlImpl: vi
        .fn()
        .mockResolvedValueOnce('<race-html>')
        .mockResolvedValueOnce('<sprint-html>'),
      buildOfficialResultsBaseUrl,
      parseRaceClassification: vi.fn().mockReturnValue({
        first: 'nor',
        second: 'pia',
        third: 'lec',
      }),
      parseBonusDriver: vi.fn().mockReturnValue('ver'),
    });

    await expect(service.fetchRaceResults('sprint-race')).resolves.toEqual({
      first: 'nor',
      second: 'pia',
      third: 'lec',
      pole: 'ver',
    });

    expect(service.fetchHtmlImpl).toHaveBeenNthCalledWith(
      2,
      'https://www.formula1.com/en/results/2026/races/sprint-race/china/sprint-results',
      expect.any(Object),
    );

    await expect(service.fetchRaceResultsForRace(null, 'missing')).rejects.toThrow('Race not found');
  });

  it('throws when the official results url cannot be derived and falls back to stored highlights when lookup fails', async () => {
    const failingService = new RaceResultsService({
      readCalendarCache: vi.fn().mockResolvedValue([]),
      fetchHtmlImpl: vi.fn(),
      buildOfficialResultsBaseUrl: vi.fn().mockReturnValue(''),
      parseRaceClassification: vi.fn(),
      parseBonusDriver: vi.fn(),
      resolveRacePhase: vi.fn(),
    });

    await expect(
      failingService.fetchRaceResultsForRace(
        {
          meetingKey: 'broken-race',
          detailUrl: 'https://www.formula1.com/en/racing/2026/broken-gp',
          isSprintWeekend: false,
        },
        'broken-race',
      ),
    ).rejects.toThrow('Race results URL could not be derived');

    const fallbackService = new RaceResultsService({
      readCalendarCache: vi.fn().mockResolvedValue([
        {
          meetingKey: 'finished-race',
          meetingName: 'Australia',
          detailUrl: 'https://www.formula1.com/en/racing/2026/australia',
          isSprintWeekend: false,
          highlightsVideoUrl: 'https://www.youtube.com/watch?v=existing-skyf1',
        },
      ]),
      fetchHtmlImpl: vi
        .fn()
        .mockResolvedValueOnce('<race-html>')
        .mockResolvedValueOnce('<qualifying-html>'),
      buildOfficialResultsBaseUrl: vi.fn().mockReturnValue(
        'https://www.formula1.com/en/results/2026/races/finished-race/australia',
      ),
      parseRaceClassification: vi.fn().mockReturnValue({
        first: 'nor',
        second: 'ver',
        third: 'lec',
      }),
      parseBonusDriver: vi.fn().mockReturnValue('pia'),
      resolveRacePhase: vi.fn().mockReturnValue('finished'),
      shouldLookupFinishedRaceHighlights: vi.fn().mockReturnValue(true),
      resolveSkySportHighlightsVideo: vi.fn().mockRejectedValue(new Error('youtube offline')),
    });

    await expect(
      fallbackService.fetchRaceResultsWithStatus('finished-race', new Date('2026-03-01T15:00:00Z')),
    ).resolves.toEqual({
      first: 'nor',
      second: 'ver',
      third: 'lec',
      pole: 'pia',
      racePhase: 'finished',
      highlightsVideoUrl: 'https://www.youtube.com/watch?v=existing-skyf1',
    });
  });

  it('covers default collaborators and falls back to an empty highlights url when lookup fails without persisted data', async () => {
    const service = new RaceResultsService({
      readCalendarCache: vi.fn().mockResolvedValue([
        {
          meetingKey: 'default-race',
          meetingName: 'Default GP',
          detailUrl: 'https://www.formula1.com/en/racing/2026/default-gp',
          isSprintWeekend: false,
        },
      ]),
      fetchHtmlImpl: vi
        .fn()
        .mockResolvedValueOnce('<race-html>')
        .mockResolvedValueOnce('<qualifying-html>'),
      buildOfficialResultsBaseUrl,
      parseRaceClassification: vi.fn().mockReturnValue({
        first: 'nor',
        second: 'ver',
        third: 'lec',
      }),
      parseBonusDriver: vi.fn().mockReturnValue('pia'),
      resolveRacePhase: vi.fn().mockReturnValue('finished'),
    });

    expect(await service.resolveSkySportHighlightsVideo()).toEqual({ highlightsVideoUrl: '' });
    expect(await service.persistRaceHighlightsLookup([{ meetingKey: 'default-race' }])).toEqual([
      { meetingKey: 'default-race' },
    ]);

    await expect(
      service.fetchRaceResultsWithStatus('default-race', new Date('2026-03-01T15:00:00Z')),
    ).resolves.toEqual({
      first: 'nor',
      second: 'ver',
      third: 'lec',
      pole: 'pia',
      racePhase: 'finished',
      highlightsVideoUrl: '',
    });

    service.clearCache();
  });

  it('falls back to an empty highlights url when a lookup failure happens on a race without stored highlights', async () => {
    const service = new RaceResultsService({
      readCalendarCache: vi.fn().mockResolvedValue([
        {
          meetingKey: 'empty-highlights-race',
          meetingName: 'Empty Highlights GP',
          detailUrl: 'https://www.formula1.com/en/racing/2026/empty-highlights-gp',
          isSprintWeekend: false,
        },
      ]),
      fetchHtmlImpl: vi
        .fn()
        .mockResolvedValueOnce('<race-html>')
        .mockResolvedValueOnce('<qualifying-html>'),
      buildOfficialResultsBaseUrl,
      parseRaceClassification: vi.fn().mockReturnValue({
        first: 'nor',
        second: 'ver',
        third: 'lec',
      }),
      parseBonusDriver: vi.fn().mockReturnValue('pia'),
      resolveRacePhase: vi.fn().mockReturnValue('finished'),
      shouldLookupFinishedRaceHighlights: vi.fn().mockReturnValue(true),
      resolveSkySportHighlightsVideo: vi.fn().mockRejectedValue(new Error('youtube offline')),
    });

    await expect(
      service.fetchRaceResultsWithStatus(
        'empty-highlights-race',
        new Date('2026-03-01T15:00:00Z'),
      ),
    ).resolves.toEqual({
      first: 'nor',
      second: 'ver',
      third: 'lec',
      pole: 'pia',
      racePhase: 'finished',
      highlightsVideoUrl: '',
    });
  });
});
