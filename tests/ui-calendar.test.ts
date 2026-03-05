import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sortCalendarByRound,
  getNextUpcomingRace,
  getRaceByMeetingKey,
  translateSessionName,
  formatSessionTime,
  formatSessionTimeParts,
} from '../src/utils/calendar';
import type { RaceWeekend } from '../src/types';

describe('UI Calendar Utils', () => {
  const currentYear = new Date().getFullYear();

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('sortCalendarByRound', () => {
    it('sorts correctly by round number', () => {
      const calendar: RaceWeekend[] = [
        { roundNumber: 3, meetingKey: '3', startDate: `${currentYear}-03-27` } as RaceWeekend,
        { roundNumber: 1, meetingKey: '1', startDate: `${currentYear}-03-06` } as RaceWeekend,
        { roundNumber: 2, meetingKey: '2', startDate: `${currentYear}-03-13` } as RaceWeekend,
      ];
      const sorted = sortCalendarByRound(calendar);
      expect(sorted[0].roundNumber).toBe(1);
      expect(sorted[1].roundNumber).toBe(2);
      expect(sorted[2].roundNumber).toBe(3);
    });

    it('falls back to sorting by date if round numbers are identical', () => {
      const calendar: RaceWeekend[] = [
        { roundNumber: 1, meetingKey: '1', startDate: `${currentYear}-03-27` } as RaceWeekend,
        { roundNumber: 1, meetingKey: '2', startDate: `${currentYear}-03-06` } as RaceWeekend,
      ];
      const sorted = sortCalendarByRound(calendar);
      expect(sorted[0].meetingKey).toBe('2'); // earlier date
      expect(sorted[1].meetingKey).toBe('1');
    });

    it('handles missing dates gracefully by placing them at the end when round numbers are equal', () => {
      const calendar: RaceWeekend[] = [
        { roundNumber: 1, meetingKey: '1' } as RaceWeekend,
        { roundNumber: 1, meetingKey: '2', startDate: `${currentYear}-03-06` } as RaceWeekend,
      ];
      const sorted = sortCalendarByRound(calendar);
      expect(sorted[0].meetingKey).toBe('2');
      expect(sorted[1].meetingKey).toBe('1');
    });
  });

  describe('getNextUpcomingRace', () => {
    it('returns null for an empty calendar', () => {
      expect(getNextUpcomingRace([])).toBeNull();
    });

    it('returns the next race based on current time and endDate', () => {
      vi.setSystemTime(new Date(`${currentYear}-03-10T12:00:00Z`));
      const calendar: RaceWeekend[] = [
        { roundNumber: 1, meetingKey: '1', endDate: `${currentYear}-03-08` } as RaceWeekend, // Past
        { roundNumber: 2, meetingKey: '2', endDate: `${currentYear}-03-15` } as RaceWeekend, // Future
        { roundNumber: 3, meetingKey: '3', endDate: `${currentYear}-03-29` } as RaceWeekend, // Future
      ];
      const nextRace = getNextUpcomingRace(calendar);
      expect(nextRace?.meetingKey).toBe('2');
    });

    it('returns the next race using startDate if endDate is missing', () => {
      vi.setSystemTime(new Date(`${currentYear}-03-10T12:00:00Z`));
      const calendar: RaceWeekend[] = [
        { roundNumber: 1, meetingKey: '1', startDate: `${currentYear}-03-08` } as RaceWeekend, // Past
        { roundNumber: 2, meetingKey: '2', startDate: `${currentYear}-03-15` } as RaceWeekend, // Future
      ];
      const nextRace = getNextUpcomingRace(calendar);
      expect(nextRace?.meetingKey).toBe('2');
    });

    it('returns the first race in the calendar if all races are in the past', () => {
      vi.setSystemTime(new Date(`${currentYear}-12-01T12:00:00Z`));
      const calendar: RaceWeekend[] = [
        { roundNumber: 1, meetingKey: '1', endDate: `${currentYear}-03-08` } as RaceWeekend,
        { roundNumber: 2, meetingKey: '2', endDate: `${currentYear}-03-15` } as RaceWeekend,
      ];
      const nextRace = getNextUpcomingRace(calendar);
      expect(nextRace?.meetingKey).toBe('1');
    });

    it('skips races with invalid dates and correctly identifies the next one', () => {
      vi.setSystemTime(new Date(`${currentYear}-03-10T12:00:00Z`));
      const calendar: RaceWeekend[] = [
        { roundNumber: 1, meetingKey: '1', endDate: 'invalid-date' } as RaceWeekend,
        { roundNumber: 2, meetingKey: '2', endDate: `${currentYear}-03-15` } as RaceWeekend,
      ];
      const nextRace = getNextUpcomingRace(calendar);
      expect(nextRace?.meetingKey).toBe('2');
    });

    it('skips races where both endDate and startDate are missing', () => {
      vi.setSystemTime(new Date(`${currentYear}-03-10T12:00:00Z`));
      const calendar: RaceWeekend[] = [
        { roundNumber: 1, meetingKey: '1' } as RaceWeekend, // no dates
        { roundNumber: 2, meetingKey: '2', endDate: `${currentYear}-03-15` } as RaceWeekend,
      ];
      const nextRace = getNextUpcomingRace(calendar);
      expect(nextRace?.meetingKey).toBe('2');
    });
  });

  describe('getRaceByMeetingKey', () => {
    it('returns the correct race when meetingKey matches', () => {
      const calendar: RaceWeekend[] = [
        { meetingKey: '1279', roundNumber: 1 } as RaceWeekend,
        { meetingKey: '1280', roundNumber: 2 } as RaceWeekend,
      ];
      expect(getRaceByMeetingKey(calendar, '1280')?.roundNumber).toBe(2);
    });

    it('returns null when meetingKey is not found', () => {
      const calendar: RaceWeekend[] = [
        { meetingKey: '1279', roundNumber: 1 } as RaceWeekend,
      ];
      expect(getRaceByMeetingKey(calendar, '9999')).toBeNull();
    });
  });

  describe('translateSessionName', () => {
    it('translates standard session names correctly', () => {
      expect(translateSessionName('Practice 1')).toBe('Prove Libere 1');
      expect(translateSessionName('Qualifying')).toBe('Qualifiche');
      expect(translateSessionName('Race')).toBe('Gara');
      expect(translateSessionName('Sprint')).toBe('Gara Sprint');
      expect(translateSessionName('Sprint Shootout')).toBe('Qualifiche Sprint');
    });

    it('handles F1 site specific suffixes', () => {
      expect(translateSessionName('Practice 1 - Australian Grand Prix')).toBe('Prove Libere 1');
    });

    it('returns the original name if no translation exists', () => {
      expect(translateSessionName('Unknown Session')).toBe('Unknown Session');
    });
  });

  describe('formatSessionTime', () => {
    it('formats ISO string to FullDay dd/MM/yyyy HH:mm', () => {
      // Usiamo una data specifica (venerdì)
      const iso = `${currentYear}-03-06T10:30:00Z`;
      const formatted = formatSessionTime(iso);
      
      // Verifica il formato generale con Regex (supporta lettere accentate)
      expect(formatted).toMatch(/^[\p{L}]+ \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/u);
      
      // Verifica che contenga la data corretta
      expect(formatted).toContain(`06/03/${currentYear}`);
      
      // Verifica che contenga il giorno della settimana (Venerdì o Friday a seconda dell'ambiente, 
      // ma abbiamo forzato it-IT nel codice, quindi dovrebbe essere Venerdì)
      expect(formatted.toLowerCase()).toMatch(/^(venerdì|friday)/); 
    });

    it('returns empty string for invalid dates', () => {
      expect(formatSessionTime('invalid')).toBe('');
    });
  });

  describe('formatSessionTimeParts', () => {
    it('returns structured labels for responsive rendering', () => {
      const iso = `${currentYear}-03-06T10:30:00Z`;
      const parts = formatSessionTimeParts(iso);

      expect(parts).not.toBeNull();
      expect(parts?.dateLabel).toBe(`06/03/${currentYear}`);
      expect(parts?.timeLabel).toMatch(/^\d{2}:\d{2}$/);
      expect(parts?.dayLabel.toLowerCase()).toMatch(/^(venerdì|friday)/);
      expect(parts?.label).toBe(`${parts?.dayLabel} ${parts?.dateLabel} ${parts?.timeLabel}`);
    });

    it('returns null for invalid session times', () => {
      expect(formatSessionTimeParts('invalid')).toBeNull();
    });
  });
});
