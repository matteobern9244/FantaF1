/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import App from '../src/App';

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
      heroImageUrl: '',
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
      heroImageUrl: '',
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
      heroImageUrl: '',
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
      { name: 'Player 1', points: 10, predictions: { first: 'ver', second: '', third: '', pole: '' } },
      { name: 'Player 2', points: 8, predictions: { first: '', second: '', third: '', pole: '' } },
      { name: 'Player 3', points: 6, predictions: createEmptyPrediction() },
    ],
    history: [],
    gpName: 'Australian Grand Prix 2099',
    raceResults: { first: 'ver', second: '', third: '', pole: '' },
    selectedMeetingKey: 'race-1',
    weekendStateByMeetingKey: {
      'race-1': {
        userPredictions: {
          'Player 1': { first: 'ver', second: '', third: '', pole: '' },
          'Player 2': createEmptyPrediction(),
          'Player 3': createEmptyPrediction(),
        },
        raceResults: { first: 'ver', second: '', third: '', pole: '' },
      },
      'race-2': {
        userPredictions: {
          'Player 1': { first: 'ham', second: '', third: '', pole: '' },
          'Player 2': { first: 'nor', second: '', third: '', pole: '' },
          'Player 3': createEmptyPrediction(),
        },
        raceResults: { first: 'ham', second: '', third: '', pole: 'pia' },
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

    if (url.includes('/api/predictions')) {
      return Promise.resolve(createResponse({ message: 'Dati salvati correttamente.' }));
    }

    const match = url.match(/\/api\/results\/(.+)$/);
    if (match) {
      const handler = resultHandlers[match[1]];

      if (handler) {
        return typeof handler === 'function' ? handler() : handler;
      }

      return Promise.resolve(createResponse(createEmptyPrediction()));
    }

    return Promise.reject(new Error(`Unhandled fetch to ${url}`));
  });

  return fetchMock;
}

function getUserCard(userName: string) {
  return screen.getByRole('heading', { name: userName }).closest('article');
}

function getPredictionSelect(userName: string, label: RegExp) {
  const userCard = getUserCard(userName);
  if (!userCard) {
    throw new Error(`User card not found for ${userName}`);
  }

  return within(userCard).getByLabelText(label) as HTMLSelectElement;
}

function getResultSelect(label: RegExp) {
  return screen.getByLabelText(label) as HTMLSelectElement;
}

describe('Weekend draft synchronization UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('updates predictions and weekend results when changing the selected race and shows placeholders for empty drafts', async () => {
    setupFetch();

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    expect(getPredictionSelect('Player 1', /vincitore gara/i)).toHaveValue('ver');
    expect(getResultSelect(/risultato 1°/i)).toHaveValue('ver');

    fireEvent.click(screen.getByRole('button', { name: /china/i }));

    await waitFor(() => {
      expect(getPredictionSelect('Player 1', /vincitore gara/i)).toHaveValue('ham');
    });
    expect(getPredictionSelect('Player 2', /vincitore gara/i)).toHaveValue('nor');
    expect(getResultSelect(/risultato 1°/i)).toHaveValue('ham');
    expect(getResultSelect(/pole \/ sprint reale/i)).toHaveValue('pia');

    fireEvent.click(screen.getByRole('button', { name: /monaco/i }));

    await waitFor(() => {
      expect(getPredictionSelect('Player 1', /vincitore gara/i)).toHaveValue('');
    });
    expect(getPredictionSelect('Player 1', /vincitore gara/i)).toHaveDisplayValue(
      'Seleziona un pilota',
    );
    expect(getPredictionSelect('Player 2', /vincitore gara/i)).toHaveDisplayValue(
      'Seleziona un pilota',
    );
    expect(getResultSelect(/risultato 1°/i)).toHaveValue('');
  });

  it('saves the selected weekend draft without overwriting other weekend drafts', async () => {
    const fetchMock = setupFetch();

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    fireEvent.change(getPredictionSelect('Player 1', /vincitore gara/i), {
      target: { value: 'lec' },
    });

    fireEvent.click(screen.getByRole('button', { name: /salva dati inseriti/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/predictions',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    const saveCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/api/predictions'));
    const payload = JSON.parse(String(saveCall?.[1]?.body ?? '{}'));

    expect(payload.users[0].predictions.first).toBe('lec');
    expect(payload.weekendStateByMeetingKey['race-1'].userPredictions['Player 1'].first).toBe(
      'lec',
    );
    expect(payload.weekendStateByMeetingKey['race-2'].userPredictions['Player 1'].first).toBe(
      'ham',
    );

    fireEvent.click(screen.getByRole('button', { name: /china/i }));

    await waitFor(() => {
      expect(getPredictionSelect('Player 1', /vincitore gara/i)).toHaveValue('ham');
    });

    fireEvent.click(screen.getByRole('button', { name: /australia/i }));

    await waitFor(() => {
      expect(getPredictionSelect('Player 1', /vincitore gara/i)).toHaveValue('lec');
    });
  });

  it('ignores stale official results responses after changing weekend', async () => {
    const race1Results = createDeferredResponse();
    const race2Results = createDeferredResponse();
    const appData = createAppData();

    appData.weekendStateByMeetingKey['race-2'].raceResults = createEmptyPrediction();

    setupFetch({
      appData,
      resultHandlers: {
        'race-1': () => race1Results.promise,
        'race-2': () => race2Results.promise,
      },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /china/i }));

    await waitFor(() => {
      expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls).toEqual(
        expect.arrayContaining([[expect.stringContaining('/api/results/race-2')]]),
      );
    });

    race2Results.resolve({ first: '', second: '', third: '', pole: 'nor' });

    await waitFor(() => {
      expect(getResultSelect(/pole \/ sprint reale/i)).toHaveValue('nor');
    });

    race1Results.resolve({ first: '', second: '', third: '', pole: 'pia' });

    await waitFor(() => {
      expect(getResultSelect(/pole \/ sprint reale/i)).toHaveValue('nor');
    });
    expect(getPredictionSelect('Player 1', /vincitore gara/i)).toHaveValue('ham');
  });
});
