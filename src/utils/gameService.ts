import type { PointsConfig, Prediction, RaceRecord, UserData } from '../types';

class PredictionScoringService {
  normalizePredictionValue(value: string): string {
    return String(value ?? '').trim().toLowerCase();
  }

  calculatePointsBreakdown(
    prediction: Prediction,
    raceResults: Prediction,
    pointsConfig: PointsConfig,
  ) {
    const normalizedPrediction = {
      first: this.normalizePredictionValue(prediction.first),
      second: this.normalizePredictionValue(prediction.second),
      third: this.normalizePredictionValue(prediction.third),
      pole: this.normalizePredictionValue(prediction.pole),
    };
    const normalizedRaceResults = {
      first: this.normalizePredictionValue(raceResults.first),
      second: this.normalizePredictionValue(raceResults.second),
      third: this.normalizePredictionValue(raceResults.third),
      pole: this.normalizePredictionValue(raceResults.pole),
    };
    let basePoints = 0;

    (Object.keys(pointsConfig) as (keyof PointsConfig)[]).forEach((field) => {
      const isMatch = normalizedPrediction[field] === normalizedRaceResults[field] && normalizedRaceResults[field];
      if (!isMatch) {
        return;
      }

      basePoints += pointsConfig[field];
    });

    return {
      basePoints,
      totalPoints: basePoints,
    };
  }

  calculatePointsEarned(
    prediction: Prediction,
    raceResults: Prediction,
    pointsConfig: PointsConfig,
  ): number {
    return this.calculatePointsBreakdown(prediction, raceResults, pointsConfig).totalPoints;
  }

  calculateProjectedPoints(
    prediction: Prediction,
    raceResults: Prediction,
    pointsConfig: PointsConfig,
  ): number {
    return this.calculatePointsEarned(prediction, raceResults, pointsConfig);
  }

  calculateLiveTotal(
    user: UserData,
    raceResults: Prediction,
    pointsConfig: PointsConfig,
  ): number {
    return user.points + this.calculateProjectedPoints(user.predictions, raceResults, pointsConfig);
  }

  sortUsersByLiveTotal(
    users: UserData[],
    raceResults: Prediction,
    pointsConfig: PointsConfig,
  ): UserData[] {
    return [...users].sort(
      (firstUser, secondUser) =>
        this.calculateLiveTotal(secondUser, raceResults, pointsConfig) -
        this.calculateLiveTotal(firstUser, raceResults, pointsConfig),
    );
  }
}

class PredictionValidationService {
  validatePredictions(
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
}

class RaceHistoryService {
  private readonly scoringService: PredictionScoringService;

  constructor({ scoringService = new PredictionScoringService() }: { scoringService?: PredictionScoringService } = {}) {
    this.scoringService = scoringService;
  }

  createEmptyPrediction(): Prediction {
    return {
      first: '',
      second: '',
      third: '',
      pole: '',
    };
  }

  createInitialUsers(participantsOrSlots: string[] | number): UserData[] {
    const participantNames = Array.isArray(participantsOrSlots)
      ? participantsOrSlots
      : Array.from({ length: participantsOrSlots }, (_, index) => `Player ${index + 1}`);

    return participantNames.map((name) => ({
      name,
      predictions: this.createEmptyPrediction(),
      points: 0,
    }));
  }

  rebuildUsersFromHistory(
    participants: string[],
    history: RaceRecord[],
  ): UserData[] {
    const users = this.createInitialUsers(participants);

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

  mergeMissingPredictionFields(
    currentPrediction: Prediction,
    incomingPrediction: Prediction,
  ): Prediction {
    const mergedPrediction: Prediction = { ...currentPrediction };
    let hasChanges = false;

    (Object.keys(mergedPrediction) as (keyof Prediction)[]).forEach((field) => {
      if (this.scoringService.normalizePredictionValue(mergedPrediction[field])) {
        return;
      }

      if (!this.scoringService.normalizePredictionValue(incomingPrediction[field])) {
        return;
      }

      mergedPrediction[field] = incomingPrediction[field];
      hasChanges = true;
    });

    return hasChanges ? mergedPrediction : currentPrediction;
  }

  buildRaceRecord(
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
      const pointsEarned = this.scoringService.calculatePointsEarned(user.predictions, raceResults, pointsConfig);

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
}

export {
  PredictionScoringService,
  PredictionValidationService,
  RaceHistoryService,
};
