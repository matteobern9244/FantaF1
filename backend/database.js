const LOCAL_DATABASE_NAME = 'fantaf1_dev';
const PRODUCTION_DATABASE_NAME = 'fantaf1';

function normalizeRuntimeEnvironment(nodeEnv) {
  return String(nodeEnv ?? '').trim().toLowerCase() === 'production'
    ? 'production'
    : 'development';
}

function resolveMongoDatabaseName({ nodeEnv, explicitDbName } = {}) {
  const normalizedExplicitDbName =
    typeof explicitDbName === 'string' ? explicitDbName.trim() : '';

  if (normalizedExplicitDbName) {
    return normalizedExplicitDbName;
  }

  return normalizeRuntimeEnvironment(nodeEnv) === 'production'
    ? PRODUCTION_DATABASE_NAME
    : LOCAL_DATABASE_NAME;
}

function verifyMongoDatabaseName(actualDbName, expectedDbName) {
  if (actualDbName !== expectedDbName) {
    throw new Error(
      `Connected to unexpected MongoDB database "${actualDbName}". Expected "${expectedDbName}".`,
    );
  }
}

export {
  LOCAL_DATABASE_NAME,
  PRODUCTION_DATABASE_NAME,
  normalizeRuntimeEnvironment,
  resolveMongoDatabaseName,
  verifyMongoDatabaseName,
};
