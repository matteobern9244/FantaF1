export interface Driver {
  id: string;
  name: string;
  team: string;
  color: string;
  avatarUrl?: string;
  teamSlug?: string;
}

export type PredictionKey = 'first' | 'second' | 'third' | 'pole';

export interface Prediction {
  first: string;
  second: string;
  third: string;
  pole: string;
}

export interface RaceRecord {
  gpName: string;
  meetingKey?: string;
  date: string;
  results: Prediction;
  userPredictions: Record<
    string,
    {
      prediction: Prediction;
      pointsEarned: number;
    }
  >;
}

export interface Session {
  name: string;
  startTime: string; // ISO format
}

export interface RaceWeekend {
  meetingKey: string;
  meetingName: string;
  grandPrixTitle: string;
  roundNumber: number;
  dateRangeLabel: string;
  detailUrl: string;
  heroImageUrl: string;
  trackOutlineUrl: string;
  isSprintWeekend: boolean;
  startDate?: string;
  endDate?: string;
  raceStartTime?: string;
  sessions?: Session[];
}

export interface UserData {
  name: string;
  predictions: Prediction;
  points: number;
}

export interface AppData {
  users: UserData[];
  history: RaceRecord[];
  gpName: string;
  raceResults: Prediction;
  selectedMeetingKey: string;
}

export interface PointsConfig {
  first: number;
  second: number;
  third: number;
  pole: number;
}
