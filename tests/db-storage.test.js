import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  readAppData,
  readPersistedParticipantRoster,
  writeAppData,
  readDriversCache,
  writeDriversCache,
  readCalendarCache,
  writeCalendarCache,
} from '../backend/storage.js';
import { AppData, Driver, Weekend } from '../backend/models.js';

vi.mock('../backend/models.js', () => ({
  AppData: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
  Driver: {
    find: vi.fn(),
    deleteMany: vi.fn(),
    insertMany: vi.fn(),
  },
  Weekend: {
    find: vi.fn(),
    deleteMany: vi.fn(),
    insertMany: vi.fn(),
  },
}));

describe('MongoDB Storage Functions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    console.error = vi.fn(); // Suppress expected errors in console
  });

  describe('readAppData', () => {
    it('returns default data if findOne fails', async () => {
      AppData.findOne.mockReturnValue({
        sort: vi.fn().mockRejectedValue(new Error('DB Error')),
      });
      const data = await readAppData(Promise.resolve([]));
      expect(data).toHaveProperty('users');
      expect(data.users.length).toBe(3);
    });

    it('returns sanitized data if record exists', async () => {
      AppData.findOne.mockReturnValue({
        sort: vi.fn().mockResolvedValue({
          toObject: () => ({ gpName: 'Test GP', users: [] }),
        }),
      });
      const data = await readAppData(Promise.resolve([]));
      expect(data.gpName).toBe('Test GP');
    });

    it('prefers the persisted selected weekend state when it already exists', async () => {
      AppData.findOne.mockReturnValue({
        sort: vi.fn().mockResolvedValue({
          toObject: () => ({
            gpName: 'Australia',
            selectedMeetingKey: 'australia',
            users: [
              { name: 'Player 1', points: 4, predictions: { first: 'legacy' } },
              { name: 'Player 2', points: 3, predictions: {} },
              { name: 'Player 3', points: 2, predictions: {} },
            ],
            raceResults: { first: 'legacy' },
            weekendStateByMeetingKey: {
              australia: {
                userPredictions: {
                  'Player 1': { first: 'ver', second: '', third: '', pole: '' },
                  'Player 2': { first: '', second: '', third: '', pole: '' },
                  'Player 3': { first: '', second: '', third: '', pole: '' },
                },
                raceResults: { first: '', second: '', third: '', pole: 'pia' },
              },
            },
          }),
        }),
      });

      const data = await readAppData(
        Promise.resolve([
          {
            meetingKey: 'australia',
            meetingName: 'Australia',
            grandPrixTitle: 'Australian Grand Prix',
            roundNumber: 1,
            startDate: '2026-03-08',
            endDate: '2026-03-08',
          },
        ]),
      );

      expect(data.users[0].predictions.first).toBe('ver');
      expect(data.raceResults.pole).toBe('pia');
    });

    it('returns default data if record is null', async () => {
      AppData.findOne.mockReturnValue({
        sort: vi.fn().mockResolvedValue(null),
      });
      const data = await readAppData(Promise.resolve([]));
      expect(data.gpName).toBe('');
    });

    it('reads the persisted roster from the latest stored app data when available', async () => {
      AppData.findOne.mockReturnValue({
        sort: vi.fn().mockResolvedValue({
          toObject: () => ({
            users: [
              { name: 'Uno' },
              { name: 'Due' },
              { name: 'Tre' },
            ],
          }),
        }),
      });

      await expect(readPersistedParticipantRoster()).resolves.toEqual(['Uno', 'Due', 'Tre']);
    });

    it('returns null for the persisted roster when no valid stored roster exists', async () => {
      AppData.findOne.mockReturnValue({
        sort: vi.fn().mockResolvedValue({
          toObject: () => ({
            users: [{ name: 'Solo' }],
          }),
        }),
      });

      await expect(readPersistedParticipantRoster()).resolves.toBeNull();
    });

    it('returns null for the persisted roster when no document exists yet', async () => {
      AppData.findOne.mockReturnValue({
        sort: vi.fn().mockResolvedValue(null),
      });

      await expect(readPersistedParticipantRoster()).resolves.toBeNull();
    });

    it('sanitizes fallback names, map-based history and reads the calendar cache when no promise is provided', async () => {
      Weekend.find.mockReturnValue({
        sort: vi.fn().mockResolvedValue([
          {
            toObject: () => ({
              meetingKey: 'monaco',
              meetingName: 'Monaco',
              grandPrixTitle: 'Monaco Grand Prix',
              roundNumber: 7,
              startDate: '2026-05-24',
              endDate: '2026-05-24',
            }),
          },
        ]),
      });
      AppData.findOne.mockReturnValue({
        sort: vi.fn().mockResolvedValue({
          toObject: () => ({
            gpName: 'Monaco Grand Prix',
            selectedMeetingKey: 'missing',
            users: [
              {
                name: '',
                points: 'NaN',
                predictions: { first: 1, second: 'ham', third: null, pole: undefined },
              },
              {
                name: 'Valid User',
                points: 7,
                predictions: { first: 'ver', second: '', third: '', pole: '' },
              },
            ],
            history: [
              {
                gpName: 'Historic GP',
                meetingKey: 'historic',
                date: '01/01/2026',
                results: { first: 'ver', second: 'ham', third: 'lec', pole: 'nor' },
                userPredictions: new Map([
                  [
                    'Player 1',
                    {
                      prediction: { first: 'ver', second: 'ham', third: 'lec', pole: 'nor' },
                      pointsEarned: 'NaN',
                    },
                  ],
                ]),
              },
            ],
          }),
        }),
      });

      const data = await readAppData();

      expect(data.selectedMeetingKey).toBe('monaco');
      expect(data.gpName).toBe('Monaco Grand Prix');
      expect(data.users).toEqual([
        {
          name: 'Unknown',
          predictions: { first: '', second: 'ham', third: '', pole: '' },
          points: 0,
          weekendBoost: 'none',
        },
        {
          name: 'Valid User',
          predictions: { first: 'ver', second: '', third: '', pole: '' },
          points: 7,
          weekendBoost: 'none',
        },
        {
          name: 'Player 3',
          predictions: { first: '', second: '', third: '', pole: '' },
          points: 0,
          weekendBoost: 'none',
        },
      ]);
      expect(data.history[0].userPredictions['Player 1'].pointsEarned).toBe(0);
      expect(data.weekendStateByMeetingKey.monaco).toEqual({
        userPredictions: {
          Unknown: { first: '', second: 'ham', third: '', pole: '' },
          'Valid User': { first: 'ver', second: '', third: '', pole: '' },
          'Player 3': { first: '', second: '', third: '', pole: '' },
        },
        raceResults: { first: '', second: '', third: '', pole: '' },
        weekendBoostByUser: {
          Unknown: 'none',
          'Valid User': 'none',
          'Player 3': 'none',
        },
        weekendBoostLockedByUser: {
          Unknown: false,
          'Valid User': false,
          'Player 3': false,
        },
      });
    });

    it('trims the list to the first three users when more are stored', async () => {
      AppData.findOne.mockReturnValue({
        sort: vi.fn().mockResolvedValue({
          toObject: () => ({
            users: [
              { name: '', points: 1, predictions: {} },
              { name: 'Two', points: 2, predictions: {} },
              { name: 'Three', points: 3, predictions: {} },
              { name: 'Four', points: 4, predictions: {} },
            ],
          }),
        }),
      });

      const data = await readAppData(Promise.resolve([]));

      expect(data.users).toHaveLength(3);
      expect(data.users[0].name).toBe('Unknown');
      expect(data.users[2].name).toBe('Three');
    });
  });

  describe('writeAppData', () => {
    it('throws error if findOneAndUpdate fails', async () => {
      AppData.findOneAndUpdate.mockRejectedValue(new Error('Write Error'));
      await expect(writeAppData({ gpName: 'Test GP' }, Promise.resolve([]))).rejects.toThrow('Write Error');
    });

    it('upserts and returns sanitized data', async () => {
      AppData.findOneAndUpdate.mockResolvedValue();
      const data = await writeAppData({ gpName: 'Test GP' }, Promise.resolve([]));
      expect(data.gpName).toBe('Test GP');
      expect(AppData.findOneAndUpdate).toHaveBeenCalled();
    });

    it('reads the calendar cache when writeAppData is called without a calendar promise', async () => {
      Weekend.find.mockReturnValue({
        sort: vi.fn().mockResolvedValue([
          {
            toObject: () => ({
              meetingKey: 'australia',
              meetingName: 'Australia',
              grandPrixTitle: 'Australian Grand Prix',
              roundNumber: 1,
              startDate: '2026-03-08',
              endDate: '2026-03-08',
            }),
          },
        ]),
      });
      AppData.findOneAndUpdate.mockResolvedValue();

      const result = await writeAppData({
        users: [{ name: '', predictions: {}, points: 'nan' }],
      });

      expect(result.selectedMeetingKey).toBe('australia');
      expect(result.users[0].name).toBe('Unknown');
      expect(result.weekendStateByMeetingKey.australia.userPredictions.Unknown).toEqual({
        first: '',
        second: '',
        third: '',
        pole: '',
      });
      expect(AppData.findOneAndUpdate).toHaveBeenCalled();
    });

    it('preserves non-selected weekend drafts while updating the selected one', async () => {
      AppData.findOne.mockReturnValue({
        sort: vi.fn().mockResolvedValue({
          toObject: () => ({
            users: [
              { name: 'Player 1' },
              { name: 'Player 2' },
              { name: 'Player 3' },
            ],
          }),
        }),
      });
      AppData.findOneAndUpdate.mockResolvedValue();

      const result = await writeAppData(
        {
          users: [
            { name: 'Player 1', points: 4, predictions: { first: 'ver', second: '', third: '', pole: '' } },
            { name: 'Player 2', points: 3, predictions: { first: '', second: '', third: '', pole: '' } },
            { name: 'Player 3', points: 2, predictions: { first: '', second: '', third: '', pole: '' } },
          ],
          history: [],
          gpName: 'Australian Grand Prix',
          raceResults: { first: '', second: '', third: '', pole: 'pia' },
          selectedMeetingKey: 'australia',
          weekendStateByMeetingKey: {
            monaco: {
              userPredictions: {
                'Player 1': { first: 'ham', second: '', third: '', pole: '' },
              },
              raceResults: { first: 'ham', second: '', third: '', pole: '' },
            },
          },
        },
        Promise.resolve([
          {
            meetingKey: 'australia',
            meetingName: 'Australia',
            grandPrixTitle: 'Australian Grand Prix',
            roundNumber: 1,
            startDate: '2026-03-08',
            endDate: '2026-03-08',
          },
        ]),
      );

      expect(result.weekendStateByMeetingKey.monaco.userPredictions['Player 1'].first).toBe('ham');
      expect(result.weekendStateByMeetingKey.australia.raceResults.pole).toBe('pia');
      expect(result.users[0].predictions.first).toBe('ver');
    });
  });

  describe('readDriversCache', () => {
    it('returns array of plain objects', async () => {
      Driver.find.mockReturnValue({
        sort: vi.fn().mockResolvedValue([{ toObject: () => ({ name: 'Test' }) }]),
      });
      const result = await readDriversCache();
      expect(result).toEqual([{ name: 'Test' }]);
    });

    it('returns empty array on error', async () => {
      Driver.find.mockReturnValue({
        sort: vi.fn().mockRejectedValue(new Error('DB Error')),
      });
      const result = await readDriversCache();
      expect(result).toEqual([]);
    });
  });

  describe('writeDriversCache', () => {
    it('replaces all drivers in DB', async () => {
      Driver.deleteMany.mockResolvedValue();
      Driver.insertMany.mockResolvedValue();
      const drivers = [{ name: 'Test' }];
      const result = await writeDriversCache(drivers);
      expect(result).toBe(drivers);
      expect(Driver.deleteMany).toHaveBeenCalled();
      expect(Driver.insertMany).toHaveBeenCalledWith(drivers);
    });

    it('returns original drivers even on error', async () => {
      Driver.deleteMany.mockRejectedValue(new Error('DB Error'));
      const drivers = [{ name: 'Test' }];
      const result = await writeDriversCache(drivers);
      expect(result).toBe(drivers);
    });
  });

  describe('readCalendarCache', () => {
    it('returns array of plain objects', async () => {
      Weekend.find.mockReturnValue({
        sort: vi.fn().mockResolvedValue([{ toObject: () => ({ meetingName: 'Test' }) }]),
      });
      const result = await readCalendarCache();
      expect(result).toEqual([{ meetingName: 'Test' }]);
    });

    it('returns empty array on error', async () => {
      Weekend.find.mockReturnValue({
        sort: vi.fn().mockRejectedValue(new Error('DB Error')),
      });
      const result = await readCalendarCache();
      expect(result).toEqual([]);
    });
  });

  describe('writeCalendarCache', () => {
    it('replaces all calendar events in DB', async () => {
      Weekend.deleteMany.mockResolvedValue();
      Weekend.insertMany.mockResolvedValue();
      const calendar = [{ meetingName: 'Test' }];
      const result = await writeCalendarCache(calendar);
      expect(result).toBe(calendar);
      expect(Weekend.deleteMany).toHaveBeenCalled();
      expect(Weekend.insertMany).toHaveBeenCalledWith(calendar);
    });

    it('returns original calendar even on error', async () => {
      Weekend.deleteMany.mockRejectedValue(new Error('DB Error'));
      const calendar = [{ meetingName: 'Test' }];
      const result = await writeCalendarCache(calendar);
      expect(result).toBe(calendar);
    });
  });
});
