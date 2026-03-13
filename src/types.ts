export interface Driver {
  id: string;
  name: string;
  team: string;
  color: string;
  avatarUrl?: string;
  teamSlug?: string;
}

export interface DriverStanding {
  position: number;
  driverId: string;
  name: string;
  team: string;
  points: number;
  avatarUrl?: string;
  color?: string;
}

export interface ConstructorStanding {
  position: number;
  team: string;
  points: number;
  color?: string;
  logoUrl?: string;
}

export interface StandingsPayload {
  driverStandings: DriverStanding[];
  constructorStandings: ConstructorStanding[];
  updatedAt: string;
}

export type PredictionKey = 'first' | 'second' | 'third' | 'pole';

export interface Prediction {
  first: string;
  second: string;
  third: string;
  pole: string;
}

export type RacePhase = 'open' | 'live' | 'finished';

export type OfficialResultsResponse = Prediction & {
  racePhase: RacePhase;
  results?: Prediction;
  highlightsVideoUrl?: string;
};

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
  highlightsVideoUrl?: string;
  highlightsLookupCheckedAt?: string;
  highlightsLookupStatus?: string;
  highlightsLookupSource?: string;
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

export interface SeasonComparisonPoint {
  userName: string;
  seasonPoints: number;
  averagePointsPerRace: number;
  totalHitRate: number;
  sprintPoints: number;
  standardPoints: number;
  consistencyIndex: number;
  leaderGap: number;
}

export interface SeasonNarrative {
  slug: 'charge' | 'consistency' | 'sprint' | 'precision';
  title: string;
  description: string;
  userName: string;
}

export interface RaceRecapSummary {
  gpName: string;
  meetingName: string;
  winnerName: string;
  winnerPoints: number;
  swingLabel: string;
  decisiveField: PredictionKey | null;
  trackOutlineUrl: string;
}

export interface SeasonAnalyticsSummary {
  comparison: SeasonComparisonPoint[];
  leaderName: string;
  narratives: SeasonNarrative[];
  recap: RaceRecapSummary | null;
}

export interface SessionState {
  isAdmin: boolean;
  defaultViewMode: ViewMode;
}
