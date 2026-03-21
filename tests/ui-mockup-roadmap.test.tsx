/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import App from '../src/App';
import { appText } from '../src/uiText';

const originalConsoleError = console.error;

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  private readonly callback: IntersectionObserverCallback;

  constructor(
    callback: IntersectionObserverCallback,
    _options?: IntersectionObserverInit,
  ) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  trigger(entries: IntersectionObserverEntry[]) {
    this.callback(entries, this as unknown as IntersectionObserver);
  }
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

function mockMediaMatches(matchesByQuery: Record<string, boolean>) {
  (window.matchMedia as ReturnType<typeof vi.fn>).mockImplementation((query) => ({
    matches: matchesByQuery[query] ?? false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
}));

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});
}

function setUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: userAgent,
  });
}

function setNavigatorStandalone(value: boolean) {
  Object.defineProperty(window.navigator, 'standalone', {
    configurable: true,
    value,
  });
}

function createEmptyPrediction() {
  return {
    first: '',
    second: '',
    third: '',
    pole: '',
  };
}

function createAppData() {
  return {
    users: [
      {
        name: 'Marco',
        points: 20,
        predictions: { first: 'ver', second: 'lec', third: 'nor', pole: 'pia' },
      },
      {
        name: 'Luca',
        points: 11,
        predictions: { first: 'ham', second: 'ver', third: 'nor', pole: 'lec' },
      },
      {
        name: 'Sara',
        points: 14,
        predictions: { first: 'ver', second: 'lec', third: 'ham', pole: 'pia' },
      },
    ],
    history: [
      {
        gpName: 'Gran Premio di Gran Bretagna',
        meetingKey: 'race-gb',
        date: '05/07/2099',
        results: { first: 'ham', second: 'nor', third: 'ver', pole: 'ham' },
        userPredictions: {
          Marco: {
            prediction: { first: 'ham', second: 'nor', third: 'lec', pole: 'ver' },
            pointsEarned: 9,
          },
          Luca: {
            prediction: { first: 'ham', second: 'nor', third: 'pia', pole: 'ver' },
            pointsEarned: 9,
          },
          Sara: {
            prediction: { first: 'nor', second: 'ham', third: 'lec', pole: 'ver' },
            pointsEarned: 3,
          },
        },
      },
    ],
    gpName: 'Monza',
    raceResults: createEmptyPrediction(),
    selectedMeetingKey: 'race-monza',
    weekendStateByMeetingKey: {
      'race-monza': {
        userPredictions: {
          Marco: { first: 'ver', second: 'lec', third: 'nor', pole: 'pia' },
          Luca: { first: 'ham', second: 'ver', third: 'nor', pole: 'lec' },
          Sara: { first: 'ver', second: 'lec', third: 'ham', pole: 'pia' },
        },
        raceResults: createEmptyPrediction(),
      },
    },
  };
}

function createDrivers() {
  return [
    { id: 'ver', name: 'Max Verstappen', team: 'Red Bull', color: '#0000ff', avatarUrl: 'https://media.example.com/ver.webp' },
    { id: 'lec', name: 'Charles Leclerc', team: 'Ferrari', color: '#ff0000', avatarUrl: 'https://media.example.com/lec.webp' },
    { id: 'nor', name: 'Lando Norris', team: 'McLaren', color: '#ff8000', avatarUrl: 'https://media.example.com/nor.webp' },
    { id: 'pia', name: 'Oscar Piastri', team: 'McLaren', color: '#ff8000', avatarUrl: 'https://media.example.com/pia.webp' },
    { id: 'ham', name: 'Lewis Hamilton', team: 'Ferrari', color: '#ff0000', avatarUrl: 'https://media.example.com/ham.webp' },
  ];
}

function createStandings() {
  return {
    driverStandings: [
      { position: 1, driverId: 'pia', name: 'Oscar Piastri', team: 'McLaren', points: 99, avatarUrl: 'https://media.example.com/pia.webp', color: '#ff8000' },
      { position: 2, driverId: 'nor', name: 'Lando Norris', team: 'McLaren', points: 89, avatarUrl: 'https://media.example.com/nor.webp', color: '#ff8000' },
      { position: 3, driverId: 'lec', name: 'Charles Leclerc', team: 'Ferrari', points: 71, avatarUrl: 'https://media.example.com/lec.webp', color: '#ff0000' },
    ],
    constructorStandings: [
      { position: 1, team: 'McLaren', points: 188, color: '#ff8000', logoUrl: 'https://media.example.com/mclaren-logo.webp' },
      { position: 2, team: 'Ferrari', points: 144, color: '#ff0000', logoUrl: 'https://media.example.com/ferrari-logo.webp' },
      { position: 3, team: 'Red Bull', points: 121, color: '#0000ff', logoUrl: 'https://media.example.com/red-bull-logo.webp' },
    ],
    updatedAt: '2026-03-12T10:00:00.000Z',
  };
}

