import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../app.js';

// Mocking storage so we don't hit the DB during integration tests for routes
vi.mock('../backend/storage.js', () => ({
  readAppData: vi.fn(() => Promise.resolve({ users: [] })),
  readCalendarCache: vi.fn(() => Promise.resolve([])),
  readDriversCache: vi.fn(() => Promise.resolve([])),
  writeAppData: vi.fn(() => Promise.resolve()),
}));

describe('API Integration - Routes', () => {
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
});
