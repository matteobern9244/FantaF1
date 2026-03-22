/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../src/App';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

// Mock matchMedia for responsive UI components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('App Frontend Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
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

  it('renders the initial loading state', async () => {
    render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>);
    expect(screen.getByTestId('pitstop-loader')).toBeInTheDocument();
    expect(screen.getByAltText('FantaF1 splash logo')).toBeInTheDocument();
    expect(screen.queryByAltText('Pitstop mechanic')).not.toBeInTheDocument();
    expect(screen.queryByAltText('Spinning tire')).not.toBeInTheDocument();
  });

  it('renders the app title and hero after data is loaded', async () => {
    render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>);
    
    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    // Check for hero title presence in the main heading
    expect(screen.getByRole('heading', { name: /Fanta Formula 1/i })).toBeInTheDocument();
  });
});
