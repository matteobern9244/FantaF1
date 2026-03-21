/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import App from '../src/App';
import React from 'react';

// Mock matchMedia for responsive UI components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
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

describe('Minimal Routing Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/session')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ isAdmin: true, defaultViewMode: 'admin' }) });
      }
      if (url.includes('/api/data')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ users: [], history: [], gpName: '', raceResults: {}, selectedMeetingKey: '' }) });
      }
      if (url.includes('/api/drivers')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.includes('/api/calendar')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.includes('/api/standings')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ driverStandings: [], constructorStandings: [], updatedAt: '' }) });
      }
      if (url.includes('/api/results')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ results: {}, racePhase: 'open' }) });
      }
      return Promise.reject(new Error(`Unhandled fetch to ${url}`));
    });
  });

  it('renders dashboard by default', async () => {
    render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument());
    // Should be on dashboard route
    expect(screen.getByRole('heading', { name: /calendario stagione/i })).toBeInTheDocument();
  });

  it('redirects the root route with query parameters to the dashboard content', async () => {
    render(<MemoryRouter initialEntries={['/?meeting=1281&view=admin']}><App /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument());

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /calendario stagione/i })).toBeInTheDocument();
    });
  });

  it('preserves root query parameters while normalizing the pathname to /dashboard', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/api/session')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ isAdmin: true, defaultViewMode: 'admin' }) });
      }
      if (url.includes('/api/data')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              users: [],
              history: [],
              gpName: 'Australian Grand Prix',
              raceResults: {},
              selectedMeetingKey: '1281',
              weekendStateByMeetingKey: {},
            }),
        });
      }
      if (url.includes('/api/drivers')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.includes('/api/calendar')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                meetingKey: '1281',
                meetingName: 'Australia',
                grandPrixTitle: 'Australian Grand Prix',
                roundNumber: 1,
                dateRangeLabel: '',
                detailUrl: '',
                heroImageUrl: '',
                trackOutlineUrl: '',
                isSprintWeekend: false,
                startDate: '2099-03-13',
                endDate: '2099-03-15',
              },
            ]),
        });
      }
      if (url.includes('/api/standings')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ driverStandings: [], constructorStandings: [], updatedAt: '' }) });
      }
      if (url.includes('/api/results')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ results: {}, racePhase: 'open' }) });
      }
      return Promise.reject(new Error(`Unhandled fetch to ${url}`));
    });

    window.history.replaceState({}, '', '/?meeting=1281&view=admin&historySearch=Australia');

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    );

    await waitFor(() => expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /calendario stagione/i })).toBeInTheDocument(),
    );

    expect(window.location.pathname).toBe('/dashboard');
    expect(window.location.search).toContain('meeting=1281');
    expect(window.location.search).toContain('view=admin');
    expect(window.location.search).toContain('historySearch=Australia');
  });

  it('exposes the pronostici navigation entry in the shell', async () => {
    render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument());

    const navigation = screen.getByRole('navigation', { name: /sezioni applicazione/i });
    expect(within(navigation).getByRole('button', { name: /pronostici dei giocatori/i })).toBeInTheDocument();
  });
});
