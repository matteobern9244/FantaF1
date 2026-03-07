import 'dotenv/config'; // Load env vars
import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { syncCalendarFromOfficialSource, sortCalendarByRound, fetchRaceResults } from './backend/calendar.js';
import { appConfig, currentYear } from './backend/config.js';
import {
  determineExpectedMongoDatabaseName,
  normalizeRuntimeEnvironment,
} from './backend/database.js';
import {
  buildHealthPayload,
  buildSaveErrorResponse,
  classifySaveError,
  createRequestId,
  extractErrorDetails,
} from './backend/http.js';
import {
  buildSessionClearCookie,
  buildSessionCookie,
  ensureAdminCredentials,
  readAdminSession,
  verifyAdminPassword,
} from './backend/auth.js';
import { sortDriversAlphabetically } from './backend/drivers.js';
import {
  readAppData,
  readCalendarCache,
  readDriversCache,
  readPersistedParticipantRoster,
  writeAppData,
} from './backend/storage.js';
import { getSelectedWeekendState, normalizeWeekendBoost, sanitizeWeekendStateByMeetingKey } from './backend/weekend-state.js';
import { isRaceLocked, validateParticipants, validatePredictions } from './backend/validation.js';
import { verifyMongoDatabaseName } from './backend/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const runtimeEnvironment = normalizeRuntimeEnvironment(process.env.NODE_ENV);
const databaseTargetName = determineExpectedMongoDatabaseName(process.env.NODE_ENV);
const predictionFieldOrder = ['first', 'second', 'third', 'pole'];
const allowedWeekendBoosts = new Set(['none', 'first', 'second', 'third', 'pole']);
const participantSlots = Number.isFinite(Number(appConfig.participantSlots))
  ? Number(appConfig.participantSlots)
  : 3;

app.use(cors());
app.use(express.json());

function isProductionEnvironment() {
  return runtimeEnvironment === 'production';
}

function getDefaultViewMode() {
  return isProductionEnvironment() ? 'public' : 'admin';
}

function isAdminRequest(req) {
  if (!isProductionEnvironment()) {
    return true;
  }

  return Boolean(readAdminSession(req));
}

function requireAdminSession(req, res) {
  if (isAdminRequest(req)) {
    return true;
  }

  res.status(401).json({
    error: 'Admin authentication required',
    code: 'admin_auth_required',
  });

  return false;
}

function hasRaceStarted(selectedRace, now = new Date()) {
  if (!selectedRace) {
    return false;
  }

  const startTimeStr =
    selectedRace.raceStartTime || (selectedRace.endDate ? `${selectedRace.endDate}T14:00:00Z` : null);

  if (!startTimeStr) {
    return false;
  }

  const startTime = new Date(startTimeStr.replace(' ', 'T'));
  if (Number.isNaN(startTime.getTime())) {
    return false;
  }

  return now >= startTime;
}

function updateBoostState(appData, meetingKey, userName, boost, { locked }) {
  const weekendStateByMeetingKey = sanitizeWeekendStateByMeetingKey(appData.weekendStateByMeetingKey);
  const selectedWeekendState = getSelectedWeekendState(weekendStateByMeetingKey, meetingKey);

  return {
    ...appData,
    selectedMeetingKey: meetingKey,
    weekendStateByMeetingKey: {
      ...weekendStateByMeetingKey,
      [meetingKey]: {
        ...selectedWeekendState,
        weekendBoostByUser: {
          ...selectedWeekendState.weekendBoostByUser,
          [userName]: normalizeWeekendBoost(boost),
        },
        weekendBoostLockedByUser: {
          ...selectedWeekendState.weekendBoostLockedByUser,
          [userName]: Boolean(locked),
        },
      },
    },
  };
}

function isExplicitValidWeekendBoost(value) {
  return typeof value === 'string' && allowedWeekendBoosts.has(value.trim());
}

// 1. Health check route
app.get(appConfig.api.healthPath, (req, res) => {
  res.json(
    buildHealthPayload({
      currentYear,
      dbState: mongoose.connection.readyState,
      environment: runtimeEnvironment,
      databaseTarget: databaseTargetName,
    }),
  );
});

app.get('/api/session', async (req, res) => {
  await ensureAdminCredentials();
  res.json({
    isAdmin: isAdminRequest(req),
    defaultViewMode: getDefaultViewMode(),
  });
});

