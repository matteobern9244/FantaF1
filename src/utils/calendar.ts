import type { RaceWeekend } from '../types';

function getDateValue(weekend: RaceWeekend) {
  const parsedValue = Date.parse(weekend.startDate ?? weekend.endDate ?? '');
  return Number.isNaN(parsedValue) ? Number.POSITIVE_INFINITY : parsedValue;
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
