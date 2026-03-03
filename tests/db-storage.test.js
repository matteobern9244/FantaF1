import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readAppData, writeAppData, readDriversCache, writeDriversCache, readCalendarCache, writeCalendarCache } from '../backend/storage.js';
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

    it('returns default data if record is null', async () => {
      AppData.findOne.mockReturnValue({
        sort: vi.fn().mockResolvedValue(null),
      });
      const data = await readAppData(Promise.resolve([]));
      expect(data.gpName).toBe('');
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
