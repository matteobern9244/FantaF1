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
import { sortDriversAlphabetically } from './backend/drivers.js';
import {
  readAppData,
  readCalendarCache,
  readDriversCache,
  writeAppData,
} from './backend/storage.js';
import { isRaceLocked, validateParticipants, validatePredictions } from './backend/validation.js';
import { verifyMongoDatabaseName } from './backend/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const runtimeEnvironment = normalizeRuntimeEnvironment(process.env.NODE_ENV);
const databaseTargetName = determineExpectedMongoDatabaseName(process.env.NODE_ENV);
const predictionFieldOrder = ['first', 'second', 'third', 'pole'];

app.use(cors());
app.use(express.json());

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
  const participantError = `Invalid participants list. Expected ${appConfig.participants.length} participants.`;

  return buildSaveErrorResponse({
    environment: runtimeEnvironment,
    requestId,
    code: 'participants_invalid',
    error: participantError,
    details: `Expected ${appConfig.participants.length} participants, received ${Array.isArray(newData?.users) ? newData.users.length : 'unknown'}.`,
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
    verifyMongoDatabaseName(mongoose.connection.db?.databaseName, databaseTargetName);

    const newData = req.body;

    if (!validateParticipants(newData?.users, appConfig.participants)) {
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
