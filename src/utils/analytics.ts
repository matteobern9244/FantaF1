import type {
  PredictionKey,
  RaceRecord,
  RaceWeekend,
  RaceRecapSummary,
  SeasonAnalyticsSummary,
  SeasonComparisonPoint,
  SeasonNarrative,
  UserAnalyticsSummary,
  UserFieldAccuracy,
  UserGpTrendPoint,
  UserKpiSummary,
  UserData,
} from '../types';

const trackedFields: PredictionKey[] = ['first', 'second', 'third', 'pole'];

function roundTo(value: number, digits = 1) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function buildRacePositions(history: RaceRecord[], users: UserData[]) {
  return history.map((record) => {
    const ranking = users
      .map((user) => ({
        name: user.name,
        pointsEarned: record.userPredictions[user.name]?.pointsEarned ?? 0,
      }))
      .sort((firstEntry, secondEntry) => {
        if (secondEntry.pointsEarned !== firstEntry.pointsEarned) {
          return secondEntry.pointsEarned - firstEntry.pointsEarned;
        }

        return firstEntry.name.localeCompare(secondEntry.name, 'it');
      });

    return Object.fromEntries(
      ranking.map((entry, index) => [entry.name, index + 1]),
    ) as Record<string, number>;
  });
}

function buildUserKpiSummaries(users: UserData[], history: RaceRecord[]): UserKpiSummary[] {
  const racePositions = buildRacePositions(history, users);
  const leaderScores = history.map((record) =>
    Math.max(...users.map((user) => record.userPredictions[user.name]?.pointsEarned ?? 0), 0),
  );

  return users.map((user) => {
    const raceCount = history.length;
    const positions = racePositions.map((racePosition) => racePosition[user.name]!);
    const totalHistoricalPoints = history.reduce((sum, record) => {
      return sum + (record.userPredictions[user.name]?.pointsEarned ?? 0);
    }, 0);
    const totalPositions = positions.reduce((sum, position) => sum + position, 0);
    const poleHits = history.reduce((sum, record) => {
      const prediction = record.userPredictions[user.name]?.prediction;
      return sum + (prediction?.pole && prediction.pole === record.results.pole ? 1 : 0);
    }, 0);
    const weekendWins = positions.reduce((sum, position) => sum + (position === 1 ? 1 : 0), 0);
    const podiums = positions.reduce((sum, position) => sum + (position <= 3 ? 1 : 0), 0);
    const totalPossibleHits = raceCount * trackedFields.length;
    const totalHits = history.reduce((sum, record) => {
      const prediction = record.userPredictions[user.name]?.prediction;
      return sum + trackedFields.reduce((fieldSum, field) => {
        return fieldSum + (prediction?.[field] && prediction[field] === record.results[field] ? 1 : 0);
      }, 0);
    }, 0);
    const totalLeaderDelta = history.reduce((sum, record, index) => {
      const userPoints = record.userPredictions[user.name]?.pointsEarned ?? 0;
      return sum + (leaderScores[index] - userPoints);
    }, 0);

    return {
      userName: user.name,
      seasonPoints: totalHistoricalPoints,
      averagePosition: raceCount > 0 ? roundTo(totalPositions / raceCount, 1) : null,
      poleAccuracy: raceCount > 0 ? Math.round((poleHits / raceCount) * 100) : 0,
      averagePointsPerRace: raceCount > 0 ? roundTo(totalHistoricalPoints / raceCount, 2) : 0,
      racesCount: raceCount,
      weekendWins,
      podiums,
      averageLeaderDelta: raceCount > 0 ? roundTo(totalLeaderDelta / raceCount, 2) : 0,
      totalHitRate: totalPossibleHits > 0 ? Math.round((totalHits / totalPossibleHits) * 100) : 0,
    };
  });
}

function buildFieldAccuracy(userName: string, history: RaceRecord[]): UserFieldAccuracy[] {
  return trackedFields.map((field) => {
    const hits = history.reduce((sum, record) => {
      const prediction = record.userPredictions[userName]?.prediction;
      return sum + (prediction?.[field] && prediction[field] === record.results[field] ? 1 : 0);
    }, 0);

    return {
      field,
      hits,
      total: history.length,
      accuracy: history.length > 0 ? Math.round((hits / history.length) * 100) : 0,
    };
  });
}

function buildTrend(userName: string, history: RaceRecord[]): UserGpTrendPoint[] {
  return [...history]
    .reverse()
    .map((record) => ({
      gpName: record.gpName,
      points: record.userPredictions[userName]?.pointsEarned ?? 0,
    }));
}

