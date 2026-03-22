import { describe, expect, it, vi } from 'vitest';
import { isAppShellReady, validateState, waitForAppShell } from '../scripts/ui-responsive/state-validation.mjs';

describe('responsive UI app shell gating', () => {
  it('treats the minimal shell as ready even before responsive assertions pass', async () => {
    const shellState = {
      href: 'http://127.0.0.1:5173/',
      title: 'FantaF1 2026',
      readyState: 'complete',
      loadingShell: false,
      selectors: {
        heroPanel: true,
        heroSummaryGrid: true,
        calendarPanel: true,
        predictionsGrid: true,
        appFooter: true,
        resultsActions: false,
        liveScoreValue: false,
        pointsPreviewValue: false,
        sectionNav: true,
      },
    };
    const validationState = {
      viewport: { width: 1280, height: 800 },
      mainSections: {
        hero: true,
        summary: true,
        calendar: true,
        predictions: true,
        results: false,
        footer: true,
      },
      nextRace: {
        cardPresent: true,
        badgeText: 'Weekend Standard',
        hasSessions: false,
        rowCount: 0,
        clippedRows: [],
        noteText: '',
        noteFits: true,
      },
      typography: {
        sessionDay: { present: false, fontFamily: '', text: '' },
        sessionDate: { present: false, fontFamily: '', text: '' },
        sessionClock: { present: false, fontFamily: '', text: '' },
        liveScoreValue: { present: false, fontFamily: '', text: '' },
        projectionValue: { present: false, fontFamily: '', text: '' },
      },
      tooltip: {
        wrapperPresent: false,
        disabledWrapperPresent: false,
        present: false,
        visible: false,
        fitsViewport: true,
        text: '',
      },
      history: {
        present: true,
        hasCards: false,
        emptyStateVisible: true,
        actionButtonCount: 0,
        clippedButtons: [],
      },
      selectedWeekend: {
        calendarCardCount: 1,
        sprintCardCount: 0,
        cardText: 'Round 1 Australia',
        bannerTitle: 'Australian Grand Prix 2026',
        firstPredictionValue: '',
        firstPredictionText: '',
        firstResultValue: '',
        firstResultText: '',
      },
      selects: {
        meeting: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', appearance: 'none', disabled: false, text: 'Australia' },
        insights: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', appearance: 'none', disabled: false, text: 'Adriano' },
        prediction: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', appearance: 'none', disabled: false, text: 'Seleziona un pilota' },
        result: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', appearance: 'none', disabled: false, text: 'Seleziona un pilota' },
        historyFilter: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', appearance: 'none', disabled: false, text: 'Tutti gli utenti' },
        predictionOption: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', disabled: false, text: 'Seleziona un pilota' },
        resultOption: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', disabled: false, text: 'Seleziona un pilota' },
      },
      navigation: {
        present: true,
        itemCount: 8,
        activeText: 'Calendario stagione',
      },
      installCta: {
        present: true,
        text: 'INSTALLA APPLICAZIONE',
        clipped: false,
      },
      unauthorizedOverflow: [],
    };

    expect(isAppShellReady(shellState)).toBe(true);
    await expect(waitForAppShell({
      getPageInfoImpl: () => shellState,
      sleepImpl: vi.fn(async () => {}),
      timeoutMs: 10,
      pollInterval: 0,
    })).resolves.toEqual(shellState);
    expect(validateState(validationState)).toEqual(
      expect.arrayContaining([
        'Target tipografico mancante: punti classifica live.',
        'Target tipografico mancante: valore proiezione gara.',
      ]),
    );
  });

  it('treats the dashboard route shell as ready when route-specific content is present', () => {
    const shellState = {
      href: 'http://127.0.0.1:5173/dashboard?meeting=1281&view=admin',
      title: 'FantaF1 2026',
      readyState: 'complete',
      loadingShell: false,
      selectors: {
        heroPanel: true,
        heroSummaryGrid: true,
        calendarPanel: true,
        predictionsGrid: false,
        appFooter: true,
        resultsActions: false,
        liveScoreValue: true,
        pointsPreviewValue: false,
        sectionNav: true,
      },
    };

    expect(isAppShellReady(shellState)).toBe(true);
  });

  it('accepts the dashboard route when only dashboard sections and controls are present', () => {
    const validationState = {
      routePath: '/dashboard',
      viewport: { width: 1280, height: 800 },
      mainSections: {
        hero: true,
        summary: true,
        calendar: true,
        predictions: false,
        results: false,
        footer: true,
      },
      nextRace: {
        cardPresent: true,
        badgeText: 'Weekend Standard',
        hasSessions: false,
        rowCount: 0,
        clippedRows: [],
        noteText: '',
        noteFits: true,
      },
      typography: {
        sessionDay: { present: false, fontFamily: '', text: '' },
        sessionDate: { present: false, fontFamily: '', text: '' },
        sessionClock: { present: false, fontFamily: '', text: '' },
        liveScoreValue: { present: true, fontFamily: 'Formula1, sans-serif', text: '12' },
        projectionValue: { present: true, fontFamily: 'Formula1, sans-serif', text: '9' },
      },
      tooltip: {
        wrapperPresent: false,
        disabledWrapperPresent: false,
        present: false,
        visible: false,
        fitsViewport: true,
        text: '',
      },
      history: {
        present: false,
        hasCards: false,
        emptyStateVisible: false,
        actionButtonCount: 0,
        clippedButtons: [],
      },
      selectedWeekend: {
        calendarCardCount: 2,
        sprintCardCount: 1,
        cardText: 'Round 1 Australia',
        bannerTitle: 'Australian Grand Prix 2026',
        firstPredictionValue: '',
        firstPredictionText: '',
        firstResultValue: '',
        firstResultText: '',
        highlightsButton: { present: true, disabled: false, text: 'Guarda Highlights', clipped: false },
      },
      selects: {
        meeting: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', appearance: 'none', disabled: false, text: 'Australia' },
        insights: { present: false, color: '', backgroundColor: '', fontFamily: '', appearance: '', disabled: false, text: '' },
        prediction: { present: false, color: '', backgroundColor: '', fontFamily: '', appearance: '', disabled: false, text: '' },
        result: { present: false, color: '', backgroundColor: '', fontFamily: '', appearance: '', disabled: false, text: '' },
        historyFilter: { present: false, color: '', backgroundColor: '', fontFamily: '', appearance: '', disabled: false, text: '' },
        predictionOption: { present: false, color: '', backgroundColor: '', fontFamily: '', appearance: '', disabled: false, text: '' },
        resultOption: { present: false, color: '', backgroundColor: '', fontFamily: '', appearance: '', disabled: false, text: '' },
      },
      viewMode: {
        current: 'admin',
        readonlyBannerPresent: false,
        adminLoginPresent: false,
        adminControlsPresent: false,
        publicControlsPresent: false,
      },
      navigation: {
        present: true,
        itemCount: 8,
        activeText: 'Calendario stagione',
      },
      installCta: {
        present: true,
        text: 'INSTALLA APPLICAZIONE',
        clipped: false,
      },
      interactiveSurfaces: {
        total: 8,
        analytics: 0,
      },
      unauthorizedOverflow: [],
    };

    expect(validateState(validationState, { expectedViewMode: 'admin' })).toEqual([]);
  });

  it('does not require the projection value on dashboard-only surfaces', () => {
    const validationState = {
      routePath: '/dashboard',
      viewport: { width: 1280, height: 800 },
      mainSections: {
        hero: true,
        summary: true,
        calendar: true,
        predictions: false,
        results: false,
        footer: true,
      },
      nextRace: {
        cardPresent: true,
        badgeText: 'Weekend Standard',
        hasSessions: false,
        rowCount: 0,
        clippedRows: [],
        noteText: '',
        noteFits: true,
      },
      typography: {
        sessionDay: { present: false, fontFamily: '', text: '' },
        sessionDate: { present: false, fontFamily: '', text: '' },
        sessionClock: { present: false, fontFamily: '', text: '' },
        liveScoreValue: { present: true, fontFamily: 'Formula1, sans-serif', text: '12' },
        projectionValue: { present: false, fontFamily: '', text: '' },
      },
      tooltip: {
        wrapperPresent: false,
        disabledWrapperPresent: false,
        present: false,
        visible: false,
        fitsViewport: true,
        text: '',
      },
      history: {
        present: false,
        hasCards: false,
        emptyStateVisible: false,
        actionButtonCount: 0,
        clippedButtons: [],
      },
      selectedWeekend: {
        calendarCardCount: 2,
        sprintCardCount: 1,
        cardText: 'Round 1 Australia',
        bannerTitle: '',
        firstPredictionValue: '',
        firstPredictionText: '',
        firstResultValue: '',
        firstResultText: '',
        highlightsButton: { present: true, disabled: false, text: 'Guarda Highlights', clipped: false },
      },
      selects: {
        meeting: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', appearance: 'none', disabled: false, text: 'Australia' },
        insights: { present: false, color: '', backgroundColor: '', fontFamily: '', appearance: '', disabled: false, text: '' },
        prediction: { present: false, color: '', backgroundColor: '', fontFamily: '', appearance: '', disabled: false, text: '' },
        result: { present: false, color: '', backgroundColor: '', fontFamily: '', appearance: '', disabled: false, text: '' },
        historyFilter: { present: false, color: '', backgroundColor: '', fontFamily: '', appearance: '', disabled: false, text: '' },
        predictionOption: { present: false, color: '', backgroundColor: '', fontFamily: '', appearance: '', disabled: false, text: '' },
        resultOption: { present: false, color: '', backgroundColor: '', fontFamily: '', appearance: '', disabled: false, text: '' },
      },
      viewMode: {
        current: 'admin',
        readonlyBannerPresent: false,
        adminLoginPresent: false,
        adminControlsPresent: false,
        publicControlsPresent: false,
      },
      navigation: {
        present: true,
        itemCount: 8,
        activeText: 'Calendario stagione',
      },
      installCta: {
        present: true,
        text: 'INSTALLA APPLICAZIONE',
        clipped: false,
      },
      interactiveSurfaces: {
        total: 8,
        analytics: 0,
      },
      unauthorizedOverflow: [],
    };

    expect(validateState(validationState, { expectedViewMode: 'admin' })).toEqual([]);
  });

  it('accepts the public view when admin-only controls are intentionally absent', () => {
    const validationState = {
      viewport: { width: 1280, height: 800 },
      mainSections: {
        hero: true,
        summary: true,
        calendar: true,
        predictions: true,
        results: false,
        footer: true,
      },
      nextRace: {
        cardPresent: true,
        badgeText: 'Weekend Standard',
        hasSessions: false,
        rowCount: 0,
        clippedRows: [],
        noteText: '',
        noteFits: true,
      },
      typography: {
        sessionDay: { present: false, fontFamily: '', text: '' },
        sessionDate: { present: false, fontFamily: '', text: '' },
        sessionClock: { present: false, fontFamily: '', text: '' },
        liveScoreValue: { present: true, fontFamily: 'Formula1, sans-serif', text: '12' },
        projectionValue: { present: true, fontFamily: 'Formula1, sans-serif', text: '9' },
      },
      tooltip: {
        wrapperPresent: false,
        disabledWrapperPresent: false,
        present: false,
        visible: false,
        fitsViewport: true,
        text: '',
      },
      history: {
        present: true,
        hasCards: true,
        emptyStateVisible: false,
        actionButtonCount: 2,
        clippedButtons: [],
      },
      selectedWeekend: {
        calendarCardCount: 2,
        sprintCardCount: 1,
        cardText: 'Round 1 Australia',
        bannerTitle: 'Australian Grand Prix 2026',
        firstPredictionValue: '',
        firstPredictionText: '',
        firstResultValue: '',
        firstResultText: '',
        highlightsButton: { present: true, disabled: false, text: 'Guarda Highlights', clipped: false },
      },
      selects: {
        meeting: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', appearance: 'none', disabled: false, text: 'Australia' },
        insights: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', appearance: 'none', disabled: false, text: 'Adriano' },
        prediction: { present: false, color: '', backgroundColor: '', fontFamily: '', appearance: '', disabled: false, text: '' },
        result: { present: false, color: '', backgroundColor: '', fontFamily: '', appearance: '', disabled: false, text: '' },
        historyFilter: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', appearance: 'none', disabled: false, text: 'Tutti gli utenti' },
        predictionOption: { present: false, color: '', backgroundColor: '', fontFamily: '', appearance: '', disabled: false, text: '' },
        resultOption: { present: false, color: '', backgroundColor: '', fontFamily: '', appearance: '', disabled: false, text: '' },
      },
      viewMode: {
        current: 'public',
        readonlyBannerPresent: true,
        adminLoginPresent: false,
        adminControlsPresent: false,
        publicControlsPresent: true,
      },
      navigation: {
        present: true,
        itemCount: 8,
        activeText: 'Calendario stagione',
      },
      installCta: {
        present: true,
        text: 'INSTALLA APPLICAZIONE',
        clipped: false,
      },
      interactiveSurfaces: {
        total: 12,
        analytics: 5,
      },
      unauthorizedOverflow: [],
    };

    expect(validateState(validationState, { expectedViewMode: 'public' })).toEqual([]);
  });

  it('requires editable prediction and result controls in admin view', () => {
    const validationState = {
      viewport: { width: 1280, height: 800 },
      mainSections: {
        hero: true,
        summary: true,
        calendar: true,
        predictions: true,
        results: true,
        footer: true,
      },
      nextRace: {
        cardPresent: true,
        badgeText: 'Weekend Standard',
        hasSessions: false,
        rowCount: 0,
        clippedRows: [],
        noteText: '',
        noteFits: true,
      },
      typography: {
        sessionDay: { present: false, fontFamily: '', text: '' },
        sessionDate: { present: false, fontFamily: '', text: '' },
        sessionClock: { present: false, fontFamily: '', text: '' },
        liveScoreValue: { present: true, fontFamily: 'Formula1, sans-serif', text: '12' },
        projectionValue: { present: true, fontFamily: 'Formula1, sans-serif', text: '9' },
      },
      tooltip: {
        wrapperPresent: false,
        disabledWrapperPresent: false,
        present: false,
        visible: false,
        fitsViewport: true,
        text: '',
      },
      history: {
        present: true,
        hasCards: false,
        emptyStateVisible: true,
        actionButtonCount: 0,
        clippedButtons: [],
      },
      selectedWeekend: {
        calendarCardCount: 1,
        sprintCardCount: 0,
        cardText: 'Round 1 Australia',
        bannerTitle: 'Australian Grand Prix 2026',
        firstPredictionValue: '',
        firstPredictionText: '',
        firstResultValue: '',
        firstResultText: '',
      },
      selects: {
        meeting: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', appearance: 'none', disabled: false, text: 'Australia' },
        insights: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', appearance: 'none', disabled: false, text: 'Adriano' },
        prediction: { present: false, color: '', backgroundColor: '', fontFamily: '', appearance: '', disabled: false, text: '' },
        result: { present: false, color: '', backgroundColor: '', fontFamily: '', appearance: '', disabled: false, text: '' },
        historyFilter: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', appearance: 'none', disabled: false, text: 'Tutti gli utenti' },
        predictionOption: { present: false, color: '', backgroundColor: '', fontFamily: '', appearance: '', disabled: false, text: '' },
        resultOption: { present: false, color: '', backgroundColor: '', fontFamily: '', appearance: '', disabled: false, text: '' },
      },
      unauthorizedOverflow: [],
      viewMode: {
        current: 'admin',
        readonlyBannerPresent: false,
        adminLoginPresent: false,
        adminControlsPresent: true,
        publicControlsPresent: false,
      },
      navigation: {
        present: true,
        itemCount: 8,
        activeText: 'Calendario stagione',
      },
      installCta: {
        present: true,
        text: 'INSTALLA APPLICAZIONE',
        clipped: false,
      },
      interactiveSurfaces: {
        total: 12,
        analytics: 5,
      },
    };

    expect(validateState(validationState, { expectedViewMode: 'admin' })).toEqual(
      expect.arrayContaining([
        'Controllo select mancante: select pronostici.',
        'Controllo select mancante: select risultati.',
        'Controllo option mancante: option pronostici.',
        'Controllo option mancante: option risultati.',
      ]),
    );
  });

  it('flags selects with transparent colors or missing backgrounds', () => {
    const validationState = {
      viewport: { width: 1280, height: 800 },
      mainSections: {
        hero: true,
        summary: true,
        calendar: true,
        predictions: true,
        results: true,
        footer: true,
      },
      nextRace: {
        cardPresent: true,
        badgeText: 'Weekend Standard',
        hasSessions: false,
        rowCount: 0,
        clippedRows: [],
        noteText: '',
        noteFits: true,
      },
      typography: {
        sessionDay: { present: false, fontFamily: '', text: '' },
        sessionDate: { present: false, fontFamily: '', text: '' },
        sessionClock: { present: false, fontFamily: '', text: '' },
        liveScoreValue: { present: true, fontFamily: 'Formula1, sans-serif', text: '12' },
        projectionValue: { present: true, fontFamily: 'Formula1, sans-serif', text: '9' },
      },
      tooltip: {
        wrapperPresent: false,
        disabledWrapperPresent: false,
        present: false,
        visible: false,
        fitsViewport: true,
        text: '',
      },
      history: {
        present: true,
        hasCards: false,
        emptyStateVisible: true,
        actionButtonCount: 0,
        clippedButtons: [],
      },
      selectedWeekend: {
        calendarCardCount: 1,
        sprintCardCount: 0,
        cardText: 'Round 1 Australia',
        bannerTitle: 'Australian Grand Prix 2026',
        firstPredictionValue: '',
        firstPredictionText: '',
        firstResultValue: '',
        firstResultText: '',
      },
      selects: {
        meeting: { present: true, color: 'transparent', backgroundColor: 'rgba(0, 0, 0, 0)', fontFamily: 'Formula1, sans-serif', disabled: false, text: 'Australia' },
        insights: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', disabled: false, text: 'Adriano' },
        prediction: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', disabled: false, text: 'Seleziona un pilota' },
        result: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', disabled: false, text: 'Seleziona un pilota' },
        historyFilter: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', disabled: false, text: 'Tutti gli utenti' },
        predictionOption: { present: true, color: 'transparent', backgroundColor: 'rgba(0, 0, 0, 0)', fontFamily: 'Formula1, sans-serif', disabled: false, text: 'Seleziona un pilota' },
        resultOption: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', disabled: false, text: 'Seleziona un pilota' },
      },
      unauthorizedOverflow: [],
      viewMode: {
        current: 'admin',
        readonlyBannerPresent: false,
        adminLoginPresent: false,
        adminControlsPresent: true,
        publicControlsPresent: false,
      },
      navigation: {
        present: true,
        itemCount: 8,
        activeText: 'Calendario stagione',
      },
      installCta: {
        present: true,
        text: 'INSTALLA APPLICAZIONE',
        clipped: false,
      },
      interactiveSurfaces: {
        total: 12,
        analytics: 5,
      },
    };

    expect(validateState(validationState, { expectedViewMode: 'admin' })).toEqual(
      expect.arrayContaining([
        expect.stringContaining('option pronostici con colore testo trasparente'),
        expect.stringContaining('option pronostici con sfondo trasparente'),
      ]),
    );
  });

  it('flags a clipped highlights button in the selected weekend recap', () => {
    const validationState = {
      routePath: '/dashboard',
      viewport: { width: 1280, height: 800 },
      mainSections: {
        hero: true,
        summary: true,
        calendar: true,
        predictions: true,
        results: true,
        footer: true,
      },
      nextRace: {
        cardPresent: true,
        badgeText: 'Weekend Standard',
        hasSessions: false,
        rowCount: 0,
        clippedRows: [],
        noteText: '',
        noteFits: true,
      },
      typography: {
        sessionDay: { present: false, fontFamily: '', text: '' },
        sessionDate: { present: false, fontFamily: '', text: '' },
        sessionClock: { present: false, fontFamily: '', text: '' },
        liveScoreValue: { present: true, fontFamily: 'Formula1, sans-serif', text: '12' },
        projectionValue: { present: true, fontFamily: 'Formula1, sans-serif', text: '9' },
      },
      tooltip: {
        wrapperPresent: false,
        disabledWrapperPresent: false,
        present: false,
        visible: false,
        fitsViewport: true,
        text: '',
      },
      history: {
        present: true,
        hasCards: false,
        emptyStateVisible: true,
        actionButtonCount: 0,
        clippedButtons: [],
      },
      selectedWeekend: {
        calendarCardCount: 1,
        sprintCardCount: 0,
        cardText: 'Round 1 Australia',
        bannerTitle: 'Australian Grand Prix 2026',
        firstPredictionValue: '',
        firstPredictionText: '',
        firstResultValue: '',
        firstResultText: '',
        highlightsButton: { present: true, disabled: false, text: 'Guarda Highlights', clipped: true },
      },
      selects: {
        meeting: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', appearance: 'none', disabled: false, text: 'Australia' },
        insights: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', appearance: 'none', disabled: false, text: 'Adriano' },
        prediction: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', appearance: 'none', disabled: false, text: 'Seleziona un pilota' },
        result: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', appearance: 'none', disabled: false, text: 'Seleziona un pilota' },
        historyFilter: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', appearance: 'none', disabled: false, text: 'Tutti gli utenti' },
        predictionOption: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', disabled: false, text: 'Seleziona un pilota' },
        resultOption: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', disabled: false, text: 'Seleziona un pilota' },
      },
      unauthorizedOverflow: [],
      viewMode: {
        current: 'admin',
        readonlyBannerPresent: false,
        adminLoginPresent: false,
        adminControlsPresent: true,
        publicControlsPresent: false,
      },
      navigation: {
        present: true,
        itemCount: 8,
        activeText: 'Calendario stagione',
      },
      installCta: {
        present: true,
        text: 'INSTALLA APPLICAZIONE',
        clipped: false,
      },
      interactiveSurfaces: {
        total: 12,
        analytics: 5,
      },
    };

    expect(validateState(validationState, { expectedViewMode: 'admin' })).toEqual(
      expect.arrayContaining(['Pulsante highlights fuori dal recap del weekend selezionato.']),
    );
  });

  it('requires the sticky navigation and install CTA when the scenario expects the page scrolled away from the header', () => {
    const validationState = {
      viewport: { width: 390, height: 844 },
      mainSections: {
        hero: true,
        summary: true,
        calendar: true,
        predictions: true,
        results: true,
        footer: true,
      },
      nextRace: {
        cardPresent: true,
        badgeText: 'Weekend Standard',
        hasSessions: false,
        rowCount: 0,
        clippedRows: [],
        noteText: '',
        noteFits: true,
      },
      typography: {
        sessionDay: { present: false, fontFamily: '', text: '' },
        sessionDate: { present: false, fontFamily: '', text: '' },
        sessionClock: { present: false, fontFamily: '', text: '' },
        liveScoreValue: { present: true, fontFamily: 'Formula1, sans-serif', text: '12' },
        projectionValue: { present: true, fontFamily: 'Formula1, sans-serif', text: '9' },
      },
      tooltip: {
        wrapperPresent: false,
        disabledWrapperPresent: false,
        present: false,
        visible: false,
        fitsViewport: true,
        text: '',
      },
      history: {
        present: true,
        hasCards: true,
        emptyStateVisible: false,
        actionButtonCount: 2,
        clippedButtons: [],
      },
      selectedWeekend: {
        calendarCardCount: 2,
        sprintCardCount: 0,
        cardText: 'Round 1 Australia',
        bannerTitle: 'Australian Grand Prix 2026',
        firstPredictionValue: 'ver',
        firstPredictionText: 'Verstappen Max',
        firstResultValue: 'ver',
        firstResultText: 'Verstappen Max',
        highlightsButton: { present: false, disabled: true, text: '', clipped: false },
      },
      selects: {
        meeting: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', appearance: 'auto', disabled: false, text: 'Australia' },
        insights: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', appearance: 'auto', disabled: false, text: 'Marco' },
        prediction: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', appearance: 'auto', disabled: false, text: 'Verstappen Max' },
        result: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', appearance: 'auto', disabled: false, text: 'Verstappen Max' },
        historyFilter: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', appearance: 'auto', disabled: false, text: 'Tutti gli utenti' },
        predictionOption: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', disabled: false, text: 'Seleziona un pilota' },
        resultOption: { present: true, color: 'rgb(248, 250, 252)', backgroundColor: 'rgb(24, 28, 39)', fontFamily: 'Formula1, sans-serif', disabled: false, text: 'Seleziona un pilota' },
      },
      unauthorizedOverflow: [],
      viewMode: {
        current: 'admin',
        readonlyBannerPresent: false,
        adminLoginPresent: false,
        adminControlsPresent: true,
        publicControlsPresent: false,
      },
      navigation: {
        present: true,
        itemCount: 8,
        activeText: 'Calendario stagione',
      },
      installCta: {
        present: false,
        text: '',
        clipped: true,
      },
      interactiveSurfaces: {
        total: 12,
        analytics: 5,
      },
    };

    expect(validateState(validationState, {
      expectedViewMode: 'admin',
      expectInstallCtaVisible: true,
    })).toEqual(
      expect.arrayContaining([
        'CTA installazione non rilevata.',
      ]),
    );
  });
});
