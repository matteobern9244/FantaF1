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

function ensureNpx() {
  const result = spawnSync('npx', ['--version'], {
    cwd: process.cwd(),
    encoding: 'utf8',
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

function startChild(command, args, { cwd = projectRoot, env = loadRuntimeEnv(), spawnImpl = spawn } = {}) {
  return spawnImpl(command, args, {
    cwd,
    env,
    stdio: 'ignore',
  });
}

async function stopChild(child, { sleepImpl = sleep } = {}) {
  if (!child || child.killed) {
    return;
  }

  child.kill('SIGTERM');
  await sleepImpl(1000);

  if (!child.killed) {
    child.kill('SIGKILL');
  }
}

async function ensureLocalAppStack({
  frontendUrl = baseUrl,
  backendUrl = backendHealthUrl,
  fetchImpl = fetch,
  spawnImpl = spawn,
  sleepImpl = sleep,
  timeoutMs = startupTimeoutMs,
  pollInterval = pollIntervalMs,
  cwd = projectRoot,
  env = loadRuntimeEnv(),
  backendCommand = 'node',
  backendArgs = ['server.js'],
  frontendCommand = 'npm',
  frontendArgs = ['run', 'dev:frontend'],
} = {}) {
  if (await probeUrl(frontendUrl, { fetchImpl })) {
    return {
      started: false,
      stop: async () => {},
    };
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
      pollInterval,
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
        pollInterval,
        label: frontendUrl,
        failureMessage: `Frontend non raggiungibile su ${frontendUrl}.`,
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

function getCliArgs(args) {
  return [
    '--yes',
    '--package',
    '@playwright/cli',
    'playwright-cli',
    `-s=${sessionName}`,
    ...args,
  ];
}

function isPlaywrightSessionReady({ runCliImpl = runCli } = {}) {
  const output = runCliImpl(['tab-list'], {
    allowFailure: true,
  });

  return !/not open, please run open first/i.test(output);
}

async function waitForPlaywrightSession({
  probeImpl = isPlaywrightSessionReady,
  timeoutMs = startupTimeoutMs,
  pollInterval = pollIntervalMs,
  sleepImpl = sleep,
} = {}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (probeImpl()) {
      return;
    }

    await sleepImpl(pollInterval);
  }

  fail('Sessione Playwright non pronta entro il timeout previsto.');
}

async function startPlaywrightSession({
  spawnImpl = spawn,
  sleepImpl = sleep,
  waitForReadyImpl = waitForPlaywrightSession,
  timeoutMs = startupTimeoutMs,
  pollInterval = pollIntervalMs,
} = {}) {
  const child = spawnImpl('npx', getCliArgs(['open']), {
    cwd: process.cwd(),
    stdio: 'ignore',
  });

  try {
    await waitForReadyImpl({
      timeoutMs,
      pollInterval,
      sleepImpl,
    });

    return {
      stop: async () => {
        await stopChild(child, { sleepImpl });
      },
    };
  } catch (error) {
    await stopChild(child, { sleepImpl });
    throw error;
  }
}

function runCli(args, { allowFailure = false } = {}) {
  const result = spawnSync('npx', getCliArgs(args), {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();

  if (result.error) {
    throw result.error;
  }

  if (!allowFailure && result.status !== 0) {
    fail(`Comando Playwright fallito: ${args.join(' ')}`, output);
  }

  return output;
}

function extractResultBlock(output) {
  const match = output.match(/### Result\s*([\s\S]*?)\n### Ran Playwright code/);

  if (!match) {
    fail('Impossibile leggere il risultato da Playwright CLI.', output);
  }

  return match[1].trim();
}

function evaluateJson(expression) {
  const output = runCli(['eval', expression]);
  const raw = extractResultBlock(output);

  try {
    return JSON.parse(raw);
  } catch {
    fail('Impossibile fare il parse del risultato JSON di Playwright.', raw);
  }
}

function sleepSync(durationMs) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, durationMs);
}

function waitForEvaluatedCondition(
  expression,
  {
    timeoutMs = 30000,
    pollInterval = 250,
    failureMessage = 'Condizione UI non raggiunta in tempo.',
  } = {},
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      if (evaluateJson(expression) === true) {
        return;
      }
    } catch {
      // Retry until timeout
    }

    sleepSync(pollInterval);
  }

  fail(failureMessage);
}

function waitForPageReady() {
  waitForEvaluatedCondition(
    `() => {
      return Boolean(document.querySelector('.hero-panel')) &&
        !document.querySelector('.loading-shell') &&
        Boolean(document.querySelector('.hero-summary-grid')) &&
        Boolean(document.querySelector('.calendar-panel')) &&
        Boolean(document.querySelector('.results-actions')) &&
        Boolean(document.querySelector('.app-footer')) &&
        Boolean(document.querySelector('.live-score-value')) &&
        Boolean(document.querySelector('.points-preview-value'));
    }`,
    {
      failureMessage: 'Shell UI principale non pronta entro il timeout previsto.',
    },
  );
  sleepSync(250);
}

async function waitForFrontend(url, timeoutMs = 45000) {
  await waitForUrl(url, {
    timeoutMs,
    label: url,
    failureMessage: `Frontend non raggiungibile su ${url}. Avvia backend e frontend locali prima del test.`,
  });
}

function prepareOutputDirectory() {
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });
}

function sanitizeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function captureScreenshot(name) {
  const output = runCli(['screenshot']);
  const match = output.match(/\]\(([^)]+\.png)\)/);

  if (!match) {
    return null;
  }

  const sourcePath = path.resolve(process.cwd(), match[1]);
  const targetPath = path.join(outputDir, `${sanitizeName(name)}.png`);
  fs.copyFileSync(sourcePath, targetPath);
  return targetPath;
}

