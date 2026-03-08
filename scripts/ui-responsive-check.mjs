import fs from 'fs';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const baseUrl = process.env.UI_RESPONSIVE_BASE_URL ?? 'http://127.0.0.1:5173';
const backendHealthUrl = process.env.UI_RESPONSIVE_BACKEND_HEALTH_URL ?? 'http://127.0.0.1:3001/api/health';
const sessionName = `ui-${Date.now().toString(36)}`;
const outputDir = path.resolve(process.cwd(), 'output/playwright/ui-responsive');
const startupTimeoutMs = 45000;
const pollIntervalMs = 750;
const cliCommandTimeoutMs = 30000;
const cliStartupTimeoutMs = 30000;
const cliCleanupTimeoutMs = 30000;
const cliRetryTimeoutMs = 90000;
const uiShellTimeoutMs = 30000;
const uiShellPollIntervalMs = 250;
const responsiveSessionPrefix = 'ui-';
const playwrightCliBaseArgs = ['--yes', '--package', '@playwright/cli', 'playwright-cli'];
const breakpoints = [
  { label: 'mobile', width: 390, height: 844 },
  { label: 'iphone-16-pro-max', width: 440, height: 956 },
  { label: 'tablet', width: 768, height: 1024 },
  { label: 'laptop', width: 1280, height: 800 },
  { label: 'desktop', width: 1600, height: 900 },
  { label: 'desktop-xl', width: 1920, height: 1080 },
];

const inspectStateExpression = `() => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const normalizeText = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
  const readFontFamily = (selector) => {
    const element = document.querySelector(selector);
    return {
      present: Boolean(element),
      fontFamily: element ? getComputedStyle(element).fontFamily : '',
      text: normalizeText(element?.textContent),
    };
  };
  const nextRaceCard = document.querySelector('.next-race-card');
  const schedule = nextRaceCard?.querySelector('.session-schedule');
  const scheduleRect = schedule?.getBoundingClientRect();
  const scheduleLeft = scheduleRect?.left ?? 0;
  const scheduleRight = scheduleRect?.right ?? viewportWidth;
  const sessionRows = [...(schedule?.querySelectorAll('.session-row') ?? [])].map((row) => {
    const rowRect = row.getBoundingClientRect();
    const childOverflow = [...row.children]
      .map((child) => {
        const childRect = child.getBoundingClientRect();
        return {
          className: child.className || child.tagName,
          left: childRect.left,
          right: childRect.right,
        };
      })
      .filter((child) => child.left < scheduleLeft - 1 || child.right > scheduleRight + 1);

    return {
      text: normalizeText(row.textContent),
      rowLeft: rowRect.left,
      rowRight: rowRect.right,
      rowOverflow: row.scrollWidth - row.clientWidth,
      childOverflow,
    };
  });
  const note = schedule?.querySelector('.sidebar-note');
  const noteRect = note?.getBoundingClientRect();
  const tooltipWrapper = document.querySelector('.results-actions .tooltip-wrapper');
  const disabledTooltipWrapper = document.querySelector('.results-actions .tooltip-wrapper.disabled-wrapper');
  const tooltipText = tooltipWrapper?.querySelector('.tooltip-text');
  const activeTooltip = document.querySelector('.results-actions .tooltip-wrapper.show-tooltip .tooltip-text');
  const tooltipRect = activeTooltip?.getBoundingClientRect();
  const historyHeading = [...document.querySelectorAll('h2')].find((element) =>
    /storico gare/i.test(normalizeText(element.textContent)),
  );
  const historyPanel = historyHeading?.closest('section');
  const historyPanelRect = historyPanel?.getBoundingClientRect();
  const historyActionButtons = [...(historyPanel?.querySelectorAll('.history-actions button') ?? [])].map(
    (button) => {
      const rect = button.getBoundingClientRect();

      return {
        text: normalizeText(button.textContent),
        left: rect.left,
        right: rect.right,
      };
    },
  );
  const unauthorizedOverflow = [...document.querySelectorAll('body *')]
    .map((element) => {
      const rect = element.getBoundingClientRect();

      return {
        className: element.className || element.tagName,
        text: normalizeText(element.textContent).slice(0, 80),
        left: rect.left,
        right: rect.right,
        width: rect.width,
        allowed: Boolean(element.closest('.calendar-strip')),
        position: getComputedStyle(element).position,
      };
    })
    .filter(
      (element) =>
        element.width > 0 &&
        element.right > viewportWidth + 1 &&
        !element.allowed &&
        element.position !== 'fixed',
    )
    .slice(0, 20);
  const selectedCalendarCard = document.querySelector('.calendar-card.selected');
  const selectedRaceBanner = document.querySelector('.selected-race-banner');
  const firstUserCard = document.querySelector('.predictions-grid .user-card');
  const firstPredictionSelect = firstUserCard?.querySelector('select');
  const firstResultSelect = document.querySelector('.results-grid select');

  return {
    viewport: { width: viewportWidth, height: viewportHeight },
    mainSections: {
      hero: Boolean(document.querySelector('.hero-panel')),
      summary: Boolean(document.querySelector('.hero-summary-grid')),
      calendar: Boolean(document.querySelector('.calendar-panel')),
      predictions: Boolean(document.querySelector('.predictions-grid')),
      results: Boolean(document.querySelector('.results-actions')),
      footer: Boolean(document.querySelector('.app-footer')),
    },
    nextRace: {
      cardPresent: Boolean(nextRaceCard),
      badgeText: normalizeText(nextRaceCard?.querySelector('.race-badge')?.textContent),
      hasSessions: sessionRows.length > 0,
      rowCount: sessionRows.length,
      clippedRows: sessionRows.filter(
        (row) =>
          row.rowLeft < scheduleLeft - 1 ||
          row.rowRight > scheduleRight + 1 ||
          row.rowOverflow > 1 ||
          row.childOverflow.length > 0,
      ),
      noteText: normalizeText(note?.textContent),
      noteFits:
        !note ||
        ((noteRect?.left ?? scheduleLeft) >= scheduleLeft - 1 &&
          (noteRect?.right ?? scheduleRight) <= scheduleRight + 1),
    },
    typography: {
      sessionDay: readFontFamily('.next-race-card .session-day'),
      sessionDate: readFontFamily('.next-race-card .session-calendar-date'),
      sessionClock: readFontFamily('.next-race-card .session-clock'),
      liveScoreValue: readFontFamily('.live-score-value'),
      projectionValue: readFontFamily('.points-preview-value'),
    },
    tooltip: {
      wrapperPresent: Boolean(tooltipWrapper),
      disabledWrapperPresent: Boolean(disabledTooltipWrapper),
      present: Boolean(tooltipText),
      visible: Boolean(activeTooltip),
      fitsViewport:
        !activeTooltip ||
        ((tooltipRect?.left ?? 0) >= -1 && (tooltipRect?.right ?? viewportWidth) <= viewportWidth + 1),
      text: normalizeText(activeTooltip?.textContent || tooltipText?.textContent),
    },
    history: {
      present: Boolean(historyPanel),
      hasCards: Boolean(historyPanel?.querySelector('.history-card')),
      emptyStateVisible: Boolean(historyPanel?.querySelector('.empty-copy')),
      actionButtonCount: historyActionButtons.length,
      clippedButtons: historyActionButtons.filter(
        (button) =>
          button.left < (historyPanelRect?.left ?? 0) - 1 ||
          button.right > (historyPanelRect?.right ?? viewportWidth) + 1,
      ),
    },
    viewMode: {
      current: (() => {
        const activeButton = [...document.querySelectorAll('.view-mode-toggle button')]
          .find((button) => button.getAttribute('aria-pressed') === 'true');
        const activeLabel = normalizeText(activeButton?.textContent);
        if (/pubblica/i.test(activeLabel)) {
          return 'public';
        }
        if (/admin/i.test(activeLabel)) {
          return 'admin';
        }
        return '';
      })(),
      readonlyBannerPresent: Boolean(document.querySelector('.public-readonly-panel .locked-banner')),
      adminLoginPresent: Boolean(document.querySelector('.auth-overlay')),
      adminControlsPresent: Boolean(document.querySelector('.accent-panel .results-grid')),
      publicControlsPresent: Boolean(document.querySelector('.public-readonly-panel')),
    },
    interactiveSurfaces: {
      total: document.querySelectorAll('.interactive-surface').length,
      analytics: document.querySelectorAll(
        '.kpi-card.interactive-surface, .analytics-card.interactive-surface, .analytics-subpanel.interactive-surface, .history-user-card.interactive-surface, .season-comparison-row.interactive-surface',
      ).length,
    },
    selectedWeekend: {
      calendarCardCount: document.querySelectorAll('.calendar-card').length,
      sprintCardCount: document.querySelectorAll('.calendar-card.sprint').length,
      cardText: normalizeText(selectedCalendarCard?.textContent),
      bannerTitle: normalizeText(selectedRaceBanner?.querySelector('strong')?.textContent),
      firstPredictionValue: firstPredictionSelect?.value ?? '',
      firstPredictionText: normalizeText(
        firstPredictionSelect?.selectedOptions?.[0]?.textContent || firstPredictionSelect?.value,
      ),
      firstResultValue: firstResultSelect?.value ?? '',
      firstResultText: normalizeText(
        firstResultSelect?.selectedOptions?.[0]?.textContent || firstResultSelect?.value,
      ),
    },
    unauthorizedOverflow,
  };
}`;

