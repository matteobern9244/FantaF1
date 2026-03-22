/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RaceWeekend } from '../src/types';
import { buildLocationHash, isIosSafariInstallableBrowser, resolveInstallCtaMode } from '../src/App';
import {
  buildEmptyAppData,
  fetchJson,
  fetchWithRetry,
  formatText,
  getNextRaceAfter,
  getOfficialResultsAvailability,
  getRaceFinishTime,
  getRaceStartTime,
  hasQualifyingOrSprintResult,
  hasPredictionValue,
  isRaceFinished,
  isRaceStarted,
  isWeekendActive,
  normalizeMeetingName,
  resolveSelectedRace,
} from '../src/utils/appHelpers';

describe('App helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns native when hasInstallPrompt is true', () => {
    expect(resolveInstallCtaMode({ isAppInstalled: false, hasInstallPrompt: true, isIosSafari: false }))
      .toBe('native');
  });

  it('returns ios when isIosSafari is true', () => {
    expect(resolveInstallCtaMode({ isAppInstalled: false, hasInstallPrompt: false, isIosSafari: true }))
      .toBe('ios');
  });

  it('returns installed when isAppInstalled is true', () => {
    expect(resolveInstallCtaMode({ isAppInstalled: true, hasInstallPrompt: false, isIosSafari: false }))
      .toBe('installed');
  });

  it('returns unavailable when no install method is available', () => {
    expect(resolveInstallCtaMode({ isAppInstalled: false, hasInstallPrompt: false, isIosSafari: false }))
      .toBe('unavailable');
  });

  it('formats template text and normalizes meeting names', () => {
    expect(formatText('Weekend {round} - {name}', { round: 2, name: 'China' })).toBe(
      'Weekend 2 - China',
    );
    expect(normalizeMeetingName('São Paulo Grand Prix!')).toBe('sao paulo grand prix');
  });

  it('detects prediction values and official result availability', () => {
    expect(hasPredictionValue(' ver ')).toBe(true);
    expect(hasPredictionValue('   ')).toBe(false);
    expect(hasQualifyingOrSprintResult({ first: '', second: '', third: '', pole: '' })).toBe(false);
    expect(hasQualifyingOrSprintResult({ first: '', second: '', third: '', pole: ' pia ' })).toBe(true);

    expect(getOfficialResultsAvailability({ first: '', second: '', third: '', pole: '' })).toBe(
      'none',
    );
    expect(getOfficialResultsAvailability({ first: 'ver', second: '', third: '', pole: '' })).toBe(
      'partial',
    );
    expect(
      getOfficialResultsAvailability({ first: 'ver', second: 'nor', third: 'lec', pole: 'pia' }),
    ).toBe('complete');
  });

  it('fetches json responses and retries transient failures', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'ok' }),
      } as Response);

    await expect(fetchJson('/api/test')).rejects.toThrow('undefined');

    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'ok' }),
      } as Response);

    const retryPromise = fetchWithRetry<{ status: string }>('/api/retry', 2);
    await vi.advanceTimersByTimeAsync(2000);

    await expect(retryPromise).resolves.toEqual({ status: 'ok' });
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 } as Response);
    await expect(fetchWithRetry('/api/retry-fail', 1)).rejects.toThrow('503');
  });

  it('builds default app data and resolves the selected race', () => {
    vi.setSystemTime(new Date('2099-03-01T12:00:00Z'));
    const calendar: RaceWeekend[] = [
      {
        meetingKey: 'race-1',
        meetingName: 'Australia',
        grandPrixTitle: 'Australian Grand Prix 2099',
        roundNumber: 1,
        dateRangeLabel: '',
        detailUrl: '',
        heroImageUrl: '',
        trackOutlineUrl: '',
        isSprintWeekend: false,
        startDate: '2099-03-13',
        endDate: '2099-03-15',
      },
      {
        meetingKey: 'race-2',
        meetingName: 'China',
        grandPrixTitle: 'Chinese Grand Prix 2099',
        roundNumber: 2,
        dateRangeLabel: '',
        detailUrl: '',
        heroImageUrl: '',
        trackOutlineUrl: '',
        isSprintWeekend: false,
        startDate: '2099-03-20',
        endDate: '2099-03-22',
      },
    ];

    expect(buildEmptyAppData(calendar).selectedMeetingKey).toBe('race-1');
    expect(buildEmptyAppData(calendar).users).toHaveLength(3);
    expect(
      buildEmptyAppData([
        {
          ...calendar[0],
          grandPrixTitle: undefined,
          meetingName: 'Australia fallback',
        },
      ]).gpName,
    ).toBe('Australia fallback');
    expect(buildEmptyAppData([]).gpName).toBe('');
    expect(resolveSelectedRace(calendar, 'race-2')?.meetingKey).toBe('race-2');
    expect(resolveSelectedRace(calendar, 'missing')?.meetingKey).toBe('race-1');
    expect(resolveSelectedRace([], 'missing')).toBeNull();
    expect(getNextRaceAfter(calendar, calendar[0])?.meetingKey).toBe('race-2');
    expect(getNextRaceAfter(calendar, calendar[1])?.meetingKey).toBe('race-2');
    expect(getNextRaceAfter(calendar, null)?.meetingKey).toBe('race-1');
    expect(getNextRaceAfter([], null)).toBeNull();
    expect(
      getNextRaceAfter(calendar, {
        ...calendar[0],
        meetingKey: 'unknown',
      })?.meetingKey,
    ).toBe('unknown');
  });

  it('computes race timing helpers and active weekend windows', () => {
    vi.setSystemTime(new Date('2099-03-15T14:30:00Z'));
    const race: RaceWeekend = {
      meetingKey: 'race-1',
      meetingName: 'Australia',
      grandPrixTitle: 'Australian Grand Prix 2099',
      roundNumber: 1,
      dateRangeLabel: '',
      detailUrl: '',
      heroImageUrl: '',
      trackOutlineUrl: '',
      isSprintWeekend: false,
      startDate: '2099-03-13',
      endDate: '2099-03-15',
      raceStartTime: '2099-03-15T14:00:00Z',
    };

    expect(getRaceStartTime(race)?.toISOString()).toBe('2099-03-15T14:00:00.000Z');
    expect(getRaceFinishTime(race)?.toISOString()).toBe('2099-03-15T16:30:00.000Z');
    expect(isRaceStarted(race)).toBe(true);
    expect(isRaceFinished(race)).toBe(false);
    expect(isWeekendActive(race)).toBe(true);
    expect(isRaceStarted(null)).toBe(false);
    expect(isRaceFinished({ ...race, raceStartTime: 'invalid' })).toBe(false);
    expect(getRaceStartTime({ ...race, raceStartTime: 'invalid', endDate: undefined })).toBeNull();
    expect(getRaceFinishTime({ ...race, raceStartTime: 'invalid', endDate: undefined })).toBeNull();
    expect(isWeekendActive({ ...race, startDate: undefined })).toBe(false);
    expect(isWeekendActive({ ...race, startDate: 'invalid', endDate: 'invalid' })).toBe(false);
  });

  it('falls back to endDate when raceStartTime is missing', () => {
    vi.setSystemTime(new Date('2099-03-15T15:00:00Z'));
    const race: RaceWeekend = {
      meetingKey: 'race-1',
      meetingName: 'Australia',
      grandPrixTitle: 'Australian Grand Prix 2099',
      roundNumber: 1,
      dateRangeLabel: '',
      detailUrl: '',
      heroImageUrl: '',
      trackOutlineUrl: '',
      isSprintWeekend: false,
      startDate: '2099-03-13',
      endDate: '2099-03-15',
    };

    expect(getRaceStartTime(race)?.toISOString()).toBe('2099-03-15T14:00:00.000Z');
    expect(isRaceStarted(race)).toBe(true);
    expect(isWeekendActive(race)).toBe(true);
    expect(
      isWeekendActive({
        ...race,
        raceStartTime: 'invalid',
      }),
    ).toBe(true);
    expect(
      isWeekendActive({
        ...race,
        raceStartTime: undefined,
        endDate: undefined,
      }),
    ).toBe(false);
  });

  describe('buildLocationHash', () => {
    it('returns empty string when hash normalizes to empty', () => {
      expect(buildLocationHash('')).toBe('');
      expect(buildLocationHash('#')).toBe('');
      expect(buildLocationHash('   ')).toBe('');
    });
    it('returns hash with # prefix when hash is non-empty', () => {
      expect(buildLocationHash('section-1')).toBe('#section-1');
      expect(buildLocationHash('#section-1')).toBe('#section-1');
    });
  });

  describe('isIosSafariInstallableBrowser', () => {
    it('returns true for iOS Safari', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        configurable: true,
      });
      expect(isIosSafariInstallableBrowser()).toBe(true);
    });
    it('returns false for iOS Chrome', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/119.0.6045.169 Mobile/15E148 Safari/604.1',
        configurable: true,
      });
      expect(isIosSafariInstallableBrowser()).toBe(false);
    });
    it('returns false for non-Apple device', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36',
        configurable: true,
      });
      expect(isIosSafariInstallableBrowser()).toBe(false);
    });
  });

  it('recognizes finished weekends when the derived finish time is in the past', () => {
    vi.setSystemTime(new Date('2099-03-15T18:00:00Z'));
    const race: RaceWeekend = {
      meetingKey: 'race-1',
      meetingName: 'Australia',
      grandPrixTitle: 'Australian Grand Prix 2099',
      roundNumber: 1,
      dateRangeLabel: '',
      detailUrl: '',
      heroImageUrl: '',
      trackOutlineUrl: '',
      isSprintWeekend: false,
      startDate: '2099-03-13',
      endDate: '2099-03-15',
      raceStartTime: '2099-03-15T14:00:00Z',
    };

    expect(isRaceFinished(race)).toBe(true);
    expect(isWeekendActive(race)).toBe(false);
  });
});
