import { beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { verifyMongoDatabaseName } from '../backend/database.js';
import {
  readAppData,
  readCalendarCache,
  readDriversCache,
  readPersistedParticipantRoster,
  writeAppData,
} from '../backend/storage.js';
import { fetchRaceResults } from '../backend/calendar.js';
import app from '../app.js';

// Mocking storage so we don't hit the DB during integration tests for routes
vi.mock('../backend/storage.js', () => ({
  readAppData: vi.fn(() => Promise.resolve({ users: [] })),
  readCalendarCache: vi.fn(() => Promise.resolve([])),
  readDriversCache: vi.fn(() => Promise.resolve([])),
  readPersistedParticipantRoster: vi.fn(() => Promise.resolve(['Player 1', 'Player 2', 'Player 3'])),
  writeAppData: vi.fn(() => Promise.resolve()),
}));

vi.mock('../backend/calendar.js', async () => {
  const actual = await vi.importActual('../backend/calendar.js');

  return {
    ...actual,
    fetchRaceResults: vi.fn(),
    sortCalendarByRound: vi.fn((calendar) => calendar),
    syncCalendarFromOfficialSource: vi.fn(),
  };
});

vi.mock('../backend/database.js', async () => {
  const actual = await vi.importActual('../backend/database.js');

  return {
    ...actual,
    verifyMongoDatabaseName: vi.fn(),
  };
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

function createPayload(predictions) {
  return {
    users: createUsers(predictions),
    history: [],
    gpName: 'Australian Grand Prix 2026',
    raceResults: createEmptyPrediction(),
    selectedMeetingKey: 'race-1',
  };
}

describe('API Integration - Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyMongoDatabaseName.mockImplementation(() => {});
    mongoose.connection.db = undefined;
    readAppData.mockResolvedValue({ users: createUsers() });
    readCalendarCache.mockResolvedValue([]);
    readDriversCache.mockResolvedValue([]);
    readPersistedParticipantRoster.mockResolvedValue(['Player 1', 'Player 2', 'Player 3']);
    writeAppData.mockResolvedValue();
    fetchRaceResults.mockResolvedValue(createEmptyPrediction());
  });

  it('GET /api/health should return ok and environment metadata', async () => {
    const response = await request(app).get('/api/health');
    
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body).toHaveProperty('environment');
    expect(response.body).toHaveProperty('databaseTarget');
  });

  it('GET /api/data should return app data', async () => {
    const response = await request(app).get('/api/data');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('users');
  });

  it('GET /api/data should return 500 when storage read fails', async () => {
    readAppData.mockRejectedValueOnce(new Error('DB error'));

    const response = await request(app).get('/api/data');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to read app data' });
  });

  it('GET /api/drivers should return 500 when drivers read fails', async () => {
    readDriversCache.mockRejectedValueOnce(new Error('Drivers error'));

    const response = await request(app).get('/api/drivers');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to read drivers' });
  });

  it('GET /api/drivers should return the sorted drivers payload', async () => {
    readDriversCache.mockResolvedValueOnce([{ name: 'Zed' }, { name: 'Alpha' }]);

    const response = await request(app).get('/api/drivers');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ name: 'Alpha' }, { name: 'Zed' }]);
  });

  it('GET /api/calendar should return 500 when calendar read fails', async () => {
    readCalendarCache.mockRejectedValueOnce(new Error('Calendar error'));

    const response = await request(app).get('/api/calendar');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to read calendar' });
  });

  it('GET /api/calendar should return the sorted calendar payload', async () => {
    readCalendarCache.mockResolvedValueOnce([
      { meetingKey: 'race-2', roundNumber: 2 },
      { meetingKey: 'race-1', roundNumber: 1 },
    ]);

    const response = await request(app).get('/api/calendar');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { meetingKey: 'race-2', roundNumber: 2 },
      { meetingKey: 'race-1', roundNumber: 1 },
    ]);
  });

  it('GET /api/results/:meetingKey should return 500 when official results fetch fails', async () => {
    fetchRaceResults.mockRejectedValueOnce(new Error('Result error'));

    const response = await request(app).get('/api/results/race-1');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: 'Failed to fetch results',
      details: 'Result error',
    });
  });

  it('Catch-all for unknown /api/ routes should return 404', async () => {
    const response = await request(app).get('/api/unknown-endpoint');
    
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'API Endpoint not found' });
  });

  it('removed boost endpoints should return 404', async () => {
    const [publicResponse, adminResponse] = await Promise.all([
      request(app).post('/api/public-boost').send({}),
      request(app).post('/api/admin/boost').send({}),
    ]);

    expect(publicResponse.status).toBe(404);
    expect(publicResponse.body).toEqual({ error: 'API Endpoint not found' });
    expect(adminResponse.status).toBe(404);
    expect(adminResponse.body).toEqual({ error: 'API Endpoint not found' });
  });

  it('POST /api/data should keep allowing an all-empty payload for non-manual save flows', async () => {
    const payload = createPayload();
    const response = await request(app).post('/api/data').send(payload);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Dati salvati correttamente.');
    expect(writeAppData).toHaveBeenCalledWith(payload);
  });

  it('POST /api/data should reject invalid participants', async () => {
    const payload = {
      ...createPayload(),
      users: [{ name: 'Only one', predictions: createEmptyPrediction(), points: 0 }],
    };

    const response = await request(app).post('/api/data').send(payload);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('participants_invalid');
    expect(writeAppData).not.toHaveBeenCalled();
  });

  it('POST /api/data should reject a roster with three unexpected participant names', async () => {
    const payload = {
      ...createPayload(),
      users: [
        { name: 'Alpha', predictions: createEmptyPrediction(), points: 0 },
        { name: 'Beta', predictions: createEmptyPrediction(), points: 0 },
        { name: 'Gamma', predictions: createEmptyPrediction(), points: 0 },
      ],
    };

    const response = await request(app).post('/api/data').send(payload);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('participants_invalid');
    expect(writeAppData).not.toHaveBeenCalled();
  });

  it('POST /api/data should report unknown participant count when users are missing', async () => {
    readPersistedParticipantRoster.mockResolvedValue(null);

    const response = await request(app).post('/api/data').send({
      history: [],
      gpName: 'Australian Grand Prix 2026',
      raceResults: createEmptyPrediction(),
      selectedMeetingKey: 'race-1',
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('participants_invalid');
    expect(response.body.details).toContain('unknown');
  });

  it('POST /api/data should accept the first valid roster when no persisted roster exists yet', async () => {
    readPersistedParticipantRoster.mockResolvedValue(null);
    const payload = {
      ...createPayload(),
      users: [
        { name: 'Alpha', predictions: createEmptyPrediction(), points: 0 },
        { name: 'Beta', predictions: createEmptyPrediction(), points: 0 },
        { name: 'Gamma', predictions: createEmptyPrediction(), points: 0 },
      ],
    };

    const response = await request(app).post('/api/data').send(payload);

    expect(response.status).toBe(200);
    expect(writeAppData).toHaveBeenCalledWith(payload);
  });

  it('POST /api/predictions should reject a payload with no predictions', async () => {
    const response = await request(app).post('/api/predictions').send(createPayload());

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('predictions_missing');
    expect(writeAppData).not.toHaveBeenCalled();
  });

  it('POST /api/predictions should persist when at least one prediction is present', async () => {
    const payload = createPayload([
      { first: 'ver', second: '', third: '', pole: '' },
      createEmptyPrediction(),
      createEmptyPrediction(),
    ]);
    const response = await request(app).post('/api/predictions').send(payload);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Dati salvati correttamente.');
    expect(writeAppData).toHaveBeenCalledWith(payload);
  });

  it('POST /api/predictions should validate the selected weekend draft from the weekend map', async () => {
    const payload = {
      ...createPayload(),
      weekendStateByMeetingKey: {
        'race-1': {
          userPredictions: {
            'Player 1': { first: 'ver', second: '', third: '', pole: '' },
            'Player 2': createEmptyPrediction(),
            'Player 3': createEmptyPrediction(),
          },
          raceResults: createEmptyPrediction(),
        },
      },
    };

    const response = await request(app).post('/api/predictions').send(payload);

    expect(response.status).toBe(200);
    expect(writeAppData).toHaveBeenCalledWith(payload);
  });

  it('POST /api/predictions should keep the existing race lock behavior', async () => {
    const payload = createPayload([
      { first: 'ver', second: '', third: '', pole: '' },
      createEmptyPrediction(),
      createEmptyPrediction(),
    ]);

    readCalendarCache.mockResolvedValue([
      {
        meetingKey: 'race-1',
        raceStartTime: '2026-03-01T14:00:00Z',
      },
    ]);
    readAppData.mockResolvedValue(
      createPayload([
        { first: 'ham', second: '', third: '', pole: '' },
        createEmptyPrediction(),
        createEmptyPrediction(),
      ]),
    );

    const response = await request(app).post('/api/predictions').send(payload);

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('race_locked');
    expect(writeAppData).not.toHaveBeenCalled();
  });

  it('POST /api/predictions should report the race end date when the lock message has no race start time', async () => {
    const payload = createPayload([
      { first: 'ver', second: '', third: '', pole: '' },
      createEmptyPrediction(),
      createEmptyPrediction(),
    ]);

    readCalendarCache.mockResolvedValue([
      {
        meetingKey: 'race-1',
        endDate: '2026-03-01',
      },
    ]);
    readAppData.mockResolvedValue(
      createPayload([
        { first: 'ham', second: '', third: '', pole: '' },
        createEmptyPrediction(),
        createEmptyPrediction(),
      ]),
    );

    const response = await request(app).post('/api/predictions').send(payload);

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('race_locked');
    expect(response.body.details).toContain('2026-03-01');
    expect(writeAppData).not.toHaveBeenCalled();
  });

  it('POST /api/data should return the generic save error payload when persistence fails', async () => {
    mongoose.connection.db = { databaseName: 'fantaf1_dev' };
    writeAppData.mockRejectedValueOnce(new Error('mongo write failed'));

    const response = await request(app).post('/api/data').send(createPayload());

    expect(response.status).toBe(500);
    expect(response.body.code).toBe('storage_write_failed');
  });
});