const appShellStateExpression = `() => {
  return {
    href: window.location.href,
    title: document.title,
    readyState: document.readyState,
    loadingShell: Boolean(document.querySelector('.loading-shell')),
    selectors: {
      heroPanel: Boolean(document.querySelector('.hero-panel')),
      heroSummaryGrid: Boolean(document.querySelector('.hero-summary-grid')),
      calendarPanel: Boolean(document.querySelector('.calendar-panel')),
      predictionsGrid: Boolean(document.querySelector('.predictions-grid')),
      appFooter: Boolean(document.querySelector('.app-footer')),
      resultsActions: Boolean(document.querySelector('.results-actions')),
      liveScoreValue: Boolean(document.querySelector('.live-score-value')),
      pointsPreviewValue: Boolean(document.querySelector('.points-preview-value')),
    },
  };
}`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function fail(message, details) {
  const error = new Error(message);

  if (details) {
    error.cause = details;
  }

  throw error;
}

function formatErrorDetails(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error ?? 'Errore sconosciuto');
}

function stringifyDiagnostics(value) {
  return JSON.stringify(value, null, 2);
}

function markDiagnosticsCollected(error) {
  if (error && typeof error === 'object') {
    error.diagnosticsCollected = true;
  }

  return error;
}

function hasDiagnosticsCollected(error) {
  return Boolean(error && typeof error === 'object' && error.diagnosticsCollected);
}

function ensureNpx({ spawnSyncImpl = spawnSync, cwd = process.cwd() } = {}) {
  const result = spawnSyncImpl('npx', ['--version'], {
    cwd,
    encoding: 'utf8',
    timeout: cliCleanupTimeoutMs,
  });

  if (result.error || result.status !== 0) {
    fail('npx non disponibile. Installa Node.js/npm prima di eseguire il controllo responsive.');
  }
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

function loadRuntimeEnv() {
  return {
    ...process.env,
    ...loadEnvFile(path.join(projectRoot, '.env')),
    ...loadEnvFile(path.join(projectRoot, '.env.local')),
  };
}

function sleep(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

async function waitForUrl(url, {
  fetchImpl = fetch,
  timeoutMs = startupTimeoutMs,
  pollInterval = pollIntervalMs,
  readyWhen = (response) => Boolean(response?.ok),
  label = url,
  failureMessage,
  sleepImpl = sleep,
} = {}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetchImpl(url, {
        signal: AbortSignal.timeout(1500),
      });

      if (readyWhen(response)) {
        return;
      }
    } catch {
      // Retry until timeout
    }

    await sleepImpl(pollInterval);
  }

  fail(failureMessage ?? `Servizio non raggiungibile su ${label}.`);
}

async function probeUrl(url, { fetchImpl = fetch } = {}) {
  try {
    const response = await fetchImpl(url, {
      signal: AbortSignal.timeout(1500),
    });

    return Boolean(response?.ok);
  } catch {
    return false;
  }
}

