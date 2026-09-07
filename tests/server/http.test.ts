import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createMemoryDatabase, type Database } from '@/server/db';
import { body } from '@/server/http';
import { accountDelete, dashboardGet, decisionPost, healthGet, lessonGet, registerPost, sessionGet, trainerGet } from '@/server/handlers';
import { requireSameOrigin, sessionCookie } from '@/server/security';

let db: Database;
const databaseGlobal = globalThis as typeof globalThis & { studyDatabase?: Promise<Database> };
const origin = 'http://localhost:3000';
const request = (path: string, method = 'GET', payload?: unknown, cookie?: string) => new Request(`${origin}${path}`, {
  method, headers: { origin, 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
  ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
});
beforeAll(async () => {
  db = await createMemoryDatabase();
  databaseGlobal.studyDatabase = Promise.resolve(db);
  vi.stubEnv('APP_ORIGIN', origin);
});
afterAll(async () => { delete databaseGlobal.studyDatabase; await db.close(); vi.unstubAllEnvs(); });

describe('HTTP security boundary', () => {
  it('rejects unauthenticated reads and writes and exposes safe request IDs', async () => {
    const response = await dashboardGet(request('/api/dashboard'));
    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-request-id')).toMatch(/^[a-f0-9-]{36}$/);
    const mutation = await decisionPost(request('/api/trainer/decision', 'POST', {}));
    expect(mutation.status).toBe(401);
    const session = await sessionGet(request('/api/session'));
    expect(await session.json()).toEqual({ user: null });
  });

  it('rejects absent and cross-site origins and non-JSON mutation requests', async () => {
    expect(() => requireSameOrigin(new Request(`${origin}/api/auth/register`, { method: 'POST' }))).toThrow();
    const cross = new Request(`${origin}/api/auth/register`, { method: 'POST', headers: { origin: 'https://attacker.example', 'content-type': 'application/json' }, body: '{}' });
    expect((await registerPost(cross)).status).toBe(403);
    const form = new Request(`${origin}/api/auth/register`, { method: 'POST', headers: { origin, 'content-type': 'text/plain' }, body: '{}' });
    expect((await registerPost(form)).status).toBe(415);
  });

  it('bounds JSON bodies, rejects malformed JSON and rejects forged extra answer fields', async () => {
    await expect(body(new Request(`${origin}/api`, { method: 'POST', body: JSON.stringify({ value: 'x'.repeat(9000) }) }), z.unknown())).rejects.toMatchObject({ status: 413 });
    await expect(body(new Request(`${origin}/api`, { method: 'POST', body: '{broken' }), z.unknown())).rejects.toMatchObject({ status: 400 });
    const response = await registerPost(request('/api/auth/register', 'POST', { name: 'A', email: 'invalid', password: 'short', role: 'admin' }));
    expect(response.status).toBe(400);
  });

  it('sets HttpOnly session cookies, hides answers, and verifies deletion credentials', async () => {
    const response = await registerPost(request('/api/auth/register', 'POST', { name: 'Ada', email: 'http@example.test', password: 'testing-password-2026' }));
    expect(response.status).toBe(201);
    const setCookie = response.headers.get('set-cookie')!;
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Strict');
    const cookie = setCookie.split(';')[0];
    const trainer = await (await trainerGet(request('/api/trainer', 'GET', undefined, cookie))).json();
    expect(trainer.spots.length).toBeGreaterThan(0);
    expect(JSON.stringify(trainer)).not.toMatch(/frequency|bestEv|chosenEv|regret|heroCard.*opponent/);
    const lesson = await (await lessonGet(request('/api/lesson', 'GET', undefined, cookie))).json();
    expect(Object.keys(lesson.quiz).sort()).toEqual(['options', 'question']);
    expect((await accountDelete(request('/api/account', 'DELETE', { password: 'incorrect' }, cookie))).status).toBe(401);
    expect((await accountDelete(request('/api/account', 'DELETE', { password: 'testing-password-2026' }, cookie))).status).toBe(200);
    expect((await dashboardGet(request('/api/dashboard', 'GET', undefined, cookie))).status).toBe(401);
  });

  it('fails closed without a configured production origin and uses secure host cookies', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_ORIGIN', '');
    try {
      expect((await sessionGet(request('/api/session'))).status).toBe(503);
      expect(sessionCookie('token')).toContain('__Host-study_session=token');
      expect(sessionCookie('token')).toContain('; Secure');
    } finally { vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('APP_ORIGIN', origin); }
  });

  it('checks actual database and solution storage and honestly reports inactive workers', async () => {
    const response = await healthGet(request('/api/health'));
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.database.status).toBe('ready');
    expect(result.strategy.status).toBe('ready');
    expect(result.queue.status).toBe('inactive');
    expect(result.worker.status).toBe('inactive');
  });
});
