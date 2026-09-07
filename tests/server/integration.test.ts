import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createLocalDatabase, createMemoryDatabase, createPostgresDatabase, type Database } from '@/server/db';
import { completeLesson, dashboard, deleteAccount, exportAccount, login, logout, recordDecision, register, requireUser, sessionUser, updateSettings } from '@/server/service';
import { enforceRateLimit, sha256, verifyPassword } from '@/server/security';
import { getTrainingSpots } from '@/strategy';

const password = 'correct-horse-poker-2026';
const account = () => ({ name: 'Testspieler', email: `player-${randomUUID()}@example.test`, password });
let db: Database;

beforeAll(async () => { db = await createMemoryDatabase(); });
afterAll(async () => { await db.close(); });

describe('accounts and durable learning data', () => {
  it('retains account sessions and learning progress after closing and reopening filesystem storage', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'rangeform-db-test-'));
    let local: Database | undefined;
    try {
      local = await createLocalDatabase(directory);
      await expect(createLocalDatabase(directory)).rejects.toThrow('bereits geöffnet');
      const created = await register(local, account());
      await completeLesson(local, created.user, 1);
      const [spot] = await getTrainingSpots();
      await recordDecision(local, created.user, { spotId: spot.id, action: spot.actions[0].id, attemptId: randomUUID(), solutionVersion: spot.solutionVersion });
      await local.close();
      local = undefined;
      const exited = spawnSync(process.execPath, ['-e', 'process.exit(0)']);
      if (!exited.pid || exited.status !== 0) throw new Error('Could not create a completed test process');
      await writeFile(path.join(directory, '.rangeform-process-lock'), String(exited.pid));
      local = await createLocalDatabase(directory);
      expect(await sessionUser(local, created.token)).toEqual(created.user);
      const restored = await dashboard(local, created.user);
      expect(restored.decisions).toBe(1);
      expect(restored.lessonCompleted).toBe(true);
      expect(restored.xp).toBe(60);
    } finally {
      if (local) await local.close();
      const resolved = path.resolve(directory);
      if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('rangeform-db-test-')) throw new Error('Unsafe temporary cleanup path');
      await rm(resolved, { recursive: true, force: true });
    }
  });
  it('normalizes email, hashes passwords and session tokens, expires and revokes sessions', async () => {
    const input = account();
    input.email = `  ${input.email.toUpperCase()}  `;
    const result = await register(db, input);
    expect(result.user.email).toBe(input.email.trim().toLowerCase());
    expect(await sessionUser(db, result.token)).toEqual(result.user);
    const stored = await db.query<{ password_hash: string }>('SELECT password_hash FROM study_users WHERE id = $1', [result.user.id]);
    expect(stored[0].password_hash).toMatch(/^scrypt-v2:131072:8:1:/);
    expect(await verifyPassword(password, stored[0].password_hash)).toBe(true);
    expect(stored[0].password_hash).not.toContain(password);
    const sessions = await db.query<{ token_hash: string }>('SELECT token_hash FROM study_sessions WHERE user_id = $1', [result.user.id]);
    expect(sessions[0].token_hash).toBe(sha256(result.token));
    expect(sessions[0].token_hash).not.toBe(result.token);
    await logout(db, result.token);
    expect(await sessionUser(db, result.token)).toBeNull();
    await expect(login(db, { email: result.user.email, password: 'wrong' })).rejects.toMatchObject({ status: 401 });
    const again = await login(db, { email: result.user.email, password });
    expect(again.token).not.toBe(result.token);
    await db.query('UPDATE study_sessions SET expires_at = now() - interval \'1 second\' WHERE token_hash = $1', [sha256(again.token)]);
    expect(await sessionUser(db, again.token)).toBeNull();
    await expect(requireUser(db, again.token)).rejects.toMatchObject({ status: 401 });
  });

  it('persists lesson completion and evaluations exactly once, with account isolation', async () => {
    const first = await register(db, account());
    const second = await register(db, account());
    expect(await completeLesson(db, first.user, 0)).toEqual({ correct: false });
    expect((await dashboard(db, first.user)).lessonCompleted).toBe(false);
    await completeLesson(db, first.user, 1);
    await completeLesson(db, first.user, 1);
    const afterLesson = await dashboard(db, first.user);
    expect(afterLesson.recent).toHaveLength(1);
    expect(afterLesson.recent[0].label).toBe('Lektion abgeschlossen');
    const [spot] = await getTrainingSpots();
    const input = { spotId: spot.id, action: spot.actions[0].id, attemptId: randomUUID(), solutionVersion: spot.solutionVersion };
    const evaluation = await recordDecision(db, first.user, input);
    expect(evaluation.sourceType).toBe('COMPUTED');
    expect(await recordDecision(db, first.user, input)).toEqual(evaluation);
    const firstDashboard = await dashboard(db, first.user);
    expect(firstDashboard.decisions).toBe(1);
    expect(firstDashboard.xp).toBe(60);
    expect(firstDashboard.daily).toHaveLength(1);
    expect((await dashboard(db, second.user)).decisions).toBe(0);
    expect((await dashboard(db, second.user)).lessonCompleted).toBe(false);
    expect((await exportAccount(db, second.user)).trainingDecisions).toEqual([]);
    await expect(recordDecision(db, first.user, { ...input, action: spot.actions[1].id })).rejects.toMatchObject({ status: 409 });
    await expect(recordDecision(db, first.user, { ...input, solutionVersion: 'retired-version' })).rejects.toMatchObject({ status: 409, code: 'ATTEMPT_CONFLICT' });
    await expect(recordDecision(db, first.user, { ...input, attemptId: randomUUID(), solutionVersion: 'retired-version' })).rejects.toMatchObject({ status: 409, code: 'SOLUTION_CHANGED' });
    await expect(recordDecision(db, first.user, { ...input, attemptId: randomUUID(), action: 'raise-to-100' })).rejects.toMatchObject({ status: 400 });
    await expect(recordDecision(db, first.user, { ...input, attemptId: randomUUID(), spotId: 'invented' })).rejects.toMatchObject({ status: 400 });
    expect((await dashboard(db, first.user)).decisions).toBe(1);
  });

  it('deduplicates simultaneous decision submissions at the database constraint', async () => {
    const { user } = await register(db, account());
    const [spot] = await getTrainingSpots();
    const input = { spotId: spot.id, action: spot.actions[0].id, attemptId: randomUUID(), solutionVersion: spot.solutionVersion };
    const results = await Promise.all([recordDecision(db, user, input), recordDecision(db, user, input)]);
    expect(results[0]).toEqual(results[1]);
    expect((await dashboard(db, user)).decisions).toBe(1);
  });

  it('exports safe data and cascades account deletion only after password verification', async () => {
    const { user, token } = await register(db, account());
    await completeLesson(db, user, 1);
    const [spot] = await getTrainingSpots();
    await recordDecision(db, user, { spotId: spot.id, action: spot.actions[0].id, attemptId: randomUUID(), solutionVersion: spot.solutionVersion });
    const updated = await updateSettings(db, user, { name: 'Ada', weeklyGoal: 5, experience: 'intermediate' });
    expect(updated.name).toBe('Ada');
    expect(updated.weeklyGoal).toBe(5);
    const exported = await exportAccount(db, updated);
    expect(exported.user).toEqual(updated);
    expect(exported.trainingDecisions).toHaveLength(1);
    expect(JSON.stringify(exported)).not.toMatch(/password_hash|token_hash|scrypt-v2/);
    await expect(deleteAccount(db, updated, 'wrong')).rejects.toMatchObject({ status: 401 });
    expect(await sessionUser(db, token)).not.toBeNull();
    await deleteAccount(db, updated, password);
    expect(await sessionUser(db, token)).toBeNull();
    for (const table of ['study_sessions', 'lesson_completions', 'training_decisions']) {
      expect(await db.query(`SELECT user_id FROM ${table} WHERE user_id = $1`, [user.id])).toEqual([]);
    }
    expect(await db.query('SELECT id FROM study_users WHERE id = $1', [user.id])).toEqual([]);
  });

  it('rejects duplicate accounts and bounds durable rate counters', async () => {
    const input = account();
    await register(db, input);
    await expect(register(db, input)).rejects.toMatchObject({ status: 409 });
    const key = `test:${randomUUID()}`;
    await enforceRateLimit(db, key, 2, 60);
    await enforceRateLimit(db, key, 2, 60);
    await expect(enforceRateLimit(db, key, 2, 60)).rejects.toMatchObject({ status: 429 });
    const rows = await db.query<{ key: string; count: number }>('SELECT key, count FROM request_limits WHERE key = $1', [sha256(key)]);
    expect(rows[0].count).toBe(3);
    expect(rows[0].key).not.toBe(key);
  });
});

describe.runIf(Boolean(process.env.TEST_DATABASE_URL))('external PostgreSQL integration', () => {
  it('uses the production pg driver and the same migration for a complete account lifecycle', async () => {
    const postgres = await createPostgresDatabase(process.env.TEST_DATABASE_URL!);
    let userId: string | undefined;
    try {
      const created = await register(postgres, account());
      userId = created.user.id;
      await completeLesson(postgres, created.user, 1);
      const [spot] = await getTrainingSpots();
      const input = { spotId: spot.id, action: spot.actions[0].id, attemptId: randomUUID(), solutionVersion: spot.solutionVersion };
      await Promise.all([recordDecision(postgres, created.user, input), recordDecision(postgres, created.user, input)]);
      const readback = await dashboard(postgres, created.user);
      expect(readback.decisions).toBe(1);
      expect(readback.lessonCompleted).toBe(true);
      await deleteAccount(postgres, created.user, password);
      expect(await sessionUser(postgres, created.token)).toBeNull();
    } finally {
      if (userId) await postgres.query('DELETE FROM study_users WHERE id = $1', [userId]);
      await postgres.close();
    }
  });
});
