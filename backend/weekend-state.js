function createEmptyPrediction() {
  return {
    first: '',
    second: '',
    third: '',
    pole: '',
  };
}

function sanitizePrediction(value) {
  return {
    first: typeof value?.first === 'string' ? value.first : '',
    second: typeof value?.second === 'string' ? value.second : '',
    third: typeof value?.third === 'string' ? value.third : '',
    pole: typeof value?.pole === 'string' ? value.pole : '',
  };
}

function createEmptyWeekendState() {
  return {
    userPredictions: {},
    raceResults: createEmptyPrediction(),
  };
}

function sanitizeWeekendState(value) {
  const rawUserPredictions =
    value?.userPredictions instanceof Map
      ? Object.fromEntries(value.userPredictions)
      : value?.userPredictions || {};
  const safeUserPredictions = Object.fromEntries(
    Object.entries(rawUserPredictions).map(([userName, prediction]) => [
      userName,
      sanitizePrediction(prediction),
    ]),
  );

  return {
    userPredictions: safeUserPredictions,
    raceResults: sanitizePrediction(value?.raceResults),
  };
}

function sanitizeWeekendStateByMeetingKey(value) {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const rawWeekendStateByMeetingKey =
    value instanceof Map ? Object.fromEntries(value) : value;

  return Object.fromEntries(
    Object.entries(rawWeekendStateByMeetingKey)
      .filter(([meetingKey]) => typeof meetingKey === 'string' && meetingKey.trim())
      .map(([meetingKey, weekendState]) => [meetingKey.trim(), sanitizeWeekendState(weekendState)]),
  );
}

function buildWeekendStateFromUsers(users, raceResults) {
  return {
    userPredictions: Object.fromEntries(
      (Array.isArray(users) ? users : []).map((user) => [
        user.name,
        sanitizePrediction(user?.predictions),
      ]),
    ),
    raceResults: sanitizePrediction(raceResults),
  };
}

function upsertSelectedWeekendState(
  weekendStateByMeetingKey,
  selectedMeetingKey,
  users,
  raceResults,
) {
  const safeWeekendStateByMeetingKey = sanitizeWeekendStateByMeetingKey(weekendStateByMeetingKey);

  if (typeof selectedMeetingKey !== 'string' || !selectedMeetingKey.trim()) {
    return safeWeekendStateByMeetingKey;
  }

  return {
    ...safeWeekendStateByMeetingKey,
    [selectedMeetingKey.trim()]: buildWeekendStateFromUsers(
      users,
      raceResults,
      getSelectedWeekendState(safeWeekendStateByMeetingKey, selectedMeetingKey),
    ),
  };
}

function getSelectedWeekendState(weekendStateByMeetingKey, selectedMeetingKey) {
  if (typeof selectedMeetingKey !== 'string' || !selectedMeetingKey.trim()) {
    return createEmptyWeekendState();
  }

  const safeWeekendStateByMeetingKey = sanitizeWeekendStateByMeetingKey(weekendStateByMeetingKey);

  return sanitizeWeekendState(safeWeekendStateByMeetingKey[selectedMeetingKey.trim()]);
}

function hydrateUsersForSelectedWeekend(users, weekendState) {
  const safeWeekendState = sanitizeWeekendState(weekendState);

  return (Array.isArray(users) ? users : []).map((user) => ({
    ...user,
    predictions: sanitizePrediction(safeWeekendState.userPredictions[user.name]),
  }));
}

function hasAnyPredictionValue(users) {
  return (Array.isArray(users) ? users : []).some((user) =>
    Object.values(sanitizePrediction(user?.predictions)).some((value) => value.trim()),
  );
}

export {
  buildWeekendStateFromUsers,
  createEmptyPrediction,
  createEmptyWeekendState,
  getSelectedWeekendState,
  hasAnyPredictionValue,
  hydrateUsersForSelectedWeekend,
  sanitizePrediction,
  sanitizeWeekendState,
  sanitizeWeekendStateByMeetingKey,
  upsertSelectedWeekendState,
};
