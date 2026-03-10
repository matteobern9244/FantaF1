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
      highlightsVideoUrl: '',
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
      isSprintWeekend: false,
      startDate: '2099-03-20',
      endDate: '2099-03-22',
      raceStartTime: '2099-03-22T14:00:00Z',
      sessions: [],
      highlightsVideoUrl: '',
    },
  ];
}

function createDrivers() {
  return [
    { id: 'ver', name: 'Max Verstappen', team: 'Red Bull Racing', color: '#123456' },
    { id: 'ham', name: 'Lewis Hamilton', team: 'Ferrari', color: '#654321' },
    { id: 'lec', name: 'Charles Leclerc', team: 'Ferrari', color: '#654321' },
    { id: 'pia', name: 'Oscar Piastri', team: 'McLaren', color: '#ff8000' },
    { id: 'nor', name: 'Lando Norris', team: 'McLaren', color: '#ff8000' },
  ];
}

function createAppData() {
  return {
    users: [
      {
        name: 'Matteo',
        points: 10,
        predictions: { first: 'ver', second: 'nor', third: 'lec', pole: 'pia' },
      },
      {
        name: 'Fabio',
        points: 12,
        predictions: { first: 'ham', second: 'ver', third: 'lec', pole: 'nor' },
      },
      {
        name: 'Adriano',
        points: 6,
        predictions: { first: 'ver', second: 'ham', third: 'lec', pole: 'pia' },
      },
    ],
    history: [],
    gpName: 'Australian Grand Prix 2099',
    raceResults: createEmptyPrediction(),
    selectedMeetingKey: 'race-1',
    weekendStateByMeetingKey: {
      'race-1': {
        userPredictions: {
          Matteo: { first: 'ver', second: 'nor', third: 'lec', pole: 'pia' },
          Fabio: { first: 'ham', second: 'ver', third: 'lec', pole: 'nor' },
          Adriano: { first: 'ver', second: 'ham', third: 'lec', pole: 'pia' },
        },
        raceResults: createEmptyPrediction(),
      },
      'race-2': {
        userPredictions: {
          Matteo: { first: 'ver', second: 'nor', third: 'lec', pole: 'pia' },
          Fabio: { first: 'ham', second: 'ver', third: 'lec', pole: 'nor' },
          Adriano: { first: 'ver', second: 'ham', third: 'lec', pole: 'pia' },
        },
        raceResults: createEmptyPrediction(),
      },
    },
  };
}

function mockAppFetches({
  appData = createAppData(),
  calendar = createCalendar(),
  drivers = createDrivers(),
  resultsByMeetingKey = {},
}: {
  appData?: ReturnType<typeof createAppData>;
  calendar?: ReturnType<typeof createCalendar>;
  drivers?: ReturnType<typeof createDrivers>;
  resultsByMeetingKey?: Record<
    string,
    {
      racePhase?: 'open' | 'live' | 'finished';
      results: ReturnType<typeof createEmptyPrediction>;
      highlightsVideoUrl?: string | null;
    }
  >;
}) {
  const fetchMock = global.fetch as ReturnType<typeof vi.fn>;

  fetchMock.mockImplementation((url: string) => {
    if (url.includes('/api/session')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ isAdmin: true, defaultViewMode: 'admin' }),
      } as Response);
    }
    if (url.includes('/api/data')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(appData),
      } as Response);
    }

    if (url.includes('/api/drivers')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(drivers),
      } as Response);
    }

    if (url.includes('/api/calendar')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(calendar),
      } as Response);
    }

    const resultsEntry = Object.entries(resultsByMeetingKey).find(([meetingKey]) =>
      url.includes(`/api/results/${meetingKey}`),
    );

    if (resultsEntry) {
      const responsePayload = {
        ...resultsEntry[1].results,
        racePhase: resultsEntry[1].racePhase ?? 'open',
      } as {
        racePhase: 'open' | 'live' | 'finished';
        results?: ReturnType<typeof createEmptyPrediction>;
        highlightsVideoUrl?: string | null;
      };

      if (resultsEntry[1].highlightsVideoUrl !== undefined) {
        responsePayload.highlightsVideoUrl = resultsEntry[1].highlightsVideoUrl;
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(responsePayload),
      } as Response);
    }

    return Promise.reject(new Error(`Unhandled fetch to ${url}`));
  });

  return fetchMock;
}

