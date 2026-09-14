/** Offline experimental model. Never an approved StrategyArtifact. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { canonicalJson } from '../src/domain/canonical';
import { defaultTournamentContext } from '../src/domain/strategy-context';
import { initialTournamentState, applyPublicEvent, type TournamentState } from '../src/domain/tournament-state';
import { MULTI_ACTION_TREE, treeActions } from '../src/domain/preflop-tree';

const context = defaultTournamentContext(2);
const tree = { ...MULTI_ACTION_TREE, preflop: { limp: true, raises: [[{ kind: 'TO_BB' as const, value: 2 }], [{ kind: 'TO_BB' as const, value: 6 }]] }, postflop: { raises: [[{ kind: 'POT_AFTER_CALL' as const, value: 1 / 3 }]] } };
type Node = { actor: number; street: number; edges: number[]; actions: string[]; payoff: number[]; boundary: boolean };
const nodes: Node[] = [];
function build(state: TournamentState, raises: number, boundary = false): number {
  const id = nodes.length;
  const node: Node = { actor: -1, street: state.street === 'preflop' ? 0 : 1, edges: [], actions: [], payoff: [], boundary };
  nodes.push(node);
  const live = state.seats.filter(s => !s.folded);
  if (state.terminal || state.roundClosed && (state.street !== 'preflop' || live.filter(s => s.remaining > 0).length <= 1)) {
    // HU net payoff for BB loss/tie/win from BTN's perspective; uncalled live chips returned.
    const [h, v] = state.seats, matched = Math.min(h.committed - h.ante, v.committed - v.ante);
    const dead = h.ante + v.ante;
    node.payoff = live.length === 1 ? [0, 1, 2].map(() => h.folded ? -h.committed / 10000 : v.committed / 10000)
      : [-matched - h.ante, dead / 2 - h.ante, matched + v.ante].map(x => x / 10000);
    return id;
  }
  if (state.roundClosed) {
    // Only the public betting ledger uses dummy cards. Observations/payoffs use actual chance cards.
    nodes.pop();
    return build(applyPublicEvent(state, { type: 'DEAL', cards: ['2c', '3d', '4h'] }), 0, true);
  }
  node.actor = state.seats.findIndex(s => s.position === state.actor);
  let edges = treeActions(state, raises, tree);
  // Deliberate small flop action abstraction: one opening bet (1/3 pot or jam), no re-raise.
  if (state.street !== 'preflop' && raises > 0) edges = edges.filter(e => e.id === 'fold' || e.id === 'call');
  for (const edge of edges) { node.actions.push(edge.id); node.edges.push(build(edge.next, edge.raises)); }
  return id;
}
build(initialTournamentState(context), 0);
const contract = {
  id: 'PREFLOP_MODEL_V2_PILOT_2', context, preflop: tree.preflop,
  continuation: 'ONE_FLOP_BET_ROUND_THEN_FORCED_CHECKDOWN',
  boardAbstraction: 'FLOP_SUIT_COUNT_X_PAIRED_V1',
  privateAbstraction: 'EXACT_PREFLOP_CLASS_X_FLOP_MADE_CATEGORY_V1',
  recall: 'RETAIN_ROOT_CLASS_AND_PUBLIC_NODE_HISTORY',
  chance: 'ALL_ORDERED_COMPATIBLE_PHYSICAL_HOLES_ONE_SEEDED_RUNOUT_PER_PAIR_WITH_GLOBAL_SUIT_CLOSURE',
  suitClosure: 'EACH_EMPIRICAL_WORLD_REPRESENTS_ALL_24_GLOBAL_RENAMINGS_AT_EQUAL_WEIGHT;_OBSERVATIONS_AND_PAYOFFS_IDENTICAL',
  chanceLimitation: 'Exact physical hole prior; finite empirical board model, NOT exact NLHE runout law',
  actions: { flop: 'CHECK_THIRD_POT_JAM_THEN_FOLD_CALL', later: 'FORCED_CHECKDOWN' },
  algorithm: 'VERSIONED_BY_RUN', verifier: 'INDEPENDENT_NUMPY_PUBLIC_TREE_BR_V1',
  convergencePolicy: 'DIAGNOSTIC_ONLY_NO_PUBLICATION_POLICY', publicationEligible: false,
};
const model = { contract, nodes };
const output = process.argv[2] ?? 'output/preflop-model-v2.json';
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify({ ...model, sha256: createHash('sha256').update(canonicalJson(model)).digest('hex') }));
console.log(JSON.stringify({ output, nodes: nodes.length, decisions: nodes.filter(n => n.actor >= 0).length, boundaries: nodes.filter(n => n.boundary).length, publicationEligible: false }));
