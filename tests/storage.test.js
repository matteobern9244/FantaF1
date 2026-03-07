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
    expect(sanitized.weekendStateByMeetingKey['1280']).toEqual({
      userPredictions: {
        'TestUser 3': {
          first: 'ver',
          second: 'nor',
          third: 'lec',
          pole: 'pia',
        },
        'TestUser 2': {
          first: 'ham',
          second: '',
          third: '',
          pole: '',
        },
        'TestUser 1': {
          first: '',
          second: '',
          third: '',
          pole: '',
        },
      },
      raceResults: {
        first: 'ver',
        second: '',
        third: '',
        pole: '',
      },
      weekendBoostByUser: {
        'TestUser 3': 'none',
        'TestUser 2': 'none',
        'TestUser 1': 'none',
      },
      weekendBoostLockedByUser: {
        'TestUser 3': false,
        'TestUser 2': false,
        'TestUser 1': false,
      },
    });
    expect(sanitized).not.toHaveProperty('drivers');
    expect(sanitized).not.toHaveProperty('calendar');
  });

  it('preserves the incoming order when no persisted roster exists yet', () => {
    const currentYear = new Date().getFullYear();
    const sanitized = sanitizeAppData(
      {
        users: [
          { name: 'Player 3', predictions: { first: 'ver' }, points: 3 },
          { name: 'Player 1', predictions: { first: 'ham' }, points: 2 },
          { name: 'Player 2', predictions: { first: 'lec' }, points: 1 },
        ],
        selectedMeetingKey: '',
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

    expect(sanitized.users.map((user) => user.name)).toEqual(['Player 3', 'Player 1', 'Player 2']);
    expect(sanitized.users[0].predictions.first).toBe('ver');
    expect(sanitized.users[1].predictions.first).toBe('ham');
    expect(sanitized.users[2].predictions.first).toBe('lec');
  });

  it('preserves a valid non-placeholder roster when it is already stored in a valid order', () => {
    const sanitized = sanitizeAppData({
      users: [
        { name: 'Uno', predictions: { first: 'ver' }, points: 3 },
        { name: 'Due', predictions: { first: 'ham' }, points: 2 },
        { name: 'Tre', predictions: { first: 'lec' }, points: 1 },
      ],
    });

    expect(sanitized.users.map((user) => user.name)).toEqual(['Uno', 'Due', 'Tre']);
  });

  it('keeps the incoming order when the provided persisted roster does not match the payload users', () => {
    const sanitized = sanitizeAppData(
      {
        users: [
          { name: 'Uno', predictions: { first: 'ver' }, points: 3 },
          { name: 'Due', predictions: { first: 'ham' }, points: 2 },
          { name: 'Quattro', predictions: { first: 'lec' }, points: 1 },
        ],
      },
      [],
      {
        participantRoster: ['Uno', 'Due', 'Tre'],
      },
    );

    expect(sanitized.users.map((user) => user.name)).toEqual(['Uno', 'Due', 'Quattro']);
  });

  it('falls back to the incoming users when a provided roster cannot map a non-string user name', () => {
    const sanitized = sanitizeAppData(
      {
        users: [
          { name: 'Uno', predictions: { first: 'ver' }, points: 3 },
          { name: { raw: 'Due' }, predictions: { first: 'ham' }, points: 2 },
          { name: 'Tre', predictions: { first: 'lec' }, points: 1 },
        ],
      },
      [],
      {
        participantRoster: ['Uno', 'Due', 'Tre'],
      },
    );

    expect(sanitized.users[1].name).toEqual({ raw: 'Due' });
    expect(sanitized.users.map((user) => user.predictions.first)).toEqual(['ver', 'ham', 'lec']);
  });

  describe('internal coverage', () => {
    it('handles empty calendar in getNextUpcomingMeeting via createDefaultAppData', () => {
      const defaultData = sanitizeAppData({}, []);
      expect(defaultData.selectedMeetingKey).toBe('');
      expect(defaultData.weekendStateByMeetingKey).toEqual({});
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
