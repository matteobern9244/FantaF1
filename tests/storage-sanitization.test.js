import { describe, it, expect } from 'vitest';
import { sanitizeAppData } from '../backend/storage.js';

describe('Storage Sanitization', () => {
  it('should return default data when input is null or undefined', () => {
    const result = sanitizeAppData(null);
    expect(result).toBeDefined();
    expect(result.users).toHaveLength(3);
    expect(result.history).toEqual([]);
  });

  it('should sanitize user predictions correctly', () => {
    const rawData = {
      users: [
        { name: 'Player 1', predictions: { first: 'VER', second: 'HAM', third: 'LEC', pole: 'VER' }, points: 10 },
        { name: 'Player 2', predictions: { first: 'NOR', second: 'PIA' }, points: 5 }, // missing fields
        { name: 'Player 3', predictions: null, points: 'invalid' } // null and invalid points
      ]
    };
    const result = sanitizeAppData(rawData);
    
    expect(result.users[0].predictions.first).toBe('VER');
    expect(result.users[1].predictions.third).toBe('');
    expect(result.users[1].predictions.pole).toBe('');
    expect(result.users[2].predictions.first).toBe('');
    expect(result.users[2].points).toBe(0);
  });

  it('should enforce exactly 3 players rule', () => {
    const tooMany = {
      users: [
        { name: 'P1' }, { name: 'P2' }, { name: 'P3' }, { name: 'P4' }
      ]
    };
    const resultTooMany = sanitizeAppData(tooMany);
    expect(resultTooMany.users).toHaveLength(3);
    expect(resultTooMany.users.map(u => u.name)).toEqual(['P1', 'P2', 'P3']);

    const tooFew = {
      users: [
        { name: 'P1' }
      ]
    };
    const resultTooFew = sanitizeAppData(tooFew);
    expect(resultTooFew.users).toHaveLength(3);
    expect(resultTooFew.users[0].name).toBe('P1');
    expect(resultTooFew.users[1].name).toBe('Player 2'); // From default
  });

  it('should sanitize history records correctly', () => {
    const rawData = {
      history: [
        {
          gpName: 'Italian Grand Prix',
          meetingKey: 'ita2024',
          date: '2024-09-01',
          results: { first: 'LEC', second: 'PIA', third: 'NOR', pole: 'NOR' },
          userPredictions: {
            'Player 1': {
              prediction: { first: 'LEC', second: 'SAI', third: 'HAM', pole: 'LEC' },
              pointsEarned: 5
            }
          }
        }
      ]
    };
    const result = sanitizeAppData(rawData);
    expect(result.history).toHaveLength(1);
    expect(result.history[0].gpName).toBe('Italian Grand Prix');
    expect(result.history[0].userPredictions['Player 1'].pointsEarned).toBe(5);
  });

  it('should handle malformed history records', () => {
    const rawData = {
      history: [
        {
          gpName: null,
          results: 'not-an-object',
          userPredictions: null
        }
      ]
    };
    const result = sanitizeAppData(rawData);
    expect(result.history[0].gpName).toBe('');
    expect(result.history[0].results.first).toBe('');
    expect(result.history[0].userPredictions).toEqual({});
  });

  it('should resolve selected meeting from calendar', () => {
    const calendar = [
      { meetingKey: 'race1', meetingName: 'Race 1', grandPrixTitle: 'GP 1' },
      { meetingKey: 'race2', meetingName: 'Race 2', grandPrixTitle: 'GP 2' }
    ];
    const rawData = {
      selectedMeetingKey: 'race2'
    };
    const result = sanitizeAppData(rawData, calendar);
    expect(result.selectedMeetingKey).toBe('race2');
    expect(result.gpName).toBe('GP 2');
  });

  it('should fallback to next upcoming meeting if selected key is invalid', () => {
    const calendar = [
      { meetingKey: 'past', endDate: '2000-01-01' },
      { meetingKey: 'future', endDate: '2099-01-01' }
    ];
    const rawData = {
      selectedMeetingKey: 'invalid'
    };
    const result = sanitizeAppData(rawData, calendar);
    expect(result.selectedMeetingKey).toBe('future');
  });

  it('should sanitize raceResults correctly', () => {
    const rawData = {
      raceResults: { first: 'VER', second: 123 } // 123 is not a string
    };
    const result = sanitizeAppData(rawData);
    expect(result.raceResults.first).toBe('VER');
    expect(result.raceResults.second).toBe('');
  });

  it('should handle missing fields in input data', () => {
    const rawData = {};
    const result = sanitizeAppData(rawData);
    expect(result.users).toHaveLength(3);
    expect(result.history).toEqual([]);
    expect(result.gpName).toBeDefined();
  });

  it('should normalize meeting names correctly for resolution', () => {
    // This indirectly tests normalizeMeetingName via resolveSelectedMeeting
    const calendar = [
      { meetingKey: 'italy', grandPrixTitle: "Gran Premio d'Italia" }
    ];
    const rawData = {
      gpName: 'gran premio d italia' // slightly different
    };
    const result = sanitizeAppData(rawData, calendar);
    expect(result.selectedMeetingKey).toBe('italy');
  });
});
