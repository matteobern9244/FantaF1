/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
        gpName: 'Australian Grand Prix 2099',
        meetingKey: 'race-1',
        date: '01/03/2099',
        results: { first: 'ver', second: 'lec', third: 'nor', pole: 'pia' },
        userPredictions: {
          Marco: {
            prediction: { first: 'ver', second: 'lec', third: 'ham', pole: 'pia' },
            pointsEarned: 9,
          },
          Luca: {
            prediction: { first: 'ham', second: 'ver', third: 'nor', pole: 'nor' },
            pointsEarned: 2,
          },
          Sara: {
            prediction: { first: 'ver', second: 'lec', third: 'nor', pole: 'pia' },
            pointsEarned: 11,
          },
        },
      },
      {
        gpName: 'Chinese Grand Prix 2099',
        meetingKey: 'race-2',
        date: '15/03/2099',
        results: { first: 'ham', second: 'nor', third: 'lec', pole: 'ver' },
        userPredictions: {
          Marco: {
            prediction: { first: 'ham', second: 'nor', third: 'lec', pole: 'ver' },
            pointsEarned: 11,
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
    gpName: 'Australian Grand Prix 2099',
    raceResults: createEmptyPrediction(),
    selectedMeetingKey: 'race-1',
    weekendStateByMeetingKey: {
      'race-1': {
        userPredictions: {
          Marco: { first: 'ver', second: 'lec', third: 'nor', pole: 'pia' },
          Luca: { first: 'ham', second: 'ver', third: 'nor', pole: 'lec' },
          Sara: { first: 'ver', second: 'lec', third: 'ham', pole: 'pia' },
        },
        raceResults: createEmptyPrediction(),
        weekendBoostByUser: {
          Marco: 'none',
          Luca: 'none',
          Sara: 'none',
        },
        weekendBoostLockedByUser: {
          Marco: false,
          Luca: false,
          Sara: false,
        },
      },
    },
  };
}

function createDrivers() {
  return [
    { id: 'ver', name: 'Max Verstappen', team: 'Red Bull', color: '#0000ff' },
    { id: 'lec', name: 'Charles Leclerc', team: 'Ferrari', color: '#ff0000' },
    { id: 'nor', name: 'Lando Norris', team: 'McLaren', color: '#ff8000' },
    { id: 'pia', name: 'Oscar Piastri', team: 'McLaren', color: '#ff8000' },
    { id: 'ham', name: 'Lewis Hamilton', team: 'Ferrari', color: '#ff0000' },
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

  fetchMock.mockImplementation((url: string, options?: RequestInit) => {
    if (url.includes('/api/session')) {
      return Promise.resolve(createResponse({ isAdmin: true, defaultViewMode: 'admin' }));
    }

    if (url.includes('/api/data') && (!options || options.method !== 'POST')) {
      return Promise.resolve(createResponse(appData));
    }

    if (url.includes('/api/drivers')) {
      return Promise.resolve(createResponse(createDrivers()));
    }

    if (url.includes('/api/calendar')) {
      return Promise.resolve(createResponse(createCalendar()));
    }

    if (url.includes('/api/predictions')) {
      return Promise.resolve(createResponse({ message: 'Dati salvati correttamente.' }));
    }

    if (url.includes('/api/results/race-1')) {
      return Promise.resolve(createResponse(createEmptyPrediction()));
    }

    return Promise.reject(new Error(`Unhandled fetch to ${url}`));
  });

  return fetchMock;
}

describe('Mockup roadmap UI features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('switches between public and admin modes and keeps editing controls admin-only', async () => {
    setupFetch();

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

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
    expect(screen.getByText(/gestione admin in sola lettura per i non admin/i)).toBeInTheDocument();
  });

  it('renders KPI and deep-dive analytics for the selected user', async () => {
    setupFetch();

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: /user kpi dashboard/i })).toBeInTheDocument();
    const kpiPanel = screen.getByTestId('user-kpi-dashboard');
    expect(within(kpiPanel).getByText('20')).toBeInTheDocument();
    expect(within(kpiPanel).getByText('1.5')).toBeInTheDocument();
    expect(within(kpiPanel).getByText('100%')).toBeInTheDocument();
    expect(within(kpiPanel).getByText('10')).toBeInTheDocument();

    const analyticsPanel = screen.getByRole('heading', { name: /deep-dive kpi dashboard/i }).closest('section');
    expect(analyticsPanel).not.toBeNull();
    expect(within(analyticsPanel as HTMLElement).getByText(/hamilton lewis/i)).toBeInTheDocument();
    expect(within(analyticsPanel as HTMLElement).getAllByText(/chinese grand prix 2099/i).length).toBeGreaterThan(0);
    expect(within(analyticsPanel as HTMLElement).getAllByText(/australian grand prix 2099/i).length).toBeGreaterThan(0);
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
});
