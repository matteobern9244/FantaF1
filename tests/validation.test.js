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
    const race = {
      meetingKey: 'test',
      raceStartTime: '2026-03-03T14:00:00Z'
    };
    const oldData = { users: [{ name: 'A', predictions: { first: 'VER' } }] };
    const newDataChanged = { users: [{ name: 'A', predictions: { first: 'HAM' } }] };
    const newDataSame = { users: [{ name: 'A', predictions: { first: 'VER' } }] };

    it('should return false if race has not started', () => {
      const before = new Date('2026-03-03T13:59:59Z');
      expect(isRaceLocked(race, newDataChanged, oldData, before)).toBe(false);
    });

    it('should return true if race started and predictions changed', () => {
      const after = new Date('2026-03-03T14:00:01Z');
      expect(isRaceLocked(race, newDataChanged, oldData, after)).toBe(true);
    });

    it('should return false if race started but predictions are the same', () => {
      const after = new Date('2026-03-03T14:00:01Z');
      expect(isRaceLocked(race, newDataSame, oldData, after)).toBe(false);
    });

    it('should use endDate as fallback if raceStartTime is missing', () => {
      const raceNoStart = { meetingKey: 'test', endDate: '2026-03-03' };
      const after = new Date('2026-03-03T15:00:00Z'); // 14:00 is default fallback in server.js logic?
      // Wait, in my validation.js I used: raceStartTime || (endDate ? `${endDate}T14:00:00Z` : null)
      expect(isRaceLocked(raceNoStart, newDataChanged, oldData, after)).toBe(true);
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

    it('should return true if all fields are empty for all users', () => {
      const users = [
        { predictions: { first: '', second: '', third: '', pole: '' } },
        { predictions: { first: '', second: '', third: '', pole: '' } }
      ];
      expect(validatePredictions(users, fields)).toBe(true);
    });

    it('should return false if some fields are filled and others are not', () => {
      const users = [
        { predictions: { first: 'A', second: 'B', third: 'C', pole: 'D' } },
        { predictions: { first: 'X', second: '', third: '', pole: '' } }
      ];
      expect(validatePredictions(users, fields)).toBe(false);
    });

    it('should return false if one user is completely empty but another is partially filled', () => {
       const users = [
        { predictions: { first: '', second: '', third: '', pole: '' } },
        { predictions: { first: 'X', second: '', third: '', pole: '' } }
      ];
      expect(validatePredictions(users, fields)).toBe(false);
    });

    it('should return false if one user is completely filled but another is partially filled', () => {
       const users = [
        { predictions: { first: 'A', second: 'B', third: 'C', pole: 'D' } },
        { predictions: { first: 'X', second: '', third: '', pole: '' } }
      ];
      expect(validatePredictions(users, fields)).toBe(false);
    });

    it('should return false if one user is completely filled but another is completely empty', () => {
       const users = [
        { predictions: { first: 'A', second: 'B', third: 'C', pole: 'D' } },
        { predictions: { first: '', second: '', third: '', pole: '' } }
      ];
      expect(validatePredictions(users, fields)).toBe(false);
    });

    it('should return false for invalid input', () => {
      expect(validatePredictions(null, fields)).toBe(false);
    });
  });
});
