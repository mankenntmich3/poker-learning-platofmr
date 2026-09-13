import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { createMemoryDatabase, createPostgresDatabase, migrate, type Database } from '@/server/db';
import { recordUnverifiedAttempt } from '@/server/solver-attempts';
import { canonicalJson } from '@/domain/canonical';
import { canonicalStrategyContext, defaultTournamentContext, positionsFor } from '@/domain/strategy-context';
import { MULTI_ACTION_TREE } from '@/domain/preflop-tree';
import { createMultistreetPreflopGame, expectedRootInformationKeys } from '@/solver/multistreet-preflop';
import { runExternalSampling } from '@/solver/external-sampling';
import { attemptFullPreflopVerification } from '@/verification/multistreet-preflop';
import { findExactVerifiedSolution, solutionCoverage } from '@/server/solution-registry';

const hash = (value: unknown) => createHash('sha256').update(canonicalJson(value)).digest('hex');
function realAttempt(players: number) {
  const input = defaultTournamentContext(players); input.actionHistory = []; input.hero = positionsFor(players)[0];
  const context = canonicalStrategyContext(input), result = runExternalSampling(createMultistreetPreflopGame(context, MULTI_ACTION_TREE), 101,
    { iterations: 100, nodes: 200, runtimeMs: 60000, infosets: 10000, heapBytes: 1024 ** 3 });
  const keys = expectedRootInformationKeys(context);
  return { ...result, schemaVersion: 'PREFLOP_EXPERIMENT_1', publishable: false, context, contextSha256: hash(context), treeSha256: hash(MULTI_ACTION_TREE), sourceSha256: 'a'.repeat(64),
    expectedRootCombos: keys.length, visitedRootCombos: keys.filter(k => Object.hasOwn(result.profile, k)).length,
    averagedRootCombos: keys.filter(k => (result.profile[k]?.averageSamples ?? 0) > 0).length,
    verification: attemptFullPreflopVerification(context, MULTI_ACTION_TREE, result.profile, { nodes: 100, runtimeMs: 60000 }),
  };
}
async function assertPersistence(db: Database) {
  const ids: string[] = [];
  try {
    for (const players of [2, 3, 6]) {
      const report = realAttempt(players), id = await recordUnverifiedAttempt(db, report); ids.push(id);
      const row = (await db.query<{ status: string; priority: number; config: Record<string, unknown> }>('SELECT status,priority,config FROM solver_jobs WHERE id=$1', [id]))[0];
      expect(row.status).toBe('COMPUTE_LIMIT'); expect(row.priority).toBe(players === 2 ? 1 : players === 3 ? 2 : 3);
      expect(row.config).not.toHaveProperty('profile'); expect(row.config.nashConv).toBeNull();
      expect(await findExactVerifiedSolution(db, report.context, report.treeSha256)).toBeNull();
      expect((await solutionCoverage(db)).filter(r => r.modelId === MULTI_ACTION_TREE.id && r.verified)).toEqual([]);
      await expect(recordUnverifiedAttempt(db, { ...report, status: 'VERIFIED' })).rejects.toThrow();
      await expect(recordUnverifiedAttempt(db, { ...report, verification: { ...report.verification, report: { nashConv: 0 } } })).rejects.toThrow();
    }
    await migrate(db);
    for (const id of ids) expect((await db.query<{ status: string }>('SELECT status FROM solver_jobs WHERE id=$1', [id]))[0].status).toBe('COMPUTE_LIMIT');
  } finally { for (const id of ids) await db.query('DELETE FROM solver_jobs WHERE id=$1', [id]); }
}
describe('bounded solve → independent verification failure → database → unavailable lookup', () => {
  let db: Database;
  beforeAll(async () => { db = await createMemoryDatabase(); });
  afterAll(async () => { await db.close(); });
  it('records real HU/3/6 attempts, survives migrations and cannot publish them', async () => { await assertPersistence(db); });
});
describe.runIf(Boolean(process.env.TEST_DATABASE_URL))('PostgreSQL solver compute-limit persistence', () => {
  it('runs the same failure boundary on managed-compatible PostgreSQL', async () => {
    const db = await createPostgresDatabase(process.env.TEST_DATABASE_URL!);
    try { await assertPersistence(db); } finally { await db.close(); }
  });
});
