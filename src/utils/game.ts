import type { PointsConfig, Prediction, RaceRecord, UserData, WeekendBoost } from '../types';

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

export function createInitialUsers(participantsOrSlots: string[] | number): UserData[] {
  const participantNames = Array.isArray(participantsOrSlots)
    ? participantsOrSlots
    : Array.from({ length: participantsOrSlots }, (_, index) => `Player ${index + 1}`);

  return participantNames.map((name) => ({
    name,
    predictions: createEmptyPrediction(),
    points: 0,
    weekendBoost: 'none',
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

export function normalizeWeekendBoost(boost?: string | null): WeekendBoost {
  return boost === 'first' || boost === 'second' || boost === 'third' || boost === 'pole'
    ? boost
    : 'none';
}

export function calculatePointsBreakdown(
  prediction: Prediction,
  raceResults: Prediction,
  pointsConfig: PointsConfig,
  weekendBoost: WeekendBoost = 'none',
) {
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
  let basePoints = 0;
  let boostBonus = 0;

  (Object.keys(pointsConfig) as (keyof PointsConfig)[]).forEach((field) => {
    const isMatch = normalizedPrediction[field] === normalizedRaceResults[field] && normalizedRaceResults[field];
    if (!isMatch) {
      return;
    }

    basePoints += pointsConfig[field];
    if (weekendBoost === field) {
      boostBonus += pointsConfig[field];
    }
  });

  return {
    basePoints,
    boostBonus,
    totalPoints: basePoints + boostBonus,
  };
}

export function calculatePointsEarned(
  prediction: Prediction,
  raceResults: Prediction,
  pointsConfig: PointsConfig,
  weekendBoost: WeekendBoost = 'none',
): number {
  return calculatePointsBreakdown(prediction, raceResults, pointsConfig, weekendBoost).totalPoints;
}

export function calculateProjectedPoints(
  prediction: Prediction,
  raceResults: Prediction,
  pointsConfig: PointsConfig,
  weekendBoost: WeekendBoost = 'none',
): number {
  return calculatePointsEarned(prediction, raceResults, pointsConfig, weekendBoost);
}

export function calculateLiveTotal(
  user: UserData,
  raceResults: Prediction,
  pointsConfig: PointsConfig,
): number {
  return user.points + calculateProjectedPoints(
    user.predictions,
    raceResults,
    pointsConfig,
    normalizeWeekendBoost(user.weekendBoost),
  );
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
    const normalizedWeekendBoost = normalizeWeekendBoost(user.weekendBoost);
    const pointsEarned = calculatePointsEarned(
      user.predictions,
      raceResults,
      pointsConfig,
      normalizedWeekendBoost,
    );

    userPredictions[user.name] = {
      prediction: { ...user.predictions },
      weekendBoost: normalizedWeekendBoost,
      pointsEarned,
    };

    return {
      ...user,
      points: user.points + pointsEarned,
      weekendBoost: normalizedWeekendBoost,
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
