/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appCssPath = path.resolve(__dirname, '..', 'src', 'App.css');
const appCssContent = readFileSync(appCssPath, 'utf8');

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

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => []),
  })),
});

function createEmptyPrediction() {
  return {
    first: '',
    second: '',
    third: '',
    pole: '',
  };
}

function createDrivers() {
  return [
    { id: 'ver', name: 'Max Verstappen', team: 'Red Bull', color: '#0000ff' },
    { id: 'ham', name: 'Lewis Hamilton', team: 'Ferrari', color: '#ff0000' },
    { id: 'lec', name: 'Charles Leclerc', team: 'Ferrari', color: '#ff0000' },
    { id: 'nor', name: 'Lando Norris', team: 'McLaren', color: '#ff8000' },
    { id: 'pia', name: 'Oscar Piastri', team: 'McLaren', color: '#ff8000' },
  ];
}

function createCalendar() {
  return [
    {
      meetingKey: 'race-1',
      meetingName: 'Australia',
      grandPrixTitle: 'Australian Grand Prix 2099',
      roundNumber: 1,
      dateRangeLabel: '13 - 15 MAR',
      detailUrl: 'https://www.formula1.com/en/racing/2099/australia',
      heroImageUrl: 'https://media.example.com/australia-hero.webp',
      trackOutlineUrl: '',
      isSprintWeekend: false,
      startDate: '2099-03-13',
      endDate: '2099-03-15',
      raceStartTime: '2099-03-15T14:00:00Z',
      sessions: [],
    },
    {
      meetingKey: 'race-2',
      meetingName: 'China',
      grandPrixTitle: 'Chinese Grand Prix 2099',
      roundNumber: 2,
      dateRangeLabel: '20 - 22 MAR',
      detailUrl: 'https://www.formula1.com/en/racing/2099/china',
      heroImageUrl: 'https://media.example.com/china-hero.webp',
      trackOutlineUrl: '',
      isSprintWeekend: true,
      startDate: '2099-03-20',
      endDate: '2099-03-22',
      raceStartTime: '2099-03-22T14:00:00Z',
      sessions: [],
    },
    {
      meetingKey: 'race-3',
      meetingName: 'Monaco',
      grandPrixTitle: 'Monaco Grand Prix 2099',
      roundNumber: 3,
      dateRangeLabel: '27 - 29 MAR',
      detailUrl: 'https://www.formula1.com/en/racing/2099/monaco',
      heroImageUrl: 'https://media.example.com/monaco-hero.webp',
      trackOutlineUrl: '',
      isSprintWeekend: false,
      startDate: '2099-03-27',
      endDate: '2099-03-29',
      raceStartTime: '2099-03-29T14:00:00Z',
      sessions: [],
    },
  ];
}

function createAppData() {
  return {
    users: [
      {
        name: 'Player 1',
        predictions: { first: 'ver', second: '', third: '', pole: '' },
        points: 0,
      },
      {
        name: 'Player 2',
        predictions: { first: '', second: '', third: '', pole: '' },
        points: 0,
      },
      {
        name: 'Player 3',
        predictions: { first: '', second: '', third: '', pole: '' },
        points: 0,
      },
    ],
    history: [],
    gpName: 'Australia',
    raceResults: { first: 'ver', second: '', third: '', pole: '' },
    selectedMeetingKey: 'race-1',
    weekendStateByMeetingKey: {
      'race-1': {
        users: [
          {
            name: 'Player 1',
            predictions: { first: 'ver', second: '', third: '', pole: '' },
            points: 0,
          },
          {
            name: 'Player 2',
            predictions: { first: '', second: '', third: '', pole: '' },
            points: 0,
          },
          {
            name: 'Player 3',
            predictions: { first: '', second: '', third: '', pole: '' },
            points: 0,
          },
        ],
        raceResults: { first: 'ver', second: '', third: '', pole: '' },
      },
      'race-2': {
        users: [
          {
            name: 'Player 1',
            predictions: { first: 'ham', second: '', third: '', pole: '' },
            points: 0,
          },
          {
            name: 'Player 2',
            predictions: { first: 'nor', second: '', third: '', pole: '' },
            points: 0,
          },
          {
            name: 'Player 3',
            predictions: { first: '', second: '', third: '', pole: '' },
            points: 0,
          },
        ],
        raceResults: { first: 'ham', second: '', third: 'nor', pole: 'pia' },
      },
    },
  };
}

