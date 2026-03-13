import { createHash, scryptSync } from 'crypto';

const DEFAULT_RUNTIME_TARGET = 'node-dev';
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORTS = Object.freeze({
  nodeBackend: 3001,
  nodeFrontend: 5173,
  csharpDevelopment: 3002,
  csharpStaging: 3003,
});

function buildUrl(port, path = '') {
  return `http://${DEFAULT_HOST}:${port}${path}`;
}

const targetDefinitions = Object.freeze({
  'node-dev': Object.freeze({
    name: 'node-dev',
    runtime: 'node',
    frontendMode: 'split',
    baseUrl: buildUrl(DEFAULT_PORTS.nodeFrontend),
    backendBaseUrl: buildUrl(DEFAULT_PORTS.nodeBackend),
    backendHealthUrl: buildUrl(DEFAULT_PORTS.nodeBackend, '/api/health'),
    expectedEnvironment: 'development',
    expectedDatabaseTarget: 'fantaf1_dev',
    busyPorts: [DEFAULT_PORTS.nodeBackend, DEFAULT_PORTS.nodeFrontend],
    backendCommand: 'node',
    backendArgs: ['server.js'],
    frontendCommand: 'npm',
    frontendArgs: ['run', 'dev:frontend'],
    startupEnv: Object.freeze({
      NODE_ENV: 'development',
    }),
  }),
  'csharp-dev': Object.freeze({
    name: 'csharp-dev',
    runtime: 'csharp',
    frontendMode: 'same-origin',
    baseUrl: buildUrl(DEFAULT_PORTS.csharpDevelopment),
    backendBaseUrl: buildUrl(DEFAULT_PORTS.csharpDevelopment),
    backendHealthUrl: buildUrl(DEFAULT_PORTS.csharpDevelopment, '/api/health'),
    expectedEnvironment: 'development',
    expectedDatabaseTarget: 'fantaf1_porting',
    busyPorts: [DEFAULT_PORTS.csharpDevelopment],
    backendCommand: 'dotnet',
    backendArgs: [
      'run',
      '--project',
      'backend-csharp/src/FantaF1.Api/FantaF1.Api.csproj',
      '-c',
      'Release',
      '--no-launch-profile',
    ],
    startupEnv: Object.freeze({
      ASPNETCORE_ENVIRONMENT: 'Development',
      ASPNETCORE_URLS: buildUrl(DEFAULT_PORTS.csharpDevelopment),
    }),
  }),
  'csharp-staging-local': Object.freeze({
    name: 'csharp-staging-local',
    runtime: 'csharp',
    frontendMode: 'same-origin',
    baseUrl: buildUrl(DEFAULT_PORTS.csharpStaging),
    backendBaseUrl: buildUrl(DEFAULT_PORTS.csharpStaging),
    backendHealthUrl: buildUrl(DEFAULT_PORTS.csharpStaging, '/api/health'),
    expectedEnvironment: 'staging',
    expectedDatabaseTarget: 'fantaf1_porting',
    busyPorts: [DEFAULT_PORTS.csharpStaging],
    backendCommand: 'dotnet',
    backendArgs: [
      'run',
      '--project',
      'backend-csharp/src/FantaF1.Api/FantaF1.Api.csproj',
      '-c',
      'Release',
      '--no-launch-profile',
    ],
    startupEnv: Object.freeze({
      ASPNETCORE_ENVIRONMENT: 'Staging',
      ASPNETCORE_URLS: buildUrl(DEFAULT_PORTS.csharpStaging),
    }),
    adminAuth: Object.freeze({
      passwordSeedLabel: 'subphase-9-staging-local-admin-password',
      saltSeedLabel: 'subphase-9-staging-local-admin-salt',
    }),
  }),
});

function buildProbeUrls(baseUrl) {
  return [
    `${baseUrl}/api/session`,
    `${baseUrl}/api/data`,
    `${baseUrl}/api/drivers`,
    `${baseUrl}/api/calendar`,
  ];
}

function deriveApiBaseUrl(target, backendHealthUrl, frontendBaseUrl) {
  const normalizedBackendHealthUrl = String(backendHealthUrl ?? '').replace(/\/+$/, '');
  if (normalizedBackendHealthUrl.endsWith('/api/health')) {
    return normalizedBackendHealthUrl.slice(0, -'/api/health'.length);
  }

  return target.frontendMode === 'same-origin'
    ? frontendBaseUrl
    : (target.backendBaseUrl ?? frontendBaseUrl);
}

function rewriteMongoDatabaseName(mongoUri, databaseName) {
  const normalizedUri = String(mongoUri ?? '').trim();
  const normalizedDatabaseName = String(databaseName ?? '').trim();

  if (!normalizedUri || !normalizedDatabaseName) {
    return normalizedUri;
  }

  const uriMatch = normalizedUri.match(/^(mongodb(?:\+srv)?:\/\/[^/]+\/)([^?]*)(\?.*)?$/i);
  if (!uriMatch) {
    return normalizedUri;
  }

  const [, prefix, , query = ''] = uriMatch;
  return `${prefix}${normalizedDatabaseName}${query}`;
}

function createDeterministicAdminPassword(seedLabel) {
  return createHash('sha256').update(String(seedLabel ?? '')).digest('hex');
}

