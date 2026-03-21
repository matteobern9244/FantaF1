/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
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

function createCalendar() {
  return [
    {
      meetingKey: 'race-monza',
      meetingName: 'Monza',
      grandPrixTitle: 'Gran Premio d\'Italia 2099',
      roundNumber: 13,
      dateRangeLabel: '04 - 06 SEP',
      detailUrl: 'https://www.formula1.com/en/racing/2099/italy',
      heroImageUrl: 'https://media.example.com/monza-hero.webp',
      trackOutlineUrl: '',
      isSprintWeekend: false,
      startDate: '2099-09-04',
      endDate: '2099-09-06',
      raceStartTime: '2099-09-06T15:00:00Z',
      sessions: [],
    },
    {
      meetingKey: 'race-gb',
      meetingName: 'Silverstone',
      grandPrixTitle: 'Gran Premio di Gran Bretagna',
      roundNumber: 10,
      dateRangeLabel: '03 - 05 JUL',
      detailUrl: 'https://www.formula1.com/en/racing/2099/great-britain',
      heroImageUrl: 'https://media.example.com/gb-hero.webp',
      trackOutlineUrl: '',
      isSprintWeekend: false,
      startDate: '2099-07-03',
      endDate: '2099-07-05',
      raceStartTime: '2099-07-05T15:00:00Z',
      sessions: [],
    },
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

function getUserCard(userName: string) {
  const headings = screen.getAllByRole('heading', { name: userName });
  const h3 = headings.find(h => h.tagName === 'H3');
  return h3?.closest('article') || null;
}

function getProjectionValue(name: string) {
  const card = getUserCard(name);
  return card?.querySelector('.points-preview-value')?.textContent?.trim();
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

    render(<MemoryRouter initialEntries={['/pronostici']}><App /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    expect(screen.queryByText(appText.panels.publicGuide.title)).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: appText.shell.navigation.items.publicView })[0]).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: appText.shell.navigation.items.savePredictions })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: appText.shell.navigation.items.publicView })[0]);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: appText.shell.navigation.items.savePredictions })).not.toBeInTheDocument();
    });
    expect(
      screen.queryByRole('button', { name: appText.shell.navigation.items.confirmResults }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: appText.shell.navigation.items.editRace })).not.toBeInTheDocument();
    expect(screen.getByText(appText.history.publicReadonly)).toBeInTheDocument();
  });

  it('renders KPI and deep-dive analytics for the selected user', async () => {
    setupFetch();

    render(<MemoryRouter initialEntries={['/analisi']}><App /></MemoryRouter>);

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

    render(<MemoryRouter initialEntries={['/analisi']}><App /></MemoryRouter>);

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

    fireEvent.click(screen.getAllByRole('button', { name: appText.shell.navigation.items.calendar })[0]);

    await waitFor(() => {
      expect(screen.getByText(appText.panels.weekendPulseHero.countdownLabel)).toBeInTheDocument();
    });

    const weekendPulseHeroCard = screen.getByText(appText.panels.weekendPulseHero.countdownLabel).closest('section');
    expect(weekendPulseHeroCard).not.toBeNull();
    expect(weekendPulseHeroCard).toHaveClass('interactive-surface');

    const weekendPulsePanel = screen.getByRole('heading', { name: appText.panels.weekendLive.title }).closest('section');
    expect(weekendPulsePanel).not.toBeNull();
    expect((weekendPulsePanel as HTMLElement).querySelectorAll('.analytics-card.interactive-surface').length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: appText.shell.navigation.items.publicView })[0]);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: appText.shell.navigation.items.publicGuide })).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: appText.shell.navigation.items.publicGuide })[0]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: appText.panels.publicGuide.title })).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: appText.shell.navigation.items.publicStandings })[0]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: appText.panels.publicStandings.driversTitle })).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: appText.panels.publicStandings.constructorsTitle })).toBeInTheDocument();
    expect(screen.getByAltText('McLaren logo')).toBeInTheDocument();
    expect(document.querySelector('.standings-team-marker')).toBeNull();
    expect(document.querySelector('.public-standings-grid.public-standings-grid-compact')).not.toBeNull();
    expect(document.querySelectorAll('.standings-subpanel.standings-subpanel-compact')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: appText.status.shareLinkCopied || /copia link vista corrente/i })).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('article').some((card) => card.classList.contains('interactive-surface')),
    ).toBe(true);

    fireEvent.click(screen.getAllByRole('button', { name: appText.shell.navigation.items.history })[0]);

    await waitFor(() => {
      expect(screen.getByLabelText(appText.panels.historyArchive.userFilterLabel)).toBeInTheDocument();
    });

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

    render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    expect(screen.getAllByRole('img', { name: 'Monza' })[0]).toHaveAttribute('src', australiaMapUrl);

    fireEvent.click(screen.getAllByRole('button', { name: appText.shell.navigation.items.publicView })[0]);

    await waitFor(() => {
      // 1 nella hero (Monza) e 1 nel recap (Silverstone - ma nel test calendar Silverstone non ha australiaMapUrl)
      expect(screen.getAllByRole('img', { name: 'Monza' })).toHaveLength(1);
    });
    
    fireEvent.click(screen.getAllByRole('button', { name: appText.shell.navigation.items.predictions })[0]);
    
    await waitFor(() => {
      const predictionsSection = document.getElementById('predictions-section');
      expect(predictionsSection).toBeInTheDocument();
    });

    const navigation = screen.getAllByRole('navigation', { name: appText.shell.navigation.ariaLabel })[0];
    
    fireEvent.click(screen.getAllByRole('button', { name: appText.shell.navigation.items.publicGuide })[0]);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: appText.panels.publicGuide.title })).toBeInTheDocument();
    });
    
    expect(within(navigation).queryByRole('button', { name: appText.shell.navigation.items.results })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: appText.shell.navigation.items.calendar })[0]);

    await waitFor(() => {
      expect(screen.getByLabelText(appText.labels.selectedRace)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(appText.labels.selectedRace), {
      target: { value: 'race-2' },
    });

    await waitFor(() => {
      // it navigates to /pronostici after selection
      const predictionsSection = document.getElementById('predictions-section');
      expect(predictionsSection).toBeInTheDocument();
      expect(screen.getAllByRole('img', { name: 'China' })).toHaveLength(1);
    });
    
    fireEvent.click(screen.getAllByRole('button', { name: appText.shell.navigation.items.analisiGroup })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: appText.shell.navigation.items.seasonAnalysis })[0]);
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: appText.panels.seasonAnalysis.title })).toBeInTheDocument();
    });
  }, 15000);

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

    setupFetchWithOverrides({
      appData,
      calendar,
      resultsByMeetingKey: {
        'race-monza': { racePhase: 'open', results: createEmptyPrediction() },
        'race-2': { racePhase: 'open', results: createEmptyPrediction() },
      },
    });

    render(<MemoryRouter initialEntries={['/classifiche?meeting=race-2&view=public&historyUser=Marco&historySearch=Gran#history-archive']}><App /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByLabelText(appText.panels.historyArchive.userFilterLabel)).toHaveValue('Marco');
    });

    expect(screen.getByLabelText(appText.panels.historyArchive.searchLabel)).toHaveValue('Gran');
    expect(screen.getByDisplayValue(/2\.\s+Chinese Grand Prix 2099/i)).toBeInTheDocument();
    expect(screen.getByText(appText.panels.historyArchive.shownCount(1))).toBeInTheDocument();
  });

  it('does not grant admin access from a shared admin url when the session is not admin', async () => {
    setupFetchWithOverrides({
      sessionState: { isAdmin: false, defaultViewMode: 'public' },
    });

    render(<MemoryRouter initialEntries={['/pronostici?view=admin']}><App /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: appText.shell.navigation.items.adminLogin })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: appText.shell.navigation.items.savePredictions })).not.toBeInTheDocument();
    expect(screen.getByText(appText.history.publicReadonly)).toBeInTheDocument();
  });

  it('renders the requested public navigation order and mirrors the same dashboard section order', async () => {
    setupFetch();
    render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    const navigation = screen.getByRole('navigation', { name: appText.shell.navigation.ariaLabel });
    fireEvent.click(screen.getByRole('button', { name: appText.shell.navigation.items.publicView }));

    await waitFor(() => {
        expect(screen.getByRole('button', { name: appText.shell.navigation.items.publicGuide })).toBeInTheDocument();
    });

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
  });

  it('renders navigation directly in the header and updates the hash on navigation', async () => {
    setupFetch();
    const scrollTo = vi.fn();
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    });

    render(<MemoryRouter initialEntries={['/analisi']}><App /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    const navigation = screen.getByRole('navigation', { name: appText.shell.navigation.ariaLabel });
    expect(navigation).toBeInTheDocument();
    expect(navigation).toHaveClass('section-nav-list');

    const userAnalyticsButton = within(navigation).getByRole('button', { name: appText.shell.navigation.items.userAnalytics });
    fireEvent.click(userAnalyticsButton);

    await waitFor(() => {
      const userAnalyticsSection = document.getElementById('user-analytics-section');
      expect(userAnalyticsSection).toBeInTheDocument();
    });
    expect(scrollTo).toHaveBeenCalled();
  });

  it('scrolls to the requested section when navigation changes both route and hash', async () => {
    setupFetch();
    const scrollTo = vi.fn();
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    });

    render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    const navigation = screen.getByRole('navigation', { name: appText.shell.navigation.ariaLabel });
    fireEvent.click(within(navigation).getByRole('button', { name: appText.shell.navigation.items.userAnalytics }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: appText.headings.userAnalytics })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(within(navigation).getByRole('button', { name: appText.shell.navigation.items.userAnalytics })).toHaveClass('active');
    });
    expect(scrollTo).toHaveBeenCalled();
  });

  it('opens the mobile menu with the localized trigger, locks scroll, and closes after switching view', async () => {
    setupFetch();
    mockMediaMatches({ '(max-width: 767px)': true });

    render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    const mobileTrigger = screen.getByRole('button', { name: appText.shell.navigation.openButton });
    fireEvent.click(mobileTrigger);

    const overlay = document.querySelector('.mobile-nav-overlay');
    expect(overlay).not.toBeNull();
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.touchAction).toBe('none');

    fireEvent.click(within(overlay as HTMLElement).getByRole('button', { name: appText.shell.navigation.items.publicView }));

    await waitFor(() => {
      expect(document.querySelector('.mobile-nav-overlay')).toBeNull();
    });

    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.touchAction).toBe('');
    expect(screen.getByRole('heading', { name: appText.panels.publicGuide.title })).toBeInTheDocument();
  });

  it('keeps the clicked third menu item active when the previous section remains more visible', async () => {
    setupFetch();
    const scrollTo = vi.fn();
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    });

    render(<MemoryRouter initialEntries={['/analisi']}><App /></MemoryRouter>);

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

    expect(thirdButton).toHaveClass('active');
    expect(thirdButton).toHaveAttribute('aria-current', 'page');
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

    render(<MemoryRouter initialEntries={['/analisi']}><App /></MemoryRouter>);

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

    const thirdButton = within(overlay as HTMLElement).getByRole('button', {
      name: appText.shell.navigation.items.userAnalytics,
    });
    fireEvent.click(thirdButton);

    expect(scrollTo).toHaveBeenCalledWith({ top: 724, behavior: 'smooth' });

    fireEvent.click(screen.getByRole('button', { name: appText.shell.navigation.openButton }));
    const reopenedOverlay = document.querySelector('.mobile-nav-overlay');
    expect(reopenedOverlay).not.toBeNull();
    const reopenedThirdButton = within(reopenedOverlay as HTMLElement).getByRole('button', {
      name: appText.shell.navigation.items.userAnalytics,
    });

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

    render(<MemoryRouter initialEntries={['/classifiche']}><App /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    const navigation = screen.getByRole('navigation', { name: appText.shell.navigation.ariaLabel });
    const historyButton = within(navigation).getByRole('button', { name: appText.shell.navigation.items.history });
    fireEvent.click(historyButton);

    await waitFor(() => {
      const historySection = document.getElementById('history-archive');
      expect(historySection).toBeInTheDocument();
    });
    expect(scrollTo).toHaveBeenCalled();
    expect(historyButton).toHaveClass('active');
  });
});
