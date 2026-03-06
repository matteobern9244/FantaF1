import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../backend/calendar.js', () => ({
  fetchRaceResults: vi.fn(),
  sortCalendarByRound: vi.fn((calendar) => calendar),
  syncCalendarFromOfficialSource: vi.fn(),
}));

import app from '../app.js';
import { fetchRaceResults } from '../backend/calendar.js';

describe('GET /api/results/:meetingKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the parsed official results payload', async () => {
    vi.mocked(fetchRaceResults).mockResolvedValue({
      first: 'nor',
      second: 'ver',
      third: 'lec',
      pole: 'pia',
    });

    const response = await request(app).get('/api/results/1280');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      first: 'nor',
      second: 'ver',
      third: 'lec',
      pole: 'pia',
    });
    expect(fetchRaceResults).toHaveBeenCalledWith('1280');
  });
});
