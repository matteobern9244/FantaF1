import { describe, expect, it } from 'vitest';
import type { AppData, UserData, WeekendStateByMeetingKey } from '../src/types';
import { createEmptyPrediction } from '../src/utils/game';
import {
  buildWeekendPredictionState,
  createEmptyWeekendPredictionState,
  getWeekendPredictionState,
  hydrateAppDataForWeekend,
  hydrateUsersForWeekend,
  normalizeWeekendStateByMeetingKey,
  upsertWeekendPredictionState,
  upsertWeekendRaceResults,
} from '../src/utils/weekendState';

function createUsers(): UserData[] {
  return [
    {
      name: 'Player 1',
      points: 10,
      predictions: { first: 'ver', second: '', third: '', pole: '' },
    },
    {
      name: 'Player 2',
      points: 8,
      predictions: { first: 'ham', second: '', third: '', pole: '' },
    },
    {
      name: 'Player 3',
      points: 6,
      predictions: createEmptyPrediction(),
    },
  ];
}

describe('weekendState utils', () => {
  it('creates an empty weekend state', () => {
    expect(createEmptyWeekendPredictionState()).toEqual({
      userPredictions: {},
      raceResults: createEmptyPrediction(),
    });
  });

  it('normalizes missing or malformed weekend state maps', () => {
    const normalized = normalizeWeekendStateByMeetingKey({
      ' ': {
        userPredictions: {
          'Player 1': { first: 'ver' },
        },
      },
      'race-1': {
        userPredictions: {
          'Player 1': { first: 'ver' },
        },
        raceResults: { pole: 'nor' },
      },
    } as unknown as WeekendStateByMeetingKey);

    expect(normalized).toEqual({
      'race-1': {
        userPredictions: {
          'Player 1': { first: 'ver', second: '', third: '', pole: '' },
        },
        raceResults: { first: '', second: '', third: '', pole: 'nor' },
      },
    });
  });

  it('builds and upserts the selected weekend state', () => {
    const users = createUsers();
    const weekendState = buildWeekendPredictionState(users, {
      first: 'ver',
      second: 'nor',
      third: 'lec',
      pole: 'pia',
    });

    expect(weekendState.userPredictions['Player 1'].first).toBe('ver');
    expect(weekendState.raceResults.second).toBe('nor');

    expect(
      upsertWeekendPredictionState({}, 'race-1', users, createEmptyPrediction()),
    ).toEqual({
      'race-1': {
        userPredictions: {
          'Player 1': { first: 'ver', second: '', third: '', pole: '' },
          'Player 2': { first: 'ham', second: '', third: '', pole: '' },
          'Player 3': createEmptyPrediction(),
        },
        raceResults: createEmptyPrediction(),
      },
    });
  });

  it('updates race results without losing user predictions', () => {
    const users = createUsers();
    const initialState = upsertWeekendPredictionState({}, 'race-1', users, createEmptyPrediction());
    const updatedState = upsertWeekendRaceResults(initialState, 'race-1', {
      first: '',
      second: '',
      third: '',
      pole: 'pia',
    });

    expect(updatedState['race-1'].userPredictions['Player 1'].first).toBe('ver');
    expect(updatedState['race-1'].raceResults.pole).toBe('pia');
    expect(upsertWeekendRaceResults(initialState, '', createEmptyPrediction())).toEqual(initialState);
  });

  it('hydrates users and app data from the selected weekend state', () => {
    const users = createUsers().map((user) => ({
      ...user,
      predictions: createEmptyPrediction(),
    }));
    const weekendStateByMeetingKey = {
      'race-1': {
        userPredictions: {
          'Player 1': { first: 'ver', second: '', third: '', pole: '' },
          'Player 2': { first: 'ham', second: '', third: '', pole: '' },
          'Player 3': createEmptyPrediction(),
        },
        raceResults: { first: '', second: '', third: '', pole: 'nor' },
      },
    };

    expect(hydrateUsersForWeekend(users, weekendStateByMeetingKey['race-1'])[0].predictions.first).toBe(
      'ver',
    );

    const appData: AppData = {
      users,
      history: [],
      gpName: 'Race 1',
      raceResults: createEmptyPrediction(),
      selectedMeetingKey: 'race-1',
      weekendStateByMeetingKey,
    };

    const hydrated = hydrateAppDataForWeekend(appData, 'race-1');

    expect(hydrated.users[1].predictions.first).toBe('ham');
    expect(hydrated.raceResults.pole).toBe('nor');
    expect(hydrated.weekendStateByMeetingKey?.['race-1'].raceResults.pole).toBe('nor');
  });

  it('returns an empty draft for unknown or blank meetings', () => {
    expect(getWeekendPredictionState({}, '')).toEqual(createEmptyWeekendPredictionState());
    expect(getWeekendPredictionState({}, 'missing')).toEqual(createEmptyWeekendPredictionState());
  });
});