function buildMostPickedDriverId(userName: string, history: RaceRecord[]) {
  const counts = new Map<string, number>();

  history.forEach((record) => {
    const prediction = record.userPredictions[userName]?.prediction;
    if (!prediction) {
      return;
    }

    trackedFields.forEach((field) => {
      const driverId = prediction[field];
      if (!driverId) {
        return;
      }

      counts.set(driverId, (counts.get(driverId) ?? 0) + 1);
    });
  });

  const orderedCounts = [...counts.entries()].sort((firstEntry, secondEntry) => {
    if (secondEntry[1] !== firstEntry[1]) {
      return secondEntry[1] - firstEntry[1];
    }

    return firstEntry[0].localeCompare(secondEntry[0], 'it');
  });

  return orderedCounts[0]?.[0] ?? '';
}

function buildCumulativeTrend(trend: UserGpTrendPoint[]) {
  let runningTotal = 0;
  return trend.map((point) => {
    runningTotal += point.points;
    return {
      gpName: point.gpName,
      points: runningTotal,
    };
  });
}

function buildPointsByField(userName: string, history: RaceRecord[]) {
  const pointsByField = {
    first: 0,
    second: 0,
    third: 0,
    pole: 0,
  } as Record<PredictionKey, number>;

  history.forEach((record) => {
    const prediction = record.userPredictions[userName]?.prediction;
    trackedFields.forEach((field) => {
      if (prediction?.[field] && prediction[field] === record.results[field]) {
        pointsByField[field] += field === 'first' ? 5 : field === 'second' ? 3 : field === 'third' ? 2 : 1;
      }
    });
  });

  return pointsByField;
}

