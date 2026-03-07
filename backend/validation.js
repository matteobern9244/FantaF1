import { getSelectedWeekendState, sanitizePrediction } from './weekend-state.js';

export function validateParticipants(incomingUsers, requiredParticipants) {
  if (!Array.isArray(incomingUsers)) return false;
  // We only enforce the total number of participants (exactly 3)
  return incomingUsers.length === requiredParticipants.length;
}

function extractSelectedWeekendPredictions(data, meetingKey) {
  const users = Array.isArray(data?.users) ? data.users : [];
  const weekendStateByMeetingKey =
    data?.weekendStateByMeetingKey && typeof data.weekendStateByMeetingKey === 'object'
      ? data.weekendStateByMeetingKey
      : null;

  if (
    typeof meetingKey !== 'string' ||
    !meetingKey.trim() ||
    !weekendStateByMeetingKey ||
    !Object.hasOwn(weekendStateByMeetingKey, meetingKey)
  ) {
    return users.map((user) => sanitizePrediction(user?.predictions));
  }

  const selectedWeekendState = getSelectedWeekendState(data?.weekendStateByMeetingKey, meetingKey);

  return users.map((user) => sanitizePrediction(selectedWeekendState.userPredictions[user.name]));
}

export function isRaceLocked(selectedRace, newData, currentData, now = new Date()) {
  if (!selectedRace) return false;

  const startTimeStr =
    selectedRace.raceStartTime || (selectedRace.endDate ? `${selectedRace.endDate}T14:00:00Z` : null);
  
  if (!startTimeStr) return false;

  // Robust parsing: handle potential space instead of T
  const normalizedTime = startTimeStr.replace(' ', 'T');
  const startTime = new Date(normalizedTime);
  
  if (isNaN(startTime.getTime())) return false;

  if (now >= startTime) {
    const selectedMeetingKey =
      (typeof newData?.selectedMeetingKey === 'string' && newData.selectedMeetingKey.trim()) ||
      (typeof currentData?.selectedMeetingKey === 'string' && currentData.selectedMeetingKey.trim()) ||
      /* v8 ignore next -- empty meeting keys are not meaningful for lock enforcement */
      selectedRace.meetingKey ||
      '';
    const predictionsChanged =
      JSON.stringify(extractSelectedWeekendPredictions(currentData, selectedMeetingKey)) !==
      JSON.stringify(extractSelectedWeekendPredictions(newData, selectedMeetingKey));

    return predictionsChanged;
  }
  return false;
}

export function validatePredictions(users, fieldOrder, weekendStateByMeetingKey, selectedMeetingKey) {
  if (!Array.isArray(users) || !Array.isArray(fieldOrder)) return false;

  const selectedWeekendState =
    typeof selectedMeetingKey === 'string' &&
    selectedMeetingKey.trim() &&
    weekendStateByMeetingKey &&
    typeof weekendStateByMeetingKey === 'object' &&
    Object.hasOwn(weekendStateByMeetingKey, selectedMeetingKey)
      ? getSelectedWeekendState(weekendStateByMeetingKey, selectedMeetingKey)
      : null;
  const predictionUsers =
    selectedWeekendState
      ? users.map((user) => ({
          predictions: selectedWeekendState.userPredictions[user.name],
        }))
      : users;
  let filledCount = 0;

  predictionUsers.forEach((user) => {
    fieldOrder.forEach((field) => {
      const value = typeof user?.predictions?.[field] === 'string' ? user.predictions[field].trim() : '';
      if (value) {
        filledCount++;
      }
    });
  });

  return filledCount > 0;
}
