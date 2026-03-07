import { describe, expect, it } from 'vitest';
import {
  buildWeekendStateFromUsers,
  createEmptyPrediction,
  createEmptyWeekendState,
  getSelectedWeekendState,
  hasAnyPredictionValue,
  hydrateUsersForSelectedWeekend,
  sanitizePrediction,
  sanitizeWeekendState,
  sanitizeWeekendStateByMeetingKey,
  upsertSelectedWeekendState,
} from '../backend/weekend-state.js';

function createUsers() {
  return [
    { name: 'Player 1', points: 10, predictions: { first: 'ver' } },
    { name: 'Player 2', points: 8, predictions: { first: 'ham' } },
    { name: 'Player 3', points: 6, predictions: {} },
  ];
}

describe('backend weekend state helpers', () => {
  it('sanitizes predictions and empty state', () => {
    expect(createEmptyPrediction()).toEqual({
      first: '',
      second: '',
      third: '',
      pole: '',
    });
    expect(createEmptyWeekendState()).toEqual({
      userPredictions: {},
      raceResults: createEmptyPrediction(),
      weekendBoostByUser: {},
      weekendBoostLockedByUser: {},
    });
    expect(sanitizePrediction({ first: 'ver', second: 1 })).toEqual({
      first: 'ver',
      second: '',
      third: '',
      pole: '',
    });
  });

  it('sanitizes weekend states and supports Map inputs', () => {
    expect(
      sanitizeWeekendState({
        userPredictions: new Map([['Player 1', { first: 'ver' }]]),
        raceResults: { pole: 'pia' },
      }),
    ).toEqual({
      userPredictions: {
        'Player 1': { first: 'ver', second: '', third: '', pole: '' },
      },
      raceResults: { first: '', second: '', third: '', pole: 'pia' },
      weekendBoostByUser: {},
      weekendBoostLockedByUser: {},
    });
    expect(sanitizeWeekendState({})).toEqual({
      userPredictions: {},
      raceResults: { first: '', second: '', third: '', pole: '' },
      weekendBoostByUser: {},
      weekendBoostLockedByUser: {},
    });

    expect(
      sanitizeWeekendStateByMeetingKey(
        new Map([
          [
            'race-1',
            {
              userPredictions: {
                'Player 1': { first: 'ver' },
              },
              raceResults: { pole: 'pia' },
            },
          ],
        ]),
      ),
    ).toEqual({
      'race-1': {
        userPredictions: {
          'Player 1': { first: 'ver', second: '', third: '', pole: '' },
        },
        raceResults: { first: '', second: '', third: '', pole: 'pia' },
        weekendBoostByUser: {},
        weekendBoostLockedByUser: {},
      },
    });
  });

  it('builds, upserts and retrieves the selected weekend state', () => {
    const users = createUsers();
    const builtState = buildWeekendStateFromUsers(users, { pole: 'nor' });

    expect(builtState.userPredictions['Player 1'].first).toBe('ver');
    expect(builtState.raceResults.pole).toBe('nor');

    const upserted = upsertSelectedWeekendState({}, 'race-1', users, { pole: 'nor' });

    expect(getSelectedWeekendState(upserted, 'race-1')).toEqual({
      userPredictions: {
        'Player 1': { first: 'ver', second: '', third: '', pole: '' },
        'Player 2': { first: 'ham', second: '', third: '', pole: '' },
        'Player 3': createEmptyPrediction(),
      },
      raceResults: { first: '', second: '', third: '', pole: 'nor' },
      weekendBoostByUser: {
        'Player 1': 'none',
        'Player 2': 'none',
        'Player 3': 'none',
      },
      weekendBoostLockedByUser: {
        'Player 1': false,
        'Player 2': false,
        'Player 3': false,
      },
    });
    expect(getSelectedWeekendState({}, '')).toEqual(createEmptyWeekendState());
    expect(upsertSelectedWeekendState({ race: builtState }, '', users, { pole: 'nor' })).toEqual({
      race: builtState,
    });
  });

  it('hydrates users from the selected weekend state and detects filled predictions', () => {
    const users = createUsers().map((user) => ({
      ...user,
      predictions: createEmptyPrediction(),
    }));
    const weekendState = {
      userPredictions: {
        'Player 1': { first: 'ver', second: '', third: '', pole: '' },
        'Player 2': { first: '', second: '', third: '', pole: '' },
      },
      raceResults: createEmptyPrediction(),
      weekendBoostByUser: {
        'Player 1': 'third',
      },
      weekendBoostLockedByUser: {
        'Player 1': true,
      },
    };

    expect(hydrateUsersForSelectedWeekend(users, weekendState)[0].predictions.first).toBe('ver');
    expect(hydrateUsersForSelectedWeekend(users, weekendState)[0].weekendBoost).toBe('third');
    expect(hydrateUsersForSelectedWeekend(null, weekendState)).toEqual([]);
    expect(hasAnyPredictionValue(users)).toBe(false);
    expect(hasAnyPredictionValue(createUsers())).toBe(true);
    expect(hasAnyPredictionValue(null)).toBe(false);
    expect(buildWeekendStateFromUsers(null, { pole: 'nor' })).toEqual({
      userPredictions: {},
      raceResults: { first: '', second: '', third: '', pole: 'nor' },
      weekendBoostByUser: {},
      weekendBoostLockedByUser: {},
    });
  });
});
