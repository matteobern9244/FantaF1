import { describe, expect, it, vi } from 'vitest';
import { fetchRaceResults } from '../backend/calendar.js';
import * as storage from '../backend/storage.js';

vi.mock('../backend/storage.js', () => ({
  readCalendarCache: vi.fn(),
}));

describe('fetchRaceResults', () => {
  it('correctly maps racing URL to results URL and parses driver IDs', async () => {
    const mockCalendar = [
      {
        meetingKey: '1234',
        meetingName: 'Test GP',
        detailUrl: 'https://www.formula1.com/en/racing/2026/test-gp',
        isSprintWeekend: false
      }
    ];
    
    vi.mocked(storage.readCalendarCache).mockResolvedValue(mockCalendar);

    // Mock global fetch
    global.fetch = vi.fn((url) => {
      if (url.includes('race-result')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('<table><tr data-driver-id="VER"></tr><tr data-driver-id="NOR"></tr><tr data-driver-id="LEC"></tr></table>')
        });
      }
      if (url.includes('qualifying')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('<div data-driver-id="VER"></div>')
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const results = await fetchRaceResults('1234');
    
    expect(results).toEqual({
      first: 'ver',
      second: 'nor',
      third: 'lec',
      pole: 'ver'
    });
  });

  it('throws error if race is not found', async () => {
    vi.mocked(storage.readCalendarCache).mockResolvedValue([]);
    await expect(fetchRaceResults('9999')).rejects.toThrow('Race not found');
  });
});
