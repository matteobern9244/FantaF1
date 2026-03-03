export function validateParticipants(incomingUsers, requiredParticipants) {
  if (!Array.isArray(incomingUsers)) return false;
  const incomingNames = incomingUsers.map((u) => u.name);
  return (
    requiredParticipants.length === incomingNames.length &&
    requiredParticipants.every((p) => incomingNames.includes(p))
  );
}

export function isRaceLocked(selectedRace, newData, currentData, now = new Date()) {
  if (!selectedRace) return false;

  const startTimeStr =
    selectedRace.raceStartTime || (selectedRace.endDate ? `${selectedRace.endDate}T14:00:00Z` : null);
  
  if (!startTimeStr) return false;

  const startTime = new Date(startTimeStr);
  if (now >= startTime) {
    // Only block if trying to change CURRENT predictions
    const predictionsChanged =
      JSON.stringify(currentData.users.map((u) => u.predictions)) !==
      JSON.stringify(newData.users.map((u) => u.predictions));

    return predictionsChanged;
  }
  return false;
}

export function validatePredictions(users, fieldOrder) {
  if (!Array.isArray(users)) return false;

  let filledCount = 0;
  let totalCount = 0;

  users.forEach((user) => {
    fieldOrder.forEach((field) => {
      totalCount++;
      if (user.predictions[field]) {
        filledCount++;
      }
    });
  });

  const isAllEmpty = filledCount === 0;
  const isAllFilled = filledCount === totalCount;

  return isAllEmpty || isAllFilled;
}
