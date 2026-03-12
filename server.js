import 'dotenv/config'; // Load env vars
import mongoose from 'mongoose';
import app from './app.js';
import { syncCalendarFromOfficialSource } from './backend/calendar.js';
import { appConfig } from './backend/config.js';
import {
  determineExpectedMongoDatabaseName,
  MONGO_DATABASE_NAME_OVERRIDE_ENV_VAR,
  normalizeRuntimeEnvironment,
  resolveMongoDatabaseName,
  verifyMongoDatabaseName,
} from './backend/database.js';
import { syncDriversFromOfficialSource } from './backend/drivers.js';
import { syncStandingsFromOfficialSource } from './backend/standings.js';
import { ensureAdminCredentials } from './backend/auth.js';
import { backendText, formatBackendText } from './backend/text.js';
import {
  BackgroundSyncService,
  DatabaseConnectionService,
  ServerBootstrapService,
} from './backend/server-bootstrap-service.js';

const PORT = String(process.env.PORT || appConfig.server.port);
const HOST = '0.0.0.0'; // Bind to all interfaces for Render
const runtimeEnvironment = normalizeRuntimeEnvironment(process.env.NODE_ENV);
const mongoDatabaseNameOverride = process.env[MONGO_DATABASE_NAME_OVERRIDE_ENV_VAR];
const databaseTargetName = determineExpectedMongoDatabaseName(process.env.NODE_ENV, {
  mongoDatabaseNameOverride,
});

const databaseConnectionService = new DatabaseConnectionService({
  mongoose,
  resolveMongoDatabaseName,
  verifyMongoDatabaseName,
  backendText,
  formatBackendText,
  runtimeEnvironment,
  databaseTargetName,
  mongoDatabaseNameOverride,
});

const backgroundSyncService = new BackgroundSyncService({
  syncDriversFromOfficialSource,
  syncCalendarFromOfficialSource,
  syncStandingsFromOfficialSource,
  backendText,
  formatBackendText,
  appConfig,
});

const serverBootstrapService = new ServerBootstrapService({
  databaseConnectionService,
  backgroundSyncService,
  ensureAdminCredentials,
  app,
  host: HOST,
  port: PORT,
  backendText,
  formatBackendText,
});

async function startServer() {
  try {
    await serverBootstrapService.start({
      mongoUri: process.env.MONGODB_URI,
      nodeEnv: process.env.NODE_ENV,
    });
  } catch (error) {
    if (error?.message === backendText.database.missingMongoUri) {
      console.error(error);
    } else {
      console.error(backendText.database.connectionErrorLog, error);
    }
    process.exit(1);
  }
}

/* v8 ignore next 3 -- defensive final catch after explicit bootstrap error handling */
startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
