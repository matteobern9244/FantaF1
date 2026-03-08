import type { PointsConfig, Prediction, RaceRecord, UserData } from '../types';
import { PredictionScoringService, PredictionValidationService, RaceHistoryService } from './gameService';

const scoringService = new PredictionScoringService();
const validationService = new PredictionValidationService();
const historyService = new RaceHistoryService({ scoringService });

export function createEmptyPrediction(): Prediction {
  return historyService.createEmptyPrediction();
}

export function createInitialUsers(participantsOrSlots: string[] | number): UserData[] {
  return historyService.createInitialUsers(participantsOrSlots);
}

export function rebuildUsersFromHistory(
  participants: string[],
  history: RaceRecord[],
): UserData[] {
  return historyService.rebuildUsersFromHistory(participants, history);
}

export function calculatePointsBreakdown(
  prediction: Prediction,
  raceResults: Prediction,
  pointsConfig: PointsConfig,
) {
  return scoringService.calculatePointsBreakdown(prediction, raceResults, pointsConfig);
}

export function calculatePointsEarned(
  prediction: Prediction,
  raceResults: Prediction,
  pointsConfig: PointsConfig,
): number {
  return scoringService.calculatePointsEarned(prediction, raceResults, pointsConfig);
}

export function calculateProjectedPoints(
  prediction: Prediction,
  raceResults: Prediction,
  pointsConfig: PointsConfig,
): number {
  return scoringService.calculateProjectedPoints(prediction, raceResults, pointsConfig);
}

export function calculateLiveTotal(
  user: UserData,
  raceResults: Prediction,
  pointsConfig: PointsConfig,
): number {
  return scoringService.calculateLiveTotal(user, raceResults, pointsConfig);
}

export function sortUsersByLiveTotal(
  users: UserData[],
  raceResults: Prediction,
  pointsConfig: PointsConfig,
): UserData[] {
  return scoringService.sortUsersByLiveTotal(users, raceResults, pointsConfig);
}

export function mergeMissingPredictionFields(
  currentPrediction: Prediction,
  incomingPrediction: Prediction,
): Prediction {
  return historyService.mergeMissingPredictionFields(currentPrediction, incomingPrediction);
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
  return historyService.buildRaceRecord(
    gpName,
    meetingKey,
    raceResults,
    users,
    pointsConfig,
    formatter,
    existingDate,
  );
}

export function validatePredictions(
  users: UserData[],
  predictionFieldOrder: (keyof Prediction)[],
): boolean {
  return validationService.validatePredictions(users, predictionFieldOrder);
}
