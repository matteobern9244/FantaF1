/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';

function createEmptyPrediction() {
  return {
    first: '',
    second: '',
    third: '',
    pole: '',
  };
}

function createResponse(payload: unknown) {
  return {
    ok: true,
    json: () => Promise.resolve(payload),
  } as Response;
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
  ];
}

function createWeekendState({
  first,
  second,
  third,
  pole,
  player1First,
  player2First,
  player3First,
}: {
  first: string;
  second: string;
  third: string;
  pole: string;
  player1First: string;
  player2First: string;
  player3First: string;
}) {
  return {
    userPredictions: {
      'Player 1': { first: player1First, second: '', third: '', pole: '' },
      'Player 2': { first: player2First, second: '', third: '', pole: '' },
      'Player 3': { first: player3First, second: '', third: '', pole: '' },
    },
    raceResults: {
      first,
      second,
      third,
      pole,
    },
  };
}

function createBaseAppData() {
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
    gpName: 'Australian Grand Prix 2099',
    raceResults: {
      first: 'ver',
      second: '',
      third: '',
      pole: '',
    },
    selectedMeetingKey: 'race-1',
    weekendStateByMeetingKey: {
      'race-1': createWeekendState({
        first: 'ver',
        second: '',
        third: '',
        pole: '',
        player1First: 'ver',
        player2First: '',
        player3First: '',
      }),
      'race-2': createWeekendState({
        first: 'ham',
        second: '',
        third: 'nor',
        pole: 'pia',
        player1First: 'ham',
        player2First: 'nor',
        player3First: '',
      }),
    },
  };
}

function setupFetch({
  appData = createBaseAppData(),
  calendar = createCalendar(),
  drivers = createDrivers(),
  resultHandlers = {},
}: {
  appData?: ReturnType<typeof createBaseAppData>;
  calendar?: ReturnType<typeof createCalendar>;
  drivers?: ReturnType<typeof createDrivers>;
  resultHandlers?: Record<string, () => Promise<Response>>;
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
      return Promise.resolve(
        createResponse({ driverStandings: [], constructorStandings: [], updatedAt: '' }),
      );
    }

    if (url.includes('/api/predictions')) {
      return Promise.resolve(createResponse({ message: 'Dati salvati correttamente.' }));
    }

    const match = url.match(/\/api\/results\/(.+)$/);
    if (match) {
      const handler = resultHandlers[match[1]];
      if (handler) {
        return handler();
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

function getPredictionsSection() {
  return document.getElementById('predictions-section');
}

function getUserCard(userName: string) {
  const predictionsSection = getPredictionsSection();
  if (!predictionsSection) {
    return null;
  }

  return within(predictionsSection)
    .queryAllByRole('heading', { name: userName })
    .find((heading) => heading.tagName === 'H3')
    ?.closest('article');
}

function getUserWinnerSelect(userName: string) {
  const userCard = getUserCard(userName);
  expect(userCard).not.toBeNull();

  return within(userCard as HTMLElement).getByLabelText(/vincitore gara/i) as HTMLSelectElement;
}

function getResultSelect(label: string | RegExp) {
  const predictionsSection = getPredictionsSection();
  expect(predictionsSection).not.toBeNull();

  return within(predictionsSection as HTMLElement).getByLabelText(label) as HTMLSelectElement;
}

function renderApp(initialEntry: string) {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <App />
    </MemoryRouter>,
  );
}

async function waitForAppToSettle() {
  await waitFor(() => {
    expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
  });
}

describe('Weekend draft synchronization UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('hydrates the selected weekend predictions and official results for race-2', async () => {
    const appData = createBaseAppData();
    appData.selectedMeetingKey = 'race-2';
    appData.gpName = 'Chinese Grand Prix 2099';
    appData.users = [
      { name: 'Player 1', predictions: { first: 'ham', second: '', third: '', pole: '' }, points: 0 },
      { name: 'Player 2', predictions: { first: 'nor', second: '', third: '', pole: '' }, points: 0 },
      { name: 'Player 3', predictions: { first: '', second: '', third: '', pole: '' }, points: 0 },
    ];
    appData.raceResults = {
      first: 'ham',
      second: '',
      third: 'nor',
      pole: 'pia',
    };

    const fetchMock = setupFetch({ appData });

    renderApp('/pronostici?meeting=race-2');

    await waitForAppToSettle();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/results/race-2');
      expect(getUserWinnerSelect('Player 1')).toHaveValue('ham');
      expect(getUserWinnerSelect('Player 2')).toHaveValue('nor');
      expect(getResultSelect(/risultato 1°/i)).toHaveValue('ham');
      expect(getResultSelect(/pole \/ sprint reale/i)).toHaveValue('pia');
    });
  });

  it('persists the active weekend draft without overwriting the other weekend state', async () => {
    const appData = createBaseAppData();
    appData.selectedMeetingKey = 'race-2';
    appData.gpName = 'Chinese Grand Prix 2099';
    appData.users = [
      { name: 'Player 1', predictions: { first: 'ham', second: '', third: '', pole: '' }, points: 0 },
      { name: 'Player 2', predictions: { first: 'nor', second: '', third: '', pole: '' }, points: 0 },
      { name: 'Player 3', predictions: { first: '', second: '', third: '', pole: '' }, points: 0 },
    ];
    appData.raceResults = {
      first: 'ham',
      second: '',
      third: 'nor',
      pole: 'pia',
    };

    const fetchMock = setupFetch({ appData });

    renderApp('/pronostici?meeting=race-2');

    await waitForAppToSettle();

    fireEvent.change(getUserWinnerSelect('Player 1'), {
      target: { value: 'lec' },
    });

    expect(getUserWinnerSelect('Player 1')).toHaveValue('lec');

    fireEvent.click(screen.getByRole('button', { name: /salva dati inseriti/i }));

    let saveCall: (typeof fetchMock.mock.calls)[number] | undefined;
    await waitFor(() => {
      saveCall = fetchMock.mock.calls.find((call) => call[0] === '/api/predictions');
      expect(saveCall).toBeDefined();
      expect(saveCall?.[1]).toMatchObject({
        method: 'POST',
      });
    });

    const body = JSON.parse(String(saveCall?.[1]?.body));
    expect(body.weekendStateByMeetingKey['race-2'].userPredictions['Player 1'].first).toBe('lec');
    expect(body.weekendStateByMeetingKey['race-1'].userPredictions['Player 1'].first).toBe('ver');
  });

});