app.post('/api/admin/session', async (req, res) => {
  await ensureAdminCredentials();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const isPasswordValid = await verifyAdminPassword(password);

  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid password', code: 'admin_auth_invalid' });
  }

  res.setHeader('Set-Cookie', buildSessionCookie({ isProduction: isProductionEnvironment() }));
  res.json({ isAdmin: true, defaultViewMode: getDefaultViewMode() });
});

app.delete('/api/admin/session', (req, res) => {
  res.setHeader('Set-Cookie', buildSessionClearCookie({ isProduction: isProductionEnvironment() }));
  res.json({ isAdmin: false, defaultViewMode: getDefaultViewMode() });
});

// 2. API Routes
app.get(appConfig.api.dataPath, async (req, res) => {
  try {
    const data = await readAppData();
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to read app data' });
  }
});

app.get(appConfig.api.driversPath, async (req, res) => {
  try {
    const cachedDrivers = sortDriversAlphabetically(await readDriversCache());
    res.json(cachedDrivers);
  } catch {
    res.status(500).json({ error: 'Failed to read drivers' });
  }
});

app.get(appConfig.api.calendarPath, async (req, res) => {
  try {
    const cachedCalendar = sortCalendarByRound(await readCalendarCache());
    res.json(cachedCalendar);
  } catch {
    res.status(500).json({ error: 'Failed to read calendar' });
  }
});

app.get('/api/results/:meetingKey', async (req, res) => {
  try {
    const results = await fetchRaceResults(req.params.meetingKey);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch results', details: error.message });
  }
});

function buildParticipantsInvalidResponse(newData, requestId) {
  const participantError = `Invalid participants list. Expected ${participantSlots} participants.`;

  return buildSaveErrorResponse({
    environment: runtimeEnvironment,
    requestId,
    code: 'participants_invalid',
    error: participantError,
    details: `Expected ${participantSlots} participants, received ${Array.isArray(newData?.users) ? newData.users.length : 'unknown'}.`,
  });
}

function buildPredictionsMissingResponse(requestId) {
  return buildSaveErrorResponse({
    environment: runtimeEnvironment,
    requestId,
    code: 'predictions_missing',
    error: appConfig.uiText.alerts.missingPredictions,
    details: 'At least one prediction is required for manual predictions save.',
  });
}

async function handleSaveRequest(req, res, { requirePredictions = false, routePath }) {
  const requestId = createRequestId();

  try {
    if (!requireAdminSession(req, res)) {
      return;
    }

    verifyMongoDatabaseName(mongoose.connection.db?.databaseName, databaseTargetName);

    const newData = req.body;
    const persistedParticipantRoster = await readPersistedParticipantRoster();

    if (!validateParticipants(newData?.users, persistedParticipantRoster, participantSlots)) {
      const response = buildParticipantsInvalidResponse(newData, requestId);
      return res.status(response.status).json(response.payload);
    }

    const calendar = await readCalendarCache();
    const selectedRace = calendar.find(r => r.meetingKey === newData?.selectedMeetingKey);
    
    if (selectedRace) {
      const currentData = await readAppData();
      if (isRaceLocked(selectedRace, newData, currentData)) {
        const response = buildSaveErrorResponse({
          environment: runtimeEnvironment,
          requestId,
          code: 'race_locked',
          error: appConfig.uiText.calendar.raceLocked,
          /* v8 ignore next -- the "unknown" fallback requires an impossible locked race without timing metadata */
          details: `Race ${selectedRace.meetingKey} started at ${selectedRace.raceStartTime || selectedRace.endDate || 'unknown'} and current predictions differ from stored data.`,
        });

        return res.status(response.status).json(response.payload);
      }
    }

    if (
      requirePredictions &&
      !validatePredictions(
        newData?.users,
        predictionFieldOrder,
        newData?.weekendStateByMeetingKey,
        newData?.selectedMeetingKey,
      )
    ) {
      const response = buildPredictionsMissingResponse(requestId);
      return res.status(response.status).json(response.payload);
    }

    await writeAppData(newData);
    res.json({ message: appConfig.uiText.backend.messages.saveSuccess });
  } catch (error) {
    const code = classifySaveError(error);
    const details = extractErrorDetails(error);
    const response = buildSaveErrorResponse({
      environment: runtimeEnvironment,
      requestId,
      code,
      error: appConfig.uiText.backend.errors.saveFailed,
      details,
    });

    console.error(
      `[Error Backend] POST ${routePath} fallito [requestId=${requestId}] [environment=${runtimeEnvironment}] [databaseTarget=${databaseTargetName}] [code=${code}]`,
      error,
    );

    res.status(response.status).json(response.payload);
  }
}

