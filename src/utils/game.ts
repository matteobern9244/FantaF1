import type { PointsConfig, Prediction, RaceRecord, UserData } from '../types';

function normalizePredictionValue(value: string): string {
  return String(value ?? '').trim().toLowerCase();
}

export function createEmptyPrediction(): Prediction {
  return {
    first: '',
    second: '',
    third: '',
    pole: '',
  };
}

export function createInitialUsers(participants: string[]): UserData[] {
  return participants.map((name) => ({
    name,
    predictions: createEmptyPrediction(),
    points: 0,
  }));
}

export function rebuildUsersFromHistory(
  participants: string[],
  history: RaceRecord[],
): UserData[] {
  const users = createInitialUsers(participants);

  history.forEach((record) => {
    users.forEach((user) => {
      const entry = record.userPredictions[user.name];
      if (!entry) {
        return;
      }

      user.points += entry.pointsEarned;
    });
  });

  return users;
}

export function calculatePointsEarned(
  prediction: Prediction,
  raceResults: Prediction,
  pointsConfig: PointsConfig,
): number {
  let pointsEarned = 0;
  const normalizedPrediction = {
    first: normalizePredictionValue(prediction.first),
    second: normalizePredictionValue(prediction.second),
    third: normalizePredictionValue(prediction.third),
    pole: normalizePredictionValue(prediction.pole),
  };
  const normalizedRaceResults = {
    first: normalizePredictionValue(raceResults.first),
    second: normalizePredictionValue(raceResults.second),
    third: normalizePredictionValue(raceResults.third),
    pole: normalizePredictionValue(raceResults.pole),
  };

  if (normalizedPrediction.first === normalizedRaceResults.first && normalizedRaceResults.first) {
    pointsEarned += pointsConfig.first;
  }

  if (normalizedPrediction.second === normalizedRaceResults.second && normalizedRaceResults.second) {
    pointsEarned += pointsConfig.second;
  }

  if (normalizedPrediction.third === normalizedRaceResults.third && normalizedRaceResults.third) {
    pointsEarned += pointsConfig.third;
  }

  if (normalizedPrediction.pole === normalizedRaceResults.pole && normalizedRaceResults.pole) {
    pointsEarned += pointsConfig.pole;
  }

  return pointsEarned;
}

export function calculateProjectedPoints(
  prediction: Prediction,
  raceResults: Prediction,
  pointsConfig: PointsConfig,
): number {
  return calculatePointsEarned(prediction, raceResults, pointsConfig);
}

export function calculateLiveTotal(
  user: UserData,
  raceResults: Prediction,
  pointsConfig: PointsConfig,
): number {
  return user.points + calculateProjectedPoints(user.predictions, raceResults, pointsConfig);
}

export function sortUsersByLiveTotal(
  users: UserData[],
  raceResults: Prediction,
  pointsConfig: PointsConfig,
): UserData[] {
  return [...users].sort(
    (firstUser, secondUser) =>
      calculateLiveTotal(secondUser, raceResults, pointsConfig) -
      calculateLiveTotal(firstUser, raceResults, pointsConfig),
  );
}

export function mergeMissingPredictionFields(
  currentPrediction: Prediction,
  incomingPrediction: Prediction,
): Prediction {
  const mergedPrediction: Prediction = { ...currentPrediction };
  let hasChanges = false;

  (Object.keys(mergedPrediction) as (keyof Prediction)[]).forEach((field) => {
    if (normalizePredictionValue(mergedPrediction[field])) {
      return;
    }

    if (!normalizePredictionValue(incomingPrediction[field])) {
      return;
    }

    mergedPrediction[field] = incomingPrediction[field];
    hasChanges = true;
  });

  return hasChanges ? mergedPrediction : currentPrediction;
}

export function buildRaceRecord(
  gpName: string,
  meetingKey: string,
  raceResults: Prediction,
  users: UserData[],
  pointsConfig: PointsConfig,
  formatter: () => string,
  existingDate?: string,
): { record: RaceRecord; updatedUsers: UserData[] } {
  const userPredictions: RaceRecord['userPredictions'] = {};

  const updatedUsers = users.map((user) => {
    const pointsEarned = calculatePointsEarned(user.predictions, raceResults, pointsConfig);

    userPredictions[user.name] = {
      prediction: { ...user.predictions },
      pointsEarned,
    };

    return {
      ...user,
      points: user.points + pointsEarned,
    };
  });

  return {
    record: {
      gpName,
      meetingKey,
      date: existingDate?.trim() ? existingDate : formatter(),
      results: { ...raceResults },
      userPredictions,
    },
    updatedUsers,
  };
}

export function validatePredictions(
  users: UserData[],
  predictionFieldOrder: (keyof Prediction)[],
): boolean {
  if (!Array.isArray(users) || !Array.isArray(predictionFieldOrder)) {
    return false;
  }

  let filledCount = 0;

  users.forEach((user) => {
    predictionFieldOrder.forEach((field) => {
      const value = typeof user.predictions?.[field] === 'string' ? user.predictions[field].trim() : '';
      if (value) {
        filledCount++;
      }
    });
  });

  return filledCount > 0;
}
