import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const findOneMock = vi.fn();
const createMock = vi.fn();

vi.mock('../backend/models.js', () => ({
  AdminCredential: {
    findOne: findOneMock,
    create: createMock,
  },
}));

describe('backend auth helpers', () => {
  const originalAdminSecret = process.env.ADMIN_SESSION_SECRET;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.ADMIN_SESSION_SECRET;
  });

  afterEach(() => {
    if (originalAdminSecret === undefined) {
      delete process.env.ADMIN_SESSION_SECRET;
      return;
    }

    process.env.ADMIN_SESSION_SECRET = originalAdminSecret;
  });

  it('creates admin credentials only when missing and verifies the stored password hash', async () => {
    findOneMock.mockResolvedValueOnce(null).mockResolvedValueOnce({
      role: 'admin',
      passwordSalt: 'e1710999510fec1f46b2141d045bb3ea',
      passwordHash:
        '343ec6a8a8fe3f0531834d104d19a220e7aab00705446181236d521f7cbd051b406087dac94ec49eb27bac00d63beaae40f62b973767e906452091294da98609',
    });
    createMock.mockResolvedValue({
      role: 'admin',
      passwordSalt: 'e1710999510fec1f46b2141d045bb3ea',
      passwordHash:
        '343ec6a8a8fe3f0531834d104d19a220e7aab00705446181236d521f7cbd051b406087dac94ec49eb27bac00d63beaae40f62b973767e906452091294da98609',
    });

    const auth = await import('../backend/auth.js');

    const createdCredential = await auth.ensureAdminCredentials();
    const isValidPassword = await auth.verifyAdminPassword('55698');

    expect(createdCredential.role).toBe('admin');
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(isValidPassword).toBe(true);
  });

  it('reuses existing credentials and rejects invalid passwords', async () => {
    const existingCredential = {
      role: 'admin',
      passwordSalt: 'salt-value',
      passwordHash: 'a'.repeat(128),
    };
    findOneMock.mockResolvedValue(existingCredential);

    const auth = await import('../backend/auth.js');

    expect(await auth.ensureAdminCredentials()).toBe(existingCredential);
    expect(createMock).not.toHaveBeenCalled();
    expect(await auth.verifyAdminPassword('wrong-password')).toBe(false);
  });

  it('parses cookies and validates admin sessions across success and failure branches', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T10:00:00Z'));
    process.env.ADMIN_SESSION_SECRET = 'test-admin-secret';

    const auth = await import('../backend/auth.js');

    expect(auth.parseCookies('a=1; lonely; b=hello%20world')).toEqual({
      a: '1',
      lonely: '',
      b: 'hello world',
    });
    expect(auth.parseCookies(undefined)).toEqual({});

    const devCookie = auth.buildSessionCookie({ isProduction: false });
    const prodCookie = auth.buildSessionCookie({ isProduction: true });
    const rawCookieValue = decodeURIComponent(devCookie.split(';')[0].split('=')[1]);

    expect(devCookie).toContain('HttpOnly');
    expect(devCookie).toContain('SameSite=Lax');
    expect(devCookie).not.toContain('Secure');
    expect(prodCookie).toContain('Secure');
    expect(auth.buildSessionClearCookie({ isProduction: true })).toContain('Secure');
    expect(auth.buildSessionClearCookie({ isProduction: false })).not.toContain('Secure');

    expect(
      auth.readAdminSession({
        headers: {
          cookie: `fantaf1_admin_session=${encodeURIComponent(rawCookieValue)}`,
        },
      }),
    ).toMatchObject({ role: 'admin' });

    expect(auth.readAdminSession({ headers: { cookie: '' } })).toBeNull();
    expect(auth.readAdminSession({ headers: { cookie: 'fantaf1_admin_session=invalid' } })).toBeNull();

    const [payload, signature] = rawCookieValue.split('.');
    expect(
      auth.readAdminSession({
        headers: {
          cookie: `fantaf1_admin_session=${encodeURIComponent(`${payload}.tampered`)}`,
        },
      }),
    ).toBeNull();

    const nonAdminPayload = Buffer.from(
      JSON.stringify({
        role: 'viewer',
        nonce: 'abc',
        issuedAt: Date.now(),
      }),
    ).toString('base64url');
    const crypto = await import('crypto');
    const nonAdminSignature = crypto
      .createHmac('sha256', 'test-admin-secret')
      .update(nonAdminPayload)
      .digest('base64url');

    expect(
      auth.readAdminSession({
        headers: {
          cookie: `fantaf1_admin_session=${encodeURIComponent(`${nonAdminPayload}.${nonAdminSignature}`)}`,
        },
      }),
    ).toBeNull();

    const expiredPayload = Buffer.from(
      JSON.stringify({
        role: 'admin',
        nonce: 'expired',
        issuedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
      }),
    ).toString('base64url');
    const expiredSignature = crypto
      .createHmac('sha256', 'test-admin-secret')
      .update(expiredPayload)
      .digest('base64url');

    expect(
      auth.readAdminSession({
        headers: {
          cookie: `fantaf1_admin_session=${encodeURIComponent(`${expiredPayload}.${expiredSignature}`)}`,
        },
      }),
    ).toBeNull();

    const brokenPayload = Buffer.from('{not-json').toString('base64url');
    const brokenSignature = crypto
      .createHmac('sha256', 'test-admin-secret')
      .update(brokenPayload)
      .digest('base64url');

    expect(
      auth.readAdminSession({
        headers: {
          cookie: `fantaf1_admin_session=${encodeURIComponent(`${brokenPayload}.${brokenSignature}`)}`,
        },
      }),
    ).toBeNull();

    expect(signature).toBeTruthy();
    vi.useRealTimers();
  });

  it('covers the session-secret fallback and undefined password normalization branches', async () => {
    const credential = {
      role: 'admin',
      passwordSalt: 'e1710999510fec1f46b2141d045bb3ea',
      passwordHash:
        '343ec6a8a8fe3f0531834d104d19a220e7aab00705446181236d521f7cbd051b406087dac94ec49eb27bac00d63beaae40f62b973767e906452091294da98609',
    };
    findOneMock.mockResolvedValue(credential);

    const auth = await import('../backend/auth.js');

    expect(await auth.verifyAdminPassword(undefined)).toBe(false);

    const cookie = auth.buildSessionCookie({ isProduction: false });
    expect(cookie).toContain('fantaf1_admin_session=');
  });
});
