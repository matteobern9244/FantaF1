import { describe, expect, it } from 'vitest';
import type { AppData, RaceWeekend, SessionState, UserData, WeekendStateByMeetingKey } from '../src/types';
import { createEmptyPrediction } from '../src/utils/game';
import { WeekendStateAssembler } from '../src/utils/weekendStateService';

function createUsers(): UserData[] {
  return [
    { name: 'Player 1', points: 10, predictions: { first: 'ver', second: '', third: '', pole: '' } },
    { name: 'Player 2', points: 8, predictions: { first: 'ham', second: '', third: '', pole: '' } },
    { name: 'Player 3', points: 6, predictions: createEmptyPrediction() },
  ];
}

function createCalendar(): RaceWeekend[] {
  return [
    {
      meetingKey: 'race-1',
      meetingName: 'Australia',
      grandPrixTitle: 'Australian Grand Prix',
      roundNumber: 1,
      dateRangeLabel: '',
      detailUrl: '',
      heroImageUrl: '',
      trackOutlineUrl: '',
      isSprintWeekend: false,
      startDate: '2099-03-13',
      endDate: '2099-03-15',
    },
  ];
}

describe('WeekendStateAssembler', () => {
  it('hydrates loaded app data and ensures the selected weekend state exists', () => {
    const assembler = new WeekendStateAssembler();
    const fallbackSessionState: SessionState = {
      isAdmin: true,
      defaultViewMode: 'admin',
    };
    const appData: AppData = {
      users: createUsers(),
      history: [],
      gpName: 'Australian Grand Prix',
      raceResults: { first: '', second: '', third: '', pole: 'pia' },
      selectedMeetingKey: 'race-1',
      weekendStateByMeetingKey: {},
    };

    const result = assembler.initializeLoadedAppData({
      incomingData: appData,
      calendar: createCalendar(),
      requestedMeetingKey: '',
      fallbackSessionState,
    });

    expect(result.resolvedMeetingKey).toBe('race-1');
    expect(result.hydratedIncomingData.raceResults.pole).toBe('pia');
    expect(result.initialWeekendStateByMeetingKey['race-1'].userPredictions['Player 1'].first).toBe('ver');
    expect(result.resolvedSessionState).toEqual(fallbackSessionState);
  });

  it('hydrates selected weekend views and builds persisted payloads respecting editing mode', () => {
    const assembler = new WeekendStateAssembler();
    const weekendStateByMeetingKey: WeekendStateByMeetingKey = {
      'race-1': {
        userPredictions: {
          'Player 1': { first: 'ver', second: '', third: '', pole: '' },
          'Player 2': { first: 'ham', second: '', third: '', pole: '' },
          'Player 3': createEmptyPrediction(),
        },
        raceResults: { first: '', second: '', third: '', pole: 'nor' },
      },
    };
    const users = createUsers().map((user) => ({ ...user, predictions: createEmptyPrediction() }));

    expect(assembler.hydrateSelectedWeekendView(weekendStateByMeetingKey, 'race-1', users)).toEqual({
      users: [
        { ...users[0], predictions: { first: 'ver', second: '', third: '', pole: '' } },
        { ...users[1], predictions: { first: 'ham', second: '', third: '', pole: '' } },
        users[2],
      ],
      raceResults: { first: '', second: '', third: '', pole: 'nor' },
    });

    const payload: AppData = {
      users: createUsers(),
      history: [],
      gpName: 'Australian Grand Prix',
      raceResults: createEmptyPrediction(),
      selectedMeetingKey: 'race-1',
      weekendStateByMeetingKey: {},
    };

    expect(assembler.buildPersistedPayload(payload, { editingSession: false }).weekendStateByMeetingKey).toEqual({
      'race-1': {
        userPredictions: {
          'Player 1': { first: 'ver', second: '', third: '', pole: '' },
          'Player 2': { first: 'ham', second: '', third: '', pole: '' },
          'Player 3': createEmptyPrediction(),
        },
        raceResults: createEmptyPrediction(),
      },
    });
    expect(assembler.buildPersistedPayload(payload, { editingSession: true }).weekendStateByMeetingKey).toEqual({});
  });
});
