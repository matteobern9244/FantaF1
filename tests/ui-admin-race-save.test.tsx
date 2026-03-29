/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';

function createJsonResponse(body: unknown, ok = true, status = ok ? 200 : 500) {
  return {
    ok,
    status,
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null),
    },
    json: () => Promise.resolve(body),
  } as Response;
}

function createPrediction(first = '', second = '', third = '', pole = '') {
  return { first, second, third, pole };
}

describe('Admin race results save flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('restores the current admin race results when the production save fails', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    const initialRaceResults = createPrediction('ver', 'nor', 'lec', 'pia');
    const users = [
      { name: 'Adriano', predictions: createPrediction('ver'), points: 0 },
      { name: 'Fabio', predictions: createPrediction('nor'), points: 0 },
      { name: 'Matteo', predictions: createPrediction('lec'), points: 0 },
    ];

    fetchMock.mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes('/api/session')) {
        return Promise.resolve(createJsonResponse({ isAdmin: true, defaultViewMode: 'admin' }));
      }

      if (url.includes('/api/health')) {
        return Promise.resolve(createJsonResponse({ status: 'ok', environment: 'production' }));
      }

      if (url.includes('/api/data') && (!options || options.method !== 'POST')) {
        return Promise.resolve(
          createJsonResponse({
            users,
            history: [],
            gpName: 'Australian Grand Prix 2026',
            raceResults: initialRaceResults,
            selectedMeetingKey: 'race-1',
            weekendStateByMeetingKey: {
              'race-1': {
                userPredictions: {
                  Adriano: users[0].predictions,
                  Fabio: users[1].predictions,
                  Matteo: users[2].predictions,
                },
                raceResults: initialRaceResults,
              },
            },
          }),
        );
      }

      if (url.includes('/api/data') && options?.method === 'POST') {
        return Promise.resolve(
          createJsonResponse(
            {
              error: 'mongo write failed',
              code: 'storage_write_failed',
            },
            false,
            500,
          ),
        );
      }

      if (url.includes('/api/results/race-1')) {
        return Promise.resolve(
          createJsonResponse({
            ...initialRaceResults,
            racePhase: 'finished',
          }),
        );
      }

      if (url.includes('/api/drivers')) {
        return Promise.resolve(
          createJsonResponse([
            { id: 'ver', name: 'Max Verstappen', team: 'Red Bull', color: '#1e5bc6' },
            { id: 'nor', name: 'Lando Norris', team: 'McLaren', color: '#ff8000' },
            { id: 'lec', name: 'Charles Leclerc', team: 'Ferrari', color: '#dc0000' },
            { id: 'pia', name: 'Oscar Piastri', team: 'McLaren', color: '#ff8000' },
          ]),
        );
      }

      if (url.includes('/api/calendar')) {
        return Promise.resolve(
          createJsonResponse([
            {
              meetingKey: 'race-1',
              meetingName: 'Australia',
              grandPrixTitle: 'Australian Grand Prix 2026',
              roundNumber: 1,
              dateRangeLabel: '13-15 Mar 2026',
              detailUrl: 'https://www.formula1.com/en/racing/2026/australia',
              heroImageUrl: '',
              trackOutlineUrl: '',
              isSprintWeekend: false,
              startDate: '2026-03-13',
              endDate: '2026-03-15',
              raceStartTime: '2026-03-15T04:00:00Z',
              sessions: [],
              highlightsVideoUrl: '',
              highlightsLookupCheckedAt: '',
              highlightsLookupStatus: '',
              highlightsLookupSource: '',
            },
          ]),
        );
      }

      if (url.includes('/api/standings')) {
        return Promise.resolve(
          createJsonResponse({ driverStandings: [], constructorStandings: [], updatedAt: '' }),
        );
      }

      return Promise.reject(
        new Error(`Unhandled fetch to ${url} with options ${JSON.stringify(options ?? {})}`),
      );
    });

    render(
      <MemoryRouter initialEntries={['/gara#results-section']}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByTestId('pitstop-loader')).not.toBeInTheDocument();
    });

    const confirmButton = await screen.findByRole('button', { name: /conferma risultati/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/data',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    expect((screen.getByLabelText('Risultato 1°') as HTMLSelectElement).value).toBe('ver');
    expect((screen.getByLabelText('Risultato 2°') as HTMLSelectElement).value).toBe('nor');
    expect((screen.getByLabelText('Risultato 3°') as HTMLSelectElement).value).toBe('lec');
    expect((screen.getByRole('combobox', { name: /pole/i }) as HTMLSelectElement).value).toBe('pia');
    expect(alertSpy).toHaveBeenCalledTimes(1);
  });
});
