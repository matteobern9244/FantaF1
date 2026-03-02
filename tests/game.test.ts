import { describe, expect, it } from 'vitest';
import {
  buildRaceRecord,
  calculatePointsEarned,
  createEmptyPrediction,
  rebuildUsersFromHistory,
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
    const { record, updatedUsers } = buildRaceRecord(
      'Chinese Grand Prix 2026',
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
      () => '01/03/2026',
    );

    expect(record.gpName).toBe('Chinese Grand Prix 2026');
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
    const rebuiltUsers = rebuildUsersFromHistory(
      ['Player 3', 'Player 2', 'Player 1'],
      [
        {
          gpName: 'Australian Grand Prix 2026',
          meetingKey: '1279',
          date: '01/03/2026',
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
          gpName: 'Chinese Grand Prix 2026',
          meetingKey: '1280',
          date: '15/03/2026',
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

  it('validates predictions correctly allowing all empty or all filled', () => {
    const predictionFields: ('first' | 'second' | 'third' | 'pole')[] = ['first', 'second', 'third', 'pole'];

    const user1AllEmpty = { name: 'User1', points: 0, predictions: createEmptyPrediction() };
    const user2AllEmpty = { name: 'User2', points: 0, predictions: createEmptyPrediction() };
    
    // All completely empty should be valid (returns true)
    expect(validatePredictions([user1AllEmpty, user2AllEmpty], predictionFields)).toBe(true);

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

    // All completely filled should be valid (returns true)
    expect(validatePredictions([user1AllFilled, user2AllFilled], predictionFields)).toBe(true);

    const user1Partial = {
      name: 'User1',
      points: 0,
      predictions: { first: 'ver', second: '', third: '', pole: '' },
    };

    // Partially filled overall (1 partially filled user + 1 empty user) should be invalid (returns false)
    expect(validatePredictions([user1Partial, user2AllEmpty], predictionFields)).toBe(false);

    // Partially filled overall (1 completely filled user + 1 empty user) should be invalid (returns false)
    expect(validatePredictions([user1AllFilled, user2AllEmpty], predictionFields)).toBe(false);
  });
});
