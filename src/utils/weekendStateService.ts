import type {
  AppData,
  RaceWeekend,
  SessionState,
  UserData,
  WeekendStateByMeetingKey,
} from '../types';
import { buildEmptyAppData, getNextRaceAfter, resolveSelectedRace } from './appHelpers';
import {
  getWeekendPredictionState,
  hydrateAppDataForWeekend,
  hydrateUsersForWeekend,
  normalizeWeekendStateByMeetingKey,
  upsertWeekendPredictionState,
} from './weekendState';

class WeekendStateAssembler {
  initializeLoadedAppData({
    incomingData,
    calendar,
    requestedMeetingKey,
    fallbackSessionState,
    sessionState,
  }: {
    incomingData: AppData;
    calendar: RaceWeekend[];
    requestedMeetingKey: string;
    fallbackSessionState: SessionState;
    sessionState?: SessionState;
  }) {
    const fallbackData = buildEmptyAppData(calendar);
    const resolvedSessionState = sessionState ?? fallbackSessionState;
    const resolvedRace =
      resolveSelectedRace(calendar, requestedMeetingKey || incomingData.selectedMeetingKey) ??
      getNextRaceAfter(calendar, null);
    const resolvedMeetingKey = resolvedRace?.meetingKey ?? fallbackData.selectedMeetingKey;
    const initialWeekendStateByMeetingKey = resolvedMeetingKey
      ? upsertWeekendPredictionState(
          normalizeWeekendStateByMeetingKey(incomingData.weekendStateByMeetingKey),
          resolvedMeetingKey,
          incomingData.users,
          incomingData.raceResults,
        )
      : normalizeWeekendStateByMeetingKey(incomingData.weekendStateByMeetingKey);
    const hydratedIncomingData = resolvedMeetingKey
      ? hydrateAppDataForWeekend(
          {
            ...incomingData,
            selectedMeetingKey: resolvedMeetingKey,
            weekendStateByMeetingKey: initialWeekendStateByMeetingKey,
          },
          resolvedMeetingKey,
        )
      : {
          ...incomingData,
          weekendStateByMeetingKey: initialWeekendStateByMeetingKey,
        };

    return {
      hydratedIncomingData,
      initialWeekendStateByMeetingKey,
      resolvedMeetingKey,
      resolvedRace,
      resolvedSessionState,
      fallbackData,
    };
  }

  hydrateSelectedWeekendView(
    weekendStateByMeetingKey: WeekendStateByMeetingKey,
    meetingKey: string,
    baseUsers: UserData[],
  ) {
    const selectedWeekendState = getWeekendPredictionState(weekendStateByMeetingKey, meetingKey);

    return {
      users: hydrateUsersForWeekend(baseUsers, selectedWeekendState),
      raceResults: selectedWeekendState.raceResults,
    };
  }

  buildPersistedPayload(
    payloadBase: AppData,
    { editingSession }: { editingSession: boolean },
  ): AppData {
    if (editingSession) {
      return {
        ...payloadBase,
        weekendStateByMeetingKey: normalizeWeekendStateByMeetingKey(
          payloadBase.weekendStateByMeetingKey,
        ),
      };
    }

    return {
      ...payloadBase,
      weekendStateByMeetingKey: upsertWeekendPredictionState(
        normalizeWeekendStateByMeetingKey(payloadBase.weekendStateByMeetingKey),
        payloadBase.selectedMeetingKey,
        payloadBase.users,
        payloadBase.raceResults,
      ),
    };
  }
}

export { WeekendStateAssembler };
