import { describe, expect, it } from 'vitest';
import { buildSeasonAnalytics, buildUserAnalytics, buildUserKpiSummaries } from '../src/utils/analytics';
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
  const calendar = [
    {
      meetingKey: 'race-1',
      meetingName: 'Australia',
      grandPrixTitle: 'Australian Grand Prix 2099',
      roundNumber: 1,
      dateRangeLabel: '13 - 15 MAR',
      detailUrl: '',
      heroImageUrl: '',
      trackOutlineUrl: '',
      isSprintWeekend: false,
    },
    {
      meetingKey: 'race-2',
      meetingName: 'China',
      grandPrixTitle: 'Chinese Grand Prix 2099',
      roundNumber: 2,
      dateRangeLabel: '20 - 22 MAR',
      detailUrl: '',
      heroImageUrl: '',
      trackOutlineUrl: '',
      isSprintWeekend: true,
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
    expect(summary.pointsByField).toEqual({
      first: 10,
      second: 6,
      third: 2,
      pole: 2,
    });
    expect(summary.weekendsAboveLeader).toBe(1);
  });

  it('builds season comparison narratives and recap without touching persisted data', () => {
    const season = buildSeasonAnalytics(users, history, calendar);

    expect(season.leaderName).toBe('Marco');
    expect(season.comparison).toEqual([
      {
        userName: 'Marco',
        seasonPoints: 20,
        averagePointsPerRace: 10,
        totalHitRate: 88,
        sprintPoints: 11,
        standardPoints: 9,
        consistencyIndex: 90,
        leaderGap: 0,
      },
      {
        userName: 'Sara',
        seasonPoints: 14,
        averagePointsPerRace: 7,
        totalHitRate: 75,
        sprintPoints: 3,
        standardPoints: 11,
        consistencyIndex: 60,
        leaderGap: 6,
      },
      {
        userName: 'Luca',
        seasonPoints: 11,
        averagePointsPerRace: 5.5,
        totalHitRate: 50,
        sprintPoints: 9,
        standardPoints: 2,
        consistencyIndex: 65,
        leaderGap: 9,
      },
    ]);
    expect(season.narratives.map((entry) => entry.slug)).toEqual([
      'charge',
      'consistency',
      'sprint',
      'precision',
    ]);
    expect(season.recap).toEqual({
      gpName: 'Australian Grand Prix 2099',
      meetingName: 'Australia',
      winnerName: 'Sara',
      winnerPoints: 11,
      swingLabel: 'Gap sul secondo: 2 pt',
      decisiveField: 'first',
      trackOutlineUrl: '',
    });
  });

  it('uses the most recent prepended history entry for the season recap', () => {
    const newestFirstHistory = [history[1], history[0]];

    expect(buildSeasonAnalytics(users, newestFirstHistory, calendar).recap).toEqual({
      gpName: 'Chinese Grand Prix 2099',
      meetingName: 'China',
      winnerName: 'Marco',
      winnerPoints: 11,
      swingLabel: 'Gap sul secondo: 2 pt',
      decisiveField: 'first',
      trackOutlineUrl: '',
    });
  });

  it('covers season analytics edge branches for empty averages, missing meeting keys and single-player recaps', () => {
    const edgeUsers = [
      { name: 'Anna', predictions: createEmptyPrediction(), points: 0 },
      { name: 'Bruno', predictions: createEmptyPrediction(), points: 0 },
    ];
    const edgeHistory = [
      {
        gpName: 'Solo Sprint Recap',
        date: '20/03/2099',
        results: { first: 'ver', second: 'lec', third: 'ham', pole: 'nor' },
        userPredictions: {
          Anna: {
            prediction: { first: 'ver', second: '', third: '', pole: '' },
            pointsEarned: 5,
          },
        },
      },
      {
        gpName: 'Alpha Tie Break',
        meetingKey: 'sprint-weekend',
        date: '13/03/2099',
        results: { first: 'ham', second: 'ver', third: 'lec', pole: 'pia' },
        userPredictions: {
          Anna: {
            prediction: { first: '', second: '', third: '', pole: '' },
            pointsEarned: 4,
          },
          Bruno: {
            prediction: { first: '', second: '', third: '', pole: '' },
            pointsEarned: 4,
          },
        },
      },
    ];
    const edgeCalendar = [
      {
        meetingKey: 'sprint-weekend',
        meetingName: 'Sprint Weekend',
        grandPrixTitle: 'Sprint Weekend',
        roundNumber: 3,
        dateRangeLabel: '27 - 29 MAR',
        detailUrl: '',
        heroImageUrl: '',
        trackOutlineUrl: '',
        isSprintWeekend: true,
      },
    ];

    const emptyUserAnalytics = buildUserAnalytics([], 'Anna');
    const edgeSeason = buildSeasonAnalytics(edgeUsers, edgeHistory, edgeCalendar);

    expect(emptyUserAnalytics).toMatchObject({
      userName: 'Anna',
      bestWeekend: null,
      worstWeekend: null,
      weekendsAboveLeader: 0,
    });
    expect(edgeSeason.comparison).toEqual([
      {
        userName: 'Anna',
        seasonPoints: 9,
        averagePointsPerRace: 4.5,
        totalHitRate: 13,
        sprintPoints: 4,
        standardPoints: 5,
        consistencyIndex: 95,
        leaderGap: 0,
      },
      {
        userName: 'Bruno',
        seasonPoints: 4,
        averagePointsPerRace: 2,
        totalHitRate: 0,
        sprintPoints: 4,
        standardPoints: 0,
        consistencyIndex: 80,
        leaderGap: 5,
      },
    ]);
    expect(edgeSeason.recap).toEqual({
      gpName: 'Solo Sprint Recap',
      meetingName: 'Solo Sprint Recap',
      winnerName: 'Anna',
      winnerPoints: 5,
      swingLabel: 'Weekend senza inseguitori diretti',
      decisiveField: 'second',
      trackOutlineUrl: '',
    });

    const tieRecapSeason = buildSeasonAnalytics(edgeUsers, [edgeHistory[1], edgeHistory[0]], edgeCalendar);
    expect(tieRecapSeason.recap).toEqual({
      gpName: 'Alpha Tie Break',
      meetingName: 'Sprint Weekend',
      winnerName: 'Anna',
      winnerPoints: 4,
      swingLabel: 'Gap sul secondo: 0 pt',
      decisiveField: 'first',
      trackOutlineUrl: '',
    });

    const emptyRankingSeason = buildSeasonAnalytics(
      edgeUsers,
      [
        {
          gpName: 'No Predictions Grand Prix',
          date: '27/03/2099',
          results: { first: 'ver', second: 'lec', third: 'ham', pole: 'nor' },
          userPredictions: {},
        },
      ],
      edgeCalendar,
    );
    expect(emptyRankingSeason.recap).toEqual({
      gpName: 'No Predictions Grand Prix',
      meetingName: 'No Predictions Grand Prix',
      winnerName: '',
      winnerPoints: 0,
      swingLabel: 'Weekend senza inseguitori diretti',
      decisiveField: 'first',
      trackOutlineUrl: '',
    });

    const unknownSprintSeason = buildSeasonAnalytics(
      edgeUsers,
      [
        {
          gpName: 'Unknown Sprint Weekend',
          meetingKey: 'missing-weekend',
          date: '28/03/2099',
          results: { first: 'ver', second: 'lec', third: 'ham', pole: 'nor' },
          userPredictions: {
            Anna: {
              prediction: { first: 'ver', second: '', third: '', pole: '' },
              pointsEarned: 5,
            },
          },
        },
      ],
      edgeCalendar,
    );

    expect(unknownSprintSeason.comparison[0]).toMatchObject({
      userName: 'Anna',
      sprintPoints: 0,
      standardPoints: 5,
    });

    const missingSprintParticipantSeason = buildSeasonAnalytics(
      edgeUsers,
      [
        {
          gpName: 'Tracked Sprint Weekend',
          meetingKey: 'sprint-weekend',
          date: '29/03/2099',
          results: { first: 'ver', second: 'lec', third: 'ham', pole: 'nor' },
          userPredictions: {
            Anna: {
              prediction: { first: 'ver', second: '', third: '', pole: '' },
              pointsEarned: 5,
            },
          },
        },
      ],
      edgeCalendar,
    );

    expect(missingSprintParticipantSeason.comparison.find((entry) => entry.userName === 'Bruno')).toMatchObject({
      sprintPoints: 0,
      standardPoints: 0,
    });
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
      pointsByField: {
        first: 0,
        second: 0,
        third: 0,
        pole: 0,
      },
      weekendsAboveLeader: 0,
    });
  });

  it('covers tie-breakers and missing predictions branches', () => {
    const usersWithTie = [
      { name: 'Adriano', predictions: createEmptyPrediction(), points: 0 },
      { name: 'Fabio', predictions: createEmptyPrediction(), points: 0 },
      { name: 'Matteo', predictions: createEmptyPrediction(), points: 0 },
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
            pointsEarned: 7,
          },
          Fabio: {
            prediction: { first: 'ver', second: '', third: 'nor', pole: '' },
            pointsEarned: 7,
          },
          Matteo: {
            prediction: { first: '', second: '', third: '', pole: '' },
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
            pointsEarned: 8,
          },
          Fabio: {
            prediction: { first: 'ham', second: 'ver', third: 'pia', pole: 'lec' },
            pointsEarned: 12,
          },
        },
      },
    ];

    const summaries = buildUserKpiSummaries(usersWithTie, tieHistory);
    const matteoSummary = summaries.find((entry) => entry.userName === 'Matteo');
    const fabioSummary = summaries.find((entry) => entry.userName === 'Fabio');
    const matteoAnalytics = buildUserAnalytics(tieHistory, 'Matteo');

    expect(matteoSummary).toMatchObject({
      averagePosition: 3,
      totalHitRate: 0,
    });
    expect(fabioSummary).toMatchObject({
      weekendWins: 1,
    });
    expect(matteoAnalytics).toMatchObject({
      mostPickedDriverId: '',
      bestWeekend: { gpName: 'Tie Grand Prix', points: 0 },
      worstWeekend: { gpName: 'Tie Grand Prix B', points: 0 },
      weekendsAboveLeader: 0,
    });
    expect(matteoAnalytics.pointsByField).toEqual({
      first: 0,
      second: 0,
      third: 0,
      pole: 0,
    });
  });

  it('tracks podiums correctly when a fourth player finishes outside the top three', () => {
    const expandedUsers = [
      { name: 'Adriano', predictions: createEmptyPrediction(), points: 0 },
      { name: 'Fabio', predictions: createEmptyPrediction(), points: 0 },
      { name: 'Matteo', predictions: createEmptyPrediction(), points: 0 },
      { name: 'Luca', predictions: createEmptyPrediction(), points: 0 },
    ];
    const expandedHistory = [
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

    const summaries = buildUserKpiSummaries(expandedUsers, expandedHistory);

    expect(summaries.find((entry) => entry.userName === 'Luca')).toMatchObject({
      averagePosition: 4,
      podiums: 0,
    });
  });

  it('covers matched weekend details in race recap summary when user predictions are empty', () => {
    const users = [{ name: 'Marco', predictions: createEmptyPrediction(), points: 0 }];
    const history = [
      {
        gpName: 'Matched GP',
        meetingKey: 'sprint-meeting',
        date: '01/01/2099',
        results: createEmptyPrediction(),
        userPredictions: {},
      },
    ];
    const calendar = [
      {
        meetingKey: 'sprint-meeting',
        meetingName: 'Sprint Weekend',
        grandPrixTitle: 'Solo Sprint Recap',
        roundNumber: 1,
        dateRangeLabel: '01-03 JAN',
        detailUrl: '',
        heroImageUrl: '',
        trackOutlineUrl: '/maps/sprint.png',
        isSprintWeekend: true,
        startDate: '2099-01-01',
        endDate: '2099-01-03',
        raceStartTime: '2099-01-03T14:00:00Z',
        sessions: [],
      },
    ];

    const analytics = buildSeasonAnalytics(users, history, calendar);
    expect(analytics.recap).toEqual({
      gpName: 'Matched GP',
      meetingName: 'Sprint Weekend',
      winnerName: '',
      winnerPoints: 0,
      swingLabel: 'Weekend senza inseguitori diretti',
      decisiveField: 'first',
      trackOutlineUrl: '/maps/sprint.png',
    });
  });
});
