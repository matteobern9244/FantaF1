/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import type { Prediction } from '../src/types';
import {
  fetchOfficialResults,
  normalizeOfficialResultsResponse,
} from '../src/utils/resultsApi';

describe('results api client', () => {
  it('fetches official results for a meeting key', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          first: 'nor',
          second: 'ver',
          third: 'lec',
          pole: 'pia',
          racePhase: 'finished',
        }),
    } as Response);

    await expect(fetchOfficialResults('race-1')).resolves.toEqual({
      first: 'nor',
      second: 'ver',
      third: 'lec',
      pole: 'pia',
      racePhase: 'finished',
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/results/race-1');
  });

  it('throws when the official results endpoint responds with a non-ok status', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: false,
    } as Response);

    await expect(fetchOfficialResults('race-2')).rejects.toThrow(
      'Failed to fetch official results for race-2',
    );
  });

  it('normalizes nested and flat payloads without losing highlights links', () => {
    const prediction: Prediction = {
      first: 'nor',
      second: 'ver',
      third: 'lec',
      pole: 'pia',
    };

    expect(
      normalizeOfficialResultsResponse({
        racePhase: 'finished',
        results: prediction,
        highlightsVideoUrl: 'https://www.youtube.com/watch?v=skyf1-finished',
      }),
    ).toEqual({
      racePhase: 'finished',
      results: prediction,
      highlightsVideoUrl: 'https://www.youtube.com/watch?v=skyf1-finished',
    });

    expect(normalizeOfficialResultsResponse(prediction)).toEqual({
      racePhase: 'open',
      results: prediction,
      highlightsVideoUrl: '',
    });
  });
});
