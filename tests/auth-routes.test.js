import { beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';

vi.mock('../backend/storage.js', () => ({
  readAppData: vi.fn(() => Promise.resolve({ users: [] })),
  readCalendarCache: vi.fn(() => Promise.resolve([])),
  readDriversCache: vi.fn(() => Promise.resolve([])),
  readStandingsCache: vi.fn(() => Promise.resolve({ driverStandings: [], constructorStandings: [], updatedAt: '' })),
  readPersistedParticipantRoster: vi.fn(() => Promise.resolve(['Adriano', 'Fabio', 'Matteo'])),
  writeAppData: vi.fn(() => Promise.resolve()),
}));

vi.mock('../backend/standings.js', () => ({
  syncStandingsFromOfficialSource: vi.fn(() => Promise.resolve({ driverStandings: [], constructorStandings: [], updatedAt: '' })),
}));

vi.mock('../backend/auth.js', () => ({
  ensureAdminCredentials: vi.fn(() => Promise.resolve()),
  verifyAdminPassword: vi.fn(() => Promise.resolve(true)),
  buildSessionCookie: vi.fn(() => 'fantaf1_admin_session=test-session; Path=/; HttpOnly; SameSite=Lax'),
  buildSessionClearCookie: vi.fn(() => 'fantaf1_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'),
  readAdminSession: vi.fn(() => ({ role: 'admin' })),
}));

const { ensureAdminCredentials, verifyAdminPassword } = await import('../backend/auth.js');
const { default: app } = await import('../app.js');

describe('auth routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mongoose.connection.db = { databaseName: 'fantaf1_dev' };
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

  it('rejects the admin login when the password is invalid', async () => {
    verifyAdminPassword.mockResolvedValue(false);

    const response = await request(app).post('/api/admin/session').send({ password: 'wrong' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'Invalid password',
      code: 'admin_auth_invalid',
    });
  });

  it('treats a missing admin password payload as an empty password string', async () => {
    verifyAdminPassword.mockResolvedValue(false);

    await request(app).post('/api/admin/session').send({});

    expect(verifyAdminPassword).toHaveBeenCalledWith('');
  });

  it('clears the admin session on logout', async () => {
    const response = await request(app).delete('/api/admin/session');

    expect(response.status).toBe(200);
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringMatching(/Max-Age=0/)]),
    );
    expect(response.body).toMatchObject({
      isAdmin: false,
      defaultViewMode: 'admin',
    });
  });
});