app.post(appConfig.api.dataPath, async (req, res) => {
  await handleSaveRequest(req, res, {
    requirePredictions: false,
    routePath: appConfig.api.dataPath,
  });
});

app.post(appConfig.api.predictionsPath, async (req, res) => {
  await handleSaveRequest(req, res, {
    requirePredictions: true,
    routePath: appConfig.api.predictionsPath,
  });
});

app.post('/api/public-boost', async (req, res) => {
  try {
    verifyMongoDatabaseName(mongoose.connection.db?.databaseName, databaseTargetName);
    const { meetingKey, userName, boost } = req.body ?? {};
    const normalizedMeetingKey = typeof meetingKey === 'string' ? meetingKey.trim() : '';
    const normalizedUserName = typeof userName === 'string' ? userName.trim() : '';
    const normalizedBoost = normalizeWeekendBoost(boost);
    const currentData = await readAppData();

    if (!normalizedMeetingKey || !normalizedUserName) {
      return res.status(400).json({ error: 'Invalid boost payload', code: 'public_boost_invalid' });
    }

    if (!currentData.users.some((user) => user.name === normalizedUserName)) {
      return res.status(400).json({ error: 'Unknown player', code: 'public_boost_unknown_user' });
    }

    const calendar = await readCalendarCache();
    const selectedRace = calendar.find((weekend) => weekend.meetingKey === normalizedMeetingKey);
    if (hasRaceStarted(selectedRace)) {
      return res.status(403).json({ error: appConfig.uiText.calendar.raceLocked, code: 'public_boost_locked' });
    }

    const selectedWeekendState = getSelectedWeekendState(
      currentData.weekendStateByMeetingKey,
      normalizedMeetingKey,
    );
    if (selectedWeekendState.weekendBoostLockedByUser[normalizedUserName]) {
      return res.status(409).json({ error: 'Boost already saved', code: 'public_boost_already_locked' });
    }

    const updatedData = updateBoostState(currentData, normalizedMeetingKey, normalizedUserName, normalizedBoost, {
      locked: true,
    });

    await writeAppData(updatedData);
    res.json({
      message: 'Boost salvato correttamente.',
      weekendBoostByUser: updatedData.weekendStateByMeetingKey[normalizedMeetingKey].weekendBoostByUser,
      weekendBoostLockedByUser:
        updatedData.weekendStateByMeetingKey[normalizedMeetingKey].weekendBoostLockedByUser,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save public boost', details: error.message });
  }
});

app.post('/api/admin/boost', async (req, res) => {
  try {
    if (!requireAdminSession(req, res)) {
      return;
    }

    verifyMongoDatabaseName(mongoose.connection.db?.databaseName, databaseTargetName);
    const { meetingKey, userName, boost, locked = true } = req.body ?? {};
    const normalizedMeetingKey = typeof meetingKey === 'string' ? meetingKey.trim() : '';
    const normalizedUserName = typeof userName === 'string' ? userName.trim() : '';
    const currentData = await readAppData();
    const calendar = await readCalendarCache();

    if (!normalizedMeetingKey) {
      return res.status(400).json({ error: 'Invalid meeting key', code: 'admin_boost_invalid_meeting' });
    }

    const selectedRace = calendar.find((weekend) => weekend.meetingKey === normalizedMeetingKey);
    if (!selectedRace) {
      return res.status(400).json({ error: 'Unknown meeting key', code: 'admin_boost_unknown_meeting' });
    }

    if (!currentData.users.some((user) => user.name === normalizedUserName)) {
      return res.status(400).json({ error: 'Unknown player', code: 'admin_boost_unknown_user' });
    }

    if (!isExplicitValidWeekendBoost(boost)) {
      return res.status(400).json({ error: 'Invalid boost value', code: 'admin_boost_invalid_value' });
    }

    if (Object.hasOwn(req.body ?? {}, 'locked') && typeof locked !== 'boolean') {
      return res.status(400).json({ error: 'Invalid locked flag', code: 'admin_boost_invalid_locked' });
    }

    const updatedData = updateBoostState(currentData, normalizedMeetingKey, normalizedUserName, boost, {
      locked,
    });
    await writeAppData(updatedData);
    res.json({ message: 'Boost admin aggiornato correttamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save admin boost', details: error.message });
  }
});

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API Endpoint not found' });
  }
  /* v8 ignore next -- SPA static fallback depends on built assets and is exercised outside unit tests */
  res.sendFile(path.join(distPath, 'index.html'));
});

export default app;
