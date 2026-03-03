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

  it('handles raceStartTime parsing and fallback', () => {
    const htmlWithTime = `
      <title>Test GP - F1 Race</title>
      <script>
        { "startDate": "2026-05-10T15:00:00+02:00" }
      </script>
    `;
    const detailWithTime = parseRaceDetailPage(htmlWithTime, 'Test', 'test', '2026-05-10');
    expect(detailWithTime.raceStartTime).toBe('2026-05-10T15:00:00+02:00');

    const htmlWithoutTime = `<title>Test GP - F1 Race</title>`;
    const detailFallback = parseRaceDetailPage(htmlWithoutTime, 'Test', 'test', '2026-05-10');
    expect(detailFallback.raceStartTime).toBe('2026-05-10T14:00:00Z');
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

  describe('parseDateRangeLabel edge cases', () => {
    it('handles single day events', () => {
      expect(parseDateRangeLabel('20 MAR', 2026)).toEqual({
        startDate: '2026-03-20',
        endDate: '2026-03-20',
      });
    });

    it('handles multi-day events in same month', () => {
      expect(parseDateRangeLabel('01-03 MAR', 2026)).toEqual({
        startDate: '2026-03-01',
        endDate: '2026-03-03',
      });
    });

    it('returns empty for invalid format', () => {
      expect(parseDateRangeLabel('invalid', 2026)).toEqual({
        startDate: '',
        endDate: '',
      });
    });
  });

  describe('parseRaceDetailPage edge cases', () => {
    it('handles missing script tag', () => {
      const html = '<html><body>no script</body></html>';
      const result = parseRaceDetailPage(html, 'Test', 'test', '2026-01-01');
      expect(result.raceStartTime).toBe('2026-01-01T14:00:00Z');
    });

    it('handles invalid JSON in script tag', () => {
      const html = '<html><script>{ invalid json }</script></html>';
      const result = parseRaceDetailPage(html, 'Test', 'test', '2026-01-01');
      expect(result.raceStartTime).toBe('2026-01-01T14:00:00Z');
    });
  });
});
