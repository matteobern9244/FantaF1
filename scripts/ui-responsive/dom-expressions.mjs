const inspectStateExpression = `() => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const normalizeText = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
  const readElementStyles = (element) => {
    const styles = element ? getComputedStyle(element) : null;

    return {
      present: Boolean(element),
      color: styles?.color ?? '',
      backgroundColor: styles?.backgroundColor ?? '',
      fontFamily: styles?.fontFamily ?? '',
      disabled: element ? Boolean(element.disabled) : false,
      text: normalizeText(
        element?.selectedOptions?.[0]?.textContent ||
        element?.textContent,
      ),
    };
  };
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
  const selectedRaceRecapCard = document.querySelector('.driver-spotlight')?.closest('section');
  const highlightsButton = document.querySelector('.driver-spotlight .highlights-button');
  const firstUserCard = document.querySelector('.predictions-grid .user-card');
  const firstPredictionSelect = firstUserCard?.querySelector('select');
  const firstResultSelect = document.querySelector('.results-grid select');
  const meetingSelector = document.querySelector('#meeting-selector');
  const insightsSelector = document.querySelector('#insights-user-selector');
  const historyFilterSelect = document.querySelector('#history-user-filter');
  const firstPredictionOption = firstPredictionSelect?.querySelector('option');
  const firstResultOption = firstResultSelect?.querySelector('option');
  const desktopSectionNav = document.querySelector('.section-nav');
  const mobileSectionTrigger = document.querySelector('.section-drawer-trigger');
  const mobileSectionDrawer = document.querySelector('.section-drawer');
  const activeSectionButton = document.querySelector('.section-nav-button.active, .section-drawer-item.active');
  const backToTopButton = document.querySelector('.back-to-top-button');
  const backToTopTooltip = document.querySelector('.back-to-top-tooltip .tooltip-text');

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
      backToTopButton: readFontFamily('.back-to-top-button'),
      backToTopTooltip: readFontFamily('.back-to-top-tooltip .tooltip-text'),
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
      highlightsButton: (() => {
        const buttonRect = highlightsButton?.getBoundingClientRect();
        const cardRect = selectedRaceRecapCard?.getBoundingClientRect();

        return {
          present: Boolean(highlightsButton),
          disabled: Boolean(highlightsButton?.disabled),
          text: normalizeText(highlightsButton?.textContent),
          clipped:
            Boolean(highlightsButton && selectedRaceRecapCard) &&
            (
              (buttonRect?.left ?? 0) < (cardRect?.left ?? 0) - 1 ||
              (buttonRect?.right ?? 0) > (cardRect?.right ?? viewportWidth) + 1
            ),
        };
      })(),
    },
    selects: {
      meeting: readElementStyles(meetingSelector),
      insights: readElementStyles(insightsSelector),
      prediction: readElementStyles(firstPredictionSelect),
      result: readElementStyles(firstResultSelect),
      historyFilter: readElementStyles(historyFilterSelect),
      predictionOption: readElementStyles(firstPredictionOption),
      resultOption: readElementStyles(firstResultOption),
    },
    navigation: {
      desktopPresent: Boolean(desktopSectionNav),
      mobileTriggerPresent: Boolean(mobileSectionTrigger),
      mobileDrawerPresent: Boolean(mobileSectionDrawer),
      itemCount: document.querySelectorAll('.section-nav-button, .section-drawer-item').length,
      activeText: normalizeText(activeSectionButton?.textContent),
      backToTopPresent: Boolean(backToTopButton),
      backToTopTooltipText: normalizeText(backToTopTooltip?.textContent),
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
      sectionNav: Boolean(document.querySelector('.section-nav') || document.querySelector('.section-drawer-trigger')),
    },
  };
}`;

export { appShellStateExpression, inspectStateExpression };
