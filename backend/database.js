import { backendText, formatBackendText } from './text.js';

const LOCAL_DATABASE_NAME = 'fantaf1_dev';
const PRODUCTION_DATABASE_NAME = 'fantaf1';
const MONGO_DATABASE_NAME_OVERRIDE_ENV_VAR = 'MONGODB_DB_NAME_OVERRIDE';

function normalizeDatabaseNameOverride(mongoDatabaseNameOverride) {
  const normalizedOverride = String(mongoDatabaseNameOverride ?? '').trim();
  return normalizedOverride || undefined;
}

function normalizeRuntimeEnvironment(nodeEnv) {
  return String(nodeEnv ?? '').trim().toLowerCase() === 'production'
    ? 'production'
    : 'development';
}

function determineExpectedMongoDatabaseName(nodeEnv, { mongoDatabaseNameOverride } = {}) {
  const normalizedOverride = normalizeDatabaseNameOverride(mongoDatabaseNameOverride);
  if (normalizedOverride) {
    return normalizedOverride;
  }

  return normalizeRuntimeEnvironment(nodeEnv) === 'production'
    ? PRODUCTION_DATABASE_NAME
    : LOCAL_DATABASE_NAME;
}

function extractMongoDatabaseName(mongoUri) {
  const normalizedUri = typeof mongoUri === 'string' ? mongoUri.trim() : '';

  if (!normalizedUri) {
    return undefined;
  }

  try {
    const parsedUri = new URL(normalizedUri);
    const pathname = parsedUri.pathname.replace(/^\/+/, '').trim();
    return pathname || undefined;
  } catch {
    return undefined;
  }
}

function resolveMongoDatabaseName({ nodeEnv, mongoUri, mongoDatabaseNameOverride } = {}) {
  const expectedDatabaseName = determineExpectedMongoDatabaseName(nodeEnv, {
    mongoDatabaseNameOverride,
  });
  const uriDatabaseName = extractMongoDatabaseName(mongoUri);

  if (uriDatabaseName && uriDatabaseName !== expectedDatabaseName) {
    throw new Error(
      formatBackendText(backendText.database.mongoUriTargetMismatchTemplate, {
        uriDatabaseName,
        environment: normalizeRuntimeEnvironment(nodeEnv),
        expectedDatabaseName,
      }),
    );
  }

  return uriDatabaseName ?? expectedDatabaseName;
}

function verifyMongoDatabaseName(actualDbName, expectedDbName) {
  if (actualDbName !== expectedDbName) {
    throw new Error(
      formatBackendText(backendText.database.unexpectedConnectedDatabaseTemplate, {
        actualDbName,
        expectedDbName,
      }),
    );
  }
}

export {
  determineExpectedMongoDatabaseName,
  extractMongoDatabaseName,
  LOCAL_DATABASE_NAME,
  MONGO_DATABASE_NAME_OVERRIDE_ENV_VAR,
  PRODUCTION_DATABASE_NAME,
  normalizeRuntimeEnvironment,
  resolveMongoDatabaseName,
  verifyMongoDatabaseName,
};
