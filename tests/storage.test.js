import { describe, expect, it } from 'vitest';
import { sanitizeAppData, ensureDataDirectory } from '../backend/storage.js';

describe('storage sanitization', () => {
  it('keeps only expected app fields and preserves participant ordering', () => {
    const currentYear = new Date().getFullYear();
    const sanitized = sanitizeAppData(
      {
        users: [
          {
            name: 'TestUser 3',
            predictions: {
              first: 'ver',
              second: 'nor',
              third: 'lec',
              pole: 'pia',
              extra: 'ignore-me',
            },
            points: '7',
          },
          {
            name: 'TestUser 2',
            predictions: {
              first: 'ham',
            },
            points: 3,
            customField: 'remove-me',
          },
          {
            name: 'TestUser 1',
            predictions: {},
            points: 0,
          },
        ],
        gpName: 'China',
        selectedMeetingKey: '',
        raceResults: {
          first: 'ver',
        },
        history: [
          {
            gpName: 'Old GP',
            meetingKey: 'legacy-meeting',
            date: 'yesterday',
            results: { first: 'nor' },
            userPredictions: {
              'TestUser 3': {
                prediction: { first: 'nor' },
                pointsEarned: '2',
              },
            },
          },
        ],
        drivers: ['not-allowed'],
        calendar: ['not-allowed'],
      },
      [
        {
          meetingKey: '1280',
          meetingName: 'China',
          grandPrixTitle: `Chinese Grand Prix ${currentYear}`,
          roundNumber: 2,
          dateRangeLabel: '13 - 15 MAR',
          detailUrl: `https://www.formula1.com/en/racing/${currentYear}/china`,
          heroImageUrl: '',
          trackOutlineUrl: '',
          isSprintWeekend: true,
          startDate: `${currentYear}-03-13`,
          endDate: `${currentYear}-03-15`,
        },
      ],
    );

    expect(sanitized.users.map((user) => user.name)).toEqual(['TestUser 3', 'TestUser 2', 'TestUser 1']);
    expect(sanitized.users[0].points).toBe(7);
    expect(sanitized.users[1].predictions.first).toBe('ham');
    expect(sanitized.users[2].points).toBe(0);
    expect(sanitized.selectedMeetingKey).toBe('1280');
    expect(sanitized.gpName).toBe(`Chinese Grand Prix ${currentYear}`);
    expect(sanitized.raceResults).toEqual({
      first: 'ver',
      second: '',
      third: '',
      pole: '',
    });
    expect(sanitized.history[0].meetingKey).toBe('legacy-meeting');
    expect(sanitized.history[0].userPredictions['TestUser 3'].pointsEarned).toBe(2);
    expect(sanitized).not.toHaveProperty('drivers');
    expect(sanitized).not.toHaveProperty('calendar');
  });

  describe('internal coverage', () => {
    it('handles empty calendar in getNextUpcomingMeeting via createDefaultAppData', () => {
      const defaultData = sanitizeAppData({}, []);
      expect(defaultData.selectedMeetingKey).toBe('');
    });
    it('sorts calendar by round delta', () => {
      const calendar = [
        { roundNumber: 2, meetingKey: '2' },
        { roundNumber: 1, meetingKey: '1' }
      ];
      const defaultData = sanitizeAppData({}, calendar);
      expect(defaultData.selectedMeetingKey).toBe('1');
    });
    it('covers ensureDataDirectory', () => {
      expect(() => ensureDataDirectory()).not.toThrow();
    });
  });
});
