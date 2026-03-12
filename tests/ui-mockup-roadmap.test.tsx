/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import App from '../src/App';

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(
    _callback: IntersectionObserverCallback,
    _options?: IntersectionObserverInit,
  ) {}
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
      { position: 1, team: 'McLaren', points: 188, color: '#ff8000' },
      { position: 2, team: 'Ferrari', points: 144, color: '#ff0000' },
      { position: 3, team: 'Red Bull', points: 121, color: '#0000ff' },
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
    vi.spyOn(window, 'alert').mockImplementation(() => {});
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

    expect(screen.queryByText(/regole del gioco/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /modalita' admin/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /salva dati inseriti/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /vista pubblica/i }));

    expect(screen.queryByRole('button', { name: /salva dati inseriti/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /conferma risultati e assegna i punti/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /modifica/i })).not.toBeInTheDocument();
    expect(screen.getByText(/solo gli admin possono modificare i pronostici/i)).toBeInTheDocument();
  });

  it('renders KPI and deep-dive analytics for the selected user', async () => {
    setupFetch();

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: /user kpi dashboard/i })).toBeInTheDocument();
    const kpiPanel = screen.getByTestId('user-kpi-dashboard');
    const kpiCards = within(kpiPanel).getAllByRole('article');
    expect(within(kpiCards[0]).getByText('9')).toBeInTheDocument();
    expect(within(kpiCards[1]).getByText('2')).toBeInTheDocument();
    expect(within(kpiCards[2]).getByText('0%')).toBeInTheDocument();
    expect(within(kpiCards[3]).getByText('9')).toBeInTheDocument();
    expect(within(kpiPanel).getAllByRole('article').every((card) => card.classList.contains('interactive-surface'))).toBe(
      true,
    );

    const analyticsPanel = screen.getByRole('heading', { name: /deep-dive kpi dashboard/i }).closest('section');
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

    expect(screen.getByRole('heading', { name: /analisi stagione/i })).toBeInTheDocument();
    expect(screen.getByText(/chi tiene il passo del leader/i)).toBeInTheDocument();
    expect(screen.getByText(/recap ultimo gp/i)).toBeInTheDocument();

    // La mappa nel recap deve essere quella di Silverstone (history[0] nel mock), non Monza (selectedRace)
    const recapSection = screen.getByText(/recap ultimo gp/i).closest('.analytics-subpanel');
    const recapImage = within(recapSection as HTMLElement).getByRole('img');
    expect(recapImage).toHaveAttribute('src', '/images/tracks/silverstone.png');
    expect(recapImage).toHaveAttribute('alt', 'Silverstone');

    const seasonPanel = screen.getByRole('heading', { name: /analisi stagione/i }).closest('section');
    expect(seasonPanel).not.toBeNull();
    expect((seasonPanel as HTMLElement).querySelectorAll('.analytics-card.interactive-surface').length).toBeGreaterThan(0);
    expect((seasonPanel as HTMLElement).querySelectorAll('.analytics-subpanel.interactive-surface').length).toBeGreaterThan(0);
    expect((seasonPanel as HTMLElement).querySelectorAll('.season-comparison-row.interactive-surface').length).toBeGreaterThan(0);

    const weekendPulseHeroCard = screen.getByText(/countdown lock/i).closest('section');
    expect(weekendPulseHeroCard).not.toBeNull();
    expect(weekendPulseHeroCard).toHaveClass('interactive-surface');

    const weekendPulsePanel = screen.getByRole('heading', { name: /weekend pulse/i }).closest('section');
    expect(weekendPulsePanel).not.toBeNull();
    expect((weekendPulsePanel as HTMLElement).querySelectorAll('.analytics-card.interactive-surface').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /vista pubblica/i }));

    expect(screen.getByRole('heading', { name: /come funziona/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /classifica piloti/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /classifica scuderia/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /copia link vista corrente/i })).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('article').some((card) => card.classList.contains('interactive-surface')),
    ).toBe(true);

    fireEvent.change(screen.getByLabelText(/filtra per giocatore/i), {
      target: { value: 'Marco' },
    });
    expect(screen.getByText(/1 gran premi mostrati/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /dettaglio gran premio di gran bretagna/i }));
    expect(screen.getByText(/pronostici dettagliati/i)).toBeInTheDocument();
    expect(screen.getByText(/podio reale/i)).toBeInTheDocument();
    expect(screen.getByAltText('Lewis Hamilton')).toBeInTheDocument();
    expect(screen.getAllByText(/marco/i).length).toBeGreaterThan(0);
    expect(document.querySelectorAll('.history-card.interactive-surface').length).toBeGreaterThan(0);
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

    expect(screen.getByRole('img', { name: 'Monza' })).toHaveAttribute('src', australiaMapUrl);

    fireEvent.click(screen.getByRole('button', { name: /vista pubblica/i }));

    await waitFor(() => {
      // 1 nella hero (Monza) e 1 nel recap (Silverstone - ma nel test calendar Silverstone non ha australiaMapUrl)
      expect(screen.getAllByRole('img', { name: 'Monza' })).toHaveLength(1);
    });
    expect(screen.queryByRole('button', { name: /conferma risultati e assegna i punti/i })).not.toBeInTheDocument();

    const navigation = screen.getByRole('navigation', { name: /sezioni applicazione/i });
    expect(within(navigation).getByRole('button', { name: /come funziona/i })).toBeInTheDocument();
    expect(within(navigation).queryByRole('button', { name: /risultati del weekend/i })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/weekend selezionato/i), {
      target: { value: 'race-2' },
    });

    await waitFor(() => {
      // 1 nella hero (Cina) e 1 nel recap (Silverstone - dalla history[0])
      expect(screen.getAllByRole('img', { name: 'China' })).toHaveLength(1);
      expect(screen.getByRole('img', { name: 'Silverstone' })).toBeInTheDocument();
    });
    expect(screen.getAllByRole('img', { name: 'China' }).every((image) => image.getAttribute('src') === chinaMapUrl)).toBe(true);

    fireEvent.click(within(navigation).getByRole('button', { name: /analisi stagione/i }));
    expect(window.location.hash).toBe('#season-analysis');
  });

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
      expect(screen.getByRole('button', { name: /installa app/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /installa app/i }));

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

    const installButton = screen.getByRole('button', { name: /installa/i });
    expect(installButton).toBeInTheDocument();

    fireEvent.click(installButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/aggiungi fantaf1 alla home/i)).toBeInTheDocument();
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

    const installButton = screen.getByRole('button', { name: /installa/i });
    expect(installButton).toBeInTheDocument();

    fireEvent.click(installButton);

    expect(screen.getByRole('status')).toHaveTextContent(/gia' installata/i);
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

    const installButton = screen.getByRole('button', { name: /installa/i });
    expect(installButton).toBeInTheDocument();

    fireEvent.click(installButton);

    expect(screen.getByRole('status')).toHaveTextContent(/non disponibile/i);
  });

  it('hydrates the shared public url state from query params and preserves the requested public filters', async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
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
      expect(screen.getByRole('heading', { name: /come funziona/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /salva dati inseriti/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/filtra per giocatore/i)).toHaveValue('Marco');
    expect(screen.getByLabelText(/cerca gp/i)).toHaveValue('Gran');
    expect(screen.getByDisplayValue(/2\.\s+Chinese Grand Prix 2099/i)).toBeInTheDocument();
    expect(screen.getByText(/1 gran premi mostrati/i)).toBeInTheDocument();
    expect(scrollIntoView).toHaveBeenCalled();

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

    expect(screen.getByRole('button', { name: /vista pubblica/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /modalita' admin/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: /salva dati inseriti/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /come funziona/i })).toBeInTheDocument();
  });

  it('renders desktop section navigation with admin-only and public-only entries', async () => {
    setupFetch();

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    const navigation = screen.getByRole('navigation', { name: /sezioni applicazione/i });
    expect(within(navigation).getByRole('button', { name: /calendario stagione/i })).toBeInTheDocument();
    expect(within(navigation).getByRole('button', { name: /risultati del weekend/i })).toBeInTheDocument();
    expect(within(navigation).queryByRole('button', { name: /come funziona/i })).not.toBeInTheDocument();
    expect(within(navigation).queryByRole('button', { name: /classifiche reali/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /vista pubblica/i }));

    expect(within(navigation).getByRole('button', { name: /come funziona/i })).toBeInTheDocument();
    expect(within(navigation).getByRole('button', { name: /classifiche reali/i })).toBeInTheDocument();
    expect(within(navigation).queryByRole('button', { name: /risultati del weekend/i })).not.toBeInTheDocument();
  });

  it('renders navigation directly in the header and updates the hash on navigation', async () => {
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

    const navigation = screen.getByRole('navigation', { name: /sezioni applicazione/i });
    expect(navigation).toBeInTheDocument();
    
    const navList = navigation.querySelector('.section-nav-list');
    expect(navList).toBeInTheDocument();
    
    const seasonAnalysisButton = within(navigation).getByRole('button', { name: /analisi stagione/i });
    fireEvent.click(seasonAnalysisButton);

    expect(window.location.hash).toBe('#season-analysis');
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it('renders the install button as the last item in the navigation list', async () => {
    setupFetch();
    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    const navList = screen.getByRole('navigation', { name: /sezioni applicazione/i }).querySelector('.section-nav-list');
    const buttons = within(navList as HTMLElement).getAllByRole('button');
    const lastButton = buttons[buttons.length - 1];

    expect(lastButton).toHaveTextContent(/installa applicazione/i);
  });

  it('shows the back-to-top button when the hero panel is scrolled out of view and scrolls back to the navigation element', async () => {
    const originalObserver = window.IntersectionObserver;
    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      value: undefined,
    });

    setupFetch();
    const scrollIntoViewMock = vi.fn();
    
    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    const navigation = screen.getByRole('navigation', { name: /sezioni applicazione/i });
    Object.defineProperty(navigation, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoViewMock,
    });

    expect(screen.queryByRole('button', { name: /torna al menu/i })).not.toBeInTheDocument();

    await act(async () => {
      Object.defineProperty(window, 'scrollY', { value: 500, configurable: true });
      window.dispatchEvent(new Event('scroll'));
    });

    const backToTopButton = screen.getByRole('button', { name: /torna al menu/i });
    expect(backToTopButton).toBeInTheDocument();

    fireEvent.click(backToTopButton);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });

    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      value: originalObserver,
    });
  });
});
