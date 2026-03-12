import { createHash, createHmac, scryptSync } from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const findOneMock = vi.fn();
const createMock = vi.fn();
const defaultCredential = {
  role: 'admin',
  passwordSalt: 'e1710999510fec1f46b2141d045bb3ea',
  passwordHash:
    '343ec6a8a8fe3f0531834d104d19a220e7aab00705446181236d521f7cbd051b406087dac94ec49eb27bac00d63beaae40f62b973767e906452091294da98609',
};

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
    const credential = buildCredential('subphase-4-node-credential');
    findOneMock.mockResolvedValueOnce(null).mockResolvedValue(credential.record);
    createMock.mockResolvedValue(defaultCredential);

    const auth = await import('../backend/auth.js');

    const createdCredential = await auth.ensureAdminCredentials();
    const isValidPassword = await auth.verifyAdminPassword(credential.password);

    expect(createdCredential.role).toBe('admin');
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith(defaultCredential);
    expect(isValidPassword).toBe(true);
  });

  it('reuses existing credentials and rejects invalid passwords', async () => {
    const credential = buildCredential('subphase-4-node-existing-credential');
    findOneMock.mockResolvedValue(credential.record);

    const auth = await import('../backend/auth.js');

    expect(await auth.ensureAdminCredentials()).toBe(credential.record);
    expect(createMock).not.toHaveBeenCalled();
    expect(await auth.verifyAdminPassword(createPassword('subphase-4-node-invalid-password'))).toBe(false);
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
    const nonAdminSignature = createHmac('sha256', 'test-admin-secret')
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
    const expiredSignature = createHmac('sha256', 'test-admin-secret')
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
    const brokenSignature = createHmac('sha256', 'test-admin-secret')
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
    findOneMock.mockResolvedValue(defaultCredential);

    const auth = await import('../backend/auth.js');

    expect(await auth.verifyAdminPassword(undefined)).toBe(false);

    const cookie = auth.buildSessionCookie({ isProduction: false });
    expect(cookie).toContain('fantaf1_admin_session=');
  });

  function buildCredential(seedLabel) {
    const password = createPassword(`${seedLabel}:password`);
    const passwordSalt = createSalt(`${seedLabel}:salt`);

    return {
      password,
      record: {
        role: 'admin',
        passwordSalt,
        passwordHash: scryptSync(password, passwordSalt, 64).toString('hex'),
      },
    };
  }

  function createPassword(seedLabel) {
    return createHash('sha256').update(seedLabel).digest('hex');
  }

  function createSalt(seedLabel) {
    return createHash('sha256').update(seedLabel).digest('hex').slice(0, 32);
  }
});
