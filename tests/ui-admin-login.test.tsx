/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
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
});
