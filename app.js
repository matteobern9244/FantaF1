import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

import { loadEnv } from './backend/config-loader.js';

// Initialize environment
await loadEnv();

import { syncCalendarFromOfficialSource, sortCalendarByRound, fetchRaceResultsWithStatus } from './backend/calendar.js';
import { appConfig, currentYear } from './backend/config.js';
import {
  determineExpectedMongoDatabaseName,
  MONGO_DATABASE_NAME_OVERRIDE_ENV_VAR,
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
import { syncStandingsFromOfficialSource } from './backend/standings.js';
import { backendText, formatBackendText } from './backend/text.js';
import {
  readAppData,
  readCalendarCache,
  readDriversCache,
  readPersistedParticipantRoster,
  readStandingsCache,
  writeAppData,
} from './backend/storage.js';
import { isRaceLocked, validateParticipants, validatePredictions } from './backend/validation.js';
import { verifyMongoDatabaseName } from './backend/database.js';
import { SaveRequestService } from './backend/app-route-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const runtimeEnvironment = normalizeRuntimeEnvironment(process.env.NODE_ENV);
const databaseTargetName = determineExpectedMongoDatabaseName(process.env.NODE_ENV, {
  mongoDatabaseNameOverride: process.env[MONGO_DATABASE_NAME_OVERRIDE_ENV_VAR],
});
const predictionFieldOrder = ['first', 'second', 'third', 'pole'];
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
    error: backendText.auth.adminRequired,
    code: 'admin_auth_required',
  });

  return false;
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
    return res.status(401).json({ error: backendText.auth.invalidPassword, code: 'admin_auth_invalid' });
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
    res.status(500).json({ error: backendText.apiErrors.readAppDataFailed });
  }
});

app.get(appConfig.api.driversPath, async (req, res) => {
  try {
    const cachedDrivers = sortDriversAlphabetically(await readDriversCache());
    res.json(cachedDrivers);
  } catch {
    res.status(500).json({ error: backendText.apiErrors.readDriversFailed });
  }
});

app.get(appConfig.api.calendarPath, async (req, res) => {
  try {
    const cachedCalendar = sortCalendarByRound(await readCalendarCache());
    res.json(cachedCalendar);
  } catch {
    res.status(500).json({ error: backendText.apiErrors.readCalendarFailed });
  }
});

app.get(appConfig.api.standingsPath, async (req, res) => {
  try {
    const standings = await readStandingsCache();
    const hasCachedStandings =
      standings.driverStandings.length > 0 || standings.constructorStandings.length > 0;

    if (hasCachedStandings) {
      return res.json(standings);
    }

    const syncedStandings = await syncStandingsFromOfficialSource();
    res.json(syncedStandings);
  } catch {
    res.status(500).json({ error: backendText.apiErrors.readStandingsFailed });
  }
});

app.get('/api/results/:meetingKey', async (req, res) => {
  try {
    const resultsPayload = await fetchRaceResultsWithStatus(req.params.meetingKey);
    res.json(resultsPayload);
  } catch (error) {
    res.status(500).json({ error: backendText.apiErrors.fetchResultsFailed, details: error.message });
  }
});

function buildParticipantsInvalidResponse(newData, requestId) {
  const participantError = formatBackendText(backendText.save.participantsInvalidTemplate, {
    participantSlots,
  });

  return buildSaveErrorResponse({
    environment: runtimeEnvironment,
    requestId,
    code: 'participants_invalid',
    error: participantError,
    details: formatBackendText(backendText.save.participantsInvalidDetailsTemplate, {
      participantSlots,
      received: Array.isArray(newData?.users) ? newData.users.length : 'unknown',
    }),
  });
}

function buildPredictionsMissingResponse(requestId) {
  return buildSaveErrorResponse({
    environment: runtimeEnvironment,
    requestId,
    code: 'predictions_missing',
    error: appConfig.uiText.alerts.missingPredictions,
    details: backendText.save.predictionsMissingDetails,
  });
}

const saveRequestService = new SaveRequestService({
  requireAdminSession,
  verifyMongoDatabaseName,
  readPersistedParticipantRoster,
  validateParticipants,
  buildParticipantsInvalidResponse,
  readCalendarCache,
  readAppData,
  isRaceLocked,
  buildSaveErrorResponse,
  formatBackendText,
  backendText,
  appConfig,
  validatePredictions,
  buildPredictionsMissingResponse,
  writeAppData,
  classifySaveError,
  extractErrorDetails,
  runtimeEnvironment,
  databaseTargetName,
  participantSlots,
  predictionFieldOrder,
  createRequestId,
});
saveRequestService.getConnectedDatabaseName = () => mongoose.connection.db?.databaseName;

app.post(appConfig.api.dataPath, async (req, res) => {
  await saveRequestService.handleSaveRequest(req, res, {
    requirePredictions: false,
    routePath: appConfig.api.dataPath,
  });
});

app.post(appConfig.api.predictionsPath, async (req, res) => {
  await saveRequestService.handleSaveRequest(req, res, {
    requirePredictions: true,
    routePath: appConfig.api.predictionsPath,
  });
});

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: backendText.apiErrors.apiNotFound });
  }
  /* v8 ignore next -- SPA static fallback depends on built assets and is exercised outside unit tests */
  res.sendFile(path.join(distPath, 'index.html'));
});

export default app;