async function waitForApiReadiness(
  urls,
  {
    fetchImpl = fetch,
    timeoutMs = startupTimeoutMs,
    pollInterval = pollIntervalMs,
    sleepImpl = sleep,
  } = {},
) {
  const pendingUrls = new Set(urls);
  const startedAt = Date.now();

  while (pendingUrls.size > 0 && Date.now() - startedAt < timeoutMs) {
    const probes = await Promise.all(
      [...pendingUrls].map(async (url) => ({
        url,
        ok: await probeUrl(url, { fetchImpl }),
      })),
    );

    for (const probe of probes) {
      if (probe.ok) {
        pendingUrls.delete(probe.url);
      }
    }

    if (pendingUrls.size === 0) {
      return;
    }

    await sleepImpl(pollInterval);
  }

  fail(
    `API applicative non pronte entro il timeout previsto: ${[...pendingUrls].join(', ')}`,
  );
}

function startChild(command, args, {
  cwd = projectRoot,
  env = loadRuntimeEnv(),
  spawnImpl = spawn,
} = {}) {
  return spawnImpl(command, args, {
    cwd,
    env,
    stdio: 'ignore',
  });
}

function isChildRunning(child) {
  return Boolean(child) && child.exitCode == null && child.signalCode == null;
}

async function stopChild(child, { sleepImpl = sleep } = {}) {
  if (!child || typeof child.kill !== 'function') {
    return;
  }

  try {
    child.kill('SIGTERM');
  } catch {
    return;
  }

  await sleepImpl(1000);

  if (isChildRunning(child)) {
    try {
      child.kill('SIGKILL');
    } catch {
      // Ignore best-effort cleanup failures
    }
  }
}

async function ensureLocalAppStack({
  frontendUrl = baseUrl,
  backendUrl = backendHealthUrl,
  appProbeUrls = [
    `${baseUrl}/api/session`,
    `${baseUrl}/api/data`,
    `${baseUrl}/api/drivers`,
    `${baseUrl}/api/calendar`,
  ],
  fetchImpl = fetch,
  spawnImpl = spawn,
  sleepImpl = sleep,
  timeoutMs = startupTimeoutMs,
  pollInterval = pollIntervalMs,
  pollIntervalMs: pollIntervalOverride,
  cwd = projectRoot,
  env = loadRuntimeEnv(),
  backendCommand = 'node',
  backendArgs = ['server.js'],
  frontendCommand = 'npm',
  frontendArgs = ['run', 'dev:frontend'],
} = {}) {
  const resolvedPollInterval = pollIntervalOverride ?? pollInterval;
  const frontendReachable = await probeUrl(frontendUrl, { fetchImpl });
  const backendReachable = await probeUrl(backendUrl, { fetchImpl });

  if (frontendReachable && backendReachable) {
    await waitForApiReadiness(appProbeUrls, {
      fetchImpl,
      timeoutMs,
      pollInterval: resolvedPollInterval,
      sleepImpl,
    });

    return {
      started: false,
      stop: async () => {},
    };
  }

  if (frontendReachable !== backendReachable) {
    fail(
      frontendReachable
        ? `Frontend raggiungibile su ${frontendUrl} ma backend non pronto su ${backendUrl}. Chiudi lo stack locale parziale e riesegui il controllo responsive.`
        : `Backend raggiungibile su ${backendUrl} ma frontend non pronto su ${frontendUrl}. Chiudi lo stack locale parziale e riesegui il controllo responsive.`,
    );
  }

  const backendChild = startChild(backendCommand, backendArgs, {
    cwd,
    env,
    spawnImpl,
  });

  try {
    await waitForUrl(backendUrl, {
      fetchImpl,
      timeoutMs,
      pollInterval: resolvedPollInterval,
      label: backendUrl,
      failureMessage: `Backend non raggiungibile su ${backendUrl}.`,
      sleepImpl,
    });

    const frontendChild = startChild(frontendCommand, frontendArgs, {
      cwd,
      env,
      spawnImpl,
    });

    try {
      await waitForUrl(frontendUrl, {
        fetchImpl,
        timeoutMs,
        pollInterval: resolvedPollInterval,
        label: frontendUrl,
        failureMessage: `Frontend non raggiungibile su ${frontendUrl}.`,
        sleepImpl,
      });

      await waitForApiReadiness(appProbeUrls, {
        fetchImpl,
        timeoutMs,
        pollInterval: resolvedPollInterval,
        sleepImpl,
      });

      return {
        started: true,
        stop: async () => {
          await stopChild(frontendChild, { sleepImpl });
          await stopChild(backendChild, { sleepImpl });
        },
      };
    } catch (error) {
      await stopChild(frontendChild, { sleepImpl });
      await stopChild(backendChild, { sleepImpl });
      throw error;
    }
  } catch (error) {
    await stopChild(backendChild, { sleepImpl });
    throw error;
  }
}

function buildCliArgs(args, { sessionId } = {}) {
  return [
    ...playwrightCliBaseArgs,
    ...(sessionId ? [`-s=${sessionId}`] : []),
    ...args,
  ];
}

