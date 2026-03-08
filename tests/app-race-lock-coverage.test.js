import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';

function createEmptyPrediction() {
  return {
    first: '',
    second: '',
    third: '',
    pole: '',
  };
}

function createPayload(predictions) {
  return {
    users: [
      { name: 'Player 1', predictions: predictions?.[0] ?? createEmptyPrediction(), points: 0 },
      { name: 'Player 2', predictions: predictions?.[1] ?? createEmptyPrediction(), points: 0 },
      { name: 'Player 3', predictions: predictions?.[2] ?? createEmptyPrediction(), points: 0 },
    ],
    history: [],
    gpName: 'Australian Grand Prix 2026',
    raceResults: createEmptyPrediction(),
    selectedMeetingKey: 'race-1',
  };
}

describe('app race lock coverage fallbacks', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.NODE_ENV = 'development';
    mongoose.connection.db = { databaseName: 'fantaf1_dev' };
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('reports unknown when the race lock payload has no timing metadata', async () => {
    vi.doMock('../backend/storage.js', () => ({
      readAppData: vi.fn(() => Promise.resolve(createPayload([
        { first: 'ham', second: '', third: '', pole: '' },
        createEmptyPrediction(),
        createEmptyPrediction(),
      ]))),
      readCalendarCache: vi.fn(() => Promise.resolve([{ meetingKey: 'race-1' }])),
      readDriversCache: vi.fn(() => Promise.resolve([])),
      readPersistedParticipantRoster: vi.fn(() => Promise.resolve(['Player 1', 'Player 2', 'Player 3'])),
      writeAppData: vi.fn(() => Promise.resolve()),
    }));

    vi.doMock('../backend/validation.js', async () => {
      const actual = await vi.importActual('../backend/validation.js');

      return {
        ...actual,
        isRaceLocked: vi.fn(() => true),
      };
    });

    vi.doMock('../backend/database.js', async () => {
      const actual = await vi.importActual('../backend/database.js');

      return {
        ...actual,
        verifyMongoDatabaseName: vi.fn(),
      };
    });

    const { default: app } = await import('../app.js');
    const response = await request(app).post('/api/predictions').send(createPayload([
      { first: 'ver', second: '', third: '', pole: '' },
      createEmptyPrediction(),
      createEmptyPrediction(),
    ]));

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('race_locked');
    expect(response.body.details).toContain('unknown');
  });
});
