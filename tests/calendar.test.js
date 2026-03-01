import fs from 'fs';
import { describe, expect, it } from 'vitest';
import {
  parseDateRangeLabel,
  parseRaceDetailPage,
  parseSeasonCalendarPage,
  syncCalendarFromOfficialSource,
} from '../backend/calendar.js';

const seasonFixture = fs.readFileSync(
  new URL('./fixtures/formula1-season.html', import.meta.url),
  'utf8',
);
const detailFixture = fs.readFileSync(
  new URL('./fixtures/formula1-race-china.html', import.meta.url),
  'utf8',
);

describe('calendar parsing and fallback', () => {
  it('parses Formula1 season and detail fixtures', () => {
    const calendar = parseSeasonCalendarPage(seasonFixture, 2026);
    const chinaDetail = parseRaceDetailPage(detailFixture, 'China', 'china');

    expect(calendar).toHaveLength(3);
    expect(calendar[0]).toMatchObject({
      meetingKey: 'australia',
      meetingName: 'Australia',
      roundNumber: 1,
      dateRangeLabel: '06 - 08 MAR',
    });
    expect(calendar[2].grandPrixTitle).toBe('FORMULA 1 GULF AIR BAHRAIN GRAND PRIX 2026');
    expect(parseDateRangeLabel('30 Oct - 01 Nov', 2026)).toEqual({
      startDate: '2026-10-30',
      endDate: '2026-11-01',
    });
    expect(chinaDetail).toMatchObject({
      meetingKey: '1280',
      grandPrixTitle: 'Chinese Grand Prix 2026',
      isSprintWeekend: true,
    });
    expect(chinaDetail.trackOutlineUrl).toContain('2026trackshanghaidetailed.webp');
  });

  it('falls back to the cached calendar when the live fetch fails', async () => {
    const cachedCalendar = [
      {
        meetingKey: 'cached',
        meetingName: 'Cached',
        grandPrixTitle: 'Cached Grand Prix',
        roundNumber: 1,
        dateRangeLabel: '01 - 03 JAN',
        detailUrl: 'https://example.com',
        heroImageUrl: '',
        trackOutlineUrl: '',
        isSprintWeekend: false,
        startDate: '2026-01-01',
        endDate: '2026-01-03',
      },
    ];

    const result = await syncCalendarFromOfficialSource({
      fetchHtmlImpl: async () => {
        throw new Error('offline');
      },
      readCache: () => cachedCalendar,
      writeCache: () => {
        throw new Error('should not write');
      },
    });

    expect(result).toEqual(cachedCalendar);
  });
});
