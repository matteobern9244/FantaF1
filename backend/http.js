import { randomUUID } from 'crypto';

const SAVE_ERROR_STATUS = {
  participants_invalid: 400,
  race_locked: 403,
  database_target_mismatch: 500,
  storage_write_failed: 500,
  save_unexpected_error: 500,
};

function createRequestId() {
  return randomUUID();
}

function buildHealthPayload({ currentYear, dbState, environment, databaseTarget }) {
  return {
    status: 'ok',
    year: currentYear,
    dbState,
    environment,
    databaseTarget,
  };
}

function extractErrorDetails(error) {
  if (error instanceof Error) {
    return error.stack || error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function classifySaveError(error) {
  const details = extractErrorDetails(error);
  const normalizedDetails = details.toLowerCase();

  if (normalizedDetails.includes('invalid participants list')) {
    return 'participants_invalid';
  }

  if (normalizedDetails.includes('pronostici sono bloccati')) {
    return 'race_locked';
  }

  if (
    normalizedDetails.includes('mongodb_uri targets') ||
    normalizedDetails.includes('connected to unexpected mongodb database')
  ) {
    return 'database_target_mismatch';
  }

  if (
    normalizedDetails.includes('mongo') ||
    normalizedDetails.includes('ecast') ||
    normalizedDetails.includes('validationerror') ||
    normalizedDetails.includes('storage error')
  ) {
    return 'storage_write_failed';
  }

  return 'save_unexpected_error';
}

function buildSaveErrorPayload({ environment, requestId, code, error, details }) {
  const payload = {
    error,
    code,
    requestId,
  };

  if (environment !== 'production' && details) {
    payload.details = details;
  }

  return payload;
}

function buildSaveErrorResponse({ environment, requestId, code, error, details }) {
  return {
    status: SAVE_ERROR_STATUS[code] ?? 500,
    payload: buildSaveErrorPayload({
      environment,
      requestId,
      code,
      error,
      details,
    }),
  };
}

export {
  buildHealthPayload,
  buildSaveErrorPayload,
  buildSaveErrorResponse,
  classifySaveError,
  createRequestId,
  extractErrorDetails,
};