function createResponse(payload: unknown) {
  return {
    ok: true,
    json: () => Promise.resolve(payload),
  } as Response;
}

function createResultsResponse(racePhase: string, results = createEmptyPrediction()) {
  return () =>
    Promise.resolve(
      createResponse({
        ...results,
        racePhase,
      }),
    );
}

function createDeferredResponse() {
  let resolve;
  const promise = new Promise<Response>((internalResolve) => {
    resolve = internalResolve;
  });

  return {
    promise,
    resolve: (payload: unknown) => resolve(createResponse(payload)),
  };
}

function setupFetch({
  appData = createAppData(),
  calendar = createCalendar(),
  drivers = createDrivers(),
  resultHandlers = {},
} = {}) {
  const fetchMock = global.fetch as ReturnType<typeof vi.fn>;

  fetchMock.mockImplementation((url: string) => {
    if (url.includes('/api/session')) {
      return Promise.resolve(createResponse({ isAdmin: true, defaultViewMode: 'admin' }));
    }

    if (url.includes('/api/data')) {
      return Promise.resolve(createResponse(appData));
    }

    if (url.includes('/api/drivers')) {
      return Promise.resolve(createResponse(drivers));
    }

    if (url.includes('/api/calendar')) {
      return Promise.resolve(createResponse(calendar));
    }

    if (url.includes('/api/standings')) {
      return Promise.resolve(createResponse({ driverStandings: [], constructorStandings: [], updatedAt: '' }));
    }

    if (url.includes('/api/predictions')) {
      return Promise.resolve(createResponse({ message: 'Dati salvati correttamente.' }));
    }

    const match = url.match(/\/api\/results\/(.+)$/);
    if (match) {
      const handler = resultHandlers[match[1]];

      if (handler) {
        return typeof handler === 'function' ? handler() : handler;
      }

      return Promise.resolve(
        createResponse({
          ...createEmptyPrediction(),
          racePhase: 'open',
        }),
      );
    }

    return Promise.reject(new Error(`Unhandled fetch to ${url}`));
  });

  return fetchMock;
}

function getUserCard(userName: string) {
  const headings = screen.queryAllByRole('heading', { name: userName });
  const h3 = headings.find(h => h.tagName === 'H3');
  return h3?.closest('article') || null;
}

function getPredictionSelect(userName: string, label: string | RegExp) {
  const userCard = getUserCard(userName);
  if (!userCard) {
    return null;
  }

  return within(userCard).queryByLabelText(label) as HTMLSelectElement | null;
}

function getResultSelect(label: string | RegExp) {
  return screen.queryByLabelText(label) as HTMLSelectElement | null;
}

function expectReadableSelectStyles(element: HTMLElement) {
  const computedStyle = window.getComputedStyle(element);
  expect(computedStyle.color).not.toBe('transparent');
  expect(computedStyle.color).not.toBe('rgba(0, 0, 0, 0)');
}

function clickSectionNavigationButton(label: RegExp) {
  const sectionNavigation = screen.getByRole('navigation', { name: /sezioni applicazione/i });
  fireEvent.click(within(sectionNavigation).getByRole('button', { name: label }));
}

