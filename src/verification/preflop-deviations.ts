/** Scalable rejection witness, NOT a best-response upper bound or publication
 * certificate. Independently evaluates predeclared legal deviations against a
 * frozen full profile. No solver traversal, random generator, EV or regrets.
 */
import { createCipheriv } from 'node:crypto';
import { createCombo, createDeck, type Card, type Combo } from '@/domain/cards';
import { treeActions, validateTree, type PreflopTreeDefinition } from '@/domain/preflop-tree';
import { canonicalStrategyContext, type PublicEvent, type StrategyContext } from '@/domain/strategy-context';
import { applyPublicEvent, replayPublicHistory } from '@/domain/tournament-state';
import { independentlySettleTournament } from './multistreet-preflop';
import { encodedInformationKey, type InformationEncoding } from '@/domain/information-encoding';

class VerificationRandom {
  private cipher;
  private bytes = Buffer.alloc(0);
  private at = 0;
  constructor(seed: string) {
    if (!/^[a-f0-9]{64}$/.test(seed)) throw new Error('Independent seed must be 32-byte hex.');
    this.cipher = createCipheriv('aes-256-ctr', Buffer.from(seed, 'hex'), Buffer.alloc(16));
  }
  uint32(): number {
    if (this.at >= this.bytes.length) { this.bytes = this.cipher.update(Buffer.alloc(65536)); this.at = 0; }
    const result = this.bytes.readUInt32LE(this.at); this.at += 4; return result;
  }
  next(): number { return this.uint32() / 4294967296; }
  integer(n: number): number {
    const bound = Math.floor(4294967296 / n) * n;
    let x: number; do { x = this.uint32(); } while (x >= bound);
    return x % n;
  }
}
export interface Moments { n: number; mean: number; m2: number }
export function addObservation(m: Moments, x: number): void {
  if (!Number.isFinite(x)) throw new Error('Nonfinite observation.');
  const delta = x - m.mean; m.mean += delta / ++m.n; m.m2 += delta * (x - m.mean);
}
/** Maurer/Pontil 2009, Theorem 4, applied to -X for a one-sided lower
 * confidence bound. Width is the deterministic support width, not sample max.
 * Fixed sample size; callers must not stop early after seeing the result.
 */
export function empiricalBernsteinLower(m: Moments, width: number, failureProbability: number): number {
  if (!Number.isInteger(m.n) || m.n < 2 || !Number.isFinite(m.mean) || !Number.isFinite(m.m2) || m.m2 < 0 || !Number.isFinite(width) || width <= 0 || !(failureProbability > 0 && failureProbability < 1)) throw new Error('Invalid confidence parameters.');
  const log = Math.log(2 / failureProbability), variance = Math.max(0, m.m2 / (m.n - 1));
  return m.mean - Math.sqrt(2 * variance * log / m.n) - 7 * width * log / (3 * (m.n - 1));
}
export interface Deviation { player: number; rule: 'ROOT_ACTION' | 'POSTFLOP_CHECK_CALL' | 'POSTFLOP_JAM'; actionId?: string }
export interface FrozenPreflopCandidate { context: StrategyContext; tree: PreflopTreeDefinition; profile: Record<string, { actions: Record<string, number> }>; defaultPolicy: 'UNIFORM_UNVISITED_INFORMATION_SETS'; informationEncoding?: InformationEncoding }

