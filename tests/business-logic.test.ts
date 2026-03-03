import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { translateSessionName, getRaceByMeetingKey, getNextUpcomingRace } from '../src/utils/calendar';
import type { RaceWeekend } from '../src/types';

describe('Comprehensive UI Calendar and Business Logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('translateSessionName Edge Cases', () => {
    it('translates FP1, FP2, FP3 variants', () => {
      expect(translateSessionName('Practice 1')).toBe('Prove Libere 1');
      expect(translateSessionName('Practice 2')).toBe('Prove Libere 2');
      expect(translateSessionName('Practice 3')).toBe('Prove Libere 3');
    });

    it('translates Sprint variants', () => {
      expect(translateSessionName('Sprint Shootout')).toBe('Qualifiche Sprint');
      expect(translateSessionName('Sprint Qualifying')).toBe('Qualifiche Sprint');
      expect(translateSessionName('Sprint')).toBe('Gara Sprint');
    });

    it('translates Race and Grand Prix', () => {
      expect(translateSessionName('Race')).toBe('Gara');
      expect(translateSessionName('Grand Prix')).toBe('Gara');
    });

    it('handles F1 official site suffix names', () => {
      expect(translateSessionName('Practice 1 - Australian Grand Prix')).toBe('Prove Libere 1');
      expect(translateSessionName('Qualifying - Australian Grand Prix')).toBe('Qualifiche');
    });

    it('preserves unknown names', () => {
      expect(translateSessionName('Pit Stop Challenge')).toBe('Pit Stop Challenge');
      expect(translateSessionName('Something Random')).toBe('Something Random');
    });
  });

  describe('Calendar Selection Logic', () => {
    const mockCalendar: RaceWeekend[] = [
      { meetingKey: '100', roundNumber: 1, grandPrixTitle: 'GP 1', startDate: '2026-03-01', endDate: '2026-03-03' } as RaceWeekend,
      { meetingKey: '200', roundNumber: 2, grandPrixTitle: 'GP 2', startDate: '2026-03-10', endDate: '2026-03-12' } as RaceWeekend,
    ];

    it('retrieves race by meetingKey correctly', () => {
      expect(getRaceByMeetingKey(mockCalendar, '200')?.grandPrixTitle).toBe('GP 2');
      expect(getRaceByMeetingKey(mockCalendar, 'invalid')).toBeNull();
    });

    it('identifies next upcoming race correctly when between races', () => {
      vi.setSystemTime(new Date('2026-03-05T12:00:00Z'));
      expect(getNextUpcomingRace(mockCalendar)?.meetingKey).toBe('200');
    });

    it('stays on current race if today is during the weekend', () => {
      vi.setSystemTime(new Date('2026-03-02T12:00:00Z'));
      expect(getNextUpcomingRace(mockCalendar)?.meetingKey).toBe('100');
    });

    it('returns the first race if all are in the future', () => {
      vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
      expect(getNextUpcomingRace(mockCalendar)?.meetingKey).toBe('100');
    });
  });

  describe('Race Selection State Alignment', () => {
    // This mimics the logic in resolveSelectedRace
    it('prioritizes selectedMeetingKey but falls back to next upcoming', () => {
      const calendar = [
        { meetingKey: '1', roundNumber: 1, endDate: '2026-03-01' },
        { meetingKey: '2', roundNumber: 2, endDate: '2026-03-15' }
      ] as RaceWeekend[];
      
      vi.setSystemTime(new Date('2026-03-10T12:00:00Z'));
      
      // If user explicitly selected race 1 (past)
      const selected = getRaceByMeetingKey(calendar, '1') || getNextUpcomingRace(calendar);
      expect(selected?.meetingKey).toBe('1');

      // If no selection or invalid selection
      const fallback = getRaceByMeetingKey(calendar, 'invalid') || getNextUpcomingRace(calendar);
      expect(fallback?.meetingKey).toBe('2');
    });
  });
});
