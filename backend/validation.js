export function validateParticipants(incomingUsers, requiredParticipants) {
  if (!Array.isArray(incomingUsers)) return false;
  // We only enforce the total number of participants (exactly 3)
  return incomingUsers.length === requiredParticipants.length;
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
