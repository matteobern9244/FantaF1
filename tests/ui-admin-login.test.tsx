/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import App from '../src/App';
import { appText } from '../src/uiText';

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

function createJsonResponse(body: unknown, ok = true) {
  return {
    ok,
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null),
    },
    json: () => Promise.resolve(body),
  } as Response;
}

describe('Admin login UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the invalid password message instead of the generic save error on admin auth failure', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;

    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/api/admin/session')) {
        return Promise.resolve({
          ...createJsonResponse({ error: 'Invalid password', code: 'admin_auth_invalid' }, false),
          status: 401,
        } as Response);
      }

      if (url.includes('/api/session')) {
        return Promise.resolve(createJsonResponse({ isAdmin: false, defaultViewMode: 'public' }));
      }

      if (url.includes('/api/health')) {
        return Promise.resolve(createJsonResponse({ status: 'ok', environment: 'staging' }));
      }

      if (url.includes('/api/data')) {
        return Promise.resolve(
          createJsonResponse({
            users: [],
            history: [],
            gpName: '',
            raceResults: {},
            selectedMeetingKey: '',
            weekendStateByMeetingKey: {},
          }),
        );
      }

      if (url.includes('/api/drivers')) {
        return Promise.resolve(createJsonResponse([]));
      }

      if (url.includes('/api/calendar')) {
        return Promise.resolve(createJsonResponse([]));
      }

      if (url.includes('/api/standings')) {
        return Promise.resolve(
          createJsonResponse({ driverStandings: [], constructorStandings: [], updatedAt: '' }),
        );
      }

      return Promise.reject(new Error(`Unhandled fetch to ${url}`));
    });

    render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /admin/i })[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Modalita' admin"), {
      target: { value: 'wrong-password' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /admin/i })[1]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/session',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: 'wrong-password' }),
        }),
      );
    });

    expect(await screen.findByText('Invalid password')).toBeInTheDocument();
    expect(screen.queryByText('Impossibile salvare i dati.')).not.toBeInTheDocument();
  }, 30000);

  it('focuses the admin password field and submits with Enter from the modal', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;

    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/api/admin/session')) {
        return Promise.resolve(createJsonResponse({ isAdmin: true, defaultViewMode: 'admin' }));
      }

      if (url.includes('/api/session')) {
        return Promise.resolve(createJsonResponse({ isAdmin: false, defaultViewMode: 'public' }));
      }

      if (url.includes('/api/health')) {
        return Promise.resolve(createJsonResponse({ status: 'ok', environment: 'development' }));
      }

      if (url.includes('/api/data')) {
        return Promise.resolve(
          createJsonResponse({
            users: [],
            history: [],
            gpName: '',
            raceResults: {},
            selectedMeetingKey: '',
            weekendStateByMeetingKey: {},
          }),
        );
      }

      if (url.includes('/api/drivers')) {
        return Promise.resolve(createJsonResponse([]));
      }

      if (url.includes('/api/calendar')) {
        return Promise.resolve(createJsonResponse([]));
      }

      if (url.includes('/api/standings')) {
        return Promise.resolve(
          createJsonResponse({ driverStandings: [], constructorStandings: [], updatedAt: '' }),
        );
      }

      return Promise.reject(new Error(`Unhandled fetch to ${url}`));
    });

    render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /admin/i })[0]);

    const passwordInput = await screen.findByLabelText("Modalita' admin");
    expect(passwordInput).toHaveFocus();

    fireEvent.change(passwordInput, {
      target: { value: 'correct-password' },
    });
    fireEvent.keyDown(passwordInput, { key: 'Enter' });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/session',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ password: 'correct-password' }),
        }),
      );
    });
  }, 30000);

  it('navigates to pronostici and closes the modal after a successful admin login', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;

    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/api/admin/session')) {
        return Promise.resolve(createJsonResponse({ isAdmin: true, defaultViewMode: 'admin' }));
      }

      if (url.includes('/api/session')) {
        return Promise.resolve(createJsonResponse({ isAdmin: false, defaultViewMode: 'public' }));
      }

      if (url.includes('/api/health')) {
        return Promise.resolve(createJsonResponse({ status: 'ok', environment: 'development' }));
      }

      if (url.includes('/api/data')) {
        return Promise.resolve(
          createJsonResponse({
            users: [],
            history: [],
            gpName: '',
            raceResults: {},
            selectedMeetingKey: '',
            weekendStateByMeetingKey: {},
          }),
        );
      }

      if (url.includes('/api/drivers')) {
        return Promise.resolve(createJsonResponse([]));
      }

      if (url.includes('/api/calendar')) {
        return Promise.resolve(createJsonResponse([]));
      }

      if (url.includes('/api/standings')) {
        return Promise.resolve(
          createJsonResponse({ driverStandings: [], constructorStandings: [], updatedAt: '' }),
        );
      }

      return Promise.reject(new Error(`Unhandled fetch to ${url}`));
    });

    window.history.replaceState({}, '', '/dashboard?view=public#calendar-section');

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /admin/i })[0]);

    const passwordInput = await screen.findByLabelText("Modalita' admin");
    fireEvent.change(passwordInput, {
      target: { value: 'correct-password' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /admin/i })[1]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/session',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ password: 'correct-password' }),
        }),
      );
    });

    await waitFor(() => {
      expect(window.location.pathname).toBe('/pronostici');
      expect(window.location.hash).toBe('#predictions-section');
      expect(window.location.search).toContain('view=admin');
    });

    expect(await screen.findByRole('heading', { name: appText.headings.predictionEntry })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: appText.headings.calendar })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: appText.panels.weekendLive.title })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: appText.panels.publicGuide.title })).not.toBeInTheDocument();

    const sectionNavigation = screen.getByRole('navigation', { name: /sezioni applicazione/i });
    const predictionsButton = screen.getAllByRole('button', {
      name: new RegExp(appText.shell.navigation.items.predictions, 'i'),
    }).find((button) => sectionNavigation.contains(button));
    const calendarButton = screen.getAllByRole('button', {
      name: new RegExp(appText.shell.navigation.items.calendar, 'i'),
    }).find((button) => sectionNavigation.contains(button));

    expect(predictionsButton).toHaveAttribute('aria-current', 'page');
    expect(calendarButton).not.toHaveAttribute('aria-current');
  }, 30000);
});
