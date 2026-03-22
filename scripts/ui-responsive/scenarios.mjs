import { baseUrl } from './config.mjs';
import { inspectStateExpression } from './dom-expressions.mjs';
import { fail, markDiagnosticsCollected } from './diagnostics.mjs';
import { sleep, waitForAppShell, waitForEvaluatedCondition } from './state-validation.mjs';

async function inspectState({ evaluateJsonImpl }) {
  return await evaluateJsonImpl(inspectStateExpression);
}

async function waitForShellAfterViewToggle(cli) {
  await waitForAppShell({
    getPageInfoImpl: async () => await cli.getPageInfo(),
    failureMessage: 'Shell UI non pronta dopo il cambio vista responsive.',
  });
  await sleep(150);
}

async function navigateToBase(cli, {
  label = 'navigation',
  remediation = 'Verifica il lifecycle della sessione Playwright e i log raccolti in output/playwright/ui-responsive.',
  targetUrl = baseUrl,
} = {}) {
  try {
    await cli.goto(targetUrl);
    const pageInfo = await waitForAppShell({
      getPageInfoImpl: async () => await cli.getPageInfo(),
    });
    await sleep(250);
    return pageInfo;
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    await cli.collectDiagnostics({
      label,
      error: normalizedError,
      remediation,
    });
    markDiagnosticsCollected(normalizedError);
    throw normalizedError;
  }
}

function buildDashboardAdminUrl() {
  return new URL('/dashboard?view=admin#calendar-section', `${baseUrl}/`).toString();
}

async function ensureDashboardCalendarContext({
  cli,
  inspectStateImpl,
  switchViewModeImpl,
}) {
  await navigateToBase(cli, {
    label: 'dashboard-calendar-context',
    remediation: 'Verifica che la dashboard admin sia raggiungibile e che il calendario UI sia renderizzato correttamente.',
    targetUrl: buildDashboardAdminUrl(),
  });

  await switchViewModeImpl('admin');

  const startedAt = Date.now();
  let dashboardState = await inspectStateImpl();

  while (
    (
      dashboardState?.routePath !== '/dashboard'
      || Number(dashboardState?.selectedWeekend?.calendarCardCount ?? 0) <= 0
    )
    && Date.now() - startedAt < 10000
  ) {
    await sleep(250);
    dashboardState = await inspectStateImpl();
  }

  if (dashboardState?.routePath !== '/dashboard') {
    fail(`Contesto dashboard non raggiunto prima del controllo calendario: ${dashboardState?.routePath || '(vuoto)'}.`);
  }

  return dashboardState;
}

async function resizeViewport({ width, height }, {
  resizeViewportImpl,
  sleepImpl = sleep,
} = {}) {
  await resizeViewportImpl({ width, height });
  await sleepImpl(150);
}

