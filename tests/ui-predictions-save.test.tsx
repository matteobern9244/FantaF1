/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

function createUsers(predictions = [createEmptyPrediction(), createEmptyPrediction(), createEmptyPrediction()]) {
  return predictions.map((userPredictions, index) => ({
    name: `Player ${index + 1}`,
    predictions: userPredictions,
    points: 0,
  }));
}

function createAppData(predictions) {
  return {
    users: createUsers(predictions),
    history: [],
    gpName: '',
    raceResults: createEmptyPrediction(),
    selectedMeetingKey: '',
    weekendStateByMeetingKey: {},
  };
}

describe('Manual predictions save UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks the manual save when every prediction is empty', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
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
          json: () => Promise.resolve([]),
        } as Response);
      }

      if (url.includes('/api/calendar')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        } as Response);
      }

      if (url.includes('/api/standings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ driverStandings: [], constructorStandings: [], updatedAt: '' }),
        } as Response);
      }

      return Promise.reject(new Error(`Unhandled fetch to ${url}`));
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    const fetchCallsBeforeClick = fetchMock.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: /salva dati inseriti/i }));

    expect(alertSpy).toHaveBeenCalledWith(
      "Il salvataggio richiede l'inserimento di almeno un pronostico.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(fetchCallsBeforeClick);
  }, 15000);

  it('posts the manual save to /api/predictions when at least one prediction exists', async () => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    const appData = createAppData([
      { first: 'ver', second: '', third: '', pole: '' },
      createEmptyPrediction(),
      createEmptyPrediction(),
    ]);

    fetchMock.mockImplementation((url: string, options?: RequestInit) => {
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
          json: () => Promise.resolve([]),
        } as Response);
      }

      if (url.includes('/api/calendar')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        } as Response);
      }

      if (url.includes('/api/standings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ driverStandings: [], constructorStandings: [], updatedAt: '' }),
        } as Response);
      }

      if (url.includes('/api/predictions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Dati salvati correttamente.' }),
        } as Response);
      }

      return Promise.reject(
        new Error(`Unhandled fetch to ${url} with options ${JSON.stringify(options ?? {})}`),
      );
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /salva dati inseriti/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/predictions',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appData),
        }),
      );
    });

    expect(screen.getByRole('status')).toHaveTextContent('Pronostici salvati.');
  }, 15000);
});
