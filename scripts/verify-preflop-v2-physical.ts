/** Independent physical stress test of a finite-model strategy lift. Never grants VERIFIED. */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { allHandClasses, getHandClass } from '../src/domain/cards';
import { evaluateFive } from '../src/domain/holdem';
import { MULTI_ACTION_TREE } from '../src/domain/preflop-tree';
import type { StrategyContext } from '../src/domain/strategy-context';
import { measurePreflopDeviations, type DiagnosticPolicyMapping } from '../src/verification/preflop-deviations';

type Node = { actor: number; street: number; edges: number[]; actions: string[] };
const modelBytes = readFileSync(process.argv[2]), profileBytes = readFileSync(process.argv[3]);
const model = JSON.parse(modelBytes.toString()) as { contract: { context: StrategyContext; preflop: typeof MULTI_ACTION_TREE.preflop }; nodes: Node[] };
const profile = JSON.parse(profileBytes.toString()) as number[];
const offsets: number[] = []; let size = 0;
for (const n of model.nodes) { offsets.push(size); if (n.actor >= 0) size += (n.street ? 9126 : 169) * n.edges.length; }
if (profile.length !== size || profile.some(p => !Number.isFinite(p) || p < 0 || p > 1)) throw new Error('Invalid numeric profile');
const classes = allHandClasses();
const mapping: DiagnosticPolicyMapping = (state, hole, history, legal) => {
  let node = 0;
  for (const event of history) {
    if (event.type === 'DEAL') continue;
    const id = event.type === 'RAISE' ? `raise-${Math.round(event.toBb * 10000)}` : event.type.toLowerCase();
    const at = model.nodes[node].actions.indexOf(id);
    if (at < 0) { node = -1; break; }
    node = model.nodes[node].edges[at];
  }
  const n = node < 0 ? null : model.nodes[node];
  const policy = Object.fromEntries(legal.map(a => [a, 0]));
  // Explicit forced checkdown and off-tree response. This defines the physical lift;
  // it is never silently treated as an unrestricted equilibrium strategy.
  if (!n || n.actor < 0 || state.street === 'turn' || state.street === 'river') {
    const action = legal.find(a => a === 'check' || a === 'call') ?? legal.find(a => a === 'fold');
    if (!action) throw new Error('Missing passive lift action');
    policy[action] = 1; return policy;
  }
  const root = classes.indexOf(getHandClass(hole));
  let code = root;
  if (n.street) {
    const flop = state.board.slice(0, 3), suits = new Set(flop.map(c => c[1])).size;
    const paired = new Set(flop.map(c => c[0])).size < 3 ? 1 : 0;
    code = root * 54 + (paired * 3 + suits - 1) * 9 + evaluateFive([...hole, ...flop]).category;
  }
  n.actions.forEach((a, i) => { if (!(a in policy)) throw new Error('Model action not physically legal'); policy[a] = profile[offsets[node] + code * n.actions.length + i]; });
  return policy;
};
const sources = ['scripts/verify-preflop-v2-physical.ts', 'src/verification/preflop-deviations.ts', 'src/verification/multistreet-preflop.ts', 'src/domain/holdem.ts', 'src/domain/tournament-state.ts', 'src/domain/preflop-tree.ts'];
const hashes = () => Object.fromEntries(sources.map(p => [p, createHash('sha256').update(readFileSync(p).toString().replaceAll('\r\n', '\n')).digest('hex')]));
const before = hashes();
const result = measurePreflopDeviations({ context: model.contract.context, tree: { ...MULTI_ACTION_TREE, preflop: model.contract.preflop, postflop: { raises: [[{ kind: 'POT_AFTER_CALL', value: 1 / 3 }]] } }, profile: {}, defaultPolicy: 'UNIFORM_UNVISITED_INFORMATION_SETS' }, randomBytes(32).toString('hex'), 20000, 1e-9, 300000, mapping);
if (JSON.stringify(before) !== JSON.stringify(hashes())) throw new Error('Sources changed during measurement');
writeFileSync(process.argv[4] ?? 'output/preflop-v2-physical.json', JSON.stringify({ ...result, sources: before,
  modelHash: createHash('sha256').update(modelBytes).digest('hex'), profileHash: createHash('sha256').update(profileBytes).digest('hex'),
  lift: 'MODEL_ACTIONS_THEN_FORCED_CHECK_CALL; OFF_TREE_CHECK_CALL' }, null, 2));
console.log(JSON.stringify({ status: result.status, nashConvLowerBoundBb: result.nashConvLowerBoundBb, publicationEligible: false }));