function calculateAverage(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateConsistencyIndex(values: number[]) {
  if (values.length <= 1) {
    return 100;
  }

  const average = calculateAverage(values);
  const variance = values.reduce((sum, value) => sum + ((value - average) ** 2), 0) / values.length;
  const deviation = Math.sqrt(variance);
  return Math.max(0, Math.round(100 - deviation * 10));
}

function buildSeasonComparison(users: UserData[], history: RaceRecord[], calendar: RaceWeekend[]): SeasonComparisonPoint[] {
  const weekendByMeetingKey = new Map(calendar.map((weekend) => [weekend.meetingKey, weekend]));
  const summaries = buildUserKpiSummaries(users, history);
  const leaderPoints = Math.max(...summaries.map((summary) => summary.seasonPoints), 0);

  return summaries
    .map((summary) => {
      const userRacePoints = history.map((record) => record.userPredictions[summary.userName]?.pointsEarned ?? 0);
      const sprintPoints = history.reduce((sum, record) => {
        const isSprintWeekend = record.meetingKey
          ? weekendByMeetingKey.get(record.meetingKey)?.isSprintWeekend
          : false;
        return sum + (isSprintWeekend ? (record.userPredictions[summary.userName]?.pointsEarned ?? 0) : 0);
      }, 0);
      const standardPoints = summary.seasonPoints - sprintPoints;

      return {
        userName: summary.userName,
        seasonPoints: summary.seasonPoints,
        averagePointsPerRace: summary.averagePointsPerRace,
        totalHitRate: summary.totalHitRate,
        sprintPoints,
        standardPoints,
        consistencyIndex: calculateConsistencyIndex(userRacePoints),
        leaderGap: leaderPoints - summary.seasonPoints,
      };
    })
    .sort((firstEntry, secondEntry) => {
      if (secondEntry.seasonPoints !== firstEntry.seasonPoints) {
        return secondEntry.seasonPoints - firstEntry.seasonPoints;
      }

      return firstEntry.userName.localeCompare(secondEntry.userName, 'it');
    });
}

function buildSeasonNarratives(comparison: SeasonComparisonPoint[]): SeasonNarrative[] {
  if (comparison.length === 0) {
    return [];
  }

  const bestCharge = [...comparison].sort((firstEntry, secondEntry) => {
    if (firstEntry.leaderGap !== secondEntry.leaderGap) {
      return firstEntry.leaderGap - secondEntry.leaderGap;
    }

    return secondEntry.averagePointsPerRace - firstEntry.averagePointsPerRace;
  })[0];
  const mostConsistent = [...comparison].sort((firstEntry, secondEntry) => {
    if (secondEntry.consistencyIndex !== firstEntry.consistencyIndex) {
      return secondEntry.consistencyIndex - firstEntry.consistencyIndex;
    }

    return secondEntry.seasonPoints - firstEntry.seasonPoints;
  })[0];
  const sprintLeader = [...comparison].sort((firstEntry, secondEntry) => {
    if (secondEntry.sprintPoints !== firstEntry.sprintPoints) {
      return secondEntry.sprintPoints - firstEntry.sprintPoints;
    }

    return secondEntry.totalHitRate - firstEntry.totalHitRate;
  })[0];
  const mostPrecise = [...comparison].sort((firstEntry, secondEntry) => {
    if (secondEntry.totalHitRate !== firstEntry.totalHitRate) {
      return secondEntry.totalHitRate - firstEntry.totalHitRate;
    }

    return secondEntry.seasonPoints - firstEntry.seasonPoints;
  })[0];

  return [
    {
      slug: 'charge',
      title: 'Chi tiene il passo del leader',
      description: `${bestCharge.userName} ha il gap piu' basso dalla vetta.`,
      userName: bestCharge.userName,
    },
    {
      slug: 'consistency',
      title: "Il piu' costante",
      description: `${mostConsistent.userName} mantiene il rendimento piu' stabile GP dopo GP.`,
      userName: mostConsistent.userName,
    },
    {
      slug: 'sprint',
      title: 'Specialista Sprint',
      description: `${sprintLeader.userName} converte meglio i weekend Sprint.`,
      userName: sprintLeader.userName,
    },
    {
      slug: 'precision',
      title: "Il piu' preciso",
      description: `${mostPrecise.userName} ha l'hit rate migliore sui pronostici.`,
      userName: mostPrecise.userName,
    },
  ];
}

function buildRaceRecap(history: RaceRecord[]): RaceRecapSummary | null {
  const lastRecord = history[0];
  if (!lastRecord) {
    return null;
  }

  const ranking = Object.entries(lastRecord.userPredictions).sort((firstEntry, secondEntry) => {
    if (secondEntry[1].pointsEarned !== firstEntry[1].pointsEarned) {
      return secondEntry[1].pointsEarned - firstEntry[1].pointsEarned;
    }

    return firstEntry[0].localeCompare(secondEntry[0], 'it');
  });
  const winnerEntry = ranking[0];
  const runnerUpEntry = ranking[1];
  const fieldHits = trackedFields.map((field) => ({
    field,
    hits: ranking.reduce((sum, [, value]) => {
      return sum + (value.prediction[field] && value.prediction[field] === lastRecord.results[field] ? 1 : 0);
    }, 0),
  })).sort((firstEntry, secondEntry) => {
    if (firstEntry.hits !== secondEntry.hits) {
      return firstEntry.hits - secondEntry.hits;
    }

    return trackedFields.indexOf(firstEntry.field) - trackedFields.indexOf(secondEntry.field);
  });

  return {
    gpName: lastRecord.gpName,
    winnerName: winnerEntry?.[0] ?? '',
    winnerPoints: winnerEntry?.[1].pointsEarned ?? 0,
    swingLabel: runnerUpEntry
      ? `Gap sul secondo: ${(winnerEntry?.[1].pointsEarned ?? 0) - runnerUpEntry[1].pointsEarned} pt`
      : 'Weekend senza inseguitori diretti',
    decisiveField: fieldHits[0]?.hits === 0 ? fieldHits[0]?.field ?? null : fieldHits[0]?.field ?? null,
  };
}

function buildSeasonAnalytics(users: UserData[], history: RaceRecord[], calendar: RaceWeekend[]): SeasonAnalyticsSummary {
  const comparison = buildSeasonComparison(users, history, calendar);

  return {
    comparison,
    leaderName: comparison[0]?.userName ?? '',
    narratives: buildSeasonNarratives(comparison),
    recap: buildRaceRecap(history),
  };
}

function buildUserAnalytics(history: RaceRecord[], userName: string): UserAnalyticsSummary {
  const trend = buildTrend(userName, history);
  const cumulativeTrend = buildCumulativeTrend(trend);
  const sortedTrend = [...trend].sort((firstPoint, secondPoint) => {
    if (secondPoint.points !== firstPoint.points) {
      return secondPoint.points - firstPoint.points;
    }

    return firstPoint.gpName.localeCompare(secondPoint.gpName, 'it');
  });

  return {
    userName,
    bestWeekend: sortedTrend[0] ?? null,
    worstWeekend: sortedTrend.length > 0 ? sortedTrend[sortedTrend.length - 1] : null,
    mostPickedDriverId: buildMostPickedDriverId(userName, history),
    fieldAccuracy: buildFieldAccuracy(userName, history),
    trend,
    cumulativeTrend,
    pointsByField: buildPointsByField(userName, history),
    weekendsAboveLeader: history.reduce((sum, record) => {
      const leaderScore = Math.max(...Object.values(record.userPredictions).map((entry) => entry.pointsEarned), 0);
      return sum + ((record.userPredictions[userName]?.pointsEarned ?? 0) === leaderScore ? 1 : 0);
    }, 0),
  };
}

export {
  buildSeasonAnalytics,
  buildUserAnalytics,
  buildUserKpiSummaries,
  trackedFields,
};
