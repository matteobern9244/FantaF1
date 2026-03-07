import 'dotenv/config'; // Load env vars
import mongoose from 'mongoose';
import app from './app.js';
import { syncCalendarFromOfficialSource } from './backend/calendar.js';
import { appConfig, formatConfigText } from './backend/config.js';
import {
  determineExpectedMongoDatabaseName,
  normalizeRuntimeEnvironment,
  resolveMongoDatabaseName,
  verifyMongoDatabaseName,
} from './backend/database.js';
import { syncDriversFromOfficialSource } from './backend/drivers.js';
import { ensureAdminCredentials } from './backend/auth.js';

const PORT = process.env.PORT || appConfig.server.port;
const HOST = '0.0.0.0'; // Bind to all interfaces for Render
const runtimeEnvironment = normalizeRuntimeEnvironment(process.env.NODE_ENV);
const databaseTargetName = determineExpectedMongoDatabaseName(process.env.NODE_ENV);

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
  await ensureAdminCredentials();
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