function extractProcessOutput(result) {
  return `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
}

function extractResultBlock(output) {
  const match = String(output).match(/### Result\s*([\s\S]*?)(?:\n### Ran Playwright code|\n### Page|\n### Snapshot|$)/);

  if (!match) {
    fail('Impossibile leggere il risultato da Playwright CLI.', output);
  }

  return match[1].trim();
}

function extractMarkdownLinkTarget(output) {
  const match = String(output).match(/\]\(([^)]+)\)/);
  return match ? match[1].trim() : null;
}

function sanitizeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parsePlaywrightSessions(output) {
  const sessions = [];
  let current = null;

  for (const rawLine of String(output ?? '').split(/\r?\n/)) {
    const line = rawLine.trim();
    const nameMatch = line.match(/^- ([^:\s]+):$/);
    if (nameMatch) {
      current = {
        name: nameMatch[1],
        status: '',
      };
      sessions.push(current);
      continue;
    }

    const statusMatch = line.match(/^- status:\s*(.+)$/i);
    if (statusMatch && current) {
      current.status = statusMatch[1].trim().toLowerCase();
    }
  }

  return sessions;
}

function findStaleResponsiveSessions(output, { prefix = responsiveSessionPrefix } = {}) {
  return parsePlaywrightSessions(output)
    .filter((session) => session.name.startsWith(prefix) && session.status === 'open')
    .map((session) => session.name);
}

function parseCurrentTabUrl(output) {
  const match = String(output).match(/\(current\)\s*\[[^\]]*]\(([^)]+)\)/i);
  return match ? match[1] : null;
}

function buildCleanupInstructions(sessionIds) {
  return [
    `Sessioni rilevate: ${sessionIds.join(', ')}`,
    'Bonifica manuale consigliata:',
    '- npx --yes --package @playwright/cli playwright-cli list',
    '- npx --yes --package @playwright/cli playwright-cli -s=<sessione> close',
    '- in ultima istanza: npx --yes --package @playwright/cli playwright-cli close-all oppure kill-all',
  ].join('\n');
}

function sleepSync(durationMs) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, durationMs);
}

function isAppShellReady(pageInfo) {
  const selectors = pageInfo?.selectors ?? {};

  return (
    Boolean(pageInfo) &&
    !pageInfo.loadingShell &&
    Boolean(selectors.heroPanel) &&
    Boolean(selectors.heroSummaryGrid) &&
    Boolean(selectors.calendarPanel) &&
    Boolean(selectors.predictionsGrid) &&
    Boolean(selectors.appFooter)
  );
}

function waitForAppShell({
  getPageInfoImpl,
  sleepSyncImpl = sleepSync,
  timeoutMs = uiShellTimeoutMs,
  pollInterval = uiShellPollIntervalMs,
  failureMessage = 'Shell UI principale non pronta entro il timeout previsto.',
} = {}) {
  const startedAt = Date.now();
  let lastPageInfo = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      lastPageInfo = getPageInfoImpl();
      if (isAppShellReady(lastPageInfo)) {
        return lastPageInfo;
      }
    } catch {
      // Retry until timeout
    }

    sleepSyncImpl(pollInterval);
  }

  fail(failureMessage, lastPageInfo ? stringifyDiagnostics(lastPageInfo) : undefined);
}

function waitForEvaluatedCondition(
  expression,
  {
    evaluateJsonImpl,
    sleepSyncImpl = sleepSync,
    timeoutMs = 30000,
    pollInterval = 250,
    failureMessage = 'Condizione UI non raggiunta in tempo.',
  } = {},
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      if (evaluateJsonImpl(expression) === true) {
        return;
      }
    } catch {
      // Retry until timeout
    }

    sleepSyncImpl(pollInterval);
  }

  fail(failureMessage);
}

function prepareOutputDirectory({ fsImpl = fs, outputDirectory = outputDir } = {}) {
  fsImpl.rmSync(outputDirectory, { recursive: true, force: true });
  fsImpl.mkdirSync(outputDirectory, { recursive: true });
}

function createPlaywrightCliAdapter({
  sessionId = sessionName,
  basePageUrl = baseUrl,
  outputDirectory = outputDir,
  cwd = process.cwd(),
  cliTimeoutMs = cliCommandTimeoutMs,
  startupTimeoutMs: sessionStartupTimeoutMs = cliStartupTimeoutMs,
  cleanupTimeoutMs = cliCleanupTimeoutMs,
  pollInterval = pollIntervalMs,
  sessionPrefix = responsiveSessionPrefix,
  spawnImpl = spawn,
  spawnSyncImpl = spawnSync,
  sleepImpl = sleep,
  sleepSyncImpl = sleepSync,
  fsImpl = fs,
  pathImpl = path,
} = {}) {
  function shouldRetryTimedOutCommand(args, { timeoutMs }) {
    const command = args[0] ?? '';
    return timeoutMs < cliRetryTimeoutMs && ['list', 'tab-list'].includes(command);
  }

  function run(args, {
    allowFailure = false,
    timeoutMs = cliTimeoutMs,
    sessionScoped = true,
  } = {}) {
    const timeouts = shouldRetryTimedOutCommand(args, { timeoutMs })
      ? [timeoutMs, cliRetryTimeoutMs]
      : [timeoutMs];
    let lastResult;
    let lastOutput = '';

    for (const resolvedTimeout of timeouts) {
      const result = spawnSyncImpl('npx', buildCliArgs(args, {
        sessionId: sessionScoped ? sessionId : undefined,
      }), {
        cwd,
        encoding: 'utf8',
        timeout: resolvedTimeout,
      });
      const output = extractProcessOutput(result);

      lastResult = result;
      lastOutput = output;

      if (result.error?.code === 'ETIMEDOUT' && resolvedTimeout !== timeouts[timeouts.length - 1]) {
        continue;
      }

      break;
    }

    if (lastResult?.error) {
      if (lastResult.error.code === 'ETIMEDOUT') {
        fail(`Comando Playwright scaduto dopo ${timeoutMs}ms: ${args.join(' ')}`, lastOutput || lastResult.error.message);
      }

      fail(`Comando Playwright fallito: ${args.join(' ')}`, lastOutput || lastResult.error.message);
    }

    if (!allowFailure && lastResult?.status !== 0) {
      fail(`Comando Playwright fallito: ${args.join(' ')}`, lastOutput);
    }

    return lastOutput;
  }

  function safeRun(args, options) {
    try {
      return {
        ok: true,
        output: run(args, options),
      };
    } catch (error) {
      return {
        ok: false,
        error,
      };
    }
  }

  function evaluateJson(expression, options) {
    const output = run(['eval', expression], options);
    const raw = extractResultBlock(output);

    try {
      return JSON.parse(raw);
    } catch {
      fail('Impossibile fare il parse del risultato JSON di Playwright.', raw);
    }
  }

  function safeEvaluateJson(expression, options) {
    try {
      return {
        ok: true,
        value: evaluateJson(expression, options),
      };
    } catch (error) {
      return {
        ok: false,
        error,
      };
    }
  }

  function writeTextArtifact(fileName, content) {
    const targetPath = pathImpl.join(outputDirectory, fileName);
    fsImpl.writeFileSync(targetPath, content, 'utf8');
    return targetPath;
  }

  function copyLinkedArtifact(commandOutput, targetBaseName) {
    const linkedPath = extractMarkdownLinkTarget(commandOutput);
    if (!linkedPath) {
      return null;
    }

    const sourcePath = pathImpl.resolve(cwd, linkedPath);
    if (typeof fsImpl.existsSync === 'function' && !fsImpl.existsSync(sourcePath)) {
      return null;
    }

    const extension = pathImpl.extname(sourcePath) || '.txt';
    const targetPath = pathImpl.join(outputDirectory, `${sanitizeName(targetBaseName)}${extension}`);
    fsImpl.copyFileSync(sourcePath, targetPath);
    return targetPath;
  }

  function getPageInfo() {
    return evaluateJson(appShellStateExpression);
  }

  function waitForCurrentUrl(expectedUrl, {
    timeoutMs = sessionStartupTimeoutMs,
    pollInterval: currentPollInterval = pollInterval,
    failureMessage = `Sessione Playwright non pronta su ${expectedUrl} entro il timeout previsto.`,
  } = {}) {
    const startedAt = Date.now();
    let lastUrl = '';

    while (Date.now() - startedAt < timeoutMs) {
      const result = safeRun(['tab-list'], {
        allowFailure: true,
        timeoutMs: cleanupTimeoutMs,
      });

      if (result.ok) {
        lastUrl = parseCurrentTabUrl(result.output) ?? '';
        if (expectedUrl ? lastUrl.startsWith(expectedUrl) : lastUrl) {
          return lastUrl;
        }
      }

      sleepSyncImpl(currentPollInterval);
    }

    fail(failureMessage, lastUrl || 'Nessun tab corrente disponibile.');
  }

  function assertCleanEnvironment() {
    const output = run(['list'], {
      sessionScoped: false,
      timeoutMs: cleanupTimeoutMs,
    });
    const staleSessions = findStaleResponsiveSessions(output, {
      prefix: sessionPrefix,
    });

    if (staleSessions.length > 0) {
      fail(
        `Sessioni Playwright responsive gia' aperte: ${staleSessions.join(', ')}. Chiudi manualmente le sessioni residue prima di rieseguire il test.`,
        buildCleanupInstructions(staleSessions),
      );
    }
  }

  async function startSession({
    url = basePageUrl,
    timeoutMs = sessionStartupTimeoutMs,
    pollInterval: currentPollInterval = pollInterval,
  } = {}) {
    const child = spawnImpl('npx', buildCliArgs(['open', url], { sessionId }), {
      cwd,
      stdio: 'ignore',
    });

    try {
      const initialUrl = waitForCurrentUrl('', {
        timeoutMs,
        pollInterval: currentPollInterval,
      });

      if (url && !initialUrl.startsWith(url)) {
        run(['goto', url]);
      }

      waitForCurrentUrl(url, {
        timeoutMs,
        pollInterval: currentPollInterval,
      });

      return {
        sessionId,
        stop: async () => {
          const issues = [];
          const closeResult = safeRun(['close'], {
            allowFailure: true,
            timeoutMs: cleanupTimeoutMs,
          });

          if (!closeResult.ok && !/not open, please run open first/i.test(formatErrorDetails(closeResult.error))) {
            issues.push(`Chiusura sessione Playwright fallita: ${formatErrorDetails(closeResult.error)}`);
          }

          await stopChild(child, { sleepImpl });

          const listResult = safeRun(['list'], {
            sessionScoped: false,
            allowFailure: true,
            timeoutMs: cleanupTimeoutMs,
          });

          if (listResult.ok) {
            const openSessions = parsePlaywrightSessions(listResult.output)
              .filter((entry) => entry.status === 'open')
              .map((entry) => entry.name);

            if (openSessions.includes(sessionId)) {
              issues.push(`Sessione Playwright orfana ancora aperta: ${sessionId}. ${buildCleanupInstructions([sessionId])}`);
            }
          }

          return issues;
        },
      };
    } catch (error) {
      await stopChild(child, { sleepImpl });
      throw error;
    }
  }

  function goto(url, {
    timeoutMs = sessionStartupTimeoutMs,
    pollInterval: currentPollInterval = pollInterval,
  } = {}) {
    run(['goto', url]);
    waitForCurrentUrl(url, {
      timeoutMs,
      pollInterval: currentPollInterval,
      failureMessage: `Navigazione Playwright non riuscita verso ${url}.`,
    });
  }

  function captureScreenshot(name) {
    const screenshotResult = safeRun(['screenshot'], {
      allowFailure: true,
      timeoutMs: cleanupTimeoutMs,
    });

    if (!screenshotResult.ok) {
      return null;
    }

    return copyLinkedArtifact(screenshotResult.output, `${name}-screenshot`);
  }

  function collectDiagnostics({
    label = 'fatal',
    error,
    remediation,
  } = {}) {
    const safeLabel = sanitizeName(label);
    const screenshotPath = captureScreenshot(safeLabel);

    const tabListResult = safeRun(['tab-list'], {
      allowFailure: true,
      timeoutMs: cleanupTimeoutMs,
    });
    writeTextArtifact(
      `${safeLabel}-tab-list.txt`,
      tabListResult.ok
        ? tabListResult.output
        : `Impossibile leggere i tab Playwright.\n${formatErrorDetails(tabListResult.error)}`,
    );

    const pageInfoResult = safeEvaluateJson(appShellStateExpression, {
      allowFailure: true,
      timeoutMs: cleanupTimeoutMs,
    });
    writeTextArtifact(
      pageInfoResult.ok
        ? `${safeLabel}-page-state.json`
        : `${safeLabel}-page-state.txt`,
      pageInfoResult.ok
        ? stringifyDiagnostics(pageInfoResult.value)
        : `Impossibile leggere lo stato pagina.\n${formatErrorDetails(pageInfoResult.error)}`,
    );

    const consoleResult = safeRun(['console', 'info'], {
      allowFailure: true,
      timeoutMs: cleanupTimeoutMs,
    });
    const consolePath = consoleResult.ok
      ? copyLinkedArtifact(consoleResult.output, `${safeLabel}-console`)
      : null;
    if (!consolePath) {
      writeTextArtifact(
        `${safeLabel}-console.txt`,
        consoleResult.ok ? consoleResult.output : formatErrorDetails(consoleResult.error),
      );
    }

    const networkResult = safeRun(['network'], {
      allowFailure: true,
      timeoutMs: cleanupTimeoutMs,
    });
    const networkPath = networkResult.ok
      ? copyLinkedArtifact(networkResult.output, `${safeLabel}-network`)
      : null;
    if (!networkPath) {
      writeTextArtifact(
        `${safeLabel}-network.txt`,
        networkResult.ok ? networkResult.output : formatErrorDetails(networkResult.error),
      );
    }

    const summaryLines = [
      `sessionId: ${sessionId}`,
      `label: ${safeLabel}`,
      `error: ${formatErrorDetails(error)}`,
    ];

    if (error?.cause) {
      summaryLines.push(
        `cause: ${typeof error.cause === 'string' ? error.cause : stringifyDiagnostics(error.cause)}`,
      );
    }

    if (remediation) {
      summaryLines.push(`remediation: ${remediation}`);
    }

    if (screenshotPath) {
      summaryLines.push(`screenshot: ${screenshotPath}`);
    }

    const summaryPath = writeTextArtifact(`${safeLabel}-summary.txt`, summaryLines.join('\n'));

    return {
      summaryPath,
      screenshotPath,
      consolePath,
      networkPath,
    };
  }

  return {
    sessionId,
    run,
    safeRun,
    evaluateJson,
    getPageInfo,
    assertCleanEnvironment,
    startSession,
    goto,
    captureScreenshot,
    collectDiagnostics,
  };
}

