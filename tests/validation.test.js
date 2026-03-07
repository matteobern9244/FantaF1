import { describe, it, expect } from 'vitest';
import {
  validateParticipants,
  resolveParticipantRoster,
  isRaceLocked,
  validatePredictions,
} from '../backend/validation.js';

describe('Validation Logic', () => {
  describe('validateParticipants', () => {
    const required = ['A', 'B', 'C'];
    
    it('should return true for the exact configured roster', () => {
      const users = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];
      expect(validateParticipants(users, required)).toBe(true);
    });

    it('should return true when the exact roster is present in a different order', () => {
      const users = [{ name: 'C' }, { name: 'A' }, { name: 'B' }];
      expect(validateParticipants(users, required)).toBe(true);
    });

    it('should return false when names do not match the configured roster', () => {
      const users = [{ name: 'X' }, { name: 'Y' }, { name: 'Z' }];
      expect(validateParticipants(users, required)).toBe(false);
    });

    it('should return false when duplicate names are provided', () => {
      const users = [{ name: 'A' }, { name: 'A' }, { name: 'C' }];
      expect(validateParticipants(users, required)).toBe(false);
    });

    it('should return false if the number of participants is incorrect', () => {
      const users = [{ name: 'A' }, { name: 'B' }];
      expect(validateParticipants(users, required)).toBe(false);
    });

    it('should return false if input is not an array', () => {
      expect(validateParticipants(null, required)).toBe(false);
    });

    it('should accept a valid unique roster when no persisted roster exists yet', () => {
      const users = [{ name: 'X' }, { name: 'Y' }, { name: 'Z' }];
      expect(validateParticipants(users, null, 3)).toBe(true);
    });

    it('should resolve a roster only when the incoming users are valid and distinct', () => {
      expect(resolveParticipantRoster([{ name: 'A' }, { name: 'B' }, { name: 'C' }], 3)).toEqual([
        'A',
        'B',
        'C',
      ]);
      expect(resolveParticipantRoster([{ name: 'A' }, { name: 'A' }, { name: 'C' }], 3)).toBeNull();
      expect(resolveParticipantRoster([{ name: 'A' }, { name: '' }, { name: 'C' }], 3)).toBeNull();
      expect(resolveParticipantRoster([{ name: 'A' }, { id: 'B' }, { name: 'C' }], 3)).toBeNull();
      expect(resolveParticipantRoster([{ name: 'A' }, { name: 'B' }], 3)).toBeNull();
    });
  });

  describe('isRaceLocked', () => {
    const currentYear = new Date().getFullYear();
    const race = {
      meetingKey: 'test',
      raceStartTime: `${currentYear}-03-03T14:00:00Z`
    };
    const oldData = { users: [{ name: 'A', predictions: { first: 'VER' } }] };
    const newDataChanged = { users: [{ name: 'A', predictions: { first: 'HAM' } }] };
    const newDataSame = { users: [{ name: 'A', predictions: { first: 'VER' } }] };

    it('should return false if race has not started', () => {
      const before = new Date(`${currentYear}-03-03T13:59:59Z`);
      expect(isRaceLocked(race, newDataChanged, oldData, before)).toBe(false);
    });

    it('should return true if race started and predictions changed', () => {
      const after = new Date(`${currentYear}-03-03T14:00:01Z`);
      expect(isRaceLocked(race, newDataChanged, oldData, after)).toBe(true);
    });

    it('should return false if race started but predictions are the same', () => {
      const after = new Date(`${currentYear}-03-03T14:00:01Z`);
      expect(isRaceLocked(race, newDataSame, oldData, after)).toBe(false);
    });

    it('should use endDate as fallback if raceStartTime is missing', () => {
      const raceNoStart = { meetingKey: 'test', endDate: `${currentYear}-03-03` };
      const after = new Date(`${currentYear}-03-03T15:00:00Z`); // 14:00 is default fallback in server.js logic?
      // Wait, in my validation.js I used: raceStartTime || (endDate ? `${endDate}T14:00:00Z` : null)
      expect(isRaceLocked(raceNoStart, newDataChanged, oldData, after)).toBe(true);
    });

    it('should return false if selectedRace is null', () => {
      expect(isRaceLocked(null, newDataChanged, oldData)).toBe(false);
    });

    it('should return false if startTimeStr is missing (no raceStartTime and no endDate)', () => {
      const raceEmpty = { meetingKey: 'test' };
      expect(isRaceLocked(raceEmpty, newDataChanged, oldData)).toBe(false);
    });

    it('should handle space instead of T in raceStartTime', () => {
      const raceSpace = { meetingKey: 'test', raceStartTime: `${currentYear}-03-03 14:00:00Z` };
      const after = new Date(`${currentYear}-03-03T14:00:01Z`);
      expect(isRaceLocked(raceSpace, newDataChanged, oldData, after)).toBe(true);
    });

    it('should return false if startTime is invalid Date', () => {
      const raceInvalid = { meetingKey: 'test', raceStartTime: 'invalid-date' };
      const after = new Date(`${currentYear}-03-03T14:00:01Z`);
      expect(isRaceLocked(raceInvalid, newDataChanged, oldData, after)).toBe(false);
    });

    it('should compare only the selected weekend predictions when per-weekend drafts are present', () => {
      const after = new Date(`${currentYear}-03-03T14:00:01Z`);
      const currentData = {
        selectedMeetingKey: 'test',
        users: [{ name: 'A', predictions: { first: 'legacy' } }],
        weekendStateByMeetingKey: {
          test: {
            userPredictions: {
              A: { first: 'VER', second: '', third: '', pole: '' },
            },
            raceResults: { first: '', second: '', third: '', pole: '' },
          },
          other: {
            userPredictions: {
              A: { first: 'NOR', second: '', third: '', pole: '' },
            },
            raceResults: { first: '', second: '', third: '', pole: '' },
          },
        },
      };
      const newData = {
        selectedMeetingKey: 'test',
        users: [{ name: 'A', predictions: { first: 'legacy' } }],
        weekendStateByMeetingKey: {
          test: {
            userPredictions: {
              A: { first: 'HAM', second: '', third: '', pole: '' },
            },
            raceResults: { first: '', second: '', third: '', pole: '' },
          },
          other: {
            userPredictions: {
              A: { first: 'NOR', second: '', third: '', pole: '' },
            },
            raceResults: { first: '', second: '', third: '', pole: '' },
          },
        },
      };

      expect(isRaceLocked(race, newData, currentData, after)).toBe(true);
    });

    it('should fall back to the current data selectedMeetingKey when the new payload omits it', () => {
      const after = new Date(`${currentYear}-03-03T14:00:01Z`);
      const currentData = {
        selectedMeetingKey: 'test',
        users: [{ name: 'A', predictions: { first: '' } }],
        weekendStateByMeetingKey: {
          test: {
            userPredictions: {
              A: { first: 'VER', second: '', third: '', pole: '' },
            },
            raceResults: { first: '', second: '', third: '', pole: '' },
          },
        },
      };
      const newData = {
        users: [{ name: 'A', predictions: { first: '' } }],
        weekendStateByMeetingKey: {
          test: {
            userPredictions: {
              A: { first: 'HAM', second: '', third: '', pole: '' },
            },
            raceResults: { first: '', second: '', third: '', pole: '' },
          },
        },
      };

      expect(isRaceLocked(race, newData, currentData, after)).toBe(true);
    });

    it('should fall back to the race meetingKey when no selectedMeetingKey is present in either payload', () => {
      const after = new Date(`${currentYear}-03-03T14:00:01Z`);
      const currentData = {
        users: [{ name: 'A', predictions: {} }],
        weekendStateByMeetingKey: {
          test: {
            userPredictions: {
              A: { first: 'VER', second: '', third: '', pole: '' },
            },
            raceResults: { first: '', second: '', third: '', pole: '' },
          },
        },
      };
      const newData = {
        users: [{ name: 'A', predictions: {} }],
        weekendStateByMeetingKey: {
          test: {
            userPredictions: {
              A: { first: 'HAM', second: '', third: '', pole: '' },
            },
            raceResults: { first: '', second: '', third: '', pole: '' },
          },
        },
      };

      expect(isRaceLocked(race, newData, currentData, after)).toBe(true);
    });

    it('should handle payloads without users by reading the selected weekend map only', () => {
      const after = new Date(`${currentYear}-03-03T14:00:01Z`);
      const currentData = {
        weekendStateByMeetingKey: {
          test: {
            userPredictions: {
              A: { first: 'VER', second: '', third: '', pole: '' },
            },
            raceResults: { first: '', second: '', third: '', pole: '' },
          },
        },
      };
      const newData = {
        weekendStateByMeetingKey: {
          test: {
            userPredictions: {
              A: { first: 'HAM', second: '', third: '', pole: '' },
            },
            raceResults: { first: '', second: '', third: '', pole: '' },
          },
        },
      };

      expect(isRaceLocked(race, newData, currentData, after)).toBe(false);
    });
  });

  describe('validatePredictions', () => {
    const fields = ['first', 'second', 'third', 'pole'];

    it('should return true if all fields are filled for all users', () => {
      const users = [
        { predictions: { first: 'A', second: 'B', third: 'C', pole: 'D' } },
        { predictions: { first: 'X', second: 'Y', third: 'Z', pole: 'W' } }
      ];
      expect(validatePredictions(users, fields)).toBe(true);
    });

    it('should return false if all fields are empty for all users', () => {
      const users = [
        { predictions: { first: '', second: '', third: '', pole: '' } },
        { predictions: { first: '', second: '', third: '', pole: '' } }
      ];
      expect(validatePredictions(users, fields)).toBe(false);
    });

    it('should return true if some fields are filled and others are not', () => {
      const users = [
        { predictions: { first: 'A', second: 'B', third: 'C', pole: 'D' } },
        { predictions: { first: 'X', second: '', third: '', pole: '' } }
      ];
      expect(validatePredictions(users, fields)).toBe(true);
    });

    it('should return true if one user is completely empty but another is partially filled', () => {
       const users = [
        { predictions: { first: '', second: '', third: '', pole: '' } },
        { predictions: { first: 'X', second: '', third: '', pole: '' } }
      ];
      expect(validatePredictions(users, fields)).toBe(true);
    });

    it('should return true if one user is completely filled but another is partially filled', () => {
       const users = [
        { predictions: { first: 'A', second: 'B', third: 'C', pole: 'D' } },
        { predictions: { first: 'X', second: '', third: '', pole: '' } }
      ];
      expect(validatePredictions(users, fields)).toBe(true);
    });

    it('should return true if one user is completely filled but another is completely empty', () => {
       const users = [
        { predictions: { first: 'A', second: 'B', third: 'C', pole: 'D' } },
        { predictions: { first: '', second: '', third: '', pole: '' } }
      ];
      expect(validatePredictions(users, fields)).toBe(true);
    });

    it('should ignore whitespace-only values when checking if at least one prediction exists', () => {
      const users = [
        { predictions: { first: '   ', second: '', third: '', pole: '' } },
        { predictions: { first: '', second: '', third: '', pole: '' } }
      ];

      expect(validatePredictions(users, fields)).toBe(false);
    });

    it('should return false for invalid input', () => {
      expect(validatePredictions(null, fields)).toBe(false);
    });

    it('should treat non-string prediction fields as empty', () => {
      const users = [
        { predictions: { first: 42, second: null, third: undefined, pole: '' } },
      ];

      expect(validatePredictions(users, fields)).toBe(false);
    });

    it('should validate only the selected weekend entry when a weekend map is present', () => {
      const users = [{ name: 'A', predictions: { first: '', second: '', third: '', pole: '' } }];
      const weekendStateByMeetingKey = {
        'race-1': {
          userPredictions: {
            A: { first: '', second: '', third: '', pole: '' },
          },
          raceResults: { first: '', second: '', third: '', pole: '' },
        },
        'race-2': {
          userPredictions: {
            A: { first: 'VER', second: '', third: '', pole: '' },
          },
          raceResults: { first: '', second: '', third: '', pole: '' },
        },
      };

      expect(validatePredictions(users, fields, weekendStateByMeetingKey, 'race-1')).toBe(false);
      expect(validatePredictions(users, fields, weekendStateByMeetingKey, 'race-2')).toBe(true);
    });
  });
});
