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

function createPayload() {
  return {
    users: [
      { name: 'Player 1', predictions: createEmptyPrediction(), points: 0 },
      { name: 'Player 2', predictions: createEmptyPrediction(), points: 0 },
      { name: 'Player 3', predictions: createEmptyPrediction(), points: 0 },
    ],
    history: [],
    gpName: 'Australian Grand Prix 2026',
    raceResults: createEmptyPrediction(),
    selectedMeetingKey: 'race-1',
  };
}

describe('production admin guard routes', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.NODE_ENV = 'production';
    mongoose.connection.db = { databaseName: 'fantaf1' };
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('rejects save requests without an admin session in production', async () => {
    vi.doMock('../backend/storage.js', () => ({
      readAppData: vi.fn(() => Promise.resolve({ users: [] })),
      readCalendarCache: vi.fn(() => Promise.resolve([])),
      readDriversCache: vi.fn(() => Promise.resolve([])),
      readPersistedParticipantRoster: vi.fn(() => Promise.resolve(['Player 1', 'Player 2', 'Player 3'])),
      writeAppData: vi.fn(() => Promise.resolve()),
    }));

    vi.doMock('../backend/auth.js', () => ({
      ensureAdminCredentials: vi.fn(() => Promise.resolve()),
      verifyAdminPassword: vi.fn(() => Promise.resolve(true)),
      buildSessionCookie: vi.fn(() => 'fantaf1_admin_session=test-session; Path=/; HttpOnly; SameSite=Lax'),
      buildSessionClearCookie: vi.fn(() => 'fantaf1_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'),
      readAdminSession: vi.fn(() => null),
    }));

    const { default: app } = await import('../app.js');
    const response = await request(app).post('/api/data').send(createPayload());

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'Admin authentication required',
      code: 'admin_auth_required',
    });
  });

  it('falls back to three participant slots when the config contains a non-numeric value', async () => {
    vi.doMock('../backend/storage.js', () => ({
      readAppData: vi.fn(() => Promise.resolve({ users: [] })),
      readCalendarCache: vi.fn(() => Promise.resolve([])),
      readDriversCache: vi.fn(() => Promise.resolve([])),
      readPersistedParticipantRoster: vi.fn(() => Promise.resolve(['Player 1', 'Player 2', 'Player 3'])),
      writeAppData: vi.fn(() => Promise.resolve()),
    }));

    vi.doMock('../backend/auth.js', () => ({
      ensureAdminCredentials: vi.fn(() => Promise.resolve()),
      verifyAdminPassword: vi.fn(() => Promise.resolve(true)),
      buildSessionCookie: vi.fn(() => 'fantaf1_admin_session=test-session; Path=/; HttpOnly; SameSite=Lax'),
      buildSessionClearCookie: vi.fn(() => 'fantaf1_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'),
      readAdminSession: vi.fn(() => ({ role: 'admin' })),
    }));

    vi.doMock('../backend/config.js', async () => {
      const actual = await vi.importActual('../backend/config.js');

      return {
        ...actual,
        appConfig: {
          ...actual.appConfig,
          participantSlots: 'invalid',
        },
      };
    });

    const { default: app } = await import('../app.js');
    const response = await request(app).post('/api/data').send({
      history: [],
      gpName: 'Australian Grand Prix 2026',
      raceResults: createEmptyPrediction(),
      selectedMeetingKey: 'race-1',
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('participants_invalid');
  });

  it('returns the public default view mode in production sessions', async () => {
    vi.doMock('../backend/storage.js', () => ({
      readAppData: vi.fn(() => Promise.resolve({ users: [] })),
      readCalendarCache: vi.fn(() => Promise.resolve([])),
      readDriversCache: vi.fn(() => Promise.resolve([])),
      readPersistedParticipantRoster: vi.fn(() => Promise.resolve(['Player 1', 'Player 2', 'Player 3'])),
      writeAppData: vi.fn(() => Promise.resolve()),
    }));

    vi.doMock('../backend/auth.js', () => ({
      ensureAdminCredentials: vi.fn(() => Promise.resolve()),
      verifyAdminPassword: vi.fn(() => Promise.resolve(true)),
      buildSessionCookie: vi.fn(() => 'fantaf1_admin_session=test-session; Path=/; HttpOnly; SameSite=Lax'),
      buildSessionClearCookie: vi.fn(() => 'fantaf1_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'),
      readAdminSession: vi.fn(() => ({ role: 'admin' })),
    }));

    const { default: app } = await import('../app.js');
    const response = await request(app).get('/api/session');

    expect(response.status).toBe(200);
    expect(response.body.defaultViewMode).toBe('public');
  });
});