async function waitForFrontend(url, timeoutMs = startupTimeoutMs) {
  await waitForUrl(url, {
    timeoutMs,
    label: url,
    failureMessage: `Frontend non raggiungibile su ${url}. Avvia backend e frontend locali prima del test.`,
  });
}

function inspectState({ evaluateJsonImpl }) {
  return evaluateJsonImpl(inspectStateExpression);
}

function navigateToBase(cli, {
  label = 'navigation',
  remediation = 'Verifica il lifecycle della sessione Playwright e i log raccolti in output/playwright/ui-responsive.',
} = {}) {
  try {
    cli.goto(baseUrl);
    const pageInfo = waitForAppShell({
      getPageInfoImpl: () => cli.getPageInfo(),
    });
    sleepSync(250);
    return pageInfo;
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    cli.collectDiagnostics({
      label,
      error: normalizedError,
      remediation,
    });
    markDiagnosticsCollected(normalizedError);
    throw normalizedError;
  }
}

function resizeViewport({ width, height }, {
  runCliImpl,
  sleepSyncImpl = sleepSync,
} = {}) {
  runCliImpl(['resize', String(width), String(height)]);
  sleepSyncImpl(150);
}

function selectSprintWeekend({
  evaluateJsonImpl,
  sleepSyncImpl = sleepSync,
} = {}) {
  const result = evaluateJsonImpl(`() => {
    const sprintCard = document.querySelector('.calendar-card.sprint');

    if (!sprintCard) {
      return { clicked: false };
    }

    sprintCard.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return { clicked: true, label: sprintCard.textContent?.replace(/\\s+/g, ' ').trim() ?? '' };
  }`);

  if (!result.clicked) {
    fail('Nessun weekend Sprint trovato nel calendario UI.');
  }

  waitForEvaluatedCondition(
    `() => {
      const badge = document.querySelector('.next-race-card .race-badge');
      return Boolean(badge) && /sprint/i.test(badge.textContent || '');
    }`,
    {
      evaluateJsonImpl,
      sleepSyncImpl,
      timeoutMs: 10000,
      failureMessage: 'Badge Sprint non aggiornato dopo la selezione del weekend Sprint.',
    },
  );
  sleepSyncImpl(150);
}

