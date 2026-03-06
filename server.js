import 'dotenv/config'; // Load env vars
import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { syncCalendarFromOfficialSource, sortCalendarByRound, fetchRaceResults } from './backend/calendar.js';
import { appConfig, currentYear, formatConfigText } from './backend/config.js';
import {
  determineExpectedMongoDatabaseName,
  normalizeRuntimeEnvironment,
  resolveMongoDatabaseName,
  verifyMongoDatabaseName,
} from './backend/database.js';
import {
  buildHealthPayload,
  buildSaveErrorResponse,
  classifySaveError,
  createRequestId,
  extractErrorDetails,
} from './backend/http.js';
import { sortDriversAlphabetically, syncDriversFromOfficialSource } from './backend/drivers.js';
import {
  readAppData,
  readCalendarCache,
  readDriversCache,
  writeAppData,
} from './backend/storage.js';
import { isRaceLocked, validateParticipants } from './backend/validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || appConfig.server.port;
const HOST = '0.0.0.0'; // Bind to all interfaces for Render
const runtimeEnvironment = normalizeRuntimeEnvironment(process.env.NODE_ENV);
const databaseTargetName = determineExpectedMongoDatabaseName(process.env.NODE_ENV);

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

app.post(appConfig.api.dataPath, async (req, res) => {
  const requestId = createRequestId();

  try {
    verifyMongoDatabaseName(mongoose.connection.db?.databaseName, databaseTargetName);

    const newData = req.body;

    // Server-side validation: Exact participants
    if (!validateParticipants(newData?.users, appConfig.participants)) {
      const participantError = `Invalid participants list. Expected ${appConfig.participants.length} participants.`;
      const response = buildSaveErrorResponse({
        environment: runtimeEnvironment,
        requestId,
        code: 'participants_invalid',
        error: participantError,
        details: `Expected ${appConfig.participants.length} participants, received ${Array.isArray(newData?.users) ? newData.users.length : 'unknown'}.`,
      });

      return res.status(response.status).json(response.payload);
    }

    // Server-side validation: Race Lock
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
          details: `Race ${selectedRace.meetingKey} started at ${selectedRace.raceStartTime || selectedRace.endDate || 'unknown'} and current predictions differ from stored data.`,
        });

        return res.status(response.status).json(response.payload);
      }
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
      `[Error Backend] POST /api/data fallito [requestId=${requestId}] [environment=${runtimeEnvironment}] [databaseTarget=${databaseTargetName}] [code=${code}]`,
      error,
    );

    res.status(response.status).json(response.payload);
  }
});

// 3. Serve static files from 'dist' directory (Vite build)
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// 4. Catch-all middleware for client-side routing (SPA)
// Using app.use instead of app.get('*') to bypass Express 5 path-to-regexp issues
app.use((req, res) => {
  // If it's an API call that wasn't matched above, return 404
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API Endpoint not found' });
  }
  // Otherwise, serve index.html for any other route (SPA)
  res.sendFile(path.join(distPath, 'index.html'));
});

async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }

  try {
    const targetDatabaseName = resolveMongoDatabaseName({
      nodeEnv: process.env.NODE_ENV,
      mongoUri: uri,
    });

    await mongoose.connect(uri, {
      dbName: databaseTargetName,
    });

    const connectedDatabaseName = mongoose.connection.db?.databaseName;
    verifyMongoDatabaseName(connectedDatabaseName, databaseTargetName);

    console.log(
      `[Database] Connected to MongoDB Atlas - Environment: ${runtimeEnvironment} - Target: ${connectedDatabaseName} - Resolved: ${targetDatabaseName}`,
    );
  } catch (error) {
    console.error('[Database] MongoDB connection error:', error);
    process.exit(1);
  }
}

async function startServer() {
  // 1. Connect to DB first (mandatory)
  await connectToDatabase();

  // 2. Start listening immediately to satisfy platform (Render) health checks
  app.listen(PORT, HOST, () => {
    console.log(
      formatConfigText(appConfig.uiText.backend.logs.serverStarted, {
        origin: `http://${HOST}:${PORT}`,
      }),
    );

    // 3. Perform external sync in the background
    // This prevents slow external sources from blocking startup
    console.log('[Sync] Starting background synchronization...');
    
    void (async () => {
      try {
        const syncedDrivers = await syncDriversFromOfficialSource();
        if (syncedDrivers.length === 0) {
          console.warn(appConfig.uiText.backend.errors.driversUnavailable);
        } else {
          console.log(`[Sync] Drivers synchronized: ${syncedDrivers.length}`);
        }
      } catch (e) {
        console.warn('[Sync] Driver sync warning:', e.message);
      }

      try {
        const syncedCalendar = await syncCalendarFromOfficialSource();
        if (syncedCalendar.length === 0) {
          console.warn(appConfig.uiText.backend.errors.calendarUnavailable);
        } else {
          console.log(`[Sync] Calendar synchronized: ${syncedCalendar.length}`);
        }
      } catch (e) {
        console.warn('[Sync] Calendar sync warning:', e.message);
      }
    })();
  });
}

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
