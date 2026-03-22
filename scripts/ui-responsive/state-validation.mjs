import { uiShellPollIntervalMs, uiShellTimeoutMs } from './config.mjs';
import { fail, stringifyDiagnostics } from './diagnostics.mjs';

function sleep(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

function isAppShellReady(pageInfo) {
  const selectors = pageInfo?.selectors ?? {};
  const routeContentPresent =
    Boolean(selectors.calendarPanel) ||
    Boolean(selectors.predictionsGrid) ||
    Boolean(selectors.resultsActions) ||
    Boolean(selectors.liveScoreValue) ||
    Boolean(selectors.pointsPreviewValue);

  return (
    Boolean(pageInfo) &&
    !pageInfo.loadingShell &&
    Boolean(selectors.heroPanel) &&
    Boolean(selectors.heroSummaryGrid) &&
    Boolean(selectors.appFooter) &&
    Boolean(selectors.sectionNav) &&
    routeContentPresent
  );
}

async function waitForAppShell({
  getPageInfoImpl,
  sleepImpl = sleep,
  timeoutMs = uiShellTimeoutMs,
  pollInterval = uiShellPollIntervalMs,
  failureMessage = 'Shell UI principale non pronta entro il timeout previsto.',
} = {}) {
  const startedAt = Date.now();
  let lastPageInfo = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      lastPageInfo = await getPageInfoImpl();
      if (isAppShellReady(lastPageInfo)) {
        return lastPageInfo;
      }
    } catch {
      // Retry until timeout
    }

    await sleepImpl(pollInterval);
  }

  fail(failureMessage, lastPageInfo ? stringifyDiagnostics(lastPageInfo) : undefined);
}

async function waitForEvaluatedCondition(
  expression,
  {
    evaluateJsonImpl,
    sleepImpl = sleep,
    timeoutMs = 30000,
    pollInterval = 250,
    failureMessage = 'Condizione UI non raggiunta in tempo.',
  } = {},
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      if (await evaluateJsonImpl(expression, { timeoutMs }) === true) {
        return;
      }
    } catch {
      // Retry until timeout
    }

    await sleepImpl(pollInterval);
  }

  fail(failureMessage);
}

function inferRoutePath(state) {
  const explicitRoutePath = typeof state?.routePath === 'string' ? state.routePath : '';
  if (explicitRoutePath) {
    return explicitRoutePath;
  }

  if (state?.mainSections?.predictions || state?.mainSections?.results) {
    return '/pronostici';
  }

  if (state?.mainSections?.calendar || Number(state?.selectedWeekend?.calendarCardCount ?? 0) > 0) {
    return '/dashboard';
  }

  if (state?.history?.present) {
    return '/classifiche';
  }

  return '/dashboard';
}