function openTooltipIfPresent({
  evaluateJsonImpl,
  sleepSyncImpl = sleepSync,
} = {}) {
  const result = evaluateJsonImpl(`() => {
    const wrapper = document.querySelector('.results-actions .tooltip-wrapper.disabled-wrapper');

    if (!wrapper) {
      return { clicked: false };
    }

    wrapper.classList.add('show-tooltip');
    return { clicked: true };
  }`);

  if (!result.clicked) {
    return false;
  }

  sleepSyncImpl(100);
  return true;
}

function switchWeekend({
  evaluateJsonImpl,
  sleepSyncImpl = sleepSync,
} = {}) {
  waitForEvaluatedCondition('() => document.querySelectorAll(".calendar-card").length > 1', {
    evaluateJsonImpl,
    sleepSyncImpl,
    timeoutMs: 10000,
    failureMessage: 'Calendario UI senza weekend alternativi disponibili.',
  });

  const result = evaluateJsonImpl(`() => {
    const cards = [...document.querySelectorAll('.calendar-card')];
    const currentIndex = cards.findIndex((card) => card.classList.contains('selected'));
    const nextCard = cards.find((_, index) => index !== currentIndex) || null;

    if (!nextCard) {
      return { clicked: false };
    }

    nextCard.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return {
      clicked: true,
      text: nextCard.textContent?.replace(/\\s+/g, ' ').trim() ?? '',
    };
  }`);

  if (!result.clicked) {
    fail('Impossibile selezionare un weekend alternativo nel calendario UI.');
  }

  sleepSyncImpl(150);
}

function switchViewMode(targetView, {
  evaluateJsonImpl,
  sleepSyncImpl = sleepSync,
} = {}) {
  const result = evaluateJsonImpl(`() => {
    const buttons = [...document.querySelectorAll('.view-mode-toggle button')];
    const matcher = ${JSON.stringify(targetView)} === 'public' ? /pubblica/i : /admin/i;
    const targetButton = buttons.find((button) => matcher.test(button.textContent || ''));

    if (!targetButton) {
      return { clicked: false };
    }

    targetButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return { clicked: true };
  }`);

  if (!result.clicked) {
    fail(`Impossibile cambiare vista verso ${targetView}.`);
  }

  waitForEvaluatedCondition(
    `() => {
      const activeButton = [...document.querySelectorAll('.view-mode-toggle button')]
        .find((button) => button.getAttribute('aria-pressed') === 'true');
      const label = String(activeButton?.textContent || '');
      return ${JSON.stringify(targetView)} === 'public'
        ? /pubblica/i.test(label)
        : /admin/i.test(label);
    }`,
    {
      evaluateJsonImpl,
      sleepSyncImpl,
      timeoutMs: 10000,
      failureMessage: `Vista ${targetView} non attiva dopo il toggle UI.`,
    },
  );

  sleepSyncImpl(150);
}

