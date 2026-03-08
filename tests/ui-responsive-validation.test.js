import { describe, expect, it, vi } from 'vitest';
import { isAppShellReady, validateState, waitForAppShell } from '../scripts/ui-responsive/state-validation.mjs';

describe('responsive UI app shell gating', () => {
  it('treats the minimal shell as ready even before responsive assertions pass', () => {
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
      },
    };
    const validationState = {
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
      unauthorizedOverflow: [],
    };

    expect(isAppShellReady(shellState)).toBe(true);
    expect(waitForAppShell({
      getPageInfoImpl: () => shellState,
      sleepSyncImpl: vi.fn(),
      timeoutMs: 10,
      pollInterval: 0,
    })).toEqual(shellState);
    expect(validateState(validationState)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Sezioni principali mancanti'),
        'Target tipografico mancante: punti classifica live.',
        'Target tipografico mancante: valore proiezione gara.',
      ]),
    );
  });

  it('accepts the public view when admin-only controls are intentionally absent', () => {
    const validationState = {
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
      },
      viewMode: {
        current: 'public',
        readonlyBannerPresent: true,
        adminLoginPresent: false,
        adminControlsPresent: false,
        publicControlsPresent: true,
      },
      interactiveSurfaces: {
        total: 12,
        analytics: 5,
      },
      unauthorizedOverflow: [],
    };

    expect(validateState(validationState, { expectedViewMode: 'public' })).toEqual([]);
  });
});
