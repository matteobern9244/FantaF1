import type { PointsConfig, Prediction, RaceRecord, UserData } from '../types';

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

  if (prediction.first === raceResults.first && raceResults.first) {
    pointsEarned += pointsConfig.first;
  }

  if (prediction.second === raceResults.second && raceResults.second) {
    pointsEarned += pointsConfig.second;
  }

  if (prediction.third === raceResults.third && raceResults.third) {
    pointsEarned += pointsConfig.third;
  }

  if (prediction.pole === raceResults.pole && raceResults.pole) {
    pointsEarned += pointsConfig.pole;
  }

  return pointsEarned;
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
  let filledCount = 0;
  let totalCount = 0;

  users.forEach((user) => {
    predictionFieldOrder.forEach((field) => {
      totalCount++;
      if (user.predictions[field]) {
        filledCount++;
      }
    });
  });

  const isAllEmpty = filledCount === 0;
  const isAllFilled = filledCount === totalCount;

  return isAllEmpty || isAllFilled;
}
