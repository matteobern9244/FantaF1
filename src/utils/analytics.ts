import type {
  RaceRecord,
  RaceWeekend,
  SeasonAnalyticsSummary,
  UserAnalyticsSummary,
  UserKpiSummary,
  UserData,
} from '../types';
import {
  SeasonAnalyticsBuilder,
  trackedFields,
  UserAnalyticsBuilder,
} from './analyticsService';

const userAnalyticsBuilder = new UserAnalyticsBuilder();
const seasonAnalyticsBuilder = new SeasonAnalyticsBuilder({
  userAnalyticsBuilder,
});

function buildUserKpiSummaries(users: UserData[], history: RaceRecord[]): UserKpiSummary[] {
  return userAnalyticsBuilder.buildUserKpiSummaries(users, history);
}

function buildSeasonAnalytics(users: UserData[], history: RaceRecord[], calendar: RaceWeekend[]): SeasonAnalyticsSummary {
  return seasonAnalyticsBuilder.buildSeasonAnalytics(users, history, calendar);
}

function buildUserAnalytics(history: RaceRecord[], userName: string): UserAnalyticsSummary {
  return userAnalyticsBuilder.buildUserAnalytics(history, userName);
}

export {
  buildSeasonAnalytics,
  buildUserAnalytics,
  buildUserKpiSummaries,
  trackedFields,
};
