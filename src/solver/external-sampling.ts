/** Original implementation of external-sampling regret updates (Lanctot et al.,
 * 2009). General-player averaging uses a separate full-support sampled path,
 * importance-weighted by own reach / proposal reach. A solver diagnostic is
 * never an equilibrium certificate, particularly in multiplayer games.
 */
export interface SampledDecision<S> { kind: 'decision'; player: number; key: string; actions: { id: string; child: S }[] }
export interface SamplingGame<S> {
  players: number;
  sampleRoot: (random: SeededRandom) => S;
  inspect: (state: S) => SampledDecision<S> | { kind: 'terminal'; payoff: number[] };
}
export class SeededRandom {
  private state: number;
  constructor(seed: number) {
    if (!Number.isInteger(seed) || seed <= 0 || seed > 0xffffffff) throw new Error('Seed must be a nonzero uint32.');
    this.state = seed;
  }
  uint32(): number {
    let x = this.state; x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return this.state = x >>> 0;
  }
  next(): number { return (this.uint32() - 1) / 0xffffffff; }
  integer(n: number): number {
    if (!Number.isSafeInteger(n) || n < 1 || n > 0xffffffff) throw new Error('Invalid random bound.');
    // xorshift32 cycles through 1..2^32-1; rejection removes modulo bias.
    const limit = Math.floor(0xffffffff / n) * n;
    let x: number;
    do { x = this.uint32() - 1; } while (x >= limit);
    return x % n;
  }
  choose(probabilities: readonly number[]): number {
    let draw = this.next();
    for (let i = 0; i < probabilities.length - 1; i++) { draw -= probabilities[i]; if (draw < 0) return i; }
    return probabilities.length - 1;
  }
}
interface Info { actions: string[]; regret: number[]; sum: number[]; samples: number; player: number }
export interface SamplingLimits { iterations: number; runtimeMs: number; nodes: number; infosets: number; heapBytes: number }
export interface SamplingResult {
  status: 'COMPUTE_LIMIT' | 'NON_CONVERGED'; reason: string;
  iterations: number; completedRegretTraversals: number; nodes: number; infosets: number; runtimeMs: number; peakHeapBytes: number;
  algorithm: 'EXTERNAL_SAMPLING_MCCFR_IMPORTANCE_AVERAGING_V1'; seed: number;
  defaultPolicy: 'UNIFORM_UNVISITED_INFORMATION_SETS';
  nashConv: null; exploitability: null;
  observedRootInformationSets: string[];
  unaveragedInformationSets: number;
  profile: Record<string, { actions: Record<string, number>; averageSamples: number }>;
}
class ComputeLimit extends Error {}
const normalize = (weights: number[]) => {
  const sum = weights.reduce((a, b) => a + b, 0);
  return sum > 0 ? weights.map(w => w / sum) : weights.map(() => 1 / weights.length);
};