export function measurePreflopDeviations(input: FrozenPreflopCandidate, seed: string, samples: number, failureProbability = 1e-9, runtimeLimitMs = 300000) {
  const context = canonicalStrategyContext(input.context), tree = input.tree;
  if (context.players !== 2 || context.conditioning || context.board.length || context.deadCards.length || context.actionHistory.length || context.gameType !== 'TOURNAMENT' || context.evaluationModel !== 'CHIP_EV' || input.defaultPolicy !== 'UNIFORM_UNVISITED_INFORMATION_SETS') throw new Error('Witness currently requires a full-prior HU tournament root.');
  if (!Number.isInteger(samples) || samples < 100 || samples > 1_000_000 || !(failureProbability > 0 && failureProbability < 1) || !Number.isInteger(runtimeLimitMs) || runtimeLimitMs <= 0) throw new Error('Invalid fixed witness budget.');
  validateTree(tree);
  if (!['PHYSICAL', 'GLOBAL_SUIT_ISOMORPHISM_V1'].includes(input.informationEncoding ?? 'PHYSICAL')) throw new Error('Unsupported frozen information encoding.');
  const root = replayPublicHistory(context), menu = treeActions(root, 0, tree);
  const deviations: Deviation[] = [
    ...menu.map(e => ({ player: 0, rule: 'ROOT_ACTION' as const, actionId: e.id })),
    ...[0, 1].flatMap(player => [{ player, rule: 'POSTFLOP_CHECK_CALL' as const }, { player, rule: 'POSTFLOP_JAM' as const }]),
  ];
  const moments = deviations.map(() => ({ n: 0, mean: 0, m2: 0 })), baseline = [{ n: 0, mean: 0, m2: 0 }, { n: 0, mean: 0, m2: 0 }];
  const random = new VerificationRandom(seed), started = performance.now();
  let nodes = 0, defaultLookups = 0, completed = 0;
  const totalStack = context.stacks.reduce((sum, s) => sum + s.stackBb, 0);
  const run = (holes: Combo[], board: Card[], draws: number[], deviation: Deviation | null, cache: Map<string, { hole: Combo; deals: Card[][] }>): number[] => {
    let state = root, history: PublicEvent[] = [], raises = 0;
    for (let depth = 0; depth < 128; depth++) {
      nodes++;
      if (state.terminal || state.roundClosed && state.seats.filter(s => !s.folded && s.remaining > 0).length <= 1) return independentlySettleTournament(state, holes, board);
      if (state.roundClosed) {
        const at = state.board.length, event: PublicEvent = { type: 'DEAL', cards: board.slice(at, at + (at ? 1 : 3)) };
        state = applyPublicEvent(state, event); history = [...history, event]; raises = 0; continue;
      }
      const actor = state.seats.findIndex(s => s.position === state.actor), edges = treeActions(state, raises, tree);
      let forced: string | undefined;
      if (deviation?.player === actor) {
        if (deviation.rule === 'ROOT_ACTION' && history.length === 0) forced = deviation.actionId;
        if (state.street !== 'preflop' && deviation.rule === 'POSTFLOP_CHECK_CALL') forced = edges.find(e => e.id === 'check' || e.id === 'call')?.id;
        if (state.street !== 'preflop' && deviation.rule === 'POSTFLOP_JAM') forced = edges.find(e => e.id === 'jam')?.id ?? edges.find(e => e.id === 'call' || e.id === 'check')?.id;
      }
      let chosen = forced ? edges.find(e => e.id === forced) : undefined;
      if (forced && !chosen) throw new Error('Illegal predeclared deviation.');
      if (!chosen) {
        const key = encodedInformationKey(state.actor!, holes[actor], history, input.informationEncoding, cache), row = input.profile[key];
        if (!row) defaultLookups++;
        const policy = row?.actions ?? Object.fromEntries(edges.map(e => [e.id, 1 / edges.length]));
        if (Object.keys(policy).sort().join('|') !== edges.map(e => e.id).sort().join('|') || Object.values(policy).some(p => !Number.isFinite(p) || p < 0 || p > 1) || Math.abs(Object.values(policy).reduce((s, p) => s + p, 0) - 1) > 1e-10) throw new Error('Invalid frozen policy.');
        let draw = draws[depth]; chosen = edges.at(-1)!;
        for (const edge of edges) { draw -= policy[edge.id]; if (draw < 0) { chosen = edge; break; } }
      }
      raises = chosen.raises; state = chosen.next; history = [...history, chosen.action];
    }
    throw new Error('Independent trajectory exceeded legal depth budget.');
  };
  for (; completed < samples; completed++) {
    if (completed % 64 === 0 && performance.now() - started > runtimeLimitMs) break;
    const deck = createDeck();
    for (let i = 0; i < 9; i++) { const j = i + random.integer(52 - i); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    const holes = [createCombo(deck[0], deck[1]), createCombo(deck[2], deck[3])], board = [...deck.slice(4, 7).sort(), ...deck.slice(7, 9)];
    const draws = Array.from({ length: 128 }, () => random.next());
    const cache = new Map<string, { hole: Combo; deals: Card[][] }>();
    const values = run(holes, board, draws, null, cache);
    values.forEach((v, p) => addObservation(baseline[p], v));
    deviations.forEach((d, i) => {
      const gain = run(holes, board, draws, d, cache)[d.player] - values[d.player];
      if (Math.abs(gain) > totalStack + 1e-9) throw new Error('Payoff support bound violated.');
      addObservation(moments[i], gain);
    });
  }
  const fixedSampleComplete = completed === samples;
  const witnesses = deviations.map((d, i) => ({ ...d, ...moments[i], variance: moments[i].n > 1 ? moments[i].m2 / (moments[i].n - 1) : null,
    lowerGainBb: fixedSampleComplete ? empiricalBernsteinLower(moments[i], 2 * totalStack, failureProbability / deviations.length) : null }));
  const lowerByPlayer = [0, 1].map(p => fixedSampleComplete ? Math.max(0, ...witnesses.filter(w => w.player === p).map(w => w.lowerGainBb!)) : null);
  return { method: 'INDEPENDENT_FIXED_DEVIATION_EMPIRICAL_BERNSTEIN_V1', publicationEligible: false,
    status: !fixedSampleComplete ? 'COMPUTE_LIMIT' : lowerByPlayer.some(x => x! > 0) ? 'POSITIVE_DEVIATION_WITNESS' : 'INCONCLUSIVE',
    requestedSamples: samples, completedSamples: completed, seed, randomGenerator: 'AES_256_CTR_REJECTION_SHUFFLE',
    confidenceAssumption: 'IID_RANDOM_DRAWS_IDEALIZATION_OF_RECORDED_CRYPTOGRAPHIC_STREAM',
    familywiseFailureProbability: failureProbability, supportWidthBb: 2 * totalStack, baseline, witnesses, lowerByPlayer,
    nashConvLowerBoundBb: fixedSampleComplete ? lowerByPlayer.reduce<number>((s, x) => s + x!, 0) : null,
    nashConvUpperBoundBb: null, nodes, defaultLookups, runtimeMs: performance.now() - started };
}
