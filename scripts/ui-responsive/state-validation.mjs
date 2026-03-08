import { uiShellPollIntervalMs, uiShellTimeoutMs } from './config.mjs';
import { fail, stringifyDiagnostics } from './diagnostics.mjs';

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
    common: {
      'select weekend': state.selects?.meeting,
      'select KPI utente': state.selects?.insights,
      'select filtro storico': state.selects?.historyFilter,
    },
    adminOnly: {
      'select pronostici': state.selects?.prediction,
      'select risultati': state.selects?.result,
    },
  };
  const optionChecks = {
    adminOnly: {
      'option pronostici': state.selects?.predictionOption,
      'option risultati': state.selects?.resultOption,
    },
  };

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

  const selectsToValidate = isPublicView
    ? selectChecks.common
    : {
        ...selectChecks.common,
        ...selectChecks.adminOnly,
      };

  for (const [label, details] of Object.entries(selectsToValidate)) {
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
  }

  const optionsToValidate = isPublicView ? {} : optionChecks.adminOnly;

  for (const [label, details] of Object.entries(optionsToValidate)) {
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

export {
  canSelectSprintWeekend,
  canSwitchWeekend,
  isAppShellReady,
  sleepSync,
  validateState,
  waitForAppShell,
  waitForEvaluatedCondition,
};
