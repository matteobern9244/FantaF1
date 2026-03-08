import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../backend/calendar.js', () => ({
  fetchRaceResults: vi.fn(),
  fetchRaceResultsWithStatus: vi.fn(),
  sortCalendarByRound: vi.fn((calendar) => calendar),
  syncCalendarFromOfficialSource: vi.fn(),
}));

import app from '../app.js';
import { fetchRaceResultsWithStatus } from '../backend/calendar.js';

describe('GET /api/results/:meetingKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the parsed official results payload together with the race phase', async () => {
    vi.mocked(fetchRaceResultsWithStatus).mockResolvedValue({
      first: 'nor',
      second: 'ver',
      third: 'lec',
      pole: 'pia',
      racePhase: 'finished',
    });

    const response = await request(app).get('/api/results/1280');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      first: 'nor',
      second: 'ver',
      third: 'lec',
      pole: 'pia',
      racePhase: 'finished',
    });
    expect(fetchRaceResultsWithStatus).toHaveBeenCalledWith('1280');
  });
});
