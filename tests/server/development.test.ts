import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryDatabase } from '@/server/db';
import { DEVELOPMENT_DEMO, developmentAccessEnabled } from '@/server/development';
import { seedDevelopmentAccount } from '@/server/seed';
import { dashboard, login, recordDecision, register, sessionUser } from '@/server/service';
import { getTrainingSpots } from '@/strategy';
import { requireSameOrigin } from '@/server/security';
import { randomUUID } from 'node:crypto';
import { safeReturnTo } from '@/shared/navigation';

afterEach(() => vi.unstubAllEnvs());
describe('local access and production isolation', () => {
  it('seeds an actual account with computed decisions and preserves subsequent progress on reseed', async () => {
    vi.stubEnv('NODE_ENV', 'development'); vi.stubEnv('DATABASE_URL', '');
    const db = await createMemoryDatabase();
    try {
      await seedDevelopmentAccount(db);
      const { user, token } = await login(db, DEVELOPMENT_DEMO);
      expect(user.developmentOnly).toBe(true);
      expect((await dashboard(db, user)).decisions).toBe(3);
      expect((await dashboard(db, user)).lessonCompleted).toBe(false);
      const [spot] = await getTrainingSpots();
      await recordDecision(db, user, { spotId: spot.id, action: spot.actions[0].id, attemptId: randomUUID(), solutionVersion: spot.solutionVersion });
      await seedDevelopmentAccount(db);
      expect((await dashboard(db, user)).decisions).toBe(4);
      expect(await sessionUser(db, token)).toEqual(user);
      const data = await db.query<{ evaluation: { sourceType: string } }>('SELECT evaluation FROM training_decisions WHERE user_id = $1', [user.id]);
      expect(data.every(row => row.evaluation.sourceType === 'COMPUTED')).toBe(true);
      vi.stubEnv('NODE_ENV', 'production');
      expect(developmentAccessEnabled()).toBe(false);
      await expect(seedDevelopmentAccount(db)).rejects.toThrow('ausschließlich');
      await expect(login(db, DEVELOPMENT_DEMO)).rejects.toMatchObject({ status: 401 });
      expect(await sessionUser(db, token)).toBeNull();
      vi.stubEnv('NODE_ENV', 'development'); vi.stubEnv('DATABASE_URL', 'postgresql://deployment/db');
      await expect(seedDevelopmentAccount(db)).rejects.toThrow('ausschließlich');
      expect(await sessionUser(db, token)).toBeNull();
    } finally { await db.close(); }
  });
  it('reserves the demo email rather than allowing a production default account', async () => {
    const db = await createMemoryDatabase();
    try { await expect(register(db, { name: 'Demo', ...DEVELOPMENT_DEMO })).rejects.toMatchObject({ code: 'RESERVED_ACCOUNT' }); }
    finally { await db.close(); }
  });
  it('accepts the actual local hostname in development while preserving cross-site and production checks', () => {
    vi.stubEnv('NODE_ENV', 'development'); vi.stubEnv('APP_ORIGIN', 'http://127.0.0.1:3000');
    const make = (origin: string) => new Request('http://localhost:3000/api/auth/login', { method: 'POST', headers: { origin, 'content-type': 'application/json' } });
    expect(() => requireSameOrigin(make('http://localhost:3000'))).not.toThrow();
    expect(() => requireSameOrigin(make('http://127.0.0.1:3000'))).toThrow();
    expect(() => requireSameOrigin(make('https://attacker.example'))).toThrow();
    const alias = new Request('http://localhost:3000/api/auth/login', { method: 'POST', headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000', 'content-type': 'application/json' } });
    expect(() => requireSameOrigin(alias)).not.toThrow();
    const forged = new Request('http://localhost:3000/api/auth/login', { method: 'POST', headers: { host: 'attacker.example', origin: 'https://attacker.example', 'content-type': 'application/json' } });
    expect(() => requireSameOrigin(forged)).toThrow();
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => requireSameOrigin(make('http://localhost:3000'))).toThrow();
  });
  it('only permits known local login destinations', () => {
    expect(safeReturnTo('/academy/grundlagen/entscheidungen')).toBe('/academy/grundlagen/entscheidungen');
    for (const unsafe of ['https://attacker.example', '//attacker.example', '/login', '/api/account', '/\\attacker.example']) expect(safeReturnTo(unsafe)).toBe('/');
  });
});
