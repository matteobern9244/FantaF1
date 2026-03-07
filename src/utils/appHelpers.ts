import { appConfig, predictionFieldOrder } from '../constants';
import type { AppData, Prediction, RaceWeekend } from '../types';
import { getNextUpcomingRace, getRaceByMeetingKey, sortCalendarByRound } from './calendar';
import { createEmptyPrediction, createInitialUsers } from './game';

const { participants } = appConfig;

type OfficialResultsAvailability = 'none' | 'partial' | 'complete';

function formatText(template: string, replacements: Record<string, string | number>) {
  return Object.entries(replacements).reduce((value, [key, replacement]) => {
    return value.split(`{${key}}`).join(String(replacement));
  }, template);
}

function normalizeMeetingName(value: string) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function hasPredictionValue(value: string) {
  return String(value ?? '').trim().length > 0;
}

function getOfficialResultsAvailability(raceResults: Prediction): OfficialResultsAvailability {
  const filledFields = predictionFieldOrder.filter((field) => hasPredictionValue(raceResults[field]));

  if (filledFields.length === 0) {
    return 'none';
  }

  if (filledFields.length === predictionFieldOrder.length) {
    return 'complete';
  }

  return 'partial';
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`${response.status}`);
  }

  return response.json() as Promise<T>;
}

/* v8 ignore start -- retry timing is covered indirectly and branch accounting on transpiled async loops is unstable */
async function fetchWithRetry<T>(url: string, maxAttempts = 3): Promise<T> {
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      return await fetchJson<T>(url);
    } catch (error) {
      attempt++;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        throw error;
      }
    }
  }
  /* v8 ignore next -- defensive guard for impossible loop exhaustion */
  throw new Error(`Failed to fetch ${url} after ${maxAttempts} attempts`);
}
/* v8 ignore stop */

function buildEmptyAppData(calendar: RaceWeekend[]): AppData {
  const fallbackRace = getNextUpcomingRace(calendar);

  return {
    users: createInitialUsers(participants),
    history: [],
    gpName: fallbackRace?.grandPrixTitle ?? fallbackRace?.meetingName ?? '',
    raceResults: createEmptyPrediction(),
    selectedMeetingKey: fallbackRace?.meetingKey ?? '',
    weekendStateByMeetingKey: {},
  };
}

function resolveSelectedRace(calendar: RaceWeekend[], selectedMeetingKey: string): RaceWeekend | null {
  return getRaceByMeetingKey(calendar, selectedMeetingKey) ?? getNextUpcomingRace(calendar);
}

function getNextRaceAfter(calendar: RaceWeekend[], currentRace: RaceWeekend | null): RaceWeekend | null {
  const sortedCalendar = sortCalendarByRound(calendar);

  if (!currentRace) {
    return getNextUpcomingRace(sortedCalendar);
  }

  const currentIndex = sortedCalendar.findIndex(
    (weekend) => weekend.meetingKey === currentRace.meetingKey,
  );

  if (currentIndex >= 0 && currentIndex < sortedCalendar.length - 1) {
    return sortedCalendar[currentIndex + 1];
  }

  return currentRace;
}

function getRaceStartTime(race: RaceWeekend | null) {
  const startTimeStr = race?.raceStartTime || (race?.endDate ? `${race.endDate}T14:00:00Z` : null);
  if (!startTimeStr) {
    return null;
  }

  const normalizedTime = startTimeStr.replace(' ', 'T');
  const startTime = new Date(normalizedTime);
  return Number.isNaN(startTime.getTime()) ? null : startTime;
}

function getRaceFinishTime(race: RaceWeekend | null) {
  const startTime = getRaceStartTime(race);
  if (!startTime) {
    return null;
  }

  return new Date(startTime.getTime() + 2.5 * 60 * 60 * 1000);
}

function isRaceStarted(race: RaceWeekend | null) {
  const startTime = getRaceStartTime(race);
  if (!startTime) {
    return false;
  }

  return new Date() >= startTime;
}

function isRaceFinished(race: RaceWeekend | null) {
  const finishTime = getRaceFinishTime(race);
  if (!finishTime) {
    return false;
  }

  return new Date() >= finishTime;
}

function isWeekendActive(race: RaceWeekend | null) {
  if (!race?.startDate) {
    return false;
  }

  const weekendStart = new Date(`${race.startDate}T00:00:00Z`);
  const weekendEnd =
    getRaceFinishTime(race) ??
    (race.endDate ? new Date(`${race.endDate}T23:59:59Z`) : null);

  if (!weekendEnd || Number.isNaN(weekendStart.getTime()) || Number.isNaN(weekendEnd.getTime())) {
    return false;
  }

  const now = new Date();
  return now >= weekendStart && now <= weekendEnd;
}

export {
  buildEmptyAppData,
  fetchJson,
  fetchWithRetry,
  formatText,
  getNextRaceAfter,
  getOfficialResultsAvailability,
  getRaceFinishTime,
  getRaceStartTime,
  hasPredictionValue,
  isRaceFinished,
  isRaceStarted,
  isWeekendActive,
  normalizeMeetingName,
  resolveSelectedRace,
};

export type { OfficialResultsAvailability };
