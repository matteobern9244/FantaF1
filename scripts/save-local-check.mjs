// Load environment variables only outside test environment
if (!process.env.VITEST) {
  const { default: dotenv } = await import('dotenv');
  dotenv.config();
}
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { ensureLocalAdminCredential } from './local-admin-credential.mjs';
import { resolveSaveSmokeTarget, rewriteMongoDatabaseName } from './local-runtime-targets.mjs';

const defaultTarget = resolveSaveSmokeTarget();
const DATA_PATH = '/api/data';
const ADMIN_SESSION_PATH = '/api/admin/session';
const STARTUP_TIMEOUT_MS = 45000;
const POLL_INTERVAL_MS = 600;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function stableSerialize(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value).sort(([firstKey], [secondKey]) =>
      firstKey.localeCompare(secondKey),
    );

    return `{${entries
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableSerialize(entryValue)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

async function readJsonResponse(response, label) {
  if (!response || typeof response.ok !== 'boolean') {
    throw new Error(`Risposta HTTP non valida durante ${label}.`);
  }

  const rawBody = await response.text();
  let parsedBody;

  if (rawBody.trim()) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = rawBody;
    }
  }

  if (!response.ok) {
    const backendMessage =
      parsedBody && typeof parsedBody === 'object' && typeof parsedBody.error === 'string'
        ? parsedBody.error
        : rawBody || `HTTP ${response.status}`;
    const requestId =
      parsedBody && typeof parsedBody === 'object' && typeof parsedBody.requestId === 'string'
        ? ` (requestId: ${parsedBody.requestId})`
        : '';

    throw new Error(`Richiesta ${label} fallita con ${response.status}: ${backendMessage}${requestId}`);
  }

  if (parsedBody === undefined) {
    throw new Error(`Risposta JSON mancante durante ${label}.`);
  }

  if (typeof parsedBody === 'string') {
    throw new Error(`Risposta JSON non valida durante ${label}: ${parsedBody}`);
  }

  return parsedBody;
}

function extractSessionCookie(response) {
  if (!response?.headers) {
    return null;
  }

  if (typeof response.headers.getSetCookie === 'function') {
    const [cookie] = response.headers.getSetCookie();
    return cookie ? cookie.split(';', 1)[0] : null;
  }

  if (typeof response.headers.get === 'function') {
    const cookie = response.headers.get('set-cookie');
    return cookie ? cookie.split(';', 1)[0] : null;
  }

  const rawCookie = response.headers['set-cookie'];
  if (Array.isArray(rawCookie)) {
    return rawCookie[0]?.split(';', 1)[0] ?? null;
  }

  return typeof rawCookie === 'string'
    ? rawCookie.split(';', 1)[0]
    : null;
}

async function loginAdminSession({
  baseUrl,
  password,
  fetchImpl,
}) {
  const response = await fetchImpl(`${baseUrl}${ADMIN_SESSION_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const payload = await readJsonResponse(response, 'POST /api/admin/session');
  const sessionCookie = extractSessionCookie(response);

  if (!sessionCookie) {
    throw new Error('POST /api/admin/session non ha restituito un cookie di sessione admin valido.');
  }

  return {
    payload,
    sessionCookie,
  };
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const parsedEntries = {};
  const fileContent = fs.readFileSync(filePath, 'utf8');

  for (const rawLine of fileContent.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    parsedEntries[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }

  return parsedEntries;
}

function sleep(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

async function waitForHealthyBackend({ healthUrl, fetchImpl, timeoutMs = STARTUP_TIMEOUT_MS, onCheck }) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (typeof onCheck === 'function') {
      onCheck();
    }

    try {
      const response = await fetchImpl(healthUrl);
      if (response?.ok) {
        return;
      }
    } catch {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Backend locale non raggiungibile su ${healthUrl} entro ${timeoutMs}ms.`);
}

async function ensureLocalBackend({
  healthUrl,
  fetchImpl,
  backendCommand = 'node',
  backendArgs = ['server.js'],
  startupEnv = {},
} = {}) {
  const env = {
    ...process.env,
    ...loadEnvFile(path.join(projectRoot, '.env')),
    ...loadEnvFile(path.join(projectRoot, '.env.local')),
    ...startupEnv,
  };

  if (typeof env.MONGODB_URI !== 'string' || !env.MONGODB_URI.trim()) {
    throw new Error(
      "Variabile d'ambiente MONGODB_URI non definita. Verifica la configurazione del file .env partendo da .env.example o impostala nel terminale.",
    );
  }

  if (
    typeof env.MONGODB_URI === 'string'
    && typeof startupEnv.MONGODB_DB_NAME_OVERRIDE === 'string'
    && typeof startupEnv.MONGODB_URI !== 'string'
  ) {
    env.MONGODB_URI = rewriteMongoDatabaseName(env.MONGODB_URI, startupEnv.MONGODB_DB_NAME_OVERRIDE);
  }
  const child = spawn(backendCommand, backendArgs, {
    cwd: projectRoot,
    env,
    stdio: 'ignore',
  });
  let stopped = false;
  let exitCode = null;

  child.on('exit', (code) => {
    exitCode = code;
  });

  const stop = async () => {
    if (stopped || child.killed) {
      return;
    }

    stopped = true;
    child.kill('SIGTERM');
    await sleep(1000);
    if (!child.killed) {
      child.kill('SIGKILL');
    }
  };

  try {
    await waitForHealthyBackend({
      healthUrl,
      fetchImpl,
      onCheck: () => {
        if (exitCode !== null) {
          throw new Error(
            `Il processo backend e' terminato inaspettatamente con codice ${exitCode} durante l'avvio.`,
          );
        }
      },
    });
    return {
      started: true,
      stop,
    };
  } catch (error) {
    await stop();
    throw error;
  }
}

async function runSaveSmoke({
  target = defaultTarget.name,
  baseUrl,
  backendHealthUrl,
  expectedEnvironment,
  expectedDatabaseTarget,
  fetchImpl = fetch,
  ensureBackend = ensureLocalBackend,
  ensureAdminCredential = ensureLocalAdminCredential,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch non disponibile per lo smoke test di salvataggio.');
  }

  const resolvedTarget = resolveSaveSmokeTarget({
    ...process.env,
    ...(target && { SAVE_SMOKE_TARGET: target }),
    ...(baseUrl && { SAVE_SMOKE_BASE_URL: baseUrl }),
    ...(backendHealthUrl && { SAVE_SMOKE_BACKEND_HEALTH_URL: backendHealthUrl }),
    ...(expectedEnvironment && { SAVE_SMOKE_EXPECTED_ENVIRONMENT: expectedEnvironment }),
    ...(expectedDatabaseTarget && { SAVE_SMOKE_EXPECTED_DATABASE_TARGET: expectedDatabaseTarget }),
  });
  const normalizedBaseUrl = resolvedTarget.baseUrl.replace(/\/+$/, '');
  const normalizedHealthUrl = resolvedTarget.backendHealthUrl.replace(/\/+$/, '');
  let backendHandle = null;
  let health;

  try {
    try {
      health = await readJsonResponse(
        await fetchImpl(normalizedHealthUrl),
        'GET /api/health',
      );
    } catch (error) {
      if (typeof ensureBackend !== 'function') {
        throw error;
      }

      backendHandle = await ensureBackend({
        healthUrl: normalizedHealthUrl,
        fetchImpl,
        backendCommand: resolvedTarget.backendCommand,
        backendArgs: resolvedTarget.backendArgs,
        startupEnv: resolvedTarget.startupEnv,
      });
      health = await readJsonResponse(
        await fetchImpl(normalizedHealthUrl),
        'GET /api/health',
      );
    }

    if (health.environment !== resolvedTarget.expectedEnvironment) {
      throw new Error(
        `Smoke save consentito solo in ${resolvedTarget.expectedEnvironment}. Environment attuale: "${health.environment ?? 'unknown'}".`,
      );
    }

    if (health.databaseTarget !== resolvedTarget.expectedDatabaseTarget) {
      throw new Error(
        `Smoke save richiede databaseTarget "${resolvedTarget.expectedDatabaseTarget}". Trovato "${health.databaseTarget ?? 'unknown'}".`,
      );
    }

    if (resolvedTarget.adminAuth?.password) {
      await ensureAdminCredential({
        targetConfig: resolvedTarget,
      });
    }

    const beforeState = await readJsonResponse(
      await fetchImpl(`${normalizedBaseUrl}${DATA_PATH}`),
      'GET /api/data (before)',
    );
    const requestHeaders = { 'Content-Type': 'application/json' };

    if (resolvedTarget.adminAuth?.password) {
      const adminSession = await loginAdminSession({
        baseUrl: normalizedBaseUrl,
        password: resolvedTarget.adminAuth.password,
        fetchImpl,
      });

      if (!adminSession.payload?.isAdmin) {
        throw new Error('POST /api/admin/session non ha attivato una sessione admin valida.');
      }

      requestHeaders.Cookie = adminSession.sessionCookie;
    }

    const saveResult = await readJsonResponse(
      await fetchImpl(`${normalizedBaseUrl}${DATA_PATH}`, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(beforeState),
      }),
      'POST /api/data',
    );

    if (typeof saveResult.message !== 'string' || !saveResult.message.trim()) {
      throw new Error('POST /api/data non ha restituito un messaggio di successo valido.');
    }

    const afterState = await readJsonResponse(
      await fetchImpl(`${normalizedBaseUrl}${DATA_PATH}`),
      'GET /api/data (after)',
    );

    let canonicalBeforeState = beforeState;
    let canonicalAfterState = afterState;

    if (stableSerialize(canonicalAfterState) !== stableSerialize(canonicalBeforeState)) {
      canonicalBeforeState = canonicalAfterState;

      const retrySaveResult = await readJsonResponse(
        await fetchImpl(`${normalizedBaseUrl}${DATA_PATH}`, {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify(canonicalBeforeState),
        }),
        'POST /api/data (retry)',
      );

      if (typeof retrySaveResult.message !== 'string' || !retrySaveResult.message.trim()) {
        throw new Error('POST /api/data (retry) non ha restituito un messaggio di successo valido.');
      }

      canonicalAfterState = await readJsonResponse(
        await fetchImpl(`${normalizedBaseUrl}${DATA_PATH}`),
        'GET /api/data (after retry)',
      );
    }

    if (stableSerialize(canonicalAfterState) !== stableSerialize(canonicalBeforeState)) {
      throw new Error('Lo stato letto dopo il salvataggio non coincide con il payload inviato.');
    }

    return {
      health,
      saveResult,
      beforeState: canonicalBeforeState,
      afterState: canonicalAfterState,
    };
  } finally {
    await backendHandle?.stop?.();
  }
}

const isMainModule =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  runSaveSmoke()
    .then(({ health, saveResult }) => {
      console.log(
        `[save-local-check] OK environment=${health.environment} databaseTarget=${health.databaseTarget} message="${saveResult.message}"`,
      );
    })
    .catch((error) => {
      console.error('[save-local-check] FAILED', error instanceof Error ? error.message : error);
      process.exit(1);
    });
}

export { runSaveSmoke, stableSerialize };
