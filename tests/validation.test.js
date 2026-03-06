import { describe, it, expect } from 'vitest';
import { validateParticipants, isRaceLocked, validatePredictions } from '../backend/validation.js';

describe('Validation Logic', () => {
  describe('validateParticipants', () => {
    const required = ['A', 'B', 'C'];
    
    it('should return true for correct number of participants', () => {
      const users = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];
      expect(validateParticipants(users, required)).toBe(true);
    });

    it('should return true even if names are different but count is the same', () => {
      const users = [{ name: 'X' }, { name: 'Y' }, { name: 'Z' }];
      expect(validateParticipants(users, required)).toBe(true);
    });

    it('should return false if the number of participants is incorrect', () => {
      const users = [{ name: 'A' }, { name: 'B' }];
      expect(validateParticipants(users, required)).toBe(false);
    });

    it('should return false if input is not an array', () => {
      expect(validateParticipants(null, required)).toBe(false);
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
  });
});
