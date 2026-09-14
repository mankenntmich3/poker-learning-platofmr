import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import { canonicalJson } from '@/domain/canonical';
import { canonicalStrategyContext, strategyContextSchema } from '@/domain/strategy-context';
import type { Database } from './db';
import { exactContextKey } from './solution-registry';

const nonnegative = z.number().finite().nonnegative();
const sha = z.string().regex(/^[a-f0-9]{64}$/);
const attempt = z.object({
  schemaVersion: z.literal('PREFLOP_EXPERIMENT_1'), publishable: z.literal(false),
  informationEncoding: z.enum(['PHYSICAL', 'GLOBAL_SUIT_ISOMORPHISM_V1']).optional(),
  context: strategyContextSchema, contextSha256: sha, treeSha256: sha, sourceSha256: sha,
  status: z.enum(['COMPUTE_LIMIT', 'NON_CONVERGED']), reason: z.string().min(1),
  iterations: nonnegative, completedRegretTraversals: nonnegative, nodes: nonnegative,
  infosets: nonnegative, runtimeMs: nonnegative, peakHeapBytes: nonnegative,
  seed: z.number().int().positive(), expectedRootCombos: nonnegative, visitedRootCombos: nonnegative, averagedRootCombos: nonnegative,
  algorithm: z.literal('EXTERNAL_SAMPLING_MCCFR_IMPORTANCE_AVERAGING_V1'),
  nashConv: z.null(), exploitability: z.null(),
  verification: z.object({ status: z.literal('COMPUTE_LIMIT'), reason: z.string().min(1), runtimeMs: nonnegative, nodes: nonnegative,
    terminalPayoffs: nonnegative, dealsStarted: nonnegative, totalChanceDeals: z.string().regex(/^\d+$/), report: z.null() }),
});
/** Store failure evidence only. This function cannot insert an artifact or set
 * VERIFIED. A generator-controlled report cannot cross the publication gate.
 */
export async function recordUnverifiedAttempt(db: Database, input: unknown): Promise<string> {
  const parsed = attempt.parse(input), context = canonicalStrategyContext(parsed.context);
  if (createHash('sha256').update(canonicalJson(context)).digest('hex') !== parsed.contextSha256) throw new Error('Attempt context hash mismatch.');
  if (parsed.averagedRootCombos > parsed.visitedRootCombos || parsed.visitedRootCombos > parsed.expectedRootCombos) throw new Error('Impossible diagnostic coverage counts.');
  const priority = context.players === 2 ? 1 : context.players === 3 ? 2 : context.actionHistory.some(e => e.type === 'RAISE') ? 4 : 3;
  const id = randomUUID();
  await db.query(`INSERT INTO solver_jobs (id,context_key,config,priority,status,error,completed_at)
    VALUES ($1,$2,$3::jsonb,$4,$5,$6,now())`, [id, exactContextKey(context, parsed.treeSha256), JSON.stringify(parsed), priority, parsed.status,
    `${parsed.reason}; independent verifier: ${parsed.verification.reason}`]);
  return id;
}
