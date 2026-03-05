import type { RaceWeekend } from '../types';

export interface SessionTimeParts {
  label: string;
  dayLabel: string;
  dateLabel: string;
  timeLabel: string;
}

function getDateValue(weekend: RaceWeekend) {
  const parsedValue = Date.parse(weekend.startDate ?? weekend.endDate ?? '');
  return Number.isNaN(parsedValue) ? Number.POSITIVE_INFINITY : parsedValue;
}

function getSessionDate(isoString: string) {
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function sortCalendarByRound(calendar: RaceWeekend[]): RaceWeekend[] {
  return [...calendar].sort((firstWeekend, secondWeekend) => {
    if (firstWeekend.roundNumber !== secondWeekend.roundNumber) {
      return firstWeekend.roundNumber - secondWeekend.roundNumber;
    }

    return getDateValue(firstWeekend) - getDateValue(secondWeekend);
  });
}

export function getNextUpcomingRace(calendar: RaceWeekend[]): RaceWeekend | null {
  if (calendar.length === 0) {
    return null;
  }

  const sortedCalendar = sortCalendarByRound(calendar);
  const now = Date.now();

  return (
    sortedCalendar.find((weekend) => {
      const parsedEndDate = Date.parse(weekend.endDate ?? weekend.startDate ?? '');
      if (Number.isNaN(parsedEndDate)) {
        return false;
      }

      return parsedEndDate >= now;
    }) ?? sortedCalendar[0]
  );
}

export function getRaceByMeetingKey(
  calendar: RaceWeekend[],
  meetingKey: string,
): RaceWeekend | null {
  return calendar.find((weekend) => weekend.meetingKey === meetingKey) ?? null;
}

export function translateSessionName(name: string) {
  const translations: Record<string, string> = {
    'Practice 1': 'Prove Libere 1',
    'Practice 2': 'Prove Libere 2',
    'Practice 3': 'Prove Libere 3',
    'Qualifying': 'Qualifiche',
    'Sprint Shootout': 'Qualifiche Sprint',
    'Sprint Qualifying': 'Qualifiche Sprint',
    'Sprint': 'Gara Sprint',
    'Race': 'Gara',
    'Grand Prix': 'Gara',
  };

  const cleanName = name.split(' - ')[0].trim();
  return translations[cleanName] || translations[name] || name;
}

export function formatSessionTime(isoString: string) {
  const parts = formatSessionTimeParts(isoString);
  return parts?.label ?? '';
}

export function formatSessionTimeParts(isoString: string): SessionTimeParts | null {
  const date = getSessionDate(isoString);
  if (!date) {
    return null;
  }

  const dayName = date.toLocaleDateString('it-IT', { weekday: 'long' });
  const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const dateLabel = `${day}/${month}/${year}`;
  const timeLabel = `${hours}:${minutes}`;

  return {
    label: `${capitalizedDay} ${dateLabel} ${timeLabel}`,
    dayLabel: capitalizedDay,
    dateLabel,
    timeLabel,
  };
}