function createDeterministicAdminSalt(seedLabel) {
  return createHash('sha256').update(String(seedLabel ?? '')).digest('hex').slice(0, 32);
}

function applyRuntimeEnvironment(target, env = process.env) {
  if (target.runtime !== 'csharp') {
    return target;
  }

  const startupEnv = {
    ...target.startupEnv,
    MONGODB_DB_NAME_OVERRIDE: target.expectedDatabaseTarget,
  };
  let adminAuth = target.adminAuth;

  if (typeof env.MONGODB_URI === 'string' && env.MONGODB_URI.trim()) {
    startupEnv.MONGODB_URI = rewriteMongoDatabaseName(env.MONGODB_URI, target.expectedDatabaseTarget);
  }

  if (target.adminAuth) {
    const password = createDeterministicAdminPassword(target.adminAuth.passwordSeedLabel);
    const salt = createDeterministicAdminSalt(target.adminAuth.saltSeedLabel);
    startupEnv.AdminCredentialSeed__PasswordSalt = salt;
    startupEnv.AdminCredentialSeed__PasswordHashHex = scryptSync(password, salt, 64).toString('hex');
    adminAuth = {
      ...target.adminAuth,
      password,
      salt,
    };
  }

  return {
    ...target,
    adminAuth,
    startupEnv,
  };
}

function normalizeName(name) {
  return String(name ?? '').trim().toLowerCase();
}

function applyOverrides(target, {
  baseUrl,
  backendHealthUrl,
  expectedEnvironment,
  expectedDatabaseTarget,
} = {}) {
  const resolvedBaseUrl = baseUrl ?? target.baseUrl;
  const resolvedBackendHealthUrl = backendHealthUrl ?? target.backendHealthUrl;
  const resolvedApiBaseUrl = deriveApiBaseUrl(target, resolvedBackendHealthUrl, resolvedBaseUrl);

  return {
    ...target,
    baseUrl: resolvedBaseUrl,
    backendHealthUrl: resolvedBackendHealthUrl,
    expectedEnvironment: expectedEnvironment ?? target.expectedEnvironment,
    expectedDatabaseTarget: expectedDatabaseTarget ?? target.expectedDatabaseTarget,
    appProbeUrls: buildProbeUrls(resolvedApiBaseUrl),
  };
}

function resolveLocalRuntimeTarget(targetName = DEFAULT_RUNTIME_TARGET, overrides) {
  const normalizedName = normalizeName(targetName) || DEFAULT_RUNTIME_TARGET;
  const target = targetDefinitions[normalizedName];

  if (!target) {
    const knownTargets = Object.keys(targetDefinitions).join(', ');
    throw new Error(`Target runtime locale non supportato: "${targetName}". Valori ammessi: ${knownTargets}.`);
  }

  return applyOverrides(target, overrides);
}

function resolveSaveSmokeTarget(env = process.env) {
  const target = applyRuntimeEnvironment(resolveLocalRuntimeTarget(env.SAVE_SMOKE_TARGET ?? env.FANTAF1_LOCAL_RUNTIME, {
    baseUrl: env.SAVE_SMOKE_BASE_URL,
    backendHealthUrl: env.SAVE_SMOKE_BACKEND_HEALTH_URL,
    expectedEnvironment: env.SAVE_SMOKE_EXPECTED_ENVIRONMENT,
    expectedDatabaseTarget: env.SAVE_SMOKE_EXPECTED_DATABASE_TARGET,
  }), env);

  return {
    ...target,
    baseUrl: env.SAVE_SMOKE_BASE_URL ?? target.backendBaseUrl,
    appProbeUrls: buildProbeUrls(env.SAVE_SMOKE_BASE_URL ?? target.backendBaseUrl),
  };
}

function resolveUiResponsiveTarget(env = process.env) {
  return applyRuntimeEnvironment(resolveLocalRuntimeTarget(env.UI_RESPONSIVE_TARGET ?? env.FANTAF1_LOCAL_RUNTIME, {
    baseUrl: env.UI_RESPONSIVE_BASE_URL,
    backendHealthUrl: env.UI_RESPONSIVE_BACKEND_HEALTH_URL,
    expectedEnvironment: env.UI_RESPONSIVE_EXPECTED_ENVIRONMENT,
    expectedDatabaseTarget: env.UI_RESPONSIVE_EXPECTED_DATABASE_TARGET,
  }), env);
}

function resolveLauncherTarget(env = process.env) {
  return applyRuntimeEnvironment(resolveLocalRuntimeTarget(env.FANTAF1_LOCAL_RUNTIME, {
    baseUrl: env.FANTAF1_FRONTEND_URL,
    backendHealthUrl: env.FANTAF1_BACKEND_HEALTH_URL,
    expectedEnvironment: env.FANTAF1_EXPECTED_ENVIRONMENT,
    expectedDatabaseTarget: env.FANTAF1_EXPECTED_DATABASE_TARGET,
  }), env);
}

export {
  DEFAULT_RUNTIME_TARGET,
  buildProbeUrls,
  createDeterministicAdminPassword,
  createDeterministicAdminSalt,
  rewriteMongoDatabaseName,
  resolveLauncherTarget,
  resolveLocalRuntimeTarget,
  resolveSaveSmokeTarget,
  resolveUiResponsiveTarget,
};