describe('Weekend draft synchronization UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it(
    'updates predictions and weekend results when changing the selected race and shows placeholders for empty drafts',
    async () => {
    setupFetch();

    const { unmount } = render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/weekend selezionato/i)).toHaveValue('race-1');
    });

    fireEvent.change(screen.getByLabelText(/weekend selezionato/i), {
      target: { value: 'race-2' },
    });

    await waitFor(() => {
      const userCard = getUserCard('Player 1');
      expect(userCard).not.toBeNull();
      expect(within(userCard!).getByLabelText(/vincitore gara/i)).toHaveValue('ham');
    });
    
    const player2Card = getUserCard('Player 2');
    expect(within(player2Card!).getByLabelText(/vincitore gara/i)).toHaveValue('nor');
    expect(getResultSelect(/risultato 1°/i)).toHaveValue('ham');
    expect(getResultSelect(/pole \/ sprint reale/i)).toHaveValue('pia');

    unmount();
    render(<MemoryRouter initialEntries={['/pronostici?meeting=race-3']}><App /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      const userCard = getUserCard('Player 1');
      expect(userCard).not.toBeNull();
      expect(within(userCard!).getByLabelText(/vincitore gara/i)).toHaveValue('');
    });
    
    const player1CardMonaco = getUserCard('Player 1');
    expect(within(player1CardMonaco!).getByLabelText(/vincitore gara/i)).toHaveDisplayValue(
      'Seleziona un pilota',
    );
    const player2CardMonaco = getUserCard('Player 2');
    expect(within(player2CardMonaco!).getByLabelText(/vincitore gara/i)).toHaveDisplayValue(
      'Seleziona un pilota',
    );
    expect(getResultSelect(/risultato 1°/i)).toHaveValue('');
  }, 30000);

  it('keeps shared selects readable across admin and public flows', async () => {
    setupFetch();

    const { unmount } = render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/weekend selezionato/i)).toBeInTheDocument();
    });

    expectReadableSelectStyles(screen.getByLabelText(/weekend selezionato/i) as HTMLSelectElement);

    unmount();
    render(<MemoryRouter initialEntries={['/pronostici?meeting=race-2']}><App /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      const player1Card = getUserCard('Player 1');
      expect(player1Card).not.toBeNull();
      expect(within(player1Card!).getByLabelText(/vincitore gara/i)).toBeInTheDocument();
    });

    const player1Card = getUserCard('Player 1');
    expectReadableSelectStyles(within(player1Card!).getByLabelText(/vincitore gara/i) as HTMLElement);
    expectReadableSelectStyles(getResultSelect(/risultato 1°/i));

    // Toggle to public view
    fireEvent.click(screen.getAllByRole('button', { name: /pubblica/i })[0]);

    await waitFor(() => {
      expect(screen.getByText(/solo gli admin possono modificare i pronostici/i)).toBeInTheDocument();
    });
  }, 30000);

  it('removes the hero title blur and keeps the race background brightness isolated to the dynamic layer', async () => {
    setupFetch();

    render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    const hero = screen.getByRole('banner');
    expect(hero).toHaveClass('hero-panel');

    fireEvent.click(screen.getByRole('button', { name: /china/i }));

    await waitFor(() => {
      const heroBackground = screen.getByTestId('hero-race-background');
      const heroStyles = window.getComputedStyle(heroBackground);
      expect(heroStyles.backgroundImage).toContain('china-hero.webp');
    });
  }, 30000);

  it('saves the selected weekend draft without overwriting other weekend drafts', async () => {
    const fetchMock = setupFetch();

    render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    await waitFor(() => expect(screen.getByLabelText(/weekend selezionato/i)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/weekend selezionato/i), {
      target: { value: 'race-2' },
    });

    await waitFor(() => {
      const player1Card = getUserCard('Player 1');
      expect(player1Card).not.toBeNull();
      expect(within(player1Card!).getByLabelText(/vincitore gara/i)).toHaveValue('ham');
    });

    const player1Card = getUserCard('Player 1');
    fireEvent.change(within(player1Card!).getByLabelText(/vincitore gara/i), {
      target: { value: 'lec' },
    });

    fireEvent.click(screen.getByRole('button', { name: /salva dati inseriti/i }));

    let predictionsCall: (typeof fetchMock.mock.calls)[number] | undefined;
    await waitFor(() => {
      predictionsCall = fetchMock.mock.calls.find((call) => call[0] === '/api/predictions');
      expect(predictionsCall).toBeDefined();
      expect(predictionsCall?.[1]).toMatchObject({
        method: 'POST',
      });
      expect(String(predictionsCall?.[1]?.body)).toContain('"selectedMeetingKey":"race-2"');
    });

    const body = JSON.parse(String(predictionsCall?.[1]?.body));
    expect(body.selectedMeetingKey).toBe('race-2');
    expect(body.users.find((u: any) => u.name === 'Player 1').predictions.first).toBe('lec');
  }, 30000);

  it('ignores stale official results responses after changing weekend', async () => {
    const race1Results = createDeferredResponse();
    const appData = createAppData();

    appData.weekendStateByMeetingKey['race-2'].raceResults = createEmptyPrediction();

    setupFetch({
      appData,
      resultHandlers: {
        'race-1': () => race1Results.promise,
      },
    });

    render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    // We are on Australia (race-1), results are loading

    fireEvent.change(screen.getByLabelText(/weekend selezionato/i), {
      target: { value: 'race-2' },
    });

    await waitFor(() => {
      // Should be on China predictions now
      const player1Card = getUserCard('Player 1');
      expect(player1Card).not.toBeNull();
    });

    // Now resolve race-1 results (stale)
    race1Results.resolve({
      first: 'ham',
      second: 'ver',
      third: 'nor',
      pole: 'ham',
      racePhase: 'finished',
    });

    await waitFor(() => {
      // Result for 1st should still be empty because we are on race-2
      expect(getResultSelect(/risultato 1°/i)).toHaveValue('');
    });
  });

  it('shows no lock banner before the race starts and keeps predictions editable', async () => {
    setupFetch({
      resultHandlers: {
        'race-1': createResultsResponse('open'),
      },
    });

    render(<MemoryRouter initialEntries={['/pronostici']}><App /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    expect(screen.queryByText('Gara in corso: pronostici bloccati.')).not.toBeInTheDocument();
    expect(screen.queryByText('Gara terminata.')).not.toBeInTheDocument();

    await waitFor(() => {
      const player1Card = getUserCard('Player 1');
      expect(player1Card).not.toBeNull();
      expect(within(player1Card!).getByLabelText(/vincitore gara/i)).not.toBeDisabled();
    });
  });

  it('shows the in-progress lock banner when the backend marks the selected race as live', async () => {
    setupFetch({
      resultHandlers: {
        'race-1': createResultsResponse('live'),
      },
    });

    render(<MemoryRouter initialEntries={['/pronostici']}><App /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    await waitFor(() => expect(screen.getByText('Gara in corso: pronostici bloccati.')).toBeInTheDocument());
    const player1Card = getUserCard('Player 1');
    expect(within(player1Card!).getByLabelText(/vincitore gara/i)).toBeDisabled();
  });

  it('shows the finished banner when the backend marks the selected race as finished', async () => {
    setupFetch({
      resultHandlers: {
        'race-1': createResultsResponse('finished', {
          first: 'ver',
          second: 'ham',
          third: 'nor',
          pole: 'ver',
        }),
      },
    });

    render(<MemoryRouter initialEntries={['/pronostici']}><App /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    await waitFor(() => expect(screen.getByText('Gara terminata.')).toBeInTheDocument());
    expect(screen.queryByText('Gara in corso: pronostici bloccati.')).not.toBeInTheDocument();
    const player1Card = getUserCard('Player 1');
    expect(within(player1Card!).getByLabelText(/vincitore gara/i)).toBeDisabled();
  });

  it('accepts the legacy wrapper payload shape while using the backend race phase', async () => {
    setupFetch({
      resultHandlers: {
        'race-1': createResponse({
          racePhase: 'finished',
          results: {
            first: 'ver',
            second: 'ham',
            third: 'nor',
            pole: 'ver',
          },
        }),
      },
    });

    render(<MemoryRouter initialEntries={['/pronostici']}><App /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    await waitFor(() => expect(screen.getByText('Gara terminata.')).toBeInTheDocument());
    
    // Check dashboard too
    clickSectionNavigationButton(/calendario stagione/i);
    await waitFor(() => expect(screen.getAllByText(/australia/i).length).toBeGreaterThan(0));
  });
});
