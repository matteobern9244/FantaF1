import { describe, expect, it } from 'vitest';
import { AnalyticsMathService, SeasonAnalyticsBuilder, UserAnalyticsBuilder } from '../src/utils/analyticsService';
import { createEmptyPrediction } from '../src/utils/game';

describe('analytics services', () => {
  const users = [
    { name: 'Marco', predictions: createEmptyPrediction(), points: 0 },
    { name: 'Luca', predictions: createEmptyPrediction(), points: 0 },
  ];
  const history = [
    {
      gpName: 'Race 2',
      meetingKey: 'race-2',
      date: '02/01/2099',
      results: { first: 'ham', second: 'nor', third: 'lec', pole: 'ver' },
      userPredictions: {
        Marco: { prediction: { first: 'ham', second: 'nor', third: 'lec', pole: 'ver' }, pointsEarned: 11 },
        Luca: { prediction: { first: 'ham', second: '', third: '', pole: '' }, pointsEarned: 5 },
      },
    },
    {
      gpName: 'Race 1',
      meetingKey: 'race-1',
      date: '01/01/2099',
      results: { first: 'ver', second: 'lec', third: 'nor', pole: 'pia' },
      userPredictions: {
        Marco: { prediction: { first: 'ver', second: 'lec', third: 'ham', pole: 'pia' }, pointsEarned: 9 },
        Luca: { prediction: { first: '', second: '', third: '', pole: '' }, pointsEarned: 0 },
      },
    },
  ];
  const calendar = [
    { meetingKey: 'race-1', meetingName: 'Race 1', grandPrixTitle: 'Race 1', roundNumber: 1, dateRangeLabel: '', detailUrl: '', heroImageUrl: '', trackOutlineUrl: '', isSprintWeekend: false },
    { meetingKey: 'race-2', meetingName: 'Race 2', grandPrixTitle: 'Race 2', roundNumber: 2, dateRangeLabel: '', detailUrl: '', heroImageUrl: '', trackOutlineUrl: '', isSprintWeekend: true },
  ];

  it('builds user and season analytics through dedicated builders', () => {
    const userBuilder = new UserAnalyticsBuilder();
    const seasonBuilder = new SeasonAnalyticsBuilder();

    expect(userBuilder.buildUserKpiSummaries(users, history)[0].seasonPoints).toBe(20);
    expect(userBuilder.buildUserAnalytics(history, 'Marco').bestWeekend).toEqual({
      gpName: 'Race 2',
      points: 11,
    });
    expect(seasonBuilder.buildSeasonAnalytics(users, history, calendar).leaderName).toBe('Marco');
  });

  it('covers math helpers and empty narrative branches', () => {
    const mathService = new AnalyticsMathService();
    const seasonBuilder = new SeasonAnalyticsBuilder({ mathService });

    expect(mathService.roundTo(10.555, 2)).toBe(10.56);
    expect(mathService.calculateConsistencyIndex([10])).toBe(100);
    expect(seasonBuilder.buildSeasonNarratives([])).toEqual([]);
    expect(seasonBuilder.buildRaceRecap([])).toBeNull();
  });
});