function inspectState() {
  return evaluateJson(inspectStateExpression);
}

function navigateToBase() {
  runCli(['run-code', `await page.goto(${JSON.stringify(baseUrl)});`]);
  waitForPageReady();
}

function resizeViewport({ width, height }) {
  runCli(['run-code', `await page.setViewportSize({ width: ${width}, height: ${height} });`]);
  sleepSync(150);
}

function selectSprintWeekend() {
  const result = evaluateJson(`() => {
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
      timeoutMs: 10000,
      failureMessage: 'Badge Sprint non aggiornato dopo la selezione del weekend Sprint.',
    },
  );
  sleepSync(150);
}

function openTooltipIfPresent() {
  const result = evaluateJson(`() => {
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

  sleepSync(100);
  return true;
}

function switchWeekend() {
  waitForEvaluatedCondition('() => document.querySelectorAll(".calendar-card").length > 1', {
    timeoutMs: 10000,
    failureMessage: 'Calendario UI senza weekend alternativi disponibili.',
  });

  const result = evaluateJson(`() => {
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

  sleepSync(150);
}

function validateState(
  state,
  { expectSprintBadge = false, expectVisibleTooltip = false, expectedWeekendChangeFrom = null } = {},
) {
  const failures = [];
  const usesFormula1 = (fontFamily) => /(?:^|,)\s*["']?Formula1["']?\s*(?:,|$)/i.test(fontFamily);

  if (!Object.values(state.mainSections).every(Boolean)) {
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

  if (state.history.hasCards && state.history.actionButtonCount === 0) {
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

  return failures;
}

function canSwitchWeekend(state) {
  return Number(state?.selectedWeekend?.calendarCardCount ?? 0) > 1;
}

function canSelectSprintWeekend(state) {
  return Number(state?.selectedWeekend?.sprintCardCount ?? 0) > 0;
}

async function main() {
  ensureNpx();
  prepareOutputDirectory();
  const localStack = await ensureLocalAppStack();
  let playwrightSession = null;

  try {
    await waitForFrontend(baseUrl);
    playwrightSession = await startPlaywrightSession();

    console.log(`[ui-responsive] Avvio controlli su ${baseUrl}`);
    navigateToBase();

    const allFailures = [];

    for (const breakpoint of breakpoints) {
      console.log(
        `[ui-responsive] Controllo ${breakpoint.label} (${breakpoint.width}x${breakpoint.height})`,
      );
      resizeViewport(breakpoint);
      navigateToBase();

      const defaultState = inspectState();
      const defaultFailures = validateState(defaultState);
      if (defaultFailures.length > 0) {
        const screenshotPath = captureScreenshot(`${breakpoint.label}-default`);
        allFailures.push({
          viewport: breakpoint,
          state: 'default',
          failures: defaultFailures,
          screenshotPath,
        });
      }

      if (canSwitchWeekend(defaultState)) {
        switchWeekend();
        const switchedState = inspectState();
        const switchedFailures = validateState(switchedState, {
          expectedWeekendChangeFrom: defaultState.selectedWeekend,
        });
        if (switchedFailures.length > 0) {
          const screenshotPath = captureScreenshot(`${breakpoint.label}-weekend-switch`);
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
        selectSprintWeekend();
        const tooltipActivated = openTooltipIfPresent();

        const sprintState = inspectState();
        const sprintFailures = validateState(sprintState, {
          expectSprintBadge: true,
          expectVisibleTooltip: tooltipActivated,
        });
        if (sprintFailures.length > 0) {
          const screenshotPath = captureScreenshot(`${breakpoint.label}-sprint-tooltip`);
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
  } finally {
    runCli(['close'], { allowFailure: true });
    await playwrightSession?.stop();
    await localStack.stop();
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
  ensureLocalAppStack,
};
