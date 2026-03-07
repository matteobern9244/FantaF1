import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { AdminCredential } from './models.js';

const ADMIN_ROLE = 'admin';
const SESSION_COOKIE_NAME = 'fantaf1_admin_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_ADMIN_SALT = 'e1710999510fec1f46b2141d045bb3ea';
const DEFAULT_ADMIN_HASH =
  '343ec6a8a8fe3f0531834d104d19a220e7aab00705446181236d521f7cbd051b406087dac94ec49eb27bac00d63beaae40f62b973767e906452091294da98609';

function buildSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || 'fantaf1-dev-session-secret';
}

function hashPassword(password, salt) {
  return scryptSync(password, salt, 64).toString('hex');
}

async function ensureAdminCredentials() {
  const existingCredential = await AdminCredential.findOne({ role: ADMIN_ROLE });
  if (existingCredential) {
    return existingCredential;
  }

  return AdminCredential.create({
    role: ADMIN_ROLE,
    passwordSalt: DEFAULT_ADMIN_SALT,
    passwordHash: DEFAULT_ADMIN_HASH,
  });
}

async function verifyAdminPassword(password) {
  const credential = await ensureAdminCredentials();
  const computedHash = hashPassword(String(password ?? ''), credential.passwordSalt);

  return timingSafeEqual(
    Buffer.from(computedHash, 'hex'),
    Buffer.from(credential.passwordHash, 'hex'),
  );
}

function createSessionCookieValue() {
  const payload = Buffer.from(
    JSON.stringify({
      role: ADMIN_ROLE,
      nonce: randomBytes(8).toString('hex'),
      issuedAt: Date.now(),
    }),
  ).toString('base64url');
  const signature = createHmac('sha256', buildSessionSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function parseCookies(cookieHeader) {
  return Object.fromEntries(
    String(cookieHeader ?? '')
      .split(';')
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => {
        const separatorIndex = chunk.indexOf('=');
        return separatorIndex === -1
          ? [chunk, '']
          : [chunk.slice(0, separatorIndex), decodeURIComponent(chunk.slice(separatorIndex + 1))];
      }),
  );
}

function readAdminSession(req) {
  const cookies = parseCookies(req.headers.cookie);
  const rawCookie = cookies[SESSION_COOKIE_NAME];

  if (!rawCookie || !rawCookie.includes('.')) {
    return null;
  }

  const [payload, signature] = rawCookie.split('.');
  const expectedSignature = createHmac('sha256', buildSessionSecret()).update(payload).digest('base64url');

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const parsedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (parsedPayload.role !== ADMIN_ROLE) {
      return null;
    }

    if (Date.now() - Number(parsedPayload.issuedAt) > SESSION_TTL_MS) {
      return null;
    }

    return parsedPayload;
  } catch {
    return null;
  }
}

function buildSessionCookie({ isProduction }) {
  const secureFlag = isProduction ? '; Secure' : '';
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(createSessionCookieValue())}; Path=/; HttpOnly; SameSite=Lax${secureFlag}`;
}

function buildSessionClearCookie({ isProduction }) {
  const secureFlag = isProduction ? '; Secure' : '';
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`;
}

export {
  ADMIN_ROLE,
  SESSION_COOKIE_NAME,
  buildSessionClearCookie,
  buildSessionCookie,
  ensureAdminCredentials,
  parseCookies,
  readAdminSession,
  verifyAdminPassword,
};