export function runExternalSampling<S>(game: SamplingGame<S>, seed: number, limits: SamplingLimits): SamplingResult {
  if (!Number.isInteger(game.players) || game.players < 2 || game.players > 9) throw new Error('Invalid player count.');
  for (const value of Object.values(limits)) if (!Number.isSafeInteger(value) || value < 1) throw new Error('Positive finite integer compute limits required.');
  const rng = new SeededRandom(seed), infos = new Map<string, Info>(), started = performance.now(), rootKeys = new Set<string>();
  let nodes = 0, iterations = 0, traversals = 0, peakHeapBytes = process.memoryUsage().heapUsed;
  const guard = (depth: number) => {
    if (++nodes > limits.nodes) throw new ComputeLimit('NODE_BUDGET');
    if (depth > 128) throw new ComputeLimit('DEPTH_BUDGET');
    if (nodes % 256 === 1) {
      peakHeapBytes = Math.max(peakHeapBytes, process.memoryUsage().heapUsed);
      if (performance.now() - started >= limits.runtimeMs) throw new ComputeLimit('RUNTIME_BUDGET');
      if (peakHeapBytes >= limits.heapBytes) throw new ComputeLimit('HEAP_BUDGET');
    }
  };
  const infoFor = (node: SampledDecision<S>) => {
    const actions = node.actions.map(a => a.id);
    if (!actions.length || new Set(actions).size !== actions.length || !Number.isInteger(node.player) || node.player < 0 || node.player >= game.players) throw new Error('Invalid information set.');
    let info = infos.get(node.key);
    if (!info) {
      if (infos.size >= limits.infosets) throw new ComputeLimit('INFOSET_BUDGET');
      info = { actions, player: node.player, regret: actions.map(() => 0), sum: actions.map(() => 0), samples: 0 };
      infos.set(node.key, info);
    }
    if (info.player !== node.player || info.actions.join('|') !== actions.join('|')) throw new Error('Inconsistent information-set identity.');
    return info;
  };
  const policy = (info: Info) => normalize(info.regret.map(r => Math.max(0, r)));
  let status: SamplingResult['status'] = 'NON_CONVERGED', reason = 'ITERATION_BUDGET_NO_INDEPENDENT_CERTIFICATE';
  try {
    for (; iterations < limits.iterations; iterations++) {
      for (let player = 0; player < game.players; player++) {
        const updates = new Map<Info, number[]>();
        const walk = (state: S, depth: number): number => {
          guard(depth);
          const node = game.inspect(state);
          if (node.kind === 'terminal') {
            if (node.payoff.length !== game.players || node.payoff.some(v => !Number.isFinite(v))) throw new Error('Invalid payoff.');
            return node.payoff[player];
          }
          const info = infoFor(node), sigma = policy(info);
          if (depth === 0) rootKeys.add(node.key);
          if (node.player !== player) return walk(node.actions[rng.choose(sigma)].child, depth + 1);
          const values = node.actions.map(a => walk(a.child, depth + 1));
          const value = values.reduce((s, v, i) => s + v * sigma[i], 0);
          const delta = updates.get(info) ?? values.map(() => 0);
          values.forEach((v, i) => delta[i] += v - value);
          updates.set(info, delta);
          return value;
        };
        walk(game.sampleRoot(rng), 0);
        // Never commit a partially interrupted regret traversal.
        for (const [info, delta] of updates) delta.forEach((v, i) => info.regret[i] += v);
        traversals++;
      }
      let state = game.sampleRoot(rng), proposalReach = 1;
      const ownReach = Array(game.players).fill(1) as number[];
      const averages: { info: Info; values: number[] }[] = [];
      for (let depth = 0; ; depth++) {
        guard(depth);
        const node = game.inspect(state);
        if (node.kind === 'terminal') break;
        const info = infoFor(node), sigma = policy(info);
        if (depth === 0) rootKeys.add(node.key);
        const weight = ownReach[node.player] / proposalReach;
        if (!Number.isFinite(weight)) throw new ComputeLimit('IMPORTANCE_WEIGHT_OVERFLOW');
        averages.push({ info, values: sigma.map(p => p * weight) });
        const proposal = sigma.map(p => .9 * p + .1 / sigma.length), index = rng.choose(proposal);
        ownReach[node.player] *= sigma[index]; proposalReach *= proposal[index];
        state = node.actions[index].child;
      }
      for (const { info, values } of averages) {
        values.forEach((v, i) => info.sum[i] += v); info.samples++;
      }
    }
  } catch (error) {
    if (!(error instanceof ComputeLimit)) throw error;
    status = 'COMPUTE_LIMIT'; reason = error.message;
  }
  const profile: SamplingResult['profile'] = {};
  let unaveragedInformationSets = 0;
  for (const [key, info] of infos) {
    // Zero accumulated average is exactly the declared uniform default. Do not
    // serialize hundreds of thousands of identical fallback policy objects.
    if (!info.samples) { unaveragedInformationSets++; continue; }
    const average = normalize(info.sum);
    profile[key] = { actions: Object.fromEntries(info.actions.map((a, i) => [a, average[i]])), averageSamples: info.samples };
  }
  return { status, reason, iterations, completedRegretTraversals: traversals, nodes, infosets: infos.size,
    runtimeMs: performance.now() - started, peakHeapBytes, algorithm: 'EXTERNAL_SAMPLING_MCCFR_IMPORTANCE_AVERAGING_V1', seed,
    defaultPolicy: 'UNIFORM_UNVISITED_INFORMATION_SETS', nashConv: null, exploitability: null,
    observedRootInformationSets: [...rootKeys], unaveragedInformationSets, profile };
}
