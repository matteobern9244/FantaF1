import { baseUrl, breakpoints as defaultBreakpoints } from './config.mjs';
import { cleanupResponsiveCheck as defaultCleanupResponsiveCheck } from './cleanup.mjs';
import { ensureNpx as defaultEnsureNpx, hasDiagnosticsCollected, markDiagnosticsCollected, prepareOutputDirectory, stringifyDiagnostics } from './diagnostics.mjs';
import { createPlaywrightCliAdapter as defaultCreatePlaywrightCliAdapter } from './playwright-cli.mjs';
import {
  buildResponsiveScenarios as defaultBuildResponsiveScenarios,
  inspectState as defaultInspectState,
  navigateToBase as defaultNavigateToBase,
  openSectionDrawer as defaultOpenSectionDrawer,
  scrollAwayFromHeader as defaultScrollAwayFromHeader,
  openTooltipIfPresent as defaultOpenTooltipIfPresent,
  resizeViewport as defaultResizeViewport,
  selectSprintWeekend as defaultSelectSprintWeekend,
  switchViewMode as defaultSwitchViewMode,
  switchWeekend as defaultSwitchWeekend,
} from './scenarios.mjs';
import { ensureLocalAppStack as defaultEnsureLocalAppStack, waitForFrontend as defaultWaitForFrontend } from './stack.mjs';
import {
  canSelectSprintWeekend,
  canSwitchWeekend,
  validateState,
} from './state-validation.mjs';

async function runResponsiveCheck({
  baseUrl: targetBaseUrl = baseUrl,
  breakpoints = defaultBreakpoints,
  ensureNpx = defaultEnsureNpx,
  prepareOutputDirectory: prepareOutputDirectoryImpl = prepareOutputDirectory,
  ensureLocalAppStack = defaultEnsureLocalAppStack,
  waitForFrontend = defaultWaitForFrontend,
  createPlaywrightCliAdapter = defaultCreatePlaywrightCliAdapter,
  navigateToBase = defaultNavigateToBase,
  resizeViewport = defaultResizeViewport,
  inspectState = defaultInspectState,
  buildResponsiveScenarios = defaultBuildResponsiveScenarios,
  openSectionDrawer = defaultOpenSectionDrawer,
  scrollAwayFromHeader = defaultScrollAwayFromHeader,
  openTooltipIfPresent = defaultOpenTooltipIfPresent,
  selectSprintWeekend = defaultSelectSprintWeekend,
  switchViewMode = defaultSwitchViewMode,
  switchWeekend = defaultSwitchWeekend,
  cleanupResponsiveCheck = defaultCleanupResponsiveCheck,
  consoleImpl = console,
} = {}) {
  ensureNpx();
  prepareOutputDirectoryImpl();
  const localStack = await ensureLocalAppStack();
  const cli = createPlaywrightCliAdapter();
  let playwrightSession = null;
  const allFailures = [];
  let exitCode = 0;

  try {
    await waitForFrontend(targetBaseUrl);
    cli.assertCleanEnvironment();
    playwrightSession = await cli.startSession({
      url: targetBaseUrl,
    });

    consoleImpl.log(`[ui-responsive] Avvio controlli su ${targetBaseUrl}`);
    navigateToBase(cli, {
      label: 'initial-load',
      remediation: 'Verifica l\'allineamento della sessione Playwright, la splash iniziale e i log raccolti.',
      targetUrl: targetBaseUrl,
    });

    for (const breakpoint of breakpoints) {
      consoleImpl.log(
        `[ui-responsive] Controllo ${breakpoint.label} (${breakpoint.width}x${breakpoint.height})`,
      );
      resizeViewport(breakpoint, {
        runCliImpl: cli.run,
      });
      navigateToBase(cli, {
        label: `${breakpoint.label}-navigation`,
        remediation: 'Verifica che la sessione Playwright punti davvero al frontend locale e che la shell esca dal loading.',
        targetUrl: targetBaseUrl,
      });

      const initialState = inspectState({
        evaluateJsonImpl: cli.evaluateJson,
      });
      const scenarios = buildResponsiveScenarios({ initialState });
      const scenarioContext = {
        canSelectSprintWeekend,
        canSwitchWeekend,
        cli,
        inspectState: () => inspectState({ evaluateJsonImpl: cli.evaluateJson }),
        openSectionDrawer: () => openSectionDrawer({ evaluateJsonImpl: cli.evaluateJson }),
        scrollAwayFromHeader: () => scrollAwayFromHeader({ evaluateJsonImpl: cli.evaluateJson }),
        openTooltipIfPresent: () => openTooltipIfPresent({ evaluateJsonImpl: cli.evaluateJson }),
        selectSprintWeekend: () => selectSprintWeekend({ evaluateJsonImpl: cli.evaluateJson }),
        switchViewMode: (targetView) => switchViewMode(targetView, { evaluateJsonImpl: cli.evaluateJson }),
        switchWeekend: () => switchWeekend({ evaluateJsonImpl: cli.evaluateJson }),
        validateState,
      };

      for (const scenario of scenarios) {
        const result = await scenario.run(scenarioContext);
        if (result.skipped) {
          consoleImpl.log(
            `[ui-responsive] Salto controllo ${scenario.key} su ${breakpoint.label}: prerequisiti non disponibili.`,
          );
          continue;
        }

        if (result.failures.length > 0) {
          allFailures.push({
            viewport: breakpoint,
            state: result.key,
            failures: result.failures,
            screenshotPath: result.screenshotPath,
          });
        }
      }
    }

    if (allFailures.length > 0) {
      consoleImpl.error('[ui-responsive] Controlli falliti.');

      for (const failure of allFailures) {
        consoleImpl.error(
          `- ${failure.viewport.label} ${failure.viewport.width}x${failure.viewport.height} [${failure.state}]`,
        );
        for (const message of failure.failures) {
          consoleImpl.error(`  - ${message}`);
        }
        if (failure.screenshotPath) {
          consoleImpl.error(`  - screenshot: ${failure.screenshotPath}`);
        }
      }
    } else {
      consoleImpl.log('[ui-responsive] Tutti i controlli responsive sono passati.');
    }
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

    consoleImpl.error(`[ui-responsive] ${normalizedError.message}`);
    if (normalizedError.cause) {
      consoleImpl.error(
        typeof normalizedError.cause === 'string'
          ? normalizedError.cause
          : stringifyDiagnostics(normalizedError.cause),
      );
    }
    allFailures.push({
      viewport: null,
      state: 'fatal',
      failures: [normalizedError.message],
      screenshotPath: null,
    });
  }

  exitCode = allFailures.length > 0 ? 1 : 0;
  const cleanupIssues = await cleanupResponsiveCheck({
    playwrightSession,
    localStack,
    consoleImpl,
  });

  return {
    failures: allFailures,
    cleanupIssues,
    exitCode: cleanupIssues.length > 0 ? 1 : exitCode,
  };
}

export { runResponsiveCheck };
