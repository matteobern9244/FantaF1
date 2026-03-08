import { describe, expect, it, vi } from 'vitest';
import {
  AppDataRepository,
  AppDataSanitizer,
  ParticipantRosterPolicy,
  WeekendSelectionService,
} from '../backend/app-data-service.js';

describe('App data services', () => {
  it('sanitizes users, selected meeting, and preserved weekend state through dedicated services', () => {
    const sanitizer = new AppDataSanitizer({
      rosterPolicy: new ParticipantRosterPolicy(),
      weekendSelectionService: new WeekendSelectionService(),
    });

    const result = sanitizer.sanitizeAppData(
      {
        gpName: 'Australian Grand Prix',
        selectedMeetingKey: 'australia',
        users: [
          { name: 'Player 1', points: 4, predictions: { first: 'ver' } },
          { name: 'Player 2', points: 3, predictions: {} },
          { name: 'Player 3', points: 2, predictions: {} },
        ],
        raceResults: { pole: 'pia' },
        weekendStateByMeetingKey: {
          monaco: {
            userPredictions: {
              'Player 1': { first: 'ham' },
            },
            raceResults: { first: 'ham' },
          },
        },
      },
      [
        {
          meetingKey: 'australia',
          meetingName: 'Australia',
          grandPrixTitle: 'Australian Grand Prix',
          roundNumber: 1,
          startDate: '2026-03-08',
          endDate: '2026-03-08',
        },
      ],
    );

    expect(result.selectedMeetingKey).toBe('australia');
    expect(result.weekendStateByMeetingKey.monaco.userPredictions['Player 1'].first).toBe('ham');
    expect(result.weekendStateByMeetingKey.australia.raceResults.pole).toBe('pia');
  });

  it('returns an empty list when roster normalization receives a non-array input', () => {
    const rosterPolicy = new ParticipantRosterPolicy();

    expect(
      rosterPolicy.normalizeUsersToRoster(null, ['Player 1', 'Player 2', 'Player 3']),
    ).toEqual([]);
  });

  it('repository delegates reads and writes through the sanitizer', async () => {
    const sanitizer = {
      createDefaultAppData: vi.fn().mockReturnValue({ users: ['default'] }),
      sanitizeAppData: vi.fn().mockReturnValue({ users: ['sanitized'] }),
    };
    const appDataModel = {
      findOne: vi.fn().mockReturnValue({
        sort: vi.fn().mockResolvedValue({
          toObject: () => ({ users: [{ name: 'Stored' }] }),
        }),
      }),
      findOneAndUpdate: vi.fn().mockResolvedValue({}),
    };
    const repository = new AppDataRepository({
      appDataModel,
      readCalendarCache: vi.fn().mockResolvedValue([{ meetingKey: 'race-1' }]),
      readPersistedParticipantRoster: vi.fn().mockResolvedValue(['Player 1', 'Player 2', 'Player 3']),
      sanitizer,
    });

    await expect(repository.readAppData()).resolves.toEqual({ users: ['sanitized'] });
    await expect(repository.writeAppData({ gpName: 'Test GP' })).resolves.toEqual({ users: ['sanitized'] });

    expect(sanitizer.sanitizeAppData).toHaveBeenCalledTimes(2);
    expect(appDataModel.findOneAndUpdate).toHaveBeenCalledWith(
      {},
      { users: ['sanitized'] },
      expect.objectContaining({ upsert: true }),
    );
  });
});
