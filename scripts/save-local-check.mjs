import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { MONGO_DATABASE_NAME_OVERRIDE_ENV_VAR } from '../backend/database.js';

const DEFAULT_BASE_URL = process.env.SAVE_SMOKE_BASE_URL ?? 'http://127.0.0.1:3001';
const DEFAULT_EXPECTED_ENVIRONMENT = process.env.SAVE_SMOKE_EXPECTED_ENVIRONMENT ?? 'development';
const DEFAULT_EXPECTED_DATABASE_TARGET =
  process.env.SAVE_SMOKE_EXPECTED_DATABASE_TARGET ??
  process.env[MONGO_DATABASE_NAME_OVERRIDE_ENV_VAR] ??
  'fantaf1_dev';
const HEALTH_PATH = '/api/health';
const DATA_PATH = '/api/data';
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

async function waitForHealthyBackend({ baseUrl, fetchImpl, timeoutMs = STARTUP_TIMEOUT_MS }) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetchImpl(`${baseUrl}${HEALTH_PATH}`);
      if (response?.ok) {
        return;
      }
    } catch {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Backend locale non raggiungibile su ${baseUrl} entro ${timeoutMs}ms.`);
}

async function ensureLocalBackend({ baseUrl, fetchImpl }) {
  const env = {
    ...process.env,
    ...loadEnvFile(path.join(projectRoot, '.env')),
    ...loadEnvFile(path.join(projectRoot, '.env.local')),
  };
  const child = spawn('node', ['server.js'], {
    cwd: projectRoot,
    env,
    stdio: 'ignore',
  });
  let stopped = false;

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
    await waitForHealthyBackend({ baseUrl, fetchImpl });
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
  baseUrl = DEFAULT_BASE_URL,
  expectedEnvironment = DEFAULT_EXPECTED_ENVIRONMENT,
  expectedDatabaseTarget = DEFAULT_EXPECTED_DATABASE_TARGET,
  fetchImpl = fetch,
  ensureBackend = ensureLocalBackend,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch non disponibile per lo smoke test di salvataggio.');
  }

  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  let backendHandle = null;
  let health;

  try {
    try {
      health = await readJsonResponse(
        await fetchImpl(`${normalizedBaseUrl}${HEALTH_PATH}`),
        'GET /api/health',
      );
    } catch (error) {
      if (typeof ensureBackend !== 'function') {
        throw error;
      }

      backendHandle = await ensureBackend({
        baseUrl: normalizedBaseUrl,
        fetchImpl,
      });
      health = await readJsonResponse(
        await fetchImpl(`${normalizedBaseUrl}${HEALTH_PATH}`),
        'GET /api/health',
      );
    }

    if (health.environment !== expectedEnvironment) {
      throw new Error(
        `Smoke save consentito solo in ${expectedEnvironment}. Environment attuale: "${health.environment ?? 'unknown'}".`,
      );
    }

    if (health.databaseTarget !== expectedDatabaseTarget) {
      throw new Error(
        `Smoke save richiede databaseTarget "${expectedDatabaseTarget}". Trovato "${health.databaseTarget ?? 'unknown'}".`,
      );
    }

    const beforeState = await readJsonResponse(
      await fetchImpl(`${normalizedBaseUrl}${DATA_PATH}`),
      'GET /api/data (before)',
    );

    const saveResult = await readJsonResponse(
      await fetchImpl(`${normalizedBaseUrl}${DATA_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          headers: { 'Content-Type': 'application/json' },
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
