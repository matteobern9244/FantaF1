import { describe, expect, it } from 'vitest';
import {
  buildRaceRecord,
  calculatePointsEarned,
  calculateProjectedPoints,
  calculateLiveTotal,
  createEmptyPrediction,
  mergeMissingPredictionFields,
  rebuildUsersFromHistory,
  sortUsersByLiveTotal,
  validatePredictions,
} from '../src/utils/game';

describe('game utils', () => {
  it('calculates points with the shared scoring function', () => {
    const prediction = {
      first: 'ver',
      second: 'nor',
      third: 'lec',
      pole: 'pia',
    };
    const raceResults = {
      first: 'ver',
      second: 'ham',
      third: 'lec',
      pole: 'pia',
    };

    const points = calculatePointsEarned(prediction, raceResults, {
      first: 5,
      second: 3,
      third: 2,
      pole: 1,
    });

    expect(points).toBe(8);
  });

  it('builds a race record and updates total points', () => {
    const currentYear = new Date().getFullYear();
    const { record, updatedUsers } = buildRaceRecord(
      `Chinese Grand Prix ${currentYear}`,
      '1280',
      {
        first: 'ver',
        second: 'nor',
        third: 'lec',
        pole: 'pia',
      },
      [
        {
          name: 'Player 1',
          predictions: {
            first: 'ver',
            second: 'nor',
            third: 'lec',
            pole: 'pia',
          },
          points: 5,
        },
      ],
      {
        first: 5,
        second: 3,
        third: 2,
        pole: 1,
      },
      () => `01/03/${currentYear}`,
    );

    expect(record.gpName).toBe(`Chinese Grand Prix ${currentYear}`);
    expect(record.meetingKey).toBe('1280');
    expect(record.results).toEqual({
      first: 'ver',
      second: 'nor',
      third: 'lec',
      pole: 'pia',
    });
    expect(record.userPredictions['Player 1'].pointsEarned).toBe(11);
    expect(updatedUsers[0]).toEqual({
      name: 'Player 1',
      predictions: {
        first: 'ver',
        second: 'nor',
        third: 'lec',
        pole: 'pia',
      },
      points: 16,
    });
    expect(createEmptyPrediction()).toEqual({
      first: '',
      second: '',
      third: '',
      pole: '',
    });
  });

  it('rebuilds total points from race history and resets current predictions', () => {
    const currentYear = new Date().getFullYear();
    const rebuiltUsers = rebuildUsersFromHistory(
      ['Player 3', 'Player 2', 'Player 1'],
      [
        {
          gpName: `Australian Grand Prix ${currentYear}`,
          meetingKey: '1279',
          date: `01/03/${currentYear}`,
          results: {
            first: 'nor',
            second: 'ant',
            third: 'alo',
            pole: 'alb',
          },
          userPredictions: {
            'Player 3': {
              prediction: {
                first: 'nor',
                second: 'ant',
                third: 'bea',
                pole: 'ham',
              },
              pointsEarned: 8,
            },
            'Player 2': {
              prediction: createEmptyPrediction(),
              pointsEarned: 0,
            },
          },
        },
        {
          gpName: `Chinese Grand Prix ${currentYear}`,
          meetingKey: '1280',
          date: `15/03/${currentYear}`,
          results: createEmptyPrediction(),
          userPredictions: {
            'Player 3': {
              prediction: createEmptyPrediction(),
              pointsEarned: 2,
            },
            'Player 1': {
              prediction: createEmptyPrediction(),
              pointsEarned: 5,
            },
          },
        },
      ],
    );

    expect(rebuiltUsers).toEqual([
      {
        name: 'Player 3',
        predictions: createEmptyPrediction(),
        points: 10,
      },
      {
        name: 'Player 2',
        predictions: createEmptyPrediction(),
        points: 0,
      },
      {
        name: 'Player 1',
        predictions: createEmptyPrediction(),
        points: 5,
      },
    ]);
  });

  it('validates predictions correctly when at least one prediction is filled', () => {
    const predictionFields: ('first' | 'second' | 'third' | 'pole')[] = ['first', 'second', 'third', 'pole'];

    const user1AllEmpty = { name: 'User1', points: 0, predictions: createEmptyPrediction() };
    const user2AllEmpty = { name: 'User2', points: 0, predictions: createEmptyPrediction() };
    
    // All completely empty should be INVALID (returns false)
    expect(validatePredictions([user1AllEmpty, user2AllEmpty], predictionFields)).toBe(false);

    const user1AllFilled = {
      name: 'User1',
      points: 0,
      predictions: { first: 'ver', second: 'nor', third: 'lec', pole: 'pia' },
    };
    const user2AllFilled = {
      name: 'User2',
      points: 0,
      predictions: { first: 'ham', second: 'rus', third: 'alo', pole: 'ver' },
    };

    // All completely filled should be VALID (returns true)
    expect(validatePredictions([user1AllFilled, user2AllFilled], predictionFields)).toBe(true);

    const user1Partial = {
      name: 'User1',
      points: 0,
      predictions: { first: 'ver', second: '', third: '', pole: '' },
    };

    // Partially filled overall (1 partially filled user + 1 empty user) should be VALID (returns true)
    expect(validatePredictions([user1Partial, user2AllEmpty], predictionFields)).toBe(true);

    // Partially filled overall (1 completely filled user + 1 empty user) should be VALID (returns true)
    expect(validatePredictions([user1AllFilled, user2AllEmpty], predictionFields)).toBe(true);

    const userWhitespaceOnly = {
      name: 'User3',
      points: 0,
      predictions: { first: '   ', second: '', third: '', pole: '' },
    };

    // Whitespace-only values should still be treated as empty
    expect(validatePredictions([userWhitespaceOnly, user2AllEmpty], predictionFields)).toBe(false);
  });

  it('rejects invalid inputs and non-string prediction values', () => {
    const predictionFields: ('first' | 'second' | 'third' | 'pole')[] = ['first', 'second', 'third', 'pole'];

    expect(validatePredictions(null as unknown as never[], predictionFields)).toBe(false);
    expect(validatePredictions([], null as unknown as ('first' | 'second' | 'third' | 'pole')[])).toBe(false);

    const malformedUser = {
      name: 'Broken User',
      points: 0,
      predictions: {
        first: null,
        second: undefined,
        third: 42,
        pole: '',
      },
    };

    expect(validatePredictions([malformedUser as never], predictionFields)).toBe(false);
  });

  describe('calculatePointsEarned detailed', () => {
    const config = { first: 5, second: 3, third: 2, pole: 1 };
    const results = { first: 'A', second: 'B', third: 'C', pole: 'D' };

    it('returns 0 for no matches', () => {
      expect(calculatePointsEarned({ first: 'X', second: 'Y', third: 'Z', pole: 'W' }, results, config)).toBe(0);
    });

    it('returns points for only first', () => {
      expect(calculatePointsEarned({ first: 'A', second: 'Y', third: 'Z', pole: 'W' }, results, config)).toBe(5);
    });

    it('returns points for only second', () => {
      expect(calculatePointsEarned({ first: 'X', second: 'B', third: 'Z', pole: 'W' }, results, config)).toBe(3);
    });

    it('returns points for only third', () => {
      expect(calculatePointsEarned({ first: 'X', second: 'Y', third: 'C', pole: 'W' }, results, config)).toBe(2);
    });

    it('returns points for only pole', () => {
      expect(calculatePointsEarned({ first: 'X', second: 'Y', third: 'Z', pole: 'D' }, results, config)).toBe(1);
    });

    it('returns maximum points for all matches', () => {
      expect(calculatePointsEarned(results, results, config)).toBe(11);
    });

    it('normalizes case and whitespace before comparing predictions and results', () => {
      expect(
        calculatePointsEarned(
          { first: ' a ', second: 'B ', third: ' c', pole: ' d ' },
          results,
          config,
        ),
      ).toBe(11);
    });

    it('treats nullish prediction and result fields as empty strings', () => {
      expect(
        calculatePointsEarned(
          {
            first: null as unknown as string,
            second: undefined as unknown as string,
            third: ' C ',
            pole: ' D ',
          },
          {
            first: 'A',
            second: undefined as unknown as string,
            third: 'c',
            pole: 'd',
          },
          config,
        ),
      ).toBe(3);
    });
  });

  describe('live scoring helpers', () => {
    const config = { first: 5, second: 3, third: 2, pole: 1 };
    const results = { first: 'ver', second: 'ham', third: 'lec', pole: 'pia' };

    it('calculates projected points with the shared scoring helper', () => {
      expect(
        calculateProjectedPoints(
          { first: 'ver', second: 'nor', third: 'lec', pole: 'pia' },
          results,
          config,
        ),
      ).toBe(8);
    });

    it('builds the live total as current points plus projection', () => {
      expect(
        calculateLiveTotal(
          {
            name: 'Player 1',
            points: 10,
            predictions: { first: 'ver', second: 'nor', third: 'lec', pole: 'pia' },
          },
          results,
          config,
        ),
      ).toBe(18);
    });

    it('sorts users by live total using the shared comparison logic', () => {
      const sortedUsers = sortUsersByLiveTotal(
        [
          {
            name: 'Player 1',
            points: 10,
            predictions: { first: 'ver', second: 'nor', third: 'lec', pole: 'pia' },
          },
          {
            name: 'Player 2',
            points: 6,
            predictions: { first: 'ver', second: 'ham', third: 'lec', pole: 'pia' },
          },
          {
            name: 'Player 3',
            points: 12,
            predictions: { first: 'ham', second: 'nor', third: 'lec', pole: 'ver' },
          },
        ],
        results,
        config,
      );

      expect(sortedUsers.map((user) => user.name)).toEqual(['Player 1', 'Player 2', 'Player 3']);
    });

    it('merges fetched results without overwriting manually filled values', () => {
      expect(
        mergeMissingPredictionFields(
          { first: 'ham', second: '', third: '', pole: '' },
          { first: 'ver', second: 'nor', third: 'lec', pole: 'pia' },
        ),
      ).toEqual({
        first: 'ham',
        second: 'nor',
        third: 'lec',
        pole: 'pia',
      });
    });
  });

  describe('rebuildUsersFromHistory edge cases', () => {
    it('handles empty history', () => {
      const users = rebuildUsersFromHistory(['A', 'B'], []);
      expect(users).toHaveLength(2);
      expect(users[0].points).toBe(0);
    });

    it('handles history with missing user entries', () => {
      const history: RaceRecord[] = [{
        gpName: 'GP',
        meetingKey: 'key',
        date: 'now',
        results: createEmptyPrediction(),
        userPredictions: { 'A': { prediction: createEmptyPrediction(), pointsEarned: 10 } }
      }];
      const users = rebuildUsersFromHistory(['A', 'B'], history);
      expect(users.find(u => u.name === 'A')?.points).toBe(10);
      expect(users.find(u => u.name === 'B')?.points).toBe(0);
    });
  });

  describe('buildRaceRecord edge cases', () => {
    it('uses existing date if provided', () => {
      const { record } = buildRaceRecord('GP', 'key', createEmptyPrediction(), [], { first: 0, second: 0, third: 0, pole: 0 }, () => 'now', 'yesterday');
      expect(record.date).toBe('yesterday');
    });

    it('uses formatter if existing date is empty', () => {
      const { record } = buildRaceRecord('GP', 'key', createEmptyPrediction(), [], { first: 0, second: 0, third: 0, pole: 0 }, () => 'now', ' ');
      expect(record.date).toBe('now');
    });
  });
});
