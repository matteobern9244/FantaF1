import { baseUrl } from './config.mjs';
import { inspectStateExpression } from './dom-expressions.mjs';
import { fail, markDiagnosticsCollected } from './diagnostics.mjs';
import { sleepSync, waitForAppShell, waitForEvaluatedCondition } from './state-validation.mjs';

function inspectState({ evaluateJsonImpl }) {
  return evaluateJsonImpl(inspectStateExpression);
}

function navigateToBase(cli, {
  label = 'navigation',
  remediation = 'Verifica il lifecycle della sessione Playwright e i log raccolti in output/playwright/ui-responsive.',
  targetUrl = baseUrl,
} = {}) {
  try {
    cli.goto(targetUrl);
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

function scrollAwayFromHeader({
  evaluateJsonImpl,
  sleepSyncImpl = sleepSync,
} = {}) {
  evaluateJsonImpl(`() => {
    window.scrollTo(0, Math.max(window.innerHeight, 900));
    return true;
  }`);

  sleepSyncImpl(100);
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
  const evalOptions = { timeoutMs: 90000 };
  const findAndClickResult = () => evaluateJsonImpl(`() => {
    const normalizeText = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
    const matcher = ${JSON.stringify(targetView)} === 'public' ? /pubblica/i : /admin/i;
    const isVisible = (element) => {
      if (!element) {
        return false;
      }

      const styles = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return styles.display !== 'none' && styles.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const findToggle = () => {
      const candidates = [
        ...document.querySelectorAll('.view-mode-toggle button'),
        ...document.querySelectorAll('.sidebar-footer .sidebar-item[aria-pressed]'),
        ...document.querySelectorAll('.mobile-nav-section.footer-section .mobile-nav-item[aria-pressed]'),
      ];

      return candidates.find((button) => isVisible(button) && matcher.test(normalizeText(button.textContent)));
    };

    const targetButton = findToggle();

    if (!targetButton) {
      return { clicked: false };
    }

    targetButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return { clicked: true };
  }`, evalOptions);

  let result = findAndClickResult();

  if (!result.clicked) {
    const openMenuResult = evaluateJsonImpl(`() => {
      const mobileTrigger = document.querySelector('.mobile-menu-trigger');
      if (!mobileTrigger) {
        return { opened: false };
      }

      const styles = getComputedStyle(mobileTrigger);
      const rect = mobileTrigger.getBoundingClientRect();
      const visible = styles.display !== 'none' && styles.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      if (!visible) {
        return { opened: false };
      }

      mobileTrigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return { opened: true };
    }`, evalOptions);

    if (openMenuResult.opened) {
      sleepSyncImpl(150);
      result = findAndClickResult();
    }
  }

  if (!result.clicked) {
    fail(`Impossibile cambiare vista verso ${targetView}.`);
  }

  waitForEvaluatedCondition(
    `() => {
      const toggleButton = [
        ...document.querySelectorAll('.view-mode-toggle button[aria-pressed]'),
        ...document.querySelectorAll('.sidebar-footer .sidebar-item[aria-pressed]'),
        ...document.querySelectorAll('.mobile-nav-section.footer-section .mobile-nav-item[aria-pressed]'),
      ][0];
      const isAdmin = toggleButton?.getAttribute('aria-pressed') === 'true';
      return ${JSON.stringify(targetView)} === 'public' ? !isAdmin : isAdmin;
    }`,
    {
      evaluateJsonImpl,
      sleepSyncImpl,
      timeoutMs: 90000,
      failureMessage: `Vista ${targetView} non attiva dopo il toggle UI.`,
    },
  );

  sleepSyncImpl(150);
}

function finalizeScenarioResult({
  key,
  failures,
  cli,
}) {
  const normalizedFailures = Array.isArray(failures) ? failures : [];
  return {
    key,
    failures: normalizedFailures,
    screenshotPath: normalizedFailures.length > 0 ? cli.captureScreenshot(key) : null,
    skipped: false,
  };
}

function buildResponsiveScenarios({ initialState }) {
  const scenarios = [
    {
      key: 'default',
      run: async ({ cli, validateState }) => finalizeScenarioResult({
        key: 'default',
        failures: validateState(initialState, { expectedViewMode: 'admin' }),
        cli,
      }),
    },
    {
      key: 'public-view',
      run: async ({ cli, inspectState: inspectStateImpl, switchViewMode: switchViewModeImpl, validateState }) => {
        switchViewModeImpl('public');
        const publicState = inspectStateImpl();
        return finalizeScenarioResult({
          key: 'public-view',
          failures: validateState(publicState, { expectedViewMode: 'public' }),
          cli,
        });
      },
    },
    {
      key: 'admin-return',
      run: async ({ cli, inspectState: inspectStateImpl, switchViewMode: switchViewModeImpl, validateState }) => {
        switchViewModeImpl('admin');
        const adminReturnState = inspectStateImpl();
        return finalizeScenarioResult({
          key: 'admin-return',
          failures: validateState(adminReturnState, { expectedViewMode: 'admin' }),
          cli,
        });
      },
    },
    {
      key: 'sticky-navigation',
      run: async ({ cli, inspectState: inspectStateImpl, scrollAwayFromHeader: scrollAwayFromHeaderImpl, validateState }) => {
        scrollAwayFromHeaderImpl();
        const scrolledState = inspectStateImpl();
        return finalizeScenarioResult({
          key: 'sticky-navigation',
          failures: validateState(scrolledState, {
            expectedViewMode: 'admin',
          }),
          cli,
        });
      },
    },
    {
      key: 'weekend-switch',
      run: async ({
        cli,
        canSwitchWeekend,
        inspectState: inspectStateImpl,
        switchWeekend: switchWeekendImpl,
        validateState,
      }) => {
        if (!canSwitchWeekend(initialState)) {
          return { key: 'weekend-switch', failures: [], screenshotPath: null, skipped: true };
        }

        switchWeekendImpl();
        const switchedState = inspectStateImpl();
        return finalizeScenarioResult({
          key: 'weekend-switch',
          failures: validateState(switchedState, {
            expectedWeekendChangeFrom: initialState.selectedWeekend,
          }),
          cli,
        });
      },
    },
    {
      key: 'sprint-tooltip',
      run: async ({
        cli,
        canSelectSprintWeekend,
        inspectState: inspectStateImpl,
        openTooltipIfPresent: openTooltipIfPresentImpl,
        selectSprintWeekend: selectSprintWeekendImpl,
        validateState,
      }) => {
        if (!canSelectSprintWeekend(initialState)) {
          return { key: 'sprint-tooltip', failures: [], screenshotPath: null, skipped: true };
        }

        selectSprintWeekendImpl();
        const tooltipActivated = openTooltipIfPresentImpl();
        const sprintState = inspectStateImpl();
        return finalizeScenarioResult({
          key: 'sprint-tooltip',
          failures: validateState(sprintState, {
            expectSprintBadge: true,
            expectVisibleTooltip: tooltipActivated,
          }),
          cli,
        });
      },
    },
  ];

  return scenarios;
}

export {
  buildResponsiveScenarios,
  inspectState,
  navigateToBase,
  scrollAwayFromHeader,
  openTooltipIfPresent,
  resizeViewport,
  selectSprintWeekend,
  switchViewMode,
  switchWeekend,
};
