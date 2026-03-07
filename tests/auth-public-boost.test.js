import { beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';

vi.mock('../backend/storage.js', () => ({
  readAppData: vi.fn(() => Promise.resolve({ users: [] })),
  readCalendarCache: vi.fn(() => Promise.resolve([])),
  readDriversCache: vi.fn(() => Promise.resolve([])),
  readPersistedParticipantRoster: vi.fn(() => Promise.resolve(['Adriano', 'Fabio', 'Matteo'])),
  writeAppData: vi.fn(() => Promise.resolve()),
}));

vi.mock('../backend/auth.js', () => ({
  ensureAdminCredentials: vi.fn(() => Promise.resolve()),
  verifyAdminPassword: vi.fn(() => Promise.resolve(true)),
  buildSessionCookie: vi.fn(() => 'fantaf1_admin_session=test-session; Path=/; HttpOnly; SameSite=Lax'),
  buildSessionClearCookie: vi.fn(() => 'fantaf1_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'),
  readAdminSession: vi.fn(() => ({ role: 'admin' })),
}));

const {
  readAppData,
  readCalendarCache,
  readDriversCache,
  readPersistedParticipantRoster,
  writeAppData,
} = await import('../backend/storage.js');
const { ensureAdminCredentials, verifyAdminPassword } = await import('../backend/auth.js');
const { default: app } = await import('../app.js');

function createEmptyPrediction() {
  return {
    first: '',
    second: '',
    third: '',
    pole: '',
  };
}

function createAppData() {
  return {
    users: [
      { name: 'Adriano', predictions: createEmptyPrediction(), points: 0, weekendBoost: 'none' },
      { name: 'Fabio', predictions: createEmptyPrediction(), points: 0, weekendBoost: 'none' },
      { name: 'Matteo', predictions: createEmptyPrediction(), points: 0, weekendBoost: 'none' },
    ],
    history: [],
    gpName: 'Australian Grand Prix 2026',
    raceResults: createEmptyPrediction(),
    selectedMeetingKey: 'race-1',
    weekendStateByMeetingKey: {
      'race-1': {
        userPredictions: {
          Adriano: createEmptyPrediction(),
          Fabio: createEmptyPrediction(),
          Matteo: createEmptyPrediction(),
        },
        raceResults: createEmptyPrediction(),
        weekendBoostByUser: {
          Adriano: 'none',
          Fabio: 'none',
          Matteo: 'none',
        },
        weekendBoostLockedByUser: {
          Adriano: false,
          Fabio: false,
          Matteo: false,
        },
      },
    },
  };
}

describe('auth and public boost routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mongoose.connection.db = { databaseName: 'fantaf1_dev' };
    readAppData.mockResolvedValue(createAppData());
    readCalendarCache.mockResolvedValue([
      {
        meetingKey: 'race-1',
        raceStartTime: '2099-03-01T14:00:00Z',
      },
    ]);
    readDriversCache.mockResolvedValue([]);
    readPersistedParticipantRoster.mockResolvedValue(['Adriano', 'Fabio', 'Matteo']);
    writeAppData.mockResolvedValue();
    ensureAdminCredentials.mockResolvedValue();
    verifyAdminPassword.mockResolvedValue(true);
  });

  it('returns default admin session in development', async () => {
    const response = await request(app).get('/api/session');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      isAdmin: true,
      defaultViewMode: 'admin',
    });
  });

  it('creates an admin session when the password is valid', async () => {
    const response = await request(app).post('/api/admin/session').send({ password: 'secret' });

    expect(response.status).toBe(200);
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringMatching(/fantaf1_admin_session=/)]),
    );
  });

  it('locks a player boost after the first public save', async () => {
    const response = await request(app).post('/api/public-boost').send({
      meetingKey: 'race-1',
      userName: 'Matteo',
      boost: 'first',
    });

    expect(response.status).toBe(200);
    expect(writeAppData).toHaveBeenCalledWith(
      expect.objectContaining({
        weekendStateByMeetingKey: expect.objectContaining({
          'race-1': expect.objectContaining({
            weekendBoostByUser: expect.objectContaining({
              Matteo: 'first',
            }),
            weekendBoostLockedByUser: expect.objectContaining({
              Matteo: true,
            }),
          }),
        }),
      }),
    );
  });

  it('rejects a second public save for the same player boost', async () => {
    const currentData = createAppData();
    currentData.weekendStateByMeetingKey['race-1'].weekendBoostLockedByUser.Matteo = true;
    currentData.weekendStateByMeetingKey['race-1'].weekendBoostByUser.Matteo = 'first';
    readAppData.mockResolvedValue(currentData);

    const response = await request(app).post('/api/public-boost').send({
      meetingKey: 'race-1',
      userName: 'Matteo',
      boost: 'pole',
    });

    expect(response.status).toBe(409);
    expect(writeAppData).not.toHaveBeenCalled();
  });

  it('rejects admin boost requests with an empty meeting key', async () => {
    const response = await request(app).post('/api/admin/boost').send({
      meetingKey: '   ',
      userName: 'Matteo',
      boost: 'first',
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('admin_boost_invalid_meeting');
    expect(writeAppData).not.toHaveBeenCalled();
  });

  it('rejects admin boost requests for an unknown meeting key', async () => {
    const response = await request(app).post('/api/admin/boost').send({
      meetingKey: 'race-99',
      userName: 'Matteo',
      boost: 'first',
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('admin_boost_unknown_meeting');
    expect(writeAppData).not.toHaveBeenCalled();
  });

  it('rejects admin boost requests for an unknown player', async () => {
    const response = await request(app).post('/api/admin/boost').send({
      meetingKey: 'race-1',
      userName: 'Ghost',
      boost: 'first',
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('admin_boost_unknown_user');
    expect(writeAppData).not.toHaveBeenCalled();
  });

  it('rejects admin boost requests with an invalid boost value', async () => {
    const response = await request(app).post('/api/admin/boost').send({
      meetingKey: 'race-1',
      userName: 'Matteo',
      boost: 'turbo',
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('admin_boost_invalid_value');
    expect(writeAppData).not.toHaveBeenCalled();
  });

  it('rejects admin boost requests with a non-boolean locked flag', async () => {
    const response = await request(app).post('/api/admin/boost').send({
      meetingKey: 'race-1',
      userName: 'Matteo',
      boost: 'first',
      locked: 'yes',
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('admin_boost_invalid_locked');
    expect(writeAppData).not.toHaveBeenCalled();
  });

  it('persists a valid admin boost override on the requested weekend', async () => {
    const response = await request(app).post('/api/admin/boost').send({
      meetingKey: 'race-1',
      userName: 'Matteo',
      boost: 'pole',
      locked: false,
    });

    expect(response.status).toBe(200);
    expect(writeAppData).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedMeetingKey: 'race-1',
        weekendStateByMeetingKey: expect.objectContaining({
          'race-1': expect.objectContaining({
            weekendBoostByUser: expect.objectContaining({
              Matteo: 'pole',
            }),
            weekendBoostLockedByUser: expect.objectContaining({
              Matteo: false,
            }),
          }),
        }),
      }),
    );
  });
});
