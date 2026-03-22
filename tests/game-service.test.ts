import { describe, expect, it } from 'vitest';
import { PredictionScoringService, PredictionValidationService, RaceHistoryService } from '../src/utils/gameService';

describe('game services', () => {
  it('scores, sorts, and merges predictions through dedicated services', () => {
    const scoringService = new PredictionScoringService();
    const historyService = new RaceHistoryService({ scoringService });

    expect(
      scoringService.calculatePointsBreakdown(
        { first: 'VER ', second: 'nor', third: 'lec', pole: 'pia' },
        { first: 'ver', second: 'ham', third: 'lec', pole: 'pia' },
        { first: 5, second: 3, third: 2, pole: 1 },
      ),
    ).toEqual({ basePoints: 8, totalPoints: 8 });

    expect(
      scoringService.sortUsersByLiveTotal(
        [
          { name: 'A', points: 1, predictions: { first: 'ver', second: '', third: '', pole: '' } },
          { name: 'B', points: 5, predictions: { first: '', second: '', third: '', pole: '' } },
        ],
        { first: 'ver', second: '', third: '', pole: '' },
        { first: 5, second: 3, third: 2, pole: 1 },
      ).map((user) => user.name),
    ).toEqual(['A', 'B']);

    expect(
      historyService.mergeMissingPredictionFields(
        { first: '', second: 'ham', third: '', pole: '' },
        { first: 'ver', second: 'nor', third: 'lec', pole: 'pia' },
      ),
    ).toEqual({ first: 'ver', second: 'ham', third: 'lec', pole: 'pia' });
  });

  it('rebuilds users and validates predictions through dedicated services', () => {
    const historyService = new RaceHistoryService();
    const validationService = new PredictionValidationService();

    expect(
      historyService.rebuildUsersFromHistory(['Player 1'], [
        {
          gpName: 'Race 1',
          meetingKey: 'race-1',
          date: '01/01/2099',
          results: historyService.createEmptyPrediction(),
          userPredictions: {
            'Player 1': {
              prediction: historyService.createEmptyPrediction(),
              pointsEarned: 9,
            },
          },
        },
      ]),
    ).toEqual([
      {
        name: 'Player 1',
        predictions: historyService.createEmptyPrediction(),
        points: 9,
      },
    ]);

    expect(
      validationService.validatePredictions(
        [{ name: 'A', points: 0, predictions: { first: 'ver', second: '', third: '', pole: '' } }],
        ['first', 'second', 'third', 'pole'],
      ),
    ).toBe(true);
    expect(validationService.validatePredictions(null as never, ['first'] as never)).toBe(false);
  });

  it('covers scoring wrappers and race history helper branches', () => {
    const scoringService = new PredictionScoringService();
    const historyService = new RaceHistoryService({ scoringService });

    expect(scoringService.normalizePredictionValue('  VER ')).toBe('ver');

    expect(
      scoringService.calculateProjectedPoints(
        { first: 'ver', second: '', third: '', pole: '' },
        { first: 'ver', second: '', third: '', pole: '' },
        { first: 5, second: 3, third: 2, pole: 1 },
      ),
    ).toBe(5);
    expect(
      scoringService.calculateLiveTotal(
        { name: 'A', points: 7, predictions: { first: 'ver', second: '', third: '', pole: '' } },
        { first: 'ver', second: '', third: '', pole: '' },
        { first: 5, second: 3, third: 2, pole: 1 },
      ),
    ).toBe(12);

    expect(historyService.createInitialUsers(2)).toEqual([
      { name: 'Player 1', predictions: historyService.createEmptyPrediction(), points: 0 },
      { name: 'Player 2', predictions: historyService.createEmptyPrediction(), points: 0 },
    ]);
    expect(historyService.createInitialUsers(['Ana', 'Bea']).map((user) => user.name)).toEqual(['Ana', 'Bea']);

    const unchangedPrediction = { first: 'ver', second: '', third: '', pole: '' };
    expect(
      historyService.mergeMissingPredictionFields(unchangedPrediction, {
        first: 'ham',
        second: '',
        third: '',
        pole: '',
      }),
    ).toBe(unchangedPrediction);

    const { record, updatedUsers } = historyService.buildRaceRecord(
      'Australia',
      'race-1',
      { first: 'ver', second: '', third: '', pole: '' },
      [{ name: 'A', points: 1, predictions: { first: 'ver', second: '', third: '', pole: '' } }],
      { first: 5, second: 3, third: 2, pole: 1 },
      () => 'generated-date',
      '  ',
    );

    expect(record.date).toBe('generated-date');
    expect(updatedUsers[0].points).toBe(6);

    const persistedRecord = historyService.buildRaceRecord(
      'Australia',
      'race-2',
      { first: '', second: '', third: '', pole: '' },
      [],
      { first: 5, second: 3, third: 2, pole: 1 },
      () => 'generated-date',
      '2026-03-13',
    );

    expect(persistedRecord.record.date).toBe('2026-03-13');
  });
});
