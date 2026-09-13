import { allCombos, type Combo } from './cards';
import { bbToUnits, CHIP_UNITS_PER_BB } from './chips';
import { canonicalStrategyContext, type PublicAction, type StrategyContext } from './strategy-context';
import { applyPublicAction, type TournamentState } from './tournament-state';

/** Action abstraction only. Every non-all-in continuation plays flop/turn/river.
 * POT_AFTER_CALL means raise BY fraction * (pot + amount owed), above current bet.
 * Sizes which are illegal at a particular stack are omitted, never clamped.
 */
export type TreeSize = { kind: 'TO_BB'; value: number } | { kind: 'POT_AFTER_CALL'; value: number };
export interface PreflopTreeDefinition {
  version: 1;
  id: string;
  preflop: { limp: boolean; raises: TreeSize[][] };
  postflop: { raises: TreeSize[][] };
  jam: boolean;
  continuation: 'PLAY_TO_TERMINAL';
  cardAbstraction: 'NONE';
  splitPot: 'FRACTIONAL_CHIP_EV';
}
export const MULTI_ACTION_TREE: PreflopTreeDefinition = {
  version: 1, id: 'rangeform-preflop-multistreet-v1',
  preflop: { limp: true, raises: [
    [{ kind: 'TO_BB', value: 2 }, { kind: 'TO_BB', value: 2.2 }],
    [{ kind: 'TO_BB', value: 5 }, { kind: 'TO_BB', value: 6 }],
    [{ kind: 'TO_BB', value: 10 }],
  ] },
  postflop: { raises: [[{ kind: 'POT_AFTER_CALL', value: .5 }]] },
  jam: true, continuation: 'PLAY_TO_TERMINAL', cardAbstraction: 'NONE', splitPot: 'FRACTIONAL_CHIP_EV',
};

export function validateTree(tree: PreflopTreeDefinition): void {
  if (tree.version !== 1 || !tree.id || tree.continuation !== 'PLAY_TO_TERMINAL' || tree.cardAbstraction !== 'NONE'
    || tree.splitPot !== 'FRACTIONAL_CHIP_EV' || typeof tree.jam !== 'boolean' || typeof tree.preflop.limp !== 'boolean') throw new Error('Unsupported tree semantics.');
  for (const rounds of [tree.preflop.raises, tree.postflop.raises]) {
    if (rounds.length > 8) throw new Error('At most eight configured raise levels.');
    for (const sizes of rounds) {
      if (sizes.length > 8) throw new Error('At most eight sizes per raise level.');
      const keys = new Set<string>();
      for (const size of sizes) {
        if (!['TO_BB', 'POT_AFTER_CALL'].includes(size.kind) || !Number.isFinite(size.value) || size.value <= 0 || size.value > 10000) throw new Error('Invalid action size.');
        if (size.kind === 'TO_BB') bbToUnits(size.value);
        const key = `${size.kind}:${size.value}`;
        if (keys.has(key)) throw new Error('Duplicate configured size.');
        keys.add(key);
      }
    }
  }
}

export interface TreeEdge { id: string; action: PublicAction; next: TournamentState; raises: number }
export function treeActions(state: TournamentState, raises: number, tree: PreflopTreeDefinition): TreeEdge[] {
  if (state.actor === null || state.roundClosed || state.terminal) return [];
  if (!Number.isInteger(raises) || raises < 0) throw new Error('Invalid raise depth.');
  const actor = state.actor, seat = state.seats.find(s => s.position === actor)!;
  const owed = Math.max(0, state.currentBet - seat.streetCommitted);
  const candidates: { id: string; action: PublicAction }[] = owed
    ? [{ id: 'fold', action: { actor, type: 'FOLD' } }, {
      id: state.street === 'preflop' && raises === 0 && tree.preflop.limp ? 'limp' : 'call',
      action: { actor, type: state.street === 'preflop' && raises === 0 && tree.preflop.limp ? 'LIMP' : 'CALL' },
    }]
    : [{ id: 'check', action: { actor, type: 'CHECK' } }];
  // Disabling limps actually removes the unopened call, while calls after raises remain.
  if (owed && state.street === 'preflop' && raises === 0 && !tree.preflop.limp) candidates.pop();
  const sizes = (state.street === 'preflop' ? tree.preflop : tree.postflop).raises[raises] ?? [];
  for (const size of sizes) {
    const units = size.kind === 'TO_BB' ? bbToUnits(size.value)
      : state.currentBet + Math.round(size.value * (state.pot + owed));
    candidates.push({ id: `raise-${units}`, action: { actor, type: 'RAISE', toBb: units / CHIP_UNITS_PER_BB } });
  }
  if (tree.jam) candidates.push({ id: 'jam', action: { actor, type: 'JAM' } });
  const edges: TreeEdge[] = [], successors = new Set<string>();
  for (const candidate of candidates) {
    let next: TournamentState;
    try { next = applyPublicAction(state, candidate.action); } catch { continue; }
    // Prefer CALL for an all-in call and JAM for a configured raise exactly all-in.
    const key = JSON.stringify(next);
    if (successors.has(key)) {
      if (candidate.id === 'jam' && next.currentBet > state.currentBet) {
        const index = edges.findIndex(e => JSON.stringify(e.next) === key);
        edges[index] = { ...candidate, next, raises: raises + 1 };
      }
      continue;
    }
    successors.add(key);
    edges.push({ ...candidate, next, raises: raises + Number(next.currentBet > state.currentBet) });
  }
  if (!edges.length) throw new Error('Tree has no legal continuation.');
  return edges;
}

/** Full physical prior is a distribution, NOT a claim that a strategy is solved. */
export function fullPreflopPrior(input: StrategyContext): { combo: Combo; probability: number }[] {
  const c = canonicalStrategyContext(input);
  if (c.board.length || c.conditioning) throw new Error('Full preflop prior excludes boards and fixed-range conditioning.');
  const combos = allCombos(c.deadCards);
  return combos.map(combo => ({ combo, probability: 1 / combos.length }));
}