async function selectSprintWeekend({
  evaluateJsonImpl,
  sleepImpl = sleep,
} = {}) {
  const result = await evaluateJsonImpl(`() => {
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

  await waitForEvaluatedCondition(
    `() => {
      const badge = document.querySelector('.next-race-card .race-badge');
      return Boolean(badge) && /sprint/i.test(badge.textContent || '');
    }`,
    {
      evaluateJsonImpl,
      sleepImpl,
      timeoutMs: 10000,
      failureMessage: 'Badge Sprint non aggiornato dopo la selezione del weekend Sprint.',
    },
  );
  await sleepImpl(150);
}

async function openTooltipIfPresent({
  evaluateJsonImpl,
  sleepImpl = sleep,
} = {}) {
  const result = await evaluateJsonImpl(`() => {
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

  await sleepImpl(100);
  return true;
}

async function scrollAwayFromHeader({
  evaluateJsonImpl,
  sleepImpl = sleep,
} = {}) {
  await evaluateJsonImpl(`() => {
    window.scrollTo(0, Math.max(window.innerHeight, 900));
    return true;
  }`);

  await sleepImpl(100);
}

async function switchWeekend({
  evaluateJsonImpl,
  sleepImpl = sleep,
} = {}) {
  await waitForEvaluatedCondition('() => document.querySelectorAll(".calendar-card").length > 1', {
    evaluateJsonImpl,
    sleepImpl,
    timeoutMs: 10000,
    failureMessage: 'Calendario UI senza weekend alternativi disponibili.',
  });

  const result = await evaluateJsonImpl(`() => {
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

  await sleepImpl(150);
}

async function switchViewMode(targetView, {
  evaluateJsonImpl,
  gotoImpl,
  sleepImpl = sleep,
} = {}) {
  const evalOptions = { timeoutMs: 90000 };
  const isTargetViewActiveExpression = `() => {
    const isVisible = (element) => {
      if (!element) {
        return false;
      }

      const styles = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return styles.display !== 'none' && styles.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const toggleButton = [
      ...document.querySelectorAll('.view-mode-toggle button[aria-pressed]'),
      ...document.querySelectorAll('.sidebar-footer .sidebar-item[aria-pressed]'),
      ...document.querySelectorAll('.mobile-nav-section.footer-section .mobile-nav-item[aria-pressed]'),
    ].find((button) => isVisible(button));

    if (toggleButton) {
      const isAdmin = toggleButton.getAttribute('aria-pressed') === 'true';
      return ${JSON.stringify(targetView)} === 'public' ? !isAdmin : isAdmin;
    }

    return new URL(window.location.href).searchParams.get('view') === ${JSON.stringify(targetView)};
  }`;
  const isTargetViewAlreadyActive = await evaluateJsonImpl(isTargetViewActiveExpression, evalOptions);

  if (isTargetViewAlreadyActive) {
    await sleepImpl(150);
    return;
  }

  const findAndClickResult = async () => await evaluateJsonImpl(`() => {
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

    targetButton.click();
    return { clicked: true };
  }`, evalOptions);

  let result = await findAndClickResult();

  if (!result.clicked) {
    const openMenuResult = await evaluateJsonImpl(`() => {
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

      mobileTrigger.click();
      return { opened: true };
    }`, evalOptions);

    if (openMenuResult.opened) {
      await sleepImpl(150);
      result = await findAndClickResult();
    }
  }

  if (!result.clicked) {
    const currentUrl = gotoImpl
      ? await evaluateJsonImpl('() => window.location.href', evalOptions)
      : null;

    if (!gotoImpl || !currentUrl) {
      fail(`Impossibile cambiare vista verso ${targetView}.`);
    }

    const targetUrl = new URL(currentUrl);
    targetUrl.searchParams.set('view', targetView);
    await gotoImpl(targetUrl.toString());
  }

  try {
    await waitForEvaluatedCondition(isTargetViewActiveExpression, {
      evaluateJsonImpl,
      sleepImpl,
      timeoutMs: 90000,
      failureMessage: `Vista ${targetView} non attiva dopo il toggle UI.`,
    });
  } catch (error) {
    if (!gotoImpl) {
      throw error;
    }

    const currentUrl = await evaluateJsonImpl('() => window.location.href', evalOptions);
    const targetUrl = new URL(currentUrl);
    targetUrl.searchParams.set('view', targetView);
    await gotoImpl(targetUrl.toString());
    await waitForEvaluatedCondition(isTargetViewActiveExpression, {
      evaluateJsonImpl,
      sleepImpl,
      timeoutMs: 90000,
      failureMessage: `Vista ${targetView} non attiva dopo il cambio vista responsive.`,
    });
  }

  await sleepImpl(150);
}

async function finalizeScenarioResult({
  key,
  failures,
  cli,
}) {
  const normalizedFailures = Array.isArray(failures) ? failures : [];
  return {
    key,
    failures: normalizedFailures,
    screenshotPath: normalizedFailures.length > 0 ? await cli.captureScreenshot(key) : null,
  };
}

function buildResponsiveScenarios() {
  const scenarios = [
    {
      key: 'default',
      run: async ({ cli, inspectState: inspectStateImpl, switchViewMode: switchViewModeImpl, validateState }) => {
        const state = await ensureDashboardCalendarContext({ cli, inspectStateImpl, switchViewModeImpl });
        return await finalizeScenarioResult({
          key: 'default',
          failures: validateState(state, { expectedViewMode: 'admin' }),
          cli,
        });
      },
    },
    {
      key: 'public-view',
      run: async ({ cli, inspectState: inspectStateImpl, switchViewMode: switchViewModeImpl, validateState }) => {
        await switchViewModeImpl('public');
        await waitForShellAfterViewToggle(cli);
        const publicState = await inspectStateImpl();
        return await finalizeScenarioResult({
          key: 'public-view',
          failures: validateState(publicState, { expectedViewMode: 'public' }),
          cli,
        });
      },
    },
    {
      key: 'admin-return',
      run: async ({ cli, inspectState: inspectStateImpl, switchViewMode: switchViewModeImpl, validateState }) => {
        await switchViewModeImpl('admin');
        await waitForShellAfterViewToggle(cli);
        const adminReturnState = await inspectStateImpl();
        return await finalizeScenarioResult({
          key: 'admin-return',
          failures: validateState(adminReturnState, { expectedViewMode: 'admin' }),
          cli,
        });
      },
    },
    {
      key: 'sticky-navigation',
      run: async ({ cli, inspectState: inspectStateImpl, scrollAwayFromHeader: scrollAwayFromHeaderImpl, validateState }) => {
        await scrollAwayFromHeaderImpl();
        const scrolledState = await inspectStateImpl();
        return await finalizeScenarioResult({
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
        switchViewMode: switchViewModeImpl,
        switchWeekend: switchWeekendImpl,
        validateState,
      }) => {
        const dashboardState = await ensureDashboardCalendarContext({
          cli,
          inspectStateImpl,
          switchViewModeImpl,
        });

        if (!canSwitchWeekend(dashboardState)) {
          fail('Controllo weekend-switch non eseguibile: il calendario UI non espone almeno due weekend selezionabili.');
        }

        await switchWeekendImpl();
        const switchedState = await inspectStateImpl();
        return await finalizeScenarioResult({
          key: 'weekend-switch',
          failures: validateState(switchedState, {
            expectedWeekendChangeFrom: dashboardState.selectedWeekend,
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
        switchViewMode: switchViewModeImpl,
        validateState,
      }) => {
        const dashboardState = await ensureDashboardCalendarContext({
          cli,
          inspectStateImpl,
          switchViewModeImpl,
        });

        if (!canSelectSprintWeekend(dashboardState)) {
          fail('Controllo sprint-tooltip non eseguibile: nessun weekend Sprint disponibile nel calendario UI.');
        }

        await selectSprintWeekendImpl();
        const tooltipActivated = await openTooltipIfPresentImpl();
        const sprintState = await inspectStateImpl();
        return await finalizeScenarioResult({
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
  buildDashboardAdminUrl,
  ensureDashboardCalendarContext,
  inspectState,
  navigateToBase,
  scrollAwayFromHeader,
  openTooltipIfPresent,
  resizeViewport,
  selectSprintWeekend,
  switchViewMode,
  switchWeekend,
};
