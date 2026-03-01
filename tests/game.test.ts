import { describe, expect, it } from 'vitest';
import {
  buildRaceRecord,
  calculatePointsEarned,
  createEmptyPrediction,
  rebuildUsersFromHistory,
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
          name: 'Matteo',
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
    expect(record.userPredictions.Matteo.pointsEarned).toBe(11);
    expect(updatedUsers[0]).toEqual({
      name: 'Matteo',
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
      ['Adriano', 'Fabio', 'Matteo'],
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
            Adriano: {
              prediction: {
                first: 'nor',
                second: 'ant',
                third: 'bea',
                pole: 'ham',
              },
              pointsEarned: 8,
            },
            Fabio: {
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
            Adriano: {
              prediction: createEmptyPrediction(),
              pointsEarned: 2,
            },
            Matteo: {
              prediction: createEmptyPrediction(),
              pointsEarned: 5,
            },
          },
        },
      ],
    );

    expect(rebuiltUsers).toEqual([
      {
        name: 'Adriano',
        predictions: createEmptyPrediction(),
        points: 10,
      },
      {
        name: 'Fabio',
        predictions: createEmptyPrediction(),
        points: 0,
      },
      {
        name: 'Matteo',
        predictions: createEmptyPrediction(),
        points: 5,
      },
    ]);
  });
});
