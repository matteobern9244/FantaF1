const LOCAL_DATABASE_NAME = 'fantaf1_dev';
const PRODUCTION_DATABASE_NAME = 'fantaf1';

function normalizeRuntimeEnvironment(nodeEnv) {
  return String(nodeEnv ?? '').trim().toLowerCase() === 'production'
    ? 'production'
    : 'development';
}

function determineExpectedMongoDatabaseName(nodeEnv) {
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

function resolveMongoDatabaseName({ nodeEnv, mongoUri } = {}) {
  const expectedDatabaseName = determineExpectedMongoDatabaseName(nodeEnv);
  const uriDatabaseName = extractMongoDatabaseName(mongoUri);

  if (uriDatabaseName && uriDatabaseName !== expectedDatabaseName) {
    throw new Error(
      `MONGODB_URI targets "${uriDatabaseName}" but ${normalizeRuntimeEnvironment(nodeEnv)} requires "${expectedDatabaseName}".`,
    );
  }

  return uriDatabaseName ?? expectedDatabaseName;
}

function verifyMongoDatabaseName(actualDbName, expectedDbName) {
  if (actualDbName !== expectedDbName) {
    throw new Error(
      `Connected to unexpected MongoDB database "${actualDbName}". Expected "${expectedDbName}".`,
    );
  }
}

export {
  determineExpectedMongoDatabaseName,
  extractMongoDatabaseName,
  LOCAL_DATABASE_NAME,
  PRODUCTION_DATABASE_NAME,
  normalizeRuntimeEnvironment,
  resolveMongoDatabaseName,
  verifyMongoDatabaseName,
};
