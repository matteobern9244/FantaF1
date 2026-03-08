/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
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

function expectReadableSelectStyles(select: HTMLSelectElement) {
  expect(select).toBeInTheDocument();
  expect(appCssContent).toContain('--control-surface: #181c27;');
  expect(appCssContent).toContain('--control-option-surface: #181c27;');
  expect(appCssContent).toMatch(/select\s*\{[\s\S]*color:\s*var\(--ink\);/);
  expect(appCssContent).toMatch(/select\s*\{[\s\S]*background-color:\s*var\(--control-surface\);/);
  expect(appCssContent).toMatch(/select\s*\{[\s\S]*color-scheme:\s*dark;/);
  expect(appCssContent).toMatch(/select option,\s*[\r\n\s]*select optgroup\s*\{[\s\S]*color:\s*var\(--control-option-ink\);/);
  expect(appCssContent).toMatch(/select option,\s*[\r\n\s]*select optgroup\s*\{[\s\S]*background-color:\s*var\(--control-option-surface\);/);
}

function createResultsResponse(racePhase, results = createEmptyPrediction()) {
  return createResponse({ ...results, racePhase });
}

describe('Weekend draft synchronization UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    window.history.replaceState({}, '', '/');
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

  it('keeps shared selects readable across admin and public flows', async () => {
    setupFetch();

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    expectReadableSelectStyles(screen.getByLabelText(/weekend selezionato/i) as HTMLSelectElement);
    expectReadableSelectStyles(screen.getByLabelText(/dashboard utente/i) as HTMLSelectElement);
    expectReadableSelectStyles(getPredictionSelect('Player 1', /vincitore gara/i));
    expectReadableSelectStyles(getResultSelect(/risultato 1°/i));
    expectReadableSelectStyles(screen.getByLabelText(/filtra per giocatore/i) as HTMLSelectElement);

    fireEvent.click(screen.getByRole('button', { name: /pubblica/i }));

    await waitFor(() => {
      expect(screen.getByText(/solo gli admin possono modificare i pronostici/i)).toBeInTheDocument();
    });

    expectReadableSelectStyles(screen.getByLabelText(/weekend selezionato/i) as HTMLSelectElement);
    expectReadableSelectStyles(screen.getByLabelText(/dashboard utente/i) as HTMLSelectElement);
    expectReadableSelectStyles(screen.getByLabelText(/filtra per giocatore/i) as HTMLSelectElement);
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

  it('shows no lock banner before the race starts and keeps predictions editable', async () => {
    setupFetch({
      resultHandlers: {
        'race-1': createResultsResponse('open'),
      },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    expect(screen.queryByText('Gara in corso: pronostici bloccati.')).not.toBeInTheDocument();
    expect(screen.queryByText('Gara terminata.')).not.toBeInTheDocument();
    expect(getPredictionSelect('Player 1', /vincitore gara/i)).not.toBeDisabled();
  });

  it('shows the in-progress lock banner when the backend marks the selected race as live', async () => {
    setupFetch({
      resultHandlers: {
        'race-1': createResultsResponse('live'),
      },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Gara in corso: pronostici bloccati.')).toBeInTheDocument();
    });
    expect(getPredictionSelect('Player 1', /vincitore gara/i)).toBeDisabled();
  });

  it('shows the finished banner when the backend marks the selected race as finished', async () => {
    setupFetch({
      resultHandlers: {
        'race-1': createResultsResponse('finished', {
          first: 'ver',
          second: 'ham',
          third: 'nor',
          pole: 'pia',
        }),
      },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Gara terminata.')).toBeInTheDocument();
    });
    expect(screen.queryByText('Gara in corso: pronostici bloccati.')).not.toBeInTheDocument();
    expect(getPredictionSelect('Player 1', /vincitore gara/i)).toBeDisabled();
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
            pole: 'pia',
          },
        }),
      },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Gara terminata.')).toBeInTheDocument();
    });
    expect(getResultSelect(/risultato 1°/i)).toHaveValue('ver');
    expect(getPredictionSelect('Player 1', /vincitore gara/i)).toBeDisabled();
  });
});
