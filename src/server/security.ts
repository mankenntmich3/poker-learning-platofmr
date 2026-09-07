import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import type { Database } from './db';
import { ApiError } from './errors';

const SCRYPT_N = 131072;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const passwordGlobal = globalThis as typeof globalThis & { studyPasswordWork?: { active: boolean; queue: (() => void)[] } };
passwordGlobal.studyPasswordWork ??= { active: false, queue: [] };
const passwordWork = passwordGlobal.studyPasswordWork;
async function derivePassword(password: string, salt: string): Promise<Buffer> {
  // One expensive derivation per process keeps concurrent requests from exhausting memory.
  if (passwordWork.active) {
    if (passwordWork.queue.length >= 8) throw new ApiError(429, 'Viele Anmeldungen gleichzeitig. Bitte versuche es gleich erneut.', 'RATE_LIMITED');
    await new Promise<void>((resolve) => passwordWork.queue.push(resolve));
  } else passwordWork.active = true;
  try {
    return await new Promise<Buffer>((resolve, reject) => {
      scryptCallback(password, salt, 64, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 256 * 1024 * 1024 },
        (error, derived) => error ? reject(error) : resolve(derived));
    });
  } finally {
    const next = passwordWork.queue.shift();
    if (next) next(); else passwordWork.active = false;
  }
}
export const SESSION_SECONDS = 60 * 60 * 24 * 14;
export function sessionCookieName(): string {
  return process.env.NODE_ENV === 'production' ? '__Host-study_session' : 'study_session';
}
export function sha256(value: string): string { return createHash('sha256').update(value).digest('hex'); }
export function newSessionToken(): string { return randomBytes(32).toString('base64url'); }
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = await derivePassword(password, salt);
  return `scrypt-v2:${SCRYPT_N}:${SCRYPT_R}:${SCRYPT_P}:${salt}:${derived.toString('hex')}`;
}
// A valid fixed dummy record keeps nonexistent-account login on the password-hashing path.
const DUMMY_HASH = `scrypt-v2:${SCRYPT_N}:${SCRYPT_R}:${SCRYPT_P}:${'0'.repeat(32)}:${'0'.repeat(128)}`;
export async function verifyPassword(password: string, encoded = DUMMY_HASH): Promise<boolean> {
  const [version, n, r, p, salt, digest] = encoded.split(':');
  if (version !== 'scrypt-v2' || Number(n) !== SCRYPT_N || Number(r) !== SCRYPT_R || Number(p) !== SCRYPT_P || !/^[a-f0-9]{32}$/.test(salt ?? '') || !/^[a-f0-9]{128}$/.test(digest ?? '')) return false;
  const actual = await derivePassword(password, salt);
  return timingSafeEqual(actual, Buffer.from(digest, 'hex'));
}
export function readSessionToken(request: Request): string | null {
  const name = sessionCookieName();
  const cookie = request.headers.get('cookie')?.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  const token = cookie?.slice(name.length + 1);
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}
export function sessionCookie(token: string, clear = false): string {
  return `${sessionCookieName()}=${clear ? '' : token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : SESSION_SECONDS}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}
export function configuredOrigin(request: Request): string {
  const configured = process.env.APP_ORIGIN;
  const requested = new URL(request.url);
  // In development, accept the address actually opened in the browser, but only
  // for loopback and still require an exact same-origin mutation below.
  const host = request.headers.get('host');
  if (process.env.NODE_ENV === 'development') {
    // Next's internal request URL can canonicalize loopback aliases. The browser
    // sends its actual authority in Host; accept only a literal loopback authority.
    if (host && /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host)) return new URL(`${requested.protocol}//${host}`).origin;
    if (!host && ['localhost', '127.0.0.1', '[::1]'].includes(requested.hostname)) return requested.origin;
  }
  if (process.env.NODE_ENV === 'production' && !configured) throw new ApiError(503, 'Serverkonfiguration unvollständig.', 'CONFIGURATION_REQUIRED');
  const origin = configured ? new URL(configured).origin : new URL(request.url).origin;
  if (configured && configured.replace(/\/$/, '') !== origin) throw new ApiError(503, 'Ungültige Serverkonfiguration.', 'CONFIGURATION_REQUIRED');
  return origin;
}
export function requireSameOrigin(request: Request): void {
  const origin = configuredOrigin(request);
  if (request.headers.get('origin') !== origin || request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new ApiError(403, 'Diese Anfrage stammt nicht von der Lernplattform.', 'ORIGIN_REJECTED');
  }
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new ApiError(415, 'JSON-Anfrage erwartet.', 'CONTENT_TYPE_REQUIRED');
  }
}

/** Fixed-window counters are durable and atomically incremented by PostgreSQL. */
export async function enforceRateLimit(db: Database, key: string, limit: number, windowSeconds: number): Promise<void> {
  const now = Date.now();
  const bucket = Math.floor(now / (windowSeconds * 1000));
  const expires = new Date((bucket + 2) * windowSeconds * 1000).toISOString();
  const rows = await db.query<{ count: number }>(
    `INSERT INTO request_limits (key, bucket, count, expires_at) VALUES ($1, $2, 1, $3)
     ON CONFLICT (key, bucket) DO UPDATE SET count = request_limits.count + 1 RETURNING count`,
    [sha256(key), bucket, expires],
  );
  // Bound retained counters without trusting proxy-provided IP headers.
  await db.query('DELETE FROM request_limits WHERE expires_at < now()');
  if (rows[0].count > limit) throw new ApiError(429, 'Zu viele Versuche. Bitte warte einige Minuten.', 'RATE_LIMITED');
}
