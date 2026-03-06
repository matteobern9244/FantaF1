import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { verifyMongoDatabaseName } from '../backend/database.js';
import { readAppData, readCalendarCache, writeAppData } from '../backend/storage.js';
import app from '../app.js';

// Mocking storage so we don't hit the DB during integration tests for routes
vi.mock('../backend/storage.js', () => ({
  readAppData: vi.fn(() => Promise.resolve({ users: [] })),
  readCalendarCache: vi.fn(() => Promise.resolve([])),
  readDriversCache: vi.fn(() => Promise.resolve([])),
  writeAppData: vi.fn(() => Promise.resolve()),
}));

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
    readAppData.mockResolvedValue({ users: createUsers() });
    readCalendarCache.mockResolvedValue([]);
    writeAppData.mockResolvedValue();
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

  it('Catch-all for unknown /api/ routes should return 404', async () => {
    const response = await request(app).get('/api/unknown-endpoint');
    
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'API Endpoint not found' });
  });

  it('POST /api/data should keep allowing an all-empty payload for non-manual save flows', async () => {
    const payload = createPayload();
    const response = await request(app).post('/api/data').send(payload);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Dati salvati correttamente.');
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
});