function createCalendar() {
  return [
    {
      meetingKey: 'race-monza',
      meetingName: 'Monza',
      grandPrixTitle: 'Gran Premio d\'Italia',
      roundNumber: 15,
      dateRangeLabel: '01 - 03 SEP',
      detailUrl: 'https://www.formula1.com/en/racing/2099/italy',
      heroImageUrl: '',
      trackOutlineUrl: '/images/tracks/monza.png',
      isSprintWeekend: false,
      startDate: '2099-09-01',
      endDate: '2099-09-03',
      raceStartTime: '2099-09-03T15:00:00Z',
      sessions: [],
    },
    {
      meetingKey: 'race-gb',
      meetingName: 'Silverstone',
      grandPrixTitle: 'Gran Premio di Gran Bretagna',
      roundNumber: 10,
      dateRangeLabel: '03 - 05 JUL',
      detailUrl: 'https://www.formula1.com/en/racing/2099/great-britain',
      heroImageUrl: '',
      trackOutlineUrl: '/images/tracks/silverstone.png',
      isSprintWeekend: false,
      startDate: '2099-07-03',
      endDate: '2099-07-05',
      raceStartTime: '2099-07-05T15:00:00Z',
      sessions: [],
    },
  ];
}

function createResponse(payload: unknown) {
  return {
    ok: true,
    json: () => Promise.resolve(payload),
  } as Response;
}

function setupFetch() {
  const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
  const appData = createAppData();
  const sessionState = { isAdmin: true, defaultViewMode: 'admin' };
  const calendar = createCalendar();
  const resultsByMeetingKey = {
    'race-monza': { racePhase: 'open', results: createEmptyPrediction() },
    'race-gb': { racePhase: 'open', results: createEmptyPrediction() },
  } as Record<string, { racePhase?: 'open' | 'live' | 'finished'; results: ReturnType<typeof createEmptyPrediction> }>;
  const standings = createStandings();

  fetchMock.mockImplementation((url: string, options?: RequestInit) => {
    if (url.includes('/api/session')) {
      return Promise.resolve(createResponse(sessionState));
    }

    if (url.includes('/api/data') && (!options || options.method !== 'POST')) {
      return Promise.resolve(createResponse(appData));
    }

    if (url.includes('/api/drivers')) {
      return Promise.resolve(createResponse(createDrivers()));
    }

    if (url.includes('/api/calendar')) {
      return Promise.resolve(createResponse(calendar));
    }

    if (url.includes('/api/standings')) {
      return Promise.resolve(createResponse(standings));
    }

    if (url.includes('/api/predictions')) {
      return Promise.resolve(createResponse({ message: 'Dati salvati correttamente.' }));
    }

    const resultsEntry = Object.entries(resultsByMeetingKey).find(([meetingKey]) =>
      url.includes(`/api/results/${meetingKey}`),
    );

    if (resultsEntry) {
      return Promise.resolve(
        createResponse({
          ...resultsEntry[1].results,
          racePhase: resultsEntry[1].racePhase ?? 'open',
        }),
      );
    }

    return Promise.reject(new Error(`Unhandled fetch to ${url}`));
  });

  return fetchMock;
}

function setupFetchWithOverrides({
  appData = createAppData(),
  calendar = createCalendar(),
  sessionState = { isAdmin: true, defaultViewMode: 'admin' as const },
  resultsByMeetingKey = {
    'race-monza': { racePhase: 'open', results: createEmptyPrediction() },
    'race-gb': { racePhase: 'open', results: createEmptyPrediction() },
  } as Record<string, { racePhase?: 'open' | 'live' | 'finished'; results: ReturnType<typeof createEmptyPrediction> }>,
  standings = createStandings(),
}: {
  appData?: ReturnType<typeof createAppData>;
  calendar?: ReturnType<typeof createCalendar>;
  sessionState?: { isAdmin: boolean; defaultViewMode: 'admin' | 'public' };
  resultsByMeetingKey?: Record<string, { racePhase?: 'open' | 'live' | 'finished'; results: ReturnType<typeof createEmptyPrediction> }>;
  standings?: ReturnType<typeof createStandings>;
}) {
  const fetchMock = global.fetch as ReturnType<typeof vi.fn>;

  fetchMock.mockImplementation((url: string, options?: RequestInit) => {
    if (url.includes('/api/session')) {
      return Promise.resolve(createResponse(sessionState));
    }

    if (url.includes('/api/data') && (!options || options.method !== 'POST')) {
      return Promise.resolve(createResponse(appData));
    }

    if (url.includes('/api/drivers')) {
      return Promise.resolve(createResponse(createDrivers()));
    }

    if (url.includes('/api/calendar')) {
      return Promise.resolve(createResponse(calendar));
    }

    if (url.includes('/api/standings')) {
      return Promise.resolve(createResponse(standings));
    }

    if (url.includes('/api/predictions')) {
      return Promise.resolve(createResponse({ message: 'Dati salvati correttamente.' }));
    }

    const resultsEntry = Object.entries(resultsByMeetingKey).find(([meetingKey]) =>
      url.includes(`/api/results/${meetingKey}`),
    );

    if (resultsEntry) {
      return Promise.resolve(
        createResponse({
          ...resultsEntry[1].results,
          racePhase: resultsEntry[1].racePhase ?? 'open',
        }),
      );
    }

    return Promise.reject(new Error(`Unhandled fetch to ${url}`));
  });

  return fetchMock;
}