function validateState(
  state,
  {
    expectSprintBadge = false,
    expectVisibleTooltip = false,
    expectedViewMode = null,
    expectedWeekendChangeFrom = null,
  } = {},
) {
  const failures = [];
  const usesFormula1 = (fontFamily) => /(?:^|,)\s*["']?Formula1["']?\s*(?:,|$)/i.test(fontFamily);
  const isPublicView = expectedViewMode === 'public';

  const requiredSections = {
    hero: state.mainSections.hero,
    summary: state.mainSections.summary,
    calendar: state.mainSections.calendar,
    predictions: state.mainSections.predictions,
    footer: state.mainSections.footer,
    ...(isPublicView ? {} : { results: state.mainSections.results }),
  };

  if (!Object.values(requiredSections).every(Boolean)) {
    failures.push(`Sezioni principali mancanti: ${JSON.stringify(state.mainSections)}`);
  }

  if (!state.nextRace.cardPresent) {
    failures.push('Card "Prossimo weekend" non trovata.');
  }

  if (state.nextRace.hasSessions && state.nextRace.clippedRows.length > 0) {
    failures.push(
      `Righe sessione fuori card/clippate: ${JSON.stringify(state.nextRace.clippedRows.slice(0, 3))}`,
    );
  }

  if (!state.nextRace.hasSessions && !state.nextRace.noteFits) {
    failures.push(`Fallback orari fuori card: ${state.nextRace.noteText || '(vuoto)'}`);
  }

  if (state.nextRace.hasSessions) {
    for (const [label, details] of Object.entries({
      'orario evento (giorno)': state.typography.sessionDay,
      'orario evento (data)': state.typography.sessionDate,
      'orario evento (clock)': state.typography.sessionClock,
    })) {
      if (!details.present) {
        failures.push(`Target tipografico mancante: ${label}.`);
        continue;
      }

      if (!usesFormula1(details.fontFamily)) {
        failures.push(`${label} non usa Formula1: ${JSON.stringify(details)}`);
      }
    }
  }

  for (const [label, details] of Object.entries({
    'punti classifica live': state.typography.liveScoreValue,
    'valore proiezione gara': state.typography.projectionValue,
  })) {
    if (!details.present) {
      failures.push(`Target tipografico mancante: ${label}.`);
      continue;
    }

    if (!usesFormula1(details.fontFamily)) {
      failures.push(`${label} non usa Formula1: ${JSON.stringify(details)}`);
    }
  }

  if (expectSprintBadge && !/sprint/i.test(state.nextRace.badgeText)) {
    failures.push(`Badge Sprint non rilevato dopo la selezione: "${state.nextRace.badgeText}"`);
  }

  if (expectVisibleTooltip && !state.tooltip.wrapperPresent) {
    failures.push('Tooltip risultati non disponibile nello stato corrente.');
  }

  if (expectVisibleTooltip && !state.tooltip.present) {
    failures.push('Tooltip risultati non presente nel DOM.');
  }

  if (expectVisibleTooltip && !state.tooltip.visible) {
    failures.push('Tooltip risultati non visibile dopo l\'interazione.');
  }

  if (expectVisibleTooltip && !state.tooltip.fitsViewport) {
    failures.push(`Tooltip risultati fuori viewport: "${state.tooltip.text}"`);
  }

  if (!state.history.present) {
    failures.push('Pannello storico non trovato.');
  }

  if (!isPublicView && state.history.hasCards && state.history.actionButtonCount === 0) {
    failures.push('Storico presente ma senza action buttons.');
  }

  if (state.history.hasCards && state.history.clippedButtons.length > 0) {
    failures.push(
      `Action buttons dello storico fuori pannello: ${JSON.stringify(state.history.clippedButtons)}`,
    );
  }

  if (!state.history.hasCards && !state.history.emptyStateVisible) {
    failures.push('Storico senza card ma anche senza empty state visibile.');
  }

  if (expectedWeekendChangeFrom) {
    if (state.selectedWeekend.cardText === expectedWeekendChangeFrom.cardText) {
      failures.push('La card calendario selezionata non e\' cambiata dopo il click su un altro weekend.');
    }

    if (state.selectedWeekend.bannerTitle === expectedWeekendChangeFrom.bannerTitle) {
      failures.push('Il banner del weekend selezionato non si e\' aggiornato dopo il cambio gara.');
    }
  }

  if (state.unauthorizedOverflow.length > 0) {
    failures.push(
      `Overflow orizzontale non consentito: ${JSON.stringify(state.unauthorizedOverflow.slice(0, 5))}`,
    );
  }

  if (expectedViewMode && state.viewMode?.current !== expectedViewMode) {
    failures.push(`Vista corrente inattesa: attesa ${expectedViewMode}, rilevata ${state.viewMode?.current || '(vuota)'}.`);
  }

  if (isPublicView) {
    if (!state.viewMode?.readonlyBannerPresent) {
      failures.push('Vista pubblica senza banner readonly.');
    }

    if (!state.viewMode?.publicControlsPresent) {
      failures.push('Vista pubblica senza pannello readonly dedicato.');
    }
  } else if (expectedViewMode === 'admin' && !state.viewMode?.adminControlsPresent) {
    failures.push('Vista admin senza controlli risultati/modifica.');
  }

  if (state.interactiveSurfaces) {
    if (state.interactiveSurfaces.total <= 0) {
      failures.push('Nessuna interactive surface rilevata nella pagina.');
    }

    if (state.interactiveSurfaces.analytics <= 0) {
      failures.push('Nessuna interactive surface analytics rilevata nei riquadri UI.');
    }
  }

  return failures;
}

function canSwitchWeekend(state) {
  return Number(state?.selectedWeekend?.calendarCardCount ?? 0) > 1;
}

function canSelectSprintWeekend(state) {
  return Number(state?.selectedWeekend?.sprintCardCount ?? 0) > 0;
}

async function cleanupResponsiveCheck({
  playwrightSession,
  localStack,
  consoleImpl = console,
} = {}) {
  const issues = [];

  try {
    if (playwrightSession?.stop) {
      const sessionIssues = await playwrightSession.stop();
      if (Array.isArray(sessionIssues)) {
        issues.push(...sessionIssues);
      }
    }
  } catch (error) {
    issues.push(`Teardown sessione Playwright fallito: ${formatErrorDetails(error)}`);
  }

  try {
    await localStack?.stop?.();
  } catch (error) {
    issues.push(`Arresto stack locale fallito: ${formatErrorDetails(error)}`);
  }

  for (const issue of issues) {
    consoleImpl.error(`[ui-responsive] ${issue}`);
  }

  return issues;
}

async function main() {
  ensureNpx();
  prepareOutputDirectory();
  const localStack = await ensureLocalAppStack();
  const cli = createPlaywrightCliAdapter();
  let playwrightSession = null;

  try {
    await waitForFrontend(baseUrl);
    cli.assertCleanEnvironment();
    playwrightSession = await cli.startSession({
      url: baseUrl,
    });

    console.log(`[ui-responsive] Avvio controlli su ${baseUrl}`);
    navigateToBase(cli, {
      label: 'initial-load',
      remediation: 'Verifica l\'allineamento della sessione Playwright, la splash iniziale e i log raccolti.',
    });

    const allFailures = [];

    for (const breakpoint of breakpoints) {
      console.log(
        `[ui-responsive] Controllo ${breakpoint.label} (${breakpoint.width}x${breakpoint.height})`,
      );
      resizeViewport(breakpoint, {
        runCliImpl: cli.run,
      });
      navigateToBase(cli, {
        label: `${breakpoint.label}-navigation`,
        remediation: 'Verifica che la sessione Playwright punti davvero al frontend locale e che la shell esca dal loading.',
      });

      const defaultState = inspectState({
        evaluateJsonImpl: cli.evaluateJson,
      });
      const defaultFailures = validateState(defaultState, {
        expectedViewMode: 'admin',
      });
      if (defaultFailures.length > 0) {
        const screenshotPath = cli.captureScreenshot(`${breakpoint.label}-default`);
        allFailures.push({
          viewport: breakpoint,
          state: 'default',
          failures: defaultFailures,
          screenshotPath,
        });
      }

      switchViewMode('public', {
        evaluateJsonImpl: cli.evaluateJson,
      });
      const publicState = inspectState({
        evaluateJsonImpl: cli.evaluateJson,
      });
      const publicFailures = validateState(publicState, {
        expectedViewMode: 'public',
      });
      if (publicFailures.length > 0) {
        const screenshotPath = cli.captureScreenshot(`${breakpoint.label}-public-view`);
        allFailures.push({
          viewport: breakpoint,
          state: 'public-view',
          failures: publicFailures,
          screenshotPath,
        });
      }

      switchViewMode('admin', {
        evaluateJsonImpl: cli.evaluateJson,
      });
      const adminReturnState = inspectState({
        evaluateJsonImpl: cli.evaluateJson,
      });
      const adminReturnFailures = validateState(adminReturnState, {
        expectedViewMode: 'admin',
      });
      if (adminReturnFailures.length > 0) {
        const screenshotPath = cli.captureScreenshot(`${breakpoint.label}-admin-return`);
        allFailures.push({
          viewport: breakpoint,
          state: 'admin-return',
          failures: adminReturnFailures,
          screenshotPath,
        });
      }

      if (canSwitchWeekend(defaultState)) {
        switchWeekend({
          evaluateJsonImpl: cli.evaluateJson,
        });
        const switchedState = inspectState({
          evaluateJsonImpl: cli.evaluateJson,
        });
        const switchedFailures = validateState(switchedState, {
          expectedWeekendChangeFrom: defaultState.selectedWeekend,
        });
        if (switchedFailures.length > 0) {
          const screenshotPath = cli.captureScreenshot(`${breakpoint.label}-weekend-switch`);
          allFailures.push({
            viewport: breakpoint,
            state: 'weekend-switch',
            failures: switchedFailures,
            screenshotPath,
          });
        }
      } else {
        console.log(
          `[ui-responsive] Salto controllo weekend-switch su ${breakpoint.label}: nessun weekend alternativo disponibile.`,
        );
      }

      if (canSelectSprintWeekend(defaultState)) {
        selectSprintWeekend({
          evaluateJsonImpl: cli.evaluateJson,
        });
        const tooltipActivated = openTooltipIfPresent({
          evaluateJsonImpl: cli.evaluateJson,
        });

        const sprintState = inspectState({
          evaluateJsonImpl: cli.evaluateJson,
        });
        const sprintFailures = validateState(sprintState, {
          expectSprintBadge: true,
          expectVisibleTooltip: tooltipActivated,
        });
        if (sprintFailures.length > 0) {
          const screenshotPath = cli.captureScreenshot(`${breakpoint.label}-sprint-tooltip`);
          allFailures.push({
            viewport: breakpoint,
            state: 'sprint-tooltip',
            failures: sprintFailures,
            screenshotPath,
          });
        }
      } else {
        console.log(
          `[ui-responsive] Salto controllo sprint-tooltip su ${breakpoint.label}: nessun weekend Sprint disponibile.`,
        );
      }
    }

    if (allFailures.length > 0) {
      console.error('[ui-responsive] Controlli falliti.');

      for (const failure of allFailures) {
        console.error(
          `- ${failure.viewport.label} ${failure.viewport.width}x${failure.viewport.height} [${failure.state}]`,
        );
        for (const message of failure.failures) {
          console.error(`  - ${message}`);
        }
        if (failure.screenshotPath) {
          console.error(`  - screenshot: ${failure.screenshotPath}`);
        }
      }

      process.exitCode = 1;
      return;
    }

    console.log('[ui-responsive] Tutti i controlli responsive sono passati.');
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));

    if (!hasDiagnosticsCollected(normalizedError)) {
      cli.collectDiagnostics({
        label: 'fatal',
        error: normalizedError,
        remediation:
          'Verifica i file generati in output/playwright/ui-responsive e chiudi eventuali sessioni Playwright residue prima di riprovare.',
      });
      markDiagnosticsCollected(normalizedError);
    }

    console.error(`[ui-responsive] ${normalizedError.message}`);
    if (normalizedError.cause) {
      console.error(
        typeof normalizedError.cause === 'string'
          ? normalizedError.cause
          : stringifyDiagnostics(normalizedError.cause),
      );
    }
    process.exitCode = 1;
  } finally {
    const cleanupIssues = await cleanupResponsiveCheck({
      playwrightSession,
      localStack,
    });

    if (cleanupIssues.length > 0) {
      process.exitCode = 1;
    }
  }
}

const isMainModule =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  await main();
}

export {
  canSelectSprintWeekend,
  canSwitchWeekend,
  cleanupResponsiveCheck,
  createPlaywrightCliAdapter,
  ensureLocalAppStack,
  findStaleResponsiveSessions,
  isAppShellReady,
  validateState,
  waitForAppShell,
};
