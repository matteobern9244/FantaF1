import { pathToFileURL } from 'url';

const DEFAULT_BASE_URL = process.env.SAVE_SMOKE_BASE_URL ?? 'http://127.0.0.1:3001';
const EXPECTED_ENVIRONMENT = 'development';
const EXPECTED_DATABASE_TARGET = 'fantaf1_dev';
const HEALTH_PATH = '/api/health';
const DATA_PATH = '/api/data';

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

async function runSaveSmoke({
  baseUrl = DEFAULT_BASE_URL,
  fetchImpl = fetch,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch non disponibile per lo smoke test di salvataggio.');
  }

  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const health = await readJsonResponse(
    await fetchImpl(`${normalizedBaseUrl}${HEALTH_PATH}`),
    'GET /api/health',
  );

  if (health.environment !== EXPECTED_ENVIRONMENT) {
    throw new Error(
      `Smoke save consentito solo in ${EXPECTED_ENVIRONMENT}. Environment attuale: "${health.environment ?? 'unknown'}".`,
    );
  }

  if (health.databaseTarget !== EXPECTED_DATABASE_TARGET) {
    throw new Error(
      `Smoke save richiede databaseTarget "${EXPECTED_DATABASE_TARGET}". Trovato "${health.databaseTarget ?? 'unknown'}".`,
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

  if (stableSerialize(afterState) !== stableSerialize(beforeState)) {
    throw new Error('Lo stato letto dopo il salvataggio non coincide con il payload inviato.');
  }

  return {
    health,
    saveResult,
    beforeState,
    afterState,
  };
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
