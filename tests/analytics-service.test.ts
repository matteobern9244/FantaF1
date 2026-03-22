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

  it('covers user analytics edge cases and deterministic tie breaks', () => {
    const userBuilder = new UserAnalyticsBuilder();

    expect(userBuilder.buildUserKpiSummaries(users, [])).toEqual([
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
    ]);

    const tieHistory = [
      {
        gpName: 'Race 3',
        meetingKey: 'race-3',
        date: '03/01/2099',
        results: { first: 'ver', second: 'ham', third: 'lec', pole: 'nor' },
        userPredictions: {
          Marco: { prediction: { first: 'aaa', second: 'bbb', third: '', pole: '' }, pointsEarned: 4 },
          Luca: { prediction: createEmptyPrediction(), pointsEarned: 4 },
        },
      },
    ];

    expect(userBuilder.buildMostPickedDriverId('Marco', tieHistory)).toBe('aaa');
    expect(userBuilder.buildMostPickedDriverId('Luca', tieHistory)).toBe('');
  });

  it('covers race recap and narrative ranking fallbacks', () => {
    const seasonBuilder = new SeasonAnalyticsBuilder();

    const comparison = [
      {
        userName: 'Marco',
        seasonPoints: 20,
        averagePointsPerRace: 10,
        totalHitRate: 60,
        sprintPoints: 0,
        standardPoints: 20,
        consistencyIndex: 80,
        leaderGap: 0,
      },
      {
        userName: 'Luca',
        seasonPoints: 20,
        averagePointsPerRace: 9,
        totalHitRate: 60,
        sprintPoints: 0,
        standardPoints: 20,
        consistencyIndex: 80,
        leaderGap: 0,
      },
    ];

    expect(seasonBuilder.buildSeasonNarratives(comparison).map((entry) => entry.userName)).toEqual([
      'Marco',
      'Marco',
      'Marco',
      'Marco',
    ]);

    expect(
      seasonBuilder.buildRaceRecap(
        [
          {
            gpName: 'Race fallback',
            meetingKey: '',
            date: '04/01/2099',
            results: createEmptyPrediction(),
            userPredictions: {},
          },
        ],
        [
          {
            meetingKey: 'race-x',
            meetingName: 'Race fallback',
            grandPrixTitle: 'Race fallback',
            roundNumber: 4,
            dateRangeLabel: '',
            detailUrl: '',
            heroImageUrl: '',
            trackOutlineUrl: 'track.svg',
            isSprintWeekend: false,
          },
        ],
      ),
    ).toMatchObject({
      gpName: 'Race fallback',
      meetingName: 'Race fallback',
      winnerName: '',
      winnerPoints: 0,
      decisiveField: 'first',
      trackOutlineUrl: 'track.svg',
    });
  });

  it('covers season comparison tie breaks and sprint weekend splits', () => {
    const seasonBuilder = new SeasonAnalyticsBuilder();

    const comparison = seasonBuilder.buildSeasonComparison(
      users,
      [
        {
          gpName: 'Sprint race',
          meetingKey: 'sprint-race',
          date: '05/01/2099',
          results: createEmptyPrediction(),
          userPredictions: {
            Marco: { prediction: createEmptyPrediction(), pointsEarned: 5 },
            Luca: { prediction: createEmptyPrediction(), pointsEarned: 0 },
          },
        },
        {
          gpName: 'Regular race',
          meetingKey: 'regular-race',
          date: '06/01/2099',
          results: createEmptyPrediction(),
          userPredictions: {
            Marco: { prediction: createEmptyPrediction(), pointsEarned: 0 },
            Luca: { prediction: createEmptyPrediction(), pointsEarned: 5 },
          },
        },
      ],
      [
        {
          meetingKey: 'sprint-race',
          meetingName: 'Sprint race',
          grandPrixTitle: 'Sprint race',
          roundNumber: 1,
          dateRangeLabel: '',
          detailUrl: '',
          heroImageUrl: '',
          trackOutlineUrl: '',
          isSprintWeekend: true,
        },
        {
          meetingKey: 'regular-race',
          meetingName: 'Regular race',
          grandPrixTitle: 'Regular race',
          roundNumber: 2,
          dateRangeLabel: '',
          detailUrl: '',
          heroImageUrl: '',
          trackOutlineUrl: '',
          isSprintWeekend: false,
        },
      ],
    );

    expect(comparison.map((entry) => entry.userName)).toEqual(['Luca', 'Marco']);
    expect(comparison.find((entry) => entry.userName === 'Marco')).toMatchObject({
      seasonPoints: 5,
      sprintPoints: 5,
      standardPoints: 0,
    });
    expect(comparison.find((entry) => entry.userName === 'Luca')).toMatchObject({
      seasonPoints: 5,
      sprintPoints: 0,
      standardPoints: 5,
    });
  });
});