function validateState(
  state,
  {
    expectSprintBadge = false,
    expectVisibleTooltip = false,
    expectInstallCtaVisible = false,
    expectedViewMode = null,
    expectedWeekendChangeFrom = null,
  } = {},
) {
  const failures = [];
  const routePath = inferRoutePath(state);
  const isDashboardRoute = routePath === '/dashboard';
  const isPredictionsRoute = routePath === '/pronostici';
  const isStandingsRoute = routePath === '/classifiche';
  const isAnalysisRoute = routePath === '/analisi';
  const isAdminRoute = routePath === '/admin';
  const usesFormula1 = (fontFamily) => /(?:^|,)\s*["']?Formula1["']?\s*(?:,|$)/i.test(fontFamily);
  const isTransparentColor = (value) => {
    if (!value) {
      return true;
    }

    const normalizedValue = String(value).replace(/\s+/g, '').toLowerCase();
    return (
      normalizedValue === 'transparent' ||
      normalizedValue === 'rgba(0,0,0,0)' ||
      normalizedValue === 'hsla(0,0%,0%,0)'
    );
  };
  const isPublicView = expectedViewMode === 'public';
  const selectChecks = {
    ...(isDashboardRoute ? { 'select weekend': state.selects?.meeting } : {}),
    ...(isAnalysisRoute ? { 'select KPI utente': state.selects?.insights } : {}),
    ...(isStandingsRoute ? { 'select filtro storico': state.selects?.historyFilter } : {}),
    ...(!isPublicView && isPredictionsRoute
      ? {
          'select pronostici': state.selects?.prediction,
          'select risultati': state.selects?.result,
        }
      : {}),
  };
  const optionChecks =
    !isPublicView && isPredictionsRoute
      ? {
          'option pronostici': state.selects?.predictionOption,
          'option risultati': state.selects?.resultOption,
        }
      : {};

  const requiredSections = {
    hero: state.mainSections.hero,
    summary: state.mainSections.summary,
    footer: state.mainSections.footer,
    ...(isDashboardRoute ? { calendar: state.mainSections.calendar } : {}),
    ...(isPredictionsRoute ? { predictions: state.mainSections.predictions } : {}),
    ...(isAdminRoute ? { results: state.mainSections.results } : {}),
  };

  if (!Object.values(requiredSections).every(Boolean)) {
    failures.push(`Sezioni principali mancanti: ${JSON.stringify(state.mainSections)}`);
  }

  if (!state.navigation?.present) {
    failures.push('Navigazione sezioni non rilevata.');
  }

  if (Number(state.navigation?.itemCount ?? 0) <= 0) {
    failures.push('Navigazione sezioni senza voci disponibili.');
  }

  if (expectInstallCtaVisible) {
    if (!state.installCta?.present) {
      failures.push('CTA installazione non rilevata.');
    } else if (state.installCta.clipped) {
      failures.push('CTA installazione fuori viewport o clippata.');
    }
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
    ...(isPredictionsRoute ? { 'valore proiezione gara': state.typography.projectionValue } : {}),
  })) {
    if (!details.present) {
      failures.push(`Target tipografico mancante: ${label}.`);
      continue;
    }

    if (!usesFormula1(details.fontFamily)) {
      failures.push(`${label} non usa Formula1: ${JSON.stringify(details)}`);
    }
  }

  for (const [label, details] of Object.entries(selectChecks)) {
    if (!details?.present) {
      failures.push(`Controllo select mancante: ${label}.`);
      continue;
    }

    if (!usesFormula1(details.fontFamily)) {
      failures.push(`${label} non usa Formula1: ${JSON.stringify(details)}`);
    }

    if (isTransparentColor(details.color)) {
      failures.push(`${label} con colore testo trasparente o non definito: ${JSON.stringify(details)}`);
    }

    if (isTransparentColor(details.backgroundColor)) {
      failures.push(`${label} con sfondo trasparente o non definito: ${JSON.stringify(details)}`);
    }

    if (state.viewport.width <= 767) {
      if (details.appearance !== 'auto' && details.appearance !== 'menulist') {
        failures.push(`${label} non usa appearance nativa su mobile: ${details.appearance}`);
      }
    } else {
      if (details.appearance !== 'none') {
        failures.push(`${label} non usa appearance: none su desktop: ${details.appearance}`);
      }
    }
  }

  for (const [label, details] of Object.entries(optionChecks)) {
    if (!details?.present) {
      failures.push(`Controllo option mancante: ${label}.`);
      continue;
    }

    if (isTransparentColor(details.color)) {
      failures.push(`${label} con colore testo trasparente o non definito: ${JSON.stringify(details)}`);
    }

    if (isTransparentColor(details.backgroundColor)) {
      failures.push(`${label} con sfondo trasparente o non definito: ${JSON.stringify(details)}`);
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

  if (isStandingsRoute) {
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
  }

  if (isDashboardRoute && expectedWeekendChangeFrom) {
    if (state.selectedWeekend.cardText === expectedWeekendChangeFrom.cardText) {
      failures.push('La card calendario selezionata non e\' cambiata dopo il click su un altro weekend.');
    }

    if (
      state.selectedWeekend.bannerTitle &&
      expectedWeekendChangeFrom.bannerTitle &&
      state.selectedWeekend.bannerTitle === expectedWeekendChangeFrom.bannerTitle
    ) {
      failures.push('Il banner del weekend selezionato non si e\' aggiornato dopo il cambio gara.');
    }
  }

  if (isDashboardRoute && state.selectedWeekend?.highlightsButton?.present && !state.selectedWeekend.highlightsButton.text) {
    failures.push('Pulsante highlights presente ma senza testo leggibile.');
  }

  if (isDashboardRoute && state.selectedWeekend?.highlightsButton?.clipped) {
    failures.push('Pulsante highlights fuori dal recap del weekend selezionato.');
  }

  if (state.unauthorizedOverflow.length > 0) {
    failures.push(
      `Overflow orizzontale non consentito: ${JSON.stringify(state.unauthorizedOverflow.slice(0, 5))}`,
    );
  }

  if (expectedViewMode && state.viewMode?.current !== expectedViewMode) {
    failures.push(`Vista corrente inattesa: attesa ${expectedViewMode}, rilevata ${state.viewMode?.current || '(vuota)'}.`);
  }

  if (isPublicView && isPredictionsRoute) {
    if (!state.viewMode?.readonlyBannerPresent) {
      failures.push('Vista pubblica senza banner readonly.');
    }

    if (!state.viewMode?.publicControlsPresent) {
      failures.push('Vista pubblica senza pannello readonly dedicato.');
    }
  } else if (expectedViewMode === 'admin' && (isAdminRoute || isPredictionsRoute) && !state.viewMode?.adminControlsPresent) {
    failures.push('Vista admin senza controlli risultati/modifica.');
  }

  if (state.interactiveSurfaces) {
    if (state.interactiveSurfaces.total <= 0) {
      failures.push('Nessuna interactive surface rilevata nella pagina.');
    }

    if (isAnalysisRoute && state.interactiveSurfaces.analytics <= 0) {
      failures.push('Nessuna interactive surface analytics rilevata nei riquadri UI.');
    }
  }

  return failures;
}

function canSwitchWeekend(state) {
  const routePath = inferRoutePath(state);
  return routePath === '/dashboard' && Number(state?.selectedWeekend?.calendarCardCount ?? 0) > 1;
}

function canSelectSprintWeekend(state) {
  return inferRoutePath(state) === '/dashboard' && Number(state?.selectedWeekend?.sprintCardCount ?? 0) > 0;
}

export {
  canSelectSprintWeekend,
  canSwitchWeekend,
  isAppShellReady,
  sleep,
  validateState,
  waitForAppShell,
  waitForEvaluatedCondition,
};
