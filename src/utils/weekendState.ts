import type {
  AppData,
  Prediction,
  UserData,
  WeekendPredictionState,
  WeekendStateByMeetingKey,
} from '../types';
import { createEmptyPrediction } from './game';

function clonePrediction(prediction?: Partial<Prediction> | null): Prediction {
  return {
    first: typeof prediction?.first === 'string' ? prediction.first : '',
    second: typeof prediction?.second === 'string' ? prediction.second : '',
    third: typeof prediction?.third === 'string' ? prediction.third : '',
    pole: typeof prediction?.pole === 'string' ? prediction.pole : '',
  };
}

function createEmptyWeekendPredictionState(): WeekendPredictionState {
  return {
    userPredictions: {},
    raceResults: createEmptyPrediction(),
  };
}

function cloneWeekendPredictionState(
  weekendState?: Partial<WeekendPredictionState> | null,
): WeekendPredictionState {
  const entries = Object.entries(weekendState?.userPredictions ?? {}).map(([userName, prediction]) => [
    userName,
    clonePrediction(prediction),
  ]);

  return {
    userPredictions: Object.fromEntries(entries),
    raceResults: clonePrediction(weekendState?.raceResults),
  };
}

function normalizeWeekendStateByMeetingKey(
  weekendStateByMeetingKey?: AppData['weekendStateByMeetingKey'],
): WeekendStateByMeetingKey {
  if (!weekendStateByMeetingKey) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(weekendStateByMeetingKey)
      .filter(([meetingKey]) => typeof meetingKey === 'string' && meetingKey.trim())
      .map(([meetingKey, weekendState]) => [meetingKey, cloneWeekendPredictionState(weekendState)]),
  );
}

function buildWeekendPredictionState(
  users: UserData[],
  raceResults: Prediction,
): WeekendPredictionState {
  return {
    userPredictions: Object.fromEntries(
      users.map((user) => [user.name, clonePrediction(user.predictions)]),
    ),
    raceResults: clonePrediction(raceResults),
  };
}

function upsertWeekendPredictionState(
  weekendStateByMeetingKey: WeekendStateByMeetingKey,
  meetingKey: string,
  users: UserData[],
  raceResults: Prediction,
): WeekendStateByMeetingKey {
  if (!meetingKey.trim()) {
    return normalizeWeekendStateByMeetingKey(weekendStateByMeetingKey);
  }

  return {
    ...normalizeWeekendStateByMeetingKey(weekendStateByMeetingKey),
    [meetingKey]: buildWeekendPredictionState(
      users,
      raceResults,
    ),
  };
}

function upsertWeekendRaceResults(
  weekendStateByMeetingKey: WeekendStateByMeetingKey,
  meetingKey: string,
  raceResults: Prediction,
): WeekendStateByMeetingKey {
  if (!meetingKey.trim()) {
    return normalizeWeekendStateByMeetingKey(weekendStateByMeetingKey);
  }

  const currentWeekendState = getWeekendPredictionState(weekendStateByMeetingKey, meetingKey);

  return {
      ...normalizeWeekendStateByMeetingKey(weekendStateByMeetingKey),
      [meetingKey]: {
        userPredictions: currentWeekendState.userPredictions,
        raceResults: clonePrediction(raceResults),
      },
    };
}

function getWeekendPredictionState(
  weekendStateByMeetingKey: WeekendStateByMeetingKey,
  meetingKey: string,
): WeekendPredictionState {
  if (!meetingKey.trim()) {
    return createEmptyWeekendPredictionState();
  }

  return cloneWeekendPredictionState(weekendStateByMeetingKey[meetingKey]);
}

function hydrateUsersForWeekend(users: UserData[], weekendState: WeekendPredictionState): UserData[] {
  return users.map((user) => ({
    ...user,
    predictions: clonePrediction(weekendState.userPredictions[user.name]),
  }));
}

function hydrateAppDataForWeekend(
  appData: AppData,
  meetingKey: string,
): AppData {
  const normalizedWeekendStateByMeetingKey = normalizeWeekendStateByMeetingKey(
    appData.weekendStateByMeetingKey,
  );
  const selectedWeekendState = getWeekendPredictionState(normalizedWeekendStateByMeetingKey, meetingKey);

  return {
    ...appData,
    users: hydrateUsersForWeekend(appData.users, selectedWeekendState),
    raceResults: clonePrediction(selectedWeekendState.raceResults),
    weekendStateByMeetingKey: normalizedWeekendStateByMeetingKey,
  };
}

export {
  buildWeekendPredictionState,
  clonePrediction,
  createEmptyWeekendPredictionState,
  getWeekendPredictionState,
  hydrateAppDataForWeekend,
  hydrateUsersForWeekend,
  normalizeWeekendStateByMeetingKey,
  upsertWeekendRaceResults,
  upsertWeekendPredictionState,
};