describe('Mockup roadmap UI features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockIntersectionObserver.instances = [];
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation((message?: unknown, ...optionalParams: unknown[]) => {
      if (typeof message === 'string' && message.includes('not wrapped in act')) {
        return;
      }

      originalConsoleError(message, ...optionalParams);
    });
    window.history.replaceState({}, '', '/');
    mockMediaMatches({});
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
    setNavigatorStandalone(false);
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    });
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('switches between public and admin modes and keeps editing controls admin-only', async () => {
    setupFetch();

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    expect(screen.queryByText(appText.panels.publicGuide.title)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: appText.shell.navigation.items.publicView })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: appText.shell.navigation.items.savePredictions })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: appText.shell.navigation.items.publicView }));

    expect(screen.queryByRole('button', { name: appText.shell.navigation.items.savePredictions })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: appText.shell.navigation.items.confirmResults }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: appText.shell.navigation.items.editRace })).not.toBeInTheDocument();
    expect(screen.getByText(appText.history.publicReadonly)).toBeInTheDocument();
  });

  it('renders KPI and deep-dive analytics for the selected user', async () => {
    setupFetch();

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: appText.headings.userKpi })).toBeInTheDocument();
    const kpiPanel = screen.getByTestId('user-kpi-dashboard');
    const kpiCards = within(kpiPanel).getAllByRole('article');
    expect(within(kpiCards[0]).getByText('9')).toBeInTheDocument();
    expect(within(kpiCards[1]).getByText('2')).toBeInTheDocument();
    expect(within(kpiCards[2]).getByText('0%')).toBeInTheDocument();
    expect(within(kpiCards[3]).getByText('9')).toBeInTheDocument();
    expect(within(kpiPanel).getAllByRole('article').every((card) => card.classList.contains('interactive-surface'))).toBe(
      true,
    );

    const analyticsPanel = screen.getByRole('heading', { name: appText.headings.userAnalytics }).closest('section');
    expect(analyticsPanel).not.toBeNull();
    expect(within(analyticsPanel as HTMLElement).getByText(/hamilton lewis/i)).toBeInTheDocument();
    expect(within(analyticsPanel as HTMLElement).getAllByText(/gran premio di gran bretagna/i).length).toBeGreaterThan(0);
    expect(
      (analyticsPanel as HTMLElement).querySelectorAll('.analytics-card.interactive-surface').length,
    ).toBeGreaterThan(0);
    expect(
      (analyticsPanel as HTMLElement).querySelectorAll('.analytics-subpanel.interactive-surface').length,
    ).toBeGreaterThan(0);
  });

  it('renders season analysis, public guide, real standings and history drill-down', async () => {
    setupFetch();

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: appText.panels.seasonAnalysis.title })).toBeInTheDocument();
    expect(screen.getByText(appText.panels.seasonAnalysis.narratives.charge.title)).toBeInTheDocument();
    expect(screen.getByText(appText.panels.seasonAnalysis.latestGpTitle)).toBeInTheDocument();

    // La mappa nel recap deve essere quella di Silverstone (history[0] nel mock), non Monza (selectedRace)
    const recapSection = screen.getByText(appText.panels.seasonAnalysis.latestGpTitle).closest('.analytics-subpanel');
    const recapImage = within(recapSection as HTMLElement).getByRole('img');
    expect(recapImage).toHaveAttribute('src', '/images/tracks/silverstone.png');
    expect(recapImage).toHaveAttribute('alt', 'Silverstone');

    const seasonPanel = screen.getByRole('heading', { name: appText.panels.seasonAnalysis.title }).closest('section');
    expect(seasonPanel).not.toBeNull();
    expect((seasonPanel as HTMLElement).querySelectorAll('.analytics-card.interactive-surface').length).toBeGreaterThan(0);
    expect((seasonPanel as HTMLElement).querySelectorAll('.analytics-subpanel.interactive-surface').length).toBeGreaterThan(0);
    expect((seasonPanel as HTMLElement).querySelectorAll('.season-comparison-row.interactive-surface').length).toBeGreaterThan(0);

    const weekendPulseHeroCard = screen.getByText(appText.panels.weekendPulseHero.countdownLabel).closest('section');
    expect(weekendPulseHeroCard).not.toBeNull();
    expect(weekendPulseHeroCard).toHaveClass('interactive-surface');

    const weekendPulsePanel = screen.getByRole('heading', { name: appText.panels.weekendLive.title }).closest('section');
    expect(weekendPulsePanel).not.toBeNull();
    expect((weekendPulsePanel as HTMLElement).querySelectorAll('.analytics-card.interactive-surface').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: appText.shell.navigation.items.publicView }));

    expect(screen.getByRole('heading', { name: appText.panels.publicGuide.title })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: appText.panels.publicStandings.driversTitle })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: appText.panels.publicStandings.constructorsTitle })).toBeInTheDocument();
    expect(screen.getByAltText('McLaren logo')).toBeInTheDocument();
    expect(document.querySelector('.standings-team-marker')).toBeNull();
    expect(document.querySelector('.public-standings-grid.public-standings-grid-compact')).not.toBeNull();
    expect(document.querySelectorAll('.standings-subpanel.standings-subpanel-compact')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: appText.status.shareLinkCopied || /copia link vista corrente/i })).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('article').some((card) => card.classList.contains('interactive-surface')),
    ).toBe(true);

    fireEvent.change(screen.getByLabelText(appText.panels.historyArchive.userFilterLabel), {
      target: { value: 'Marco' },
    });
    expect(screen.getByText(appText.panels.historyArchive.shownCount(1))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: appText.panels.historyArchive.detailButton('Gran Premio di Gran Bretagna') }));
    expect(screen.getByText(appText.panels.historyArchive.detailTitle)).toBeInTheDocument();
    expect(screen.getByText(appText.panels.historyArchive.actualPodiumTitle)).toBeInTheDocument();
    expect(screen.getByAltText('Lewis Hamilton')).toBeInTheDocument();
    expect(screen.getAllByText(/marco/i).length).toBeGreaterThan(0);
    expect(document.querySelectorAll('.history-card.interactive-surface').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('.history-podium-slot.interactive-surface').length).toBeGreaterThan(0);
    expect(document.querySelector('.history-race-date')).toHaveTextContent('05/07/2099');
    expect(document.querySelectorAll('.history-user-card.interactive-surface').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('.history-detail-panel .analytics-subpanel.interactive-surface').length).toBeGreaterThan(0);
  });

  it('shows the selected circuit map in public recap surfaces and keeps admin results plus menu navigation intact', async () => {
    const australiaMapUrl = 'https://media.example.com/australia-track.webp';
    const chinaMapUrl = 'https://media.example.com/china-track.webp';
    const calendar = [
      {
        ...createCalendar()[0],
        trackOutlineUrl: australiaMapUrl,
      },
      {
        ...createCalendar()[1], // Silverstone
      },
      {
        meetingKey: 'race-2',
        meetingName: 'China',
        grandPrixTitle: 'Chinese Grand Prix 2099',
        roundNumber: 2,
        dateRangeLabel: '20 - 22 MAR',
        detailUrl: 'https://www.formula1.com/en/racing/2099/china',
        heroImageUrl: '',
        trackOutlineUrl: chinaMapUrl,
        isSprintWeekend: true,
        startDate: '2099-03-20',
        endDate: '2099-03-22',
        raceStartTime: '2099-03-22T14:00:00Z',
        sessions: [],
      },
    ];
    const appData = createAppData();
    appData.weekendStateByMeetingKey['race-2'] = {
      userPredictions: {
        Marco: { first: 'ham', second: 'nor', third: 'lec', pole: 'ver' },
        Luca: { first: 'ham', second: 'nor', third: 'pia', pole: 'ver' },
        Sara: { first: 'nor', second: 'ham', third: 'lec', pole: 'ver' },
      },
      raceResults: createEmptyPrediction(),
    };

    setupFetchWithOverrides({
      appData,
      calendar,
      resultsByMeetingKey: {
        'race-monza': { racePhase: 'open', results: createEmptyPrediction() },
        'race-2': { racePhase: 'open', results: createEmptyPrediction() },
      },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    expect(screen.getAllByRole('img', { name: 'Monza' })[0]).toHaveAttribute('src', australiaMapUrl);

    fireEvent.click(screen.getByRole('button', { name: appText.shell.navigation.items.publicView }));

    await waitFor(() => {
      // 1 nella hero (Monza) e 1 nel recap (Silverstone - ma nel test calendar Silverstone non ha australiaMapUrl)
      expect(screen.getAllByRole('img', { name: 'Monza' })).toHaveLength(1);
    });
    expect(screen.queryByRole('button', { name: appText.shell.navigation.items.confirmResults })).not.toBeInTheDocument();

    const navigation = screen.getByRole('navigation', { name: appText.shell.navigation.ariaLabel });
    expect(within(navigation).getByRole('button', { name: appText.shell.navigation.items.publicGuide })).toBeInTheDocument();
    expect(within(navigation).queryByRole('button', { name: appText.shell.navigation.items.results })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(appText.labels.selectedRace), {
      target: { value: 'race-2' },
    });

    await waitFor(() => {
      // 1 nella hero (Cina) e 1 nel recap (Silverstone - dalla history[0])
      expect(screen.getAllByRole('img', { name: 'China' })).toHaveLength(1);
      expect(screen.getByRole('img', { name: 'Silverstone' })).toBeInTheDocument();
    });
    expect(screen.getAllByRole('img', { name: 'China' }).every((image) => image.getAttribute('src') === chinaMapUrl)).toBe(true);

    fireEvent.click(within(navigation).getByRole('button', { name: appText.shell.navigation.items.seasonAnalysis }));
    expect(window.location.hash).toBe('#season-analysis');
  }, 15000);

  it('shows install CTA when the browser exposes the PWA install prompt', async () => {
    setupFetch();

    render(<App />);

    const prompt = vi.fn().mockResolvedValue(undefined);
    const preventDefault = vi.fn();
    const installEvent = new Event('beforeinstallprompt');
    Object.assign(installEvent, {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
      preventDefault,
    });

    await act(async () => {
      window.dispatchEvent(installEvent);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: appText.shell.navigation.items.installApp })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: appText.shell.navigation.items.installApp }));

    await waitFor(() => {
      expect(prompt).toHaveBeenCalled();
    });
  });

  it('shows the mobile install CTA on iOS Safari when not already installed and opens guided instructions', async () => {
    setupFetch();
    mockMediaMatches({ '(max-width: 767px)': true });
    setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    const installButton = screen.getByRole('button', { name: appText.shell.navigation.items.installApp || /installa/i });
    expect(installButton).toBeInTheDocument();

    fireEvent.click(installButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(appText.installDialog.title, 'i'))).toBeInTheDocument();
    expect(screen.getAllByText(/condividi/i).length).toBeGreaterThan(0);
  });

  it('keeps the install CTA visible when the app is already running in standalone mode and explains that it is already installed', async () => {
    setupFetch();
    mockMediaMatches({
      '(max-width: 767px)': true,
      '(display-mode: standalone)': true,
    });
    setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    );
    setNavigatorStandalone(true);

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    const installButton = screen.getByRole('button', { name: appText.shell.navigation.items.installApp || /installa/i });
    expect(installButton).toBeInTheDocument();

    fireEvent.click(installButton);

    expect(screen.getByRole('status')).toHaveTextContent(new RegExp(appText.status.pwaAlreadyInstalled, 'i'));
  });

  it('keeps the install CTA visible on unsupported browsers and shows an explicit fallback message', async () => {
    setupFetch();
    mockMediaMatches({ '(max-width: 767px)': true });
    setUserAgent(
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/124.0 Mobile Safari/537.36',
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    const installButton = screen.getByRole('button', { name: appText.shell.navigation.items.installApp || /installa/i });
    expect(installButton).toBeInTheDocument();

    fireEvent.click(installButton);

    expect(screen.getByRole('status')).toHaveTextContent(new RegExp(appText.status.pwaInstallUnavailable, 'i'));
  });

  it('hydrates the shared public url state from query params and preserves the requested public filters', async () => {
    const scrollTo = vi.fn();
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    });

    const appData = createAppData();
    appData.weekendStateByMeetingKey['race-2'] = {
      userPredictions: {
        Marco: { first: 'ham', second: 'nor', third: 'lec', pole: 'ver' },
        Luca: { first: 'ham', second: 'nor', third: 'pia', pole: 'ver' },
        Sara: { first: 'nor', second: 'ham', third: 'lec', pole: 'ver' },
      },
      raceResults: createEmptyPrediction(),
    };

    const calendar = [
      ...createCalendar(),
      {
        meetingKey: 'race-2',
        meetingName: 'China',
        grandPrixTitle: 'Chinese Grand Prix 2099',
        roundNumber: 2,
        dateRangeLabel: '20 - 22 MAR',
        detailUrl: 'https://www.formula1.com/en/racing/2099/china',
        heroImageUrl: '',
        trackOutlineUrl: '',
        isSprintWeekend: true,
        startDate: '2099-03-20',
        endDate: '2099-03-22',
        raceStartTime: '2099-03-22T14:00:00Z',
        sessions: [],
      },
    ];

    window.history.replaceState(
      {},
      '',
      '/?meeting=race-2&view=public&historyUser=Marco&historySearch=Gran#history-archive',
    );

    setupFetchWithOverrides({
      appData,
      calendar,
      resultsByMeetingKey: {
        'race-monza': { racePhase: 'open', results: createEmptyPrediction() },
        'race-2': { racePhase: 'open', results: createEmptyPrediction() },
      },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: appText.panels.publicGuide.title })).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: appText.shell.navigation.items.savePredictions })).not.toBeInTheDocument();
    expect(screen.getByLabelText(appText.panels.historyArchive.userFilterLabel)).toHaveValue('Marco');
    expect(screen.getByLabelText(appText.panels.historyArchive.searchLabel)).toHaveValue('Gran');
    expect(screen.getByDisplayValue(/2\.\s+Chinese Grand Prix 2099/i)).toBeInTheDocument();
    expect(screen.getByText(appText.panels.historyArchive.shownCount(1))).toBeInTheDocument();
    expect(scrollTo).toHaveBeenCalled();

    expect(window.location.search).toContain('meeting=race-2');
    expect(window.location.search).toContain('view=public');
    expect(window.location.search).toContain('historyUser=Marco');
    expect(window.location.search).toContain('historySearch=Gran');
    expect(window.location.hash).toBe('#history-archive');
  });

  it('does not grant admin access from a shared admin url when the session is not admin', async () => {
    window.history.replaceState({}, '', '/?meeting=race-1&view=admin');
    setupFetchWithOverrides({
      sessionState: { isAdmin: false, defaultViewMode: 'public' },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: appText.shell.navigation.items.adminLogin })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: appText.shell.navigation.items.savePredictions })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: appText.panels.publicGuide.title })).toBeInTheDocument();
  });

  it('renders desktop section navigation with admin-only and public-only entries', async () => {
    setupFetch();

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    const navigation = screen.getByRole('navigation', { name: appText.shell.navigation.ariaLabel });
    expect(within(navigation).getByRole('button', { name: appText.shell.navigation.items.calendar })).toBeInTheDocument();
    expect(within(navigation).getByText(appText.shell.navigation.items.analysisGroup)).toBeInTheDocument();
    expect(within(navigation).getByRole('button', { name: appText.shell.navigation.items.seasonAnalysis })).toBeInTheDocument();
    expect(within(navigation).getByRole('button', { name: appText.shell.navigation.items.userAnalytics })).toBeInTheDocument();
    expect(within(navigation).getByRole('button', { name: appText.shell.navigation.items.userKpi })).toBeInTheDocument();
    expect(within(navigation).queryByRole('button', { name: appText.shell.navigation.items.publicGuide })).not.toBeInTheDocument();
    expect(within(navigation).queryByRole('button', { name: appText.shell.navigation.items.publicStandings })).not.toBeInTheDocument();
    expect(within(navigation).getByRole('button', { name: appText.shell.navigation.items.results })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: appText.shell.navigation.items.publicView }));

    expect(within(navigation).getByRole('button', { name: appText.shell.navigation.items.publicGuide })).toBeInTheDocument();
    expect(within(navigation).getByRole('button', { name: appText.shell.navigation.items.publicStandings })).toBeInTheDocument();
    expect(within(navigation).queryByRole('button', { name: appText.shell.navigation.items.results })).not.toBeInTheDocument();
  });

  it('renders the requested public navigation order and mirrors the same dashboard section order', async () => {
    setupFetch();
    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    const navigation = screen.getByRole('navigation', { name: appText.shell.navigation.ariaLabel });
    fireEvent.click(screen.getByRole('button', { name: appText.shell.navigation.items.publicView }));

    const navLabels = Array.from(
      navigation.querySelectorAll('.sidebar-group-label, .sidebar-item .sidebar-label'),
    ).map((element) => element.textContent?.trim());

    expect(navLabels).toEqual([
      appText.shell.navigation.items.calendar,
      appText.shell.navigation.items.predictions,
      appText.shell.navigation.items.weekendLive,
      appText.shell.navigation.items.analysisGroup,
      appText.shell.navigation.items.seasonAnalysis,
      appText.shell.navigation.items.userAnalytics,
      appText.shell.navigation.items.userKpi,
      appText.shell.navigation.items.publicStandings,
      appText.shell.navigation.items.history,
      appText.shell.navigation.items.publicGuide,
    ]);

    const sectionOrder = Array.from(document.querySelectorAll('.nav-section')).map((section) => section.id);
    expect(sectionOrder).toEqual([
      'calendar-section',
      'predictions-section',
      'weekend-live',
      'season-analysis',
      'user-analytics-section',
      'user-kpi-section',
      'public-standings',
      'history-archive',
      'public-guide',
    ]);
  });

  it('renders navigation directly in the header and updates the hash on navigation', async () => {
    setupFetch();
    const scrollTo = vi.fn();
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    const navigation = screen.getByRole('navigation', { name: appText.shell.navigation.ariaLabel });
    expect(navigation).toBeInTheDocument();
    expect(navigation).toHaveClass('section-nav-list');

    const seasonAnalysisButton = within(navigation).getByRole('button', { name: appText.shell.navigation.items.seasonAnalysis });
    fireEvent.click(seasonAnalysisButton);

    expect(window.location.hash).toBe('#season-analysis');
    expect(scrollTo).toHaveBeenCalled();
  });

  it('renders the install button in the navigation menu', async () => {
    setupFetch();
    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    const installButton = screen.getByRole('button', { name: appText.shell.navigation.items.installApp || /installa/i });
    expect(installButton).toBeInTheDocument();
  });

  it('collapses the desktop sidebar and updates the app shell layout class', async () => {
    setupFetch();
    const { container } = render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    const appShell = container.querySelector('.app-shell');
    const sidebar = container.querySelector('.app-sidebar');
    expect(appShell).not.toBeNull();
    expect(sidebar).not.toBeNull();
    expect(appShell).not.toHaveClass('app-shell-sidebar-collapsed');

    fireEvent.click(within(sidebar as HTMLElement).getByLabelText(appText.shell.navigation.items.collapseSidebar));
    expect(appShell).toHaveClass('app-shell-sidebar-collapsed');

    fireEvent.click(within(sidebar as HTMLElement).getByLabelText(appText.shell.navigation.items.expandSidebar));
    expect(appShell).not.toHaveClass('app-shell-sidebar-collapsed');
  });

  it('opens the mobile menu with the localized trigger, locks scroll, and closes after switching view', async () => {
    setupFetch();
    mockMediaMatches({ '(max-width: 767px)': true });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    const mobileTrigger = screen.getByRole('button', { name: appText.shell.navigation.openButton });
    fireEvent.click(mobileTrigger);

    const overlay = document.querySelector('.mobile-nav-overlay');
    expect(overlay).not.toBeNull();
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.touchAction).toBe('none');
    expect(within(overlay as HTMLElement).getByText(appText.shell.navigation.currentSection)).toBeInTheDocument();
    expect(within(overlay as HTMLElement).getAllByText(appText.shell.navigation.items.calendar)).toHaveLength(2);

    fireEvent.click(within(overlay as HTMLElement).getByRole('button', { name: appText.shell.navigation.items.publicView }));

    await waitFor(() => {
      expect(document.querySelector('.mobile-nav-overlay')).toBeNull();
    });

    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.touchAction).toBe('');
    expect(screen.getByRole('heading', { name: appText.panels.publicGuide.title })).toBeInTheDocument();
  });

  it('keeps the clicked results menu item active when the observer still sees predictions as more visible', async () => {
    setupFetch();
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    const navigation = screen.getByRole('navigation', { name: appText.shell.navigation.ariaLabel });
    const predictionsButton = within(navigation).getByRole('button', { name: appText.shell.navigation.items.predictions });
    const resultsButton = within(navigation).getByRole('button', { name: appText.shell.navigation.items.results });

    fireEvent.click(predictionsButton);
    expect(resultsButton).not.toHaveClass('active');

    fireEvent.click(resultsButton);
    expect(resultsButton).toHaveClass('active');

    const predictionsSection = document.getElementById('predictions-section');
    const resultsSection = document.getElementById('results-section');
    expect(predictionsSection).not.toBeNull();
    expect(resultsSection).not.toBeNull();
    expect(MockIntersectionObserver.instances).not.toHaveLength(0);

    act(() => {
      MockIntersectionObserver.instances[0]?.trigger([
        {
          target: predictionsSection as Element,
          isIntersecting: true,
          intersectionRatio: 0.9,
        } as IntersectionObserverEntry,
        {
          target: resultsSection as Element,
          isIntersecting: true,
          intersectionRatio: 0.3,
        } as IntersectionObserverEntry,
      ]);
    });

    expect(resultsButton).toHaveClass('active');
    expect(window.location.hash).toBe('#results-section');
  });

  it('keeps the clicked third menu item active when the previous section remains more visible', async () => {
    setupFetch();
    const scrollTo = vi.fn();
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    const navigation = screen.getByRole('navigation', { name: appText.shell.navigation.ariaLabel });
    const secondButton = within(navigation).getByRole('button', { name: appText.shell.navigation.items.userKpi });
    const thirdButton = within(navigation).getByRole('button', { name: appText.shell.navigation.items.userAnalytics });

    fireEvent.click(secondButton);
    expect(secondButton).toHaveClass('active');

    fireEvent.click(thirdButton);
    expect(thirdButton).toHaveClass('active');

    const secondSection = document.getElementById('user-kpi-section');
    const thirdSection = document.getElementById('user-analytics-section');
    expect(secondSection).not.toBeNull();
    expect(thirdSection).not.toBeNull();
    expect(MockIntersectionObserver.instances).not.toHaveLength(0);

    act(() => {
      MockIntersectionObserver.instances[0]?.trigger([
        {
          target: thirdSection as Element,
          isIntersecting: true,
          intersectionRatio: 0.25,
          boundingClientRect: { top: 150 } as DOMRectReadOnly,
        } as IntersectionObserverEntry,
      ]);
    });

    act(() => {
      MockIntersectionObserver.instances[0]?.trigger([
        {
          target: secondSection as Element,
          isIntersecting: true,
          intersectionRatio: 0.95,
          boundingClientRect: { top: 20 } as DOMRectReadOnly,
        } as IntersectionObserverEntry,
        {
          target: thirdSection as Element,
          isIntersecting: true,
          intersectionRatio: 0.35,
          boundingClientRect: { top: 150 } as DOMRectReadOnly,
        } as IntersectionObserverEntry,
      ]);
    });

    expect(thirdButton).toHaveClass('active');
    expect(thirdButton).toHaveAttribute('aria-current', 'page');
    expect(window.location.hash).toBe('#user-analytics-section');
    expect(scrollTo).toHaveBeenCalled();
  });

  it('aligns the mobile third menu item to the navigation anchor and keeps it active after reopening the overlay', async () => {
    setupFetch();
    mockMediaMatches({ '(max-width: 900px)': true });
    const scrollTo = vi.fn();
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    });
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 320,
      writable: true,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    const thirdSection = document.getElementById('user-analytics-section');
    expect(thirdSection).not.toBeNull();
    Object.defineProperty(thirdSection as HTMLElement, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 580 }),
    });

    fireEvent.click(screen.getByRole('button', { name: appText.shell.navigation.openButton }));
    const overlay = document.querySelector('.mobile-nav-overlay');
    expect(overlay).not.toBeNull();
    expect(within(overlay as HTMLElement).getByText(appText.shell.navigation.currentSection)).toBeInTheDocument();

    const thirdButton = within(overlay as HTMLElement).getByRole('button', {
      name: appText.shell.navigation.items.userAnalytics,
    });
    fireEvent.click(thirdButton);

    expect(scrollTo).toHaveBeenCalledWith({ top: 724, behavior: 'smooth' });
    expect(window.location.hash).toBe('#user-analytics-section');

    fireEvent.click(screen.getByRole('button', { name: appText.shell.navigation.openButton }));
    const reopenedOverlay = document.querySelector('.mobile-nav-overlay');
    expect(reopenedOverlay).not.toBeNull();
    const reopenedThirdButton = within(reopenedOverlay as HTMLElement).getByRole('button', {
      name: appText.shell.navigation.items.userAnalytics,
    });

    expect(within(reopenedOverlay as HTMLElement).getByText(appText.shell.navigation.currentSection)).toBeInTheDocument();
    expect(reopenedThirdButton).toHaveClass('active');
    expect(reopenedThirdButton).toHaveAttribute('aria-current', 'page');
  });

  it('navigates to history even when no archived races exist yet', async () => {
    const scrollTo = vi.fn();
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    });

    setupFetchWithOverrides({
      appData: {
        ...createAppData(),
        history: [],
      },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    const navigation = screen.getByRole('navigation', { name: appText.shell.navigation.ariaLabel });
    const historyButton = within(navigation).getByRole('button', { name: appText.shell.navigation.items.history });
    fireEvent.click(historyButton);

    expect(window.location.hash).toBe('#history-archive');
    expect(scrollTo).toHaveBeenCalled();
    expect(document.getElementById('history-archive')).not.toBeNull();
    expect(historyButton).toHaveClass('active');
  });
});