function getUserCard(name: string) {
  return screen.getByRole('heading', { name }).closest('article');
}

function getProjectionValue(name: string) {
  return getUserCard(name)?.querySelector('.points-preview-value')?.textContent?.trim();
}

function getLiveRows() {
  return Array.from(document.querySelectorAll('.live-row')).map((row) => ({
    name: row.querySelector('span')?.textContent?.trim(),
    score: row.querySelector('.live-score-value')?.textContent?.trim(),
  }));
}

function getSelectedRaceHeroCard() {
  return document.querySelector('.driver-spotlight')?.closest('section') ?? null;
}

function queryOpenPredictionsStrip() {
  return screen.queryByText(/pronostici ancora aperti/i);
}

describe('Live projection UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  it('shows explicit waiting messages when the selected weekend has no official results yet', async () => {
    mockAppFetches({
      resultsByMeetingKey: {
        'race-1': { racePhase: 'open', results: createEmptyPrediction() },
      },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/nessun risultato ufficiale disponibile ancora/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        /la proiezione si aggiornera' quando formula1\.com pubblichera' pole\/sprint\/gara ufficiali\./i,
      ),
    ).toBeInTheDocument();
    expect(getProjectionValue('Matteo')).toBe('0');
    expect(getProjectionValue('Fabio')).toBe('0');
    expect(getProjectionValue('Adriano')).toBe('0');
    expect(queryOpenPredictionsStrip()).toBeInTheDocument();
  });

  it('shows the highlights CTA in the selected race recap when the finished race has a Sky Sport Italia F1 video', async () => {
    mockAppFetches({
      resultsByMeetingKey: {
        'race-1': {
          racePhase: 'finished',
          results: { first: 'nor', second: 'ver', third: 'lec', pole: 'pia' },
          highlightsVideoUrl: 'https://www.youtube.com/watch?v=skyf1-finished',
        },
      },
    });

    render(<App />);

    const highlightsButton = await screen.findByRole(
      'button',
      { name: /guarda highlights/i },
      { timeout: 5000 },
    );

    const selectedRaceHeroCard = getSelectedRaceHeroCard();
    expect(selectedRaceHeroCard).not.toBeNull();
    expect(
      within(selectedRaceHeroCard as HTMLElement).getByRole('button', { name: /guarda highlights/i }),
    ).toBeEnabled();
    expect(highlightsButton).toBeEnabled();
  });

  it('shows the official grand prix title in the selected race recap when the race is finished', async () => {
    mockAppFetches({
      resultsByMeetingKey: {
        'race-1': {
          racePhase: 'finished',
          results: { first: 'nor', second: 'ver', third: 'lec', pole: 'pia' },
          highlightsVideoUrl: 'https://www.youtube.com/watch?v=skyf1-finished',
        },
      },
    });

    render(<App />);

    await screen.findByRole('button', { name: /guarda highlights/i }, { timeout: 5000 });

    const selectedRaceHeroCard = getSelectedRaceHeroCard();
    expect(selectedRaceHeroCard).not.toBeNull();
    expect(
      within(selectedRaceHeroCard as HTMLElement).getByText('Australian Grand Prix 2099'),
    ).toBeInTheDocument();
    expect(
      within(selectedRaceHeroCard as HTMLElement).queryByText('Australia'),
    ).not.toBeInTheDocument();
  });

  it('opens the YouTube highlights outside the app when the CTA is clicked', async () => {
    mockAppFetches({
      resultsByMeetingKey: {
        'race-1': {
          racePhase: 'finished',
          results: { first: 'nor', second: 'ver', third: 'lec', pole: 'pia' },
          highlightsVideoUrl: 'https://www.youtube.com/watch?v=skyf1-click',
        },
      },
    });

    render(<App />);

    const highlightsButton = await screen.findByRole('button', { name: /guarda highlights/i });
    fireEvent.click(highlightsButton);

    expect(window.open).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=skyf1-click',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('shows a disabled highlights CTA when the finished race video is not available yet', async () => {
    mockAppFetches({
      resultsByMeetingKey: {
        'race-1': {
          racePhase: 'finished',
          results: { first: 'nor', second: 'ver', third: 'lec', pole: 'pia' },
          highlightsVideoUrl: '',
        },
      },
    });

    render(<App />);

    const disabledButton = await screen.findByRole('button', {
      name: /video highlights ancora non disponibile/i,
    }, { timeout: 5000 });

    expect(disabledButton).toBeDisabled();
  });

  it('falls back to the unavailable highlights CTA when the results payload omits highlightsVideoUrl', async () => {
    mockAppFetches({
      resultsByMeetingKey: {
        'race-1': {
          racePhase: 'finished',
          results: { first: 'nor', second: 'ver', third: 'lec', pole: 'pia' },
        },
      },
    });

    render(<App />);

    const disabledButton = await screen.findByRole('button', {
      name: /video highlights ancora non disponibile/i,
    }, { timeout: 5000 });

    expect(disabledButton).toBeDisabled();
  });

  it('falls back to the unavailable highlights CTA when the results payload has a null highlightsVideoUrl', async () => {
    mockAppFetches({
      resultsByMeetingKey: {
        'race-1': {
          racePhase: 'finished',
          results: { first: 'nor', second: 'ver', third: 'lec', pole: 'pia' },
          highlightsVideoUrl: null,
        },
      },
    });

    render(<App />);

    const disabledButton = await screen.findByRole('button', {
      name: /video highlights ancora non disponibile/i,
    }, { timeout: 5000 });

    expect(disabledButton).toBeDisabled();
  });

  it('does not show the highlights CTA before the selected race is finished', async () => {
    mockAppFetches({
      resultsByMeetingKey: {
        'race-1': {
          racePhase: 'live',
          results: { first: '', second: '', third: '', pole: 'pia' },
          highlightsVideoUrl: 'https://www.youtube.com/watch?v=should-not-render',
        },
      },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /highlights/i })).not.toBeInTheDocument();
    });
  });

  it('shows partial-result messages and awards only the published official fields', async () => {
    mockAppFetches({
      resultsByMeetingKey: {
        'race-1': { racePhase: 'open', results: { first: '', second: '', third: '', pole: 'pia' } },
      },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(
        screen.getByText(/risultati ufficiali parziali per il weekend selezionato/i),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/la proiezione e' parziale e usa solo i risultati ufficiali gia' pubblicati\./i),
    ).toBeInTheDocument();
    expect(getProjectionValue('Matteo')).toBe('1');
    expect(getProjectionValue('Fabio')).toBe('0');
    expect(getProjectionValue('Adriano')).toBe('1');
    expect(getLiveRows()).toEqual([
      { name: 'Fabio', score: '12' },
      { name: 'Matteo', score: '11' },
      { name: 'Adriano', score: '7' },
    ]);
    const selectedRaceHeroCard = getSelectedRaceHeroCard();
    expect(selectedRaceHeroCard).not.toBeNull();
    expect(within(selectedRaceHeroCard as HTMLElement).getByText('Oscar Piastri')).toBeInTheDocument();
    expect(
      within(selectedRaceHeroCard as HTMLElement).queryByText('Piastri Oscar'),
    ).not.toBeInTheDocument();
    expect(queryOpenPredictionsStrip()).not.toBeInTheDocument();
  });

  it('fetches the selected weekend results before race finish and updates projections plus live standings', async () => {
    const fetchMock = mockAppFetches({
      resultsByMeetingKey: {
        'race-1': {
          racePhase: 'finished',
          results: { first: 'ver', second: 'ham', third: 'lec', pole: 'pia' },
        },
      },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/results/race-1');
    });

    await waitFor(() => {
      expect(getProjectionValue('Matteo')).toBe('8');
      expect(getProjectionValue('Fabio')).toBe('2');
      expect(getProjectionValue('Adriano')).toBe('11');
    });

    expect(getLiveRows()).toEqual([
      { name: 'Matteo', score: '18' },
      { name: 'Adriano', score: '17' },
      { name: 'Fabio', score: '14' },
    ]);
    expect(
      screen.queryByText(/nessun risultato ufficiale disponibile ancora/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/risultati ufficiali parziali per il weekend selezionato/i),
    ).not.toBeInTheDocument();

    expect(fetchMock.mock.calls.every(([, options]) => !options || options.method !== 'POST')).toBe(
      true,
    );
  });

  it('recalculates availability messages and live standings when the selected weekend changes', async () => {
    const fetchMock = mockAppFetches({
      resultsByMeetingKey: {
        'race-1': { racePhase: 'open', results: createEmptyPrediction() },
        'race-2': { racePhase: 'open', results: { first: '', second: '', third: '', pole: 'nor' } },
      },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/nessun risultato ufficiale disponibile ancora/i)).toBeInTheDocument();
    });
    expect(queryOpenPredictionsStrip()).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/weekend selezionato/i), {
      target: { value: 'race-2' },
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/results/race-2');
    });

    await waitFor(() => {
      expect(
        screen.getByText(/risultati ufficiali parziali per il weekend selezionato/i),
      ).toBeInTheDocument();
    });

    expect(screen.queryByText(/nessun risultato ufficiale disponibile ancora/i)).not.toBeInTheDocument();
    expect(getProjectionValue('Matteo')).toBe('0');
    expect(getProjectionValue('Fabio')).toBe('1');
    expect(getProjectionValue('Adriano')).toBe('0');
    expect(getLiveRows()).toEqual([
      { name: 'Fabio', score: '13' },
      { name: 'Matteo', score: '10' },
      { name: 'Adriano', score: '6' },
    ]);
    expect(queryOpenPredictionsStrip()).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/weekend selezionato/i), {
      target: { value: 'race-1' },
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/results/race-1');
    });

    await waitFor(() => {
      expect(screen.getByText(/nessun risultato ufficiale disponibile ancora/i)).toBeInTheDocument();
    });
    expect(queryOpenPredictionsStrip()).toBeInTheDocument();
  });

  it('renders enriched weekend comparison insights for the selected GP', async () => {
    mockAppFetches({
      resultsByMeetingKey: {
        'race-1': { racePhase: 'live', results: { first: 'ver', second: '', third: '', pole: 'pia' } },
      },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: /weekend pulse/i })).toBeInTheDocument();
    expect(screen.getAllByText(/match confermati/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/risultati ufficiali parziali/i)).toBeInTheDocument();
    expect(screen.getAllByText(/verstappen max/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/piastri oscar/i).length).toBeGreaterThan(0);
  });

  it('normalizes sparse flattened results payloads by defaulting missing fields to empty strings', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;

    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/api/session')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ isAdmin: true, defaultViewMode: 'admin' }),
        } as Response);
      }
      if (url.includes('/api/data')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(createAppData()),
        } as Response);
      }
      if (url.includes('/api/drivers')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(createDrivers()),
        } as Response);
      }
      if (url.includes('/api/calendar')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(createCalendar()),
        } as Response);
      }
      if (url.includes('/api/results/race-1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ racePhase: 'open' }),
        } as Response);
      }

      return Promise.reject(new Error(`Unhandled fetch to ${url}`));
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/risultato 1°/i)).toHaveValue('');
    });
    expect(screen.queryByText('Gara in corso: pronostici bloccati.')).not.toBeInTheDocument();
  });

  it('keeps the strip hidden for the selected weekend when a stale response from another weekend resolves later', async () => {
    let resolveRace1: ((value: Response) => void) | null = null;
    const race1Promise = new Promise<Response>((resolve) => {
      resolveRace1 = resolve;
    });
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;

    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/api/session')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ isAdmin: true, defaultViewMode: 'admin' }),
        } as Response);
      }
      if (url.includes('/api/data')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(createAppData()),
        } as Response);
      }
      if (url.includes('/api/drivers')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(createDrivers()),
        } as Response);
      }
      if (url.includes('/api/calendar')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(createCalendar()),
        } as Response);
      }
      if (url.includes('/api/results/race-1')) {
        return race1Promise;
      }
      if (url.includes('/api/results/race-2')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            first: '',
            second: '',
            third: '',
            pole: 'nor',
            racePhase: 'open',
          }),
        } as Response);
      }

      return Promise.reject(new Error(`Unhandled fetch to ${url}`));
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/weekend selezionato/i), {
      target: { value: 'race-2' },
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/results/race-2');
    });

    await waitFor(() => {
      expect(screen.getByText(/risultati ufficiali parziali per il weekend selezionato/i)).toBeInTheDocument();
    });
    expect(queryOpenPredictionsStrip()).not.toBeInTheDocument();

    resolveRace1?.({
      ok: true,
      json: () => Promise.resolve({ first: '', second: '', third: '', pole: '', racePhase: 'open' }),
    } as Response);

    await waitFor(() => {
      expect(screen.getByText(/risultati ufficiali parziali per il weekend selezionato/i)).toBeInTheDocument();
    });
    expect(queryOpenPredictionsStrip()).not.toBeInTheDocument();
  });
});
