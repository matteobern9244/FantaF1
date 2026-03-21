/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

  it('exposes the pronostici navigation entry in the shell', async () => {
    render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument());

    const navigation = screen.getByRole('navigation', { name: /sezioni applicazione/i });
    expect(within(navigation).getByRole('button', { name: /pronostici dei giocatori/i })).toBeInTheDocument();
  });
});
