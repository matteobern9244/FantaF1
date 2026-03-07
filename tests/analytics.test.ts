import { describe, expect, it } from 'vitest';
import { buildUserAnalytics, buildUserKpiSummaries } from '../src/utils/analytics';
import { createEmptyPrediction } from '../src/utils/game';

describe('analytics utils', () => {
  const users = [
    { name: 'Marco', predictions: createEmptyPrediction(), points: 0 },
    { name: 'Luca', predictions: createEmptyPrediction(), points: 0 },
    { name: 'Sara', predictions: createEmptyPrediction(), points: 0 },
  ];

  const history = [
    {
      gpName: 'Australian Grand Prix 2099',
      meetingKey: 'race-1',
      date: '01/03/2099',
      results: { first: 'ver', second: 'lec', third: 'nor', pole: 'pia' },
      userPredictions: {
        Marco: {
          prediction: { first: 'ver', second: 'lec', third: 'ham', pole: 'pia' },
          pointsEarned: 9,
        },
        Luca: {
          prediction: { first: 'ham', second: 'ver', third: 'nor', pole: 'nor' },
          pointsEarned: 2,
        },
        Sara: {
          prediction: { first: 'ver', second: 'lec', third: 'nor', pole: 'pia' },
          pointsEarned: 11,
        },
      },
    },
    {
      gpName: 'Chinese Grand Prix 2099',
      meetingKey: 'race-2',
      date: '15/03/2099',
      results: { first: 'ham', second: 'nor', third: 'lec', pole: 'ver' },
      userPredictions: {
        Marco: {
          prediction: { first: 'ham', second: 'nor', third: 'lec', pole: 'ver' },
          pointsEarned: 11,
        },
        Luca: {
          prediction: { first: 'ham', second: 'nor', third: 'pia', pole: 'ver' },
          pointsEarned: 9,
        },
        Sara: {
          prediction: { first: 'nor', second: 'ham', third: 'lec', pole: 'ver' },
          pointsEarned: 3,
        },
      },
    },
  ];

  it('builds per-user KPI summaries from race history', () => {
    const summaries = buildUserKpiSummaries(users, history);

    expect(summaries).toEqual([
      {
        userName: 'Marco',
        seasonPoints: 20,
        averagePosition: 1.5,
        poleAccuracy: 100,
        averagePointsPerRace: 10,
        racesCount: 2,
        weekendWins: 1,
        podiums: 2,
        averageLeaderDelta: 1,
        totalHitRate: 88,
        boostConversionRate: 0,
      },
      {
        userName: 'Luca',
        seasonPoints: 11,
        averagePosition: 2.5,
        poleAccuracy: 50,
        averagePointsPerRace: 5.5,
        racesCount: 2,
        weekendWins: 0,
        podiums: 2,
        averageLeaderDelta: 5.5,
        totalHitRate: 50,
        boostConversionRate: 0,
      },
      {
        userName: 'Sara',
        seasonPoints: 14,
        averagePosition: 2,
        poleAccuracy: 100,
        averagePointsPerRace: 7,
        racesCount: 2,
        weekendWins: 1,
        podiums: 2,
        averageLeaderDelta: 4,
        totalHitRate: 75,
        boostConversionRate: 0,
      },
    ]);
  });

  it('builds the deep-dive analytics summary for a selected user', () => {
    const summary = buildUserAnalytics(history, 'Marco');

    expect(summary.bestWeekend).toEqual({
      gpName: 'Chinese Grand Prix 2099',
      points: 11,
    });
    expect(summary.worstWeekend).toEqual({
      gpName: 'Australian Grand Prix 2099',
      points: 9,
    });
    expect(summary.mostPickedDriverId).toBe('ham');
    expect(summary.fieldAccuracy).toEqual([
      { field: 'first', hits: 2, total: 2, accuracy: 100 },
      { field: 'second', hits: 2, total: 2, accuracy: 100 },
      { field: 'third', hits: 1, total: 2, accuracy: 50 },
      { field: 'pole', hits: 2, total: 2, accuracy: 100 },
    ]);
    expect(summary.trend).toEqual([
      { gpName: 'Chinese Grand Prix 2099', points: 11 },
      { gpName: 'Australian Grand Prix 2099', points: 9 },
    ]);
    expect(summary.cumulativeTrend).toEqual([
      { gpName: 'Chinese Grand Prix 2099', points: 11 },
      { gpName: 'Australian Grand Prix 2099', points: 20 },
    ]);
    expect(summary.boostUsage).toEqual({
      none: 2,
      first: 0,
      second: 0,
      third: 0,
      pole: 0,
    });
    expect(summary.pointsByField).toEqual({
      first: 10,
      second: 6,
      third: 2,
      pole: 2,
    });
    expect(summary.boostedWeekends).toBe(0);
    expect(summary.boostPointsEarned).toBe(0);
    expect(summary.weekendsAboveLeader).toBe(1);
  });

  it('returns stable empty summaries when history is missing', () => {
    expect(buildUserKpiSummaries(users, [])).toEqual([
      {
        userName: 'Marco',
        seasonPoints: 0,
        averagePosition: null,
        poleAccuracy: 0,
        averagePointsPerRace: 0,
        racesCount: 0,
        weekendWins: 0,
        podiums: 0,
        averageLeaderDelta: 0,
        totalHitRate: 0,
        boostConversionRate: 0,
      },
      {
        userName: 'Luca',
        seasonPoints: 0,
        averagePosition: null,
        poleAccuracy: 0,
        averagePointsPerRace: 0,
        racesCount: 0,
        weekendWins: 0,
        podiums: 0,
        averageLeaderDelta: 0,
        totalHitRate: 0,
        boostConversionRate: 0,
      },
      {
        userName: 'Sara',
        seasonPoints: 0,
        averagePosition: null,
        poleAccuracy: 0,
        averagePointsPerRace: 0,
        racesCount: 0,
        weekendWins: 0,
        podiums: 0,
        averageLeaderDelta: 0,
        totalHitRate: 0,
        boostConversionRate: 0,
      },
    ]);

    expect(buildUserAnalytics([], 'Marco')).toEqual({
      userName: 'Marco',
      bestWeekend: null,
      worstWeekend: null,
      mostPickedDriverId: '',
      fieldAccuracy: [
        { field: 'first', hits: 0, total: 0, accuracy: 0 },
        { field: 'second', hits: 0, total: 0, accuracy: 0 },
        { field: 'third', hits: 0, total: 0, accuracy: 0 },
        { field: 'pole', hits: 0, total: 0, accuracy: 0 },
      ],
      trend: [],
      cumulativeTrend: [],
      boostUsage: {
        none: 0,
        first: 0,
        second: 0,
        third: 0,
        pole: 0,
      },
      pointsByField: {
        first: 0,
        second: 0,
        third: 0,
        pole: 0,
      },
      boostedWeekends: 0,
      boostPointsEarned: 0,
      weekendsAboveLeader: 0,
    });
  });

  it('covers tie-breakers, missing predictions and boost-specific branches', () => {
    const usersWithTie = [
      { name: 'Adriano', predictions: createEmptyPrediction(), points: 0, weekendBoost: 'none' as const },
      { name: 'Fabio', predictions: createEmptyPrediction(), points: 0, weekendBoost: 'none' as const },
      { name: 'Matteo', predictions: createEmptyPrediction(), points: 0, weekendBoost: 'none' as const },
    ];
    const tieHistory = [
      {
        gpName: 'Tie Grand Prix',
        meetingKey: 'tie-1',
        date: '01/04/2099',
        results: { first: 'ver', second: 'lec', third: 'nor', pole: 'ham' },
        userPredictions: {
          Adriano: {
            prediction: { first: 'ver', second: '', third: 'nor', pole: '' },
            weekendBoost: 'first' as const,
            pointsEarned: 7,
          },
          Fabio: {
            prediction: { first: 'ver', second: '', third: 'nor', pole: '' },
            weekendBoost: 'pole' as const,
            pointsEarned: 7,
          },
          Matteo: {
            prediction: { first: '', second: '', third: '', pole: '' },
            weekendBoost: 'none' as const,
            pointsEarned: 0,
          },
        },
      },
      {
        gpName: 'Tie Grand Prix B',
        meetingKey: 'tie-2',
        date: '08/04/2099',
        results: { first: 'ham', second: 'ver', third: 'pia', pole: 'lec' },
        userPredictions: {
          Adriano: {
            prediction: { first: 'ham', second: 'ver', third: '', pole: '' },
            weekendBoost: 'none' as const,
            pointsEarned: 8,
          },
          Fabio: {
            prediction: { first: 'ham', second: 'ver', third: 'pia', pole: 'lec' },
            weekendBoost: 'pole' as const,
            pointsEarned: 12,
          },
        },
      },
    ];

    const summaries = buildUserKpiSummaries(usersWithTie, tieHistory);
    const matteoSummary = summaries.find((entry) => entry.userName === 'Matteo');
    const fabioSummary = summaries.find((entry) => entry.userName === 'Fabio');
    const matteoAnalytics = buildUserAnalytics(tieHistory, 'Matteo');
    const fabioAnalytics = buildUserAnalytics(tieHistory, 'Fabio');

    expect(matteoSummary).toMatchObject({
      averagePosition: 3,
      totalHitRate: 0,
      boostConversionRate: 0,
    });
    expect(fabioSummary).toMatchObject({
      weekendWins: 1,
      boostConversionRate: 50,
    });
    expect(matteoAnalytics).toMatchObject({
      mostPickedDriverId: '',
      bestWeekend: { gpName: 'Tie Grand Prix', points: 0 },
      worstWeekend: { gpName: 'Tie Grand Prix B', points: 0 },
      boostPointsEarned: 0,
      boostedWeekends: 0,
      weekendsAboveLeader: 0,
    });
    expect(matteoAnalytics.pointsByField).toEqual({
      first: 0,
      second: 0,
      third: 0,
      pole: 0,
    });
    expect(fabioAnalytics.boostUsage).toEqual({
      none: 0,
      first: 0,
      second: 0,
      third: 0,
      pole: 2,
    });
    expect(fabioAnalytics.boostPointsEarned).toBe(1);
  });

  it('tracks podiums correctly when a fourth player finishes outside the top three', () => {
    const users = [
      { name: 'Adriano', predictions: createEmptyPrediction(), points: 0, weekendBoost: 'none' as const },
      { name: 'Fabio', predictions: createEmptyPrediction(), points: 0, weekendBoost: 'none' as const },
      { name: 'Matteo', predictions: createEmptyPrediction(), points: 0, weekendBoost: 'none' as const },
      { name: 'Luca', predictions: createEmptyPrediction(), points: 0, weekendBoost: 'none' as const },
    ];
    const history = [
      {
        gpName: 'Expanded Grid Grand Prix',
        meetingKey: 'expanded-1',
        date: '12/04/2099',
        results: { first: 'ver', second: 'lec', third: 'ham', pole: 'nor' },
        userPredictions: {
          Adriano: { prediction: createEmptyPrediction(), pointsEarned: 12 },
          Fabio: { prediction: createEmptyPrediction(), pointsEarned: 9 },
          Matteo: { prediction: createEmptyPrediction(), pointsEarned: 4 },
          Luca: { prediction: createEmptyPrediction(), pointsEarned: 1 },
        },
      },
    ];

    const summaries = buildUserKpiSummaries(users, history);

    expect(summaries.find((entry) => entry.userName === 'Luca')).toMatchObject({
      averagePosition: 4,
      podiums: 0,
    });
  });

  it('handles boosted entries with missing predictions without crashing and without counting conversion', () => {
    const users = [
      { name: 'Adriano', predictions: createEmptyPrediction(), points: 0, weekendBoost: 'none' as const },
    ];
    const history = [
      {
        gpName: 'Broken Boost Grand Prix',
        meetingKey: 'broken-1',
        date: '19/04/2099',
        results: { first: 'ver', second: 'lec', third: 'nor', pole: 'ham' },
        userPredictions: {
          Adriano: {
            weekendBoost: 'first' as const,
            pointsEarned: 0,
          },
        },
      },
    ];

    const [summary] = buildUserKpiSummaries(users, history);

    expect(summary).toMatchObject({
      boostConversionRate: 0,
      totalHitRate: 0,
    });
  });
});
