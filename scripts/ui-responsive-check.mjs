import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const baseUrl = process.env.UI_RESPONSIVE_BASE_URL ?? 'http://127.0.0.1:5173';
const sessionName = `ui-${Date.now().toString(36)}`;
const outputDir = path.resolve(process.cwd(), 'output/playwright/ui-responsive');
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
  const tooltipText = document.querySelector('.results-actions .tooltip-wrapper .tooltip-text');
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

function runCli(args, { allowFailure = false } = {}) {
  const result = spawnSync(
    'npx',
    ['--yes', '--package', '@playwright/cli', 'playwright-cli', `-s=${sessionName}`, ...args],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );
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

function waitForPageReady() {
  runCli([
    'run-code',
    `await page.waitForFunction(() => {
      return Boolean(document.querySelector('.hero-panel')) && !document.querySelector('.loading-shell');
    }, { timeout: 30000 });`,
  ]);
  runCli(['run-code', 'await page.waitForTimeout(250);']);
}

async function waitForFrontend(url, timeoutMs = 45000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(1500),
      });

      if (response.ok) {
        return;
      }
    } catch {
      // Retry until timeout
    }

    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  fail(`Frontend non raggiungibile su ${url}. Avvia backend e frontend locali prima del test.`);
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
  runCli(['goto', baseUrl]);
  waitForPageReady();
}

function resizeViewport({ width, height }) {
  runCli(['resize', String(width), String(height)]);
  runCli(['run-code', 'await page.waitForTimeout(150);']);
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

  runCli([
    'run-code',
    `await page.waitForFunction(() => {
      const badge = document.querySelector('.next-race-card .race-badge');
      return Boolean(badge) && /sprint/i.test(badge.textContent || '');
    }, { timeout: 10000 });`,
  ]);
  runCli(['run-code', 'await page.waitForTimeout(150);']);
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
    fail('Tooltip dei risultati non disponibile nello stato corrente.');
  }

  runCli(['run-code', 'await page.waitForTimeout(100);']);
}

function switchWeekend() {
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

  runCli(['run-code', 'await page.waitForTimeout(150);']);
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

  if (!state.tooltip.present) {
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

async function main() {
  ensureNpx();
  prepareOutputDirectory();
  await waitForFrontend(baseUrl);

  console.log(`[ui-responsive] Avvio controlli su ${baseUrl}`);
  runCli(['open', baseUrl]);
  waitForPageReady();

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

    selectSprintWeekend();
    openTooltipIfPresent();

    const sprintState = inspectState();
    const sprintFailures = validateState(sprintState, {
      expectSprintBadge: true,
      expectVisibleTooltip: true,
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
}

try {
  await main();
} finally {
  runCli(['close'], { allowFailure: true });
}
