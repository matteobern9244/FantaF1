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

export interface WeekendPredictionState {
  userPredictions: Record<string, Prediction>;
  raceResults: Prediction;
}

export type WeekendStateByMeetingKey = Record<string, WeekendPredictionState>;

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
  weekendStateByMeetingKey?: WeekendStateByMeetingKey;
}

export interface PointsConfig {
  first: number;
  second: number;
  third: number;
  pole: number;
}

export type ViewMode = 'public' | 'admin';

export interface UserKpiSummary {
  userName: string;
  seasonPoints: number;
  averagePosition: number | null;
  poleAccuracy: number;
  averagePointsPerRace: number;
  racesCount: number;
  weekendWins: number;
  podiums: number;
  averageLeaderDelta: number;
  totalHitRate: number;
}

export interface UserFieldAccuracy {
  field: PredictionKey;
  hits: number;
  total: number;
  accuracy: number;
}

export interface UserGpTrendPoint {
  gpName: string;
  points: number;
}

export interface UserAnalyticsSummary {
  userName: string;
  bestWeekend: UserGpTrendPoint | null;
  worstWeekend: UserGpTrendPoint | null;
  mostPickedDriverId: string;
  fieldAccuracy: UserFieldAccuracy[];
  trend: UserGpTrendPoint[];
  cumulativeTrend: UserGpTrendPoint[];
  pointsByField: Record<PredictionKey, number>;
  weekendsAboveLeader: number;
}

export interface SessionState {
  isAdmin: boolean;
  defaultViewMode: ViewMode;
}
