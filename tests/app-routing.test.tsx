/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';
import { appText } from '../src/uiText';
import React from 'react';
import appConfig from '../config/app-config.json';

function setDesktopMatchMedia() {
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
}

setDesktopMatchMedia();

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

describe('App Routing (MPA-like)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDesktopMatchMedia();
    window.history.replaceState({}, '', '/');
    window.localStorage.clear();
    window.sessionStorage.clear();
    
    // Default mocks for API responses
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/session')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ isAdmin: true, defaultViewMode: 'admin' }),
        });
      }
      if (url.includes('/api/health')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'ok', environment: 'development' }),
        });
      }
      if (url.includes('/api/data')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            users: [],
            history: [],
            gpName: '',
            raceResults: {},
            selectedMeetingKey: ''
          }),
        });
      }
      if (url.includes('/api/drivers')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/calendar')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/standings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ driverStandings: [], constructorStandings: [], updatedAt: '' }),
        });
      }
      return Promise.reject(new Error(`Unhandled fetch to ${url}`));
    });
  });

  const renderWithRouter = (initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <App />
      </MemoryRouter>
    );
  };

  it('renders Dashboard overview on /dashboard', async () => {
    renderWithRouter('/dashboard');
    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /Fanta Formula 1/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: new RegExp(appConfig.uiText.headings.calendar, 'i') })).toBeInTheDocument();
  });

  it('renders Predictions view on /pronostici', async () => {
    renderWithRouter('/pronostici');
    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /Pronostici dei giocatori/i })).toBeInTheDocument();
  });

  it('renders Standings view on /classifiche', async () => {
    renderWithRouter('/classifiche');
    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /Storico gare/i })).toBeInTheDocument();
  });

  it('renders Analysis view on /analisi', async () => {
    renderWithRouter('/analisi');
    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /Stagione attuale/i })).toBeInTheDocument();
  });

  it('renders Admin view on /admin', async () => {
    renderWithRouter('/admin');
    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });
    // Since our mock session is admin, it should show admin content (Results)
    expect(screen.getByRole('heading', { name: new RegExp(appConfig.uiText.headings.results, 'i') })).toBeInTheDocument();
  });

  it('renders the public admin login when a non-admin session opens /admin', async () => {
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/session')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ isAdmin: false, defaultViewMode: 'public' }),
        });
      }
      if (url.includes('/api/data')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ users: [], history: [], gpName: '', raceResults: {}, selectedMeetingKey: '' }),
        });
      }
      if (url.includes('/api/drivers')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.includes('/api/calendar')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.includes('/api/standings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ driverStandings: [], constructorStandings: [], updatedAt: '' }),
        });
      }
      return Promise.reject(new Error(`Unhandled fetch to ${url}`));
    });

    renderWithRouter('/admin');
    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: new RegExp(appConfig.uiText.headings.adminAccess, 'i') })).toBeInTheDocument();
    expect(screen.getByLabelText(appConfig.uiText.buttons.adminView)).toBeInTheDocument();
  });

  it('renders the mobile bottom tabs in the real app flow', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('(max-width: 1199px)'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/session')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ isAdmin: false, defaultViewMode: 'public' }),
        });
      }
      if (url.includes('/api/health')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'ok', environment: 'development' }),
        });
      }
      if (url.includes('/api/data')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            users: [],
            history: [],
            gpName: '',
            raceResults: {},
            selectedMeetingKey: '',
          }),
        });
      }
      if (url.includes('/api/drivers')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.includes('/api/calendar')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.includes('/api/standings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ driverStandings: [], constructorStandings: [], updatedAt: '' }),
        });
      }
      return Promise.reject(new Error(`Unhandled fetch to ${url}`));
    });

    renderWithRouter('/pronostici');
    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    const bottomTabBar = screen.getByRole('navigation', { name: new RegExp(appText.shell.navigation.bottomTabBar, 'i') });
    const predictionsTab = within(bottomTabBar).getByRole('button', {
      name: new RegExp(appText.shell.navigation.items.predictions, 'i'),
    });
    expect(predictionsTab).toHaveAttribute('aria-current', 'page');
    expect(within(bottomTabBar).getByRole('button', {
      name: /calendario stagione/i,
    })).toBeInTheDocument();
  });
});
