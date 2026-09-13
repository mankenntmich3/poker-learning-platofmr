/** Independent full-chance tree reconstruction. No solver, generator payoff,
 * convergence flag or solver EV imports. Budget exhaustion is INCOMPLETE and
 * never an exploitability certificate. Public rules/tree definitions are shared.
 */
import { allCombos, assertUniqueCards, createDeck, type Card, type Combo } from '@/domain/cards';
import { canonicalJson } from '@/domain/canonical';
import { CHIP_UNITS_PER_BB } from '@/domain/chips';
import { evaluateHoldem } from '@/domain/holdem';
import { treeActions, validateTree, type PreflopTreeDefinition } from '@/domain/preflop-tree';
import { canonicalStrategyContext, type PublicEvent, type StrategyContext } from '@/domain/strategy-context';
import { applyPublicEvent, initialTournamentState, replayPublicHistory, type TournamentState } from '@/domain/tournament-state';
import { measureCounterfactualBestResponses, type BehavioralProfile, type GameNode } from './exact-best-response';

/** Separate payout construction: partition live chip intervals using all seat
 * endpoints, then award the shared dead ante pool. Five-card oracle, not the
 * generator's direct-seven evaluator. No solver-supplied utility is consumed.
 */
export function independentlySettleTournament(state: TournamentState, holes: readonly Combo[], board: readonly Card[]): number[] {
  if (holes.length !== state.seats.length) throw new Error('Invalid physical showdown.');
  assertUniqueCards([...holes.flat(), ...board, ...state.deadCards]);
  if (board.slice(0, state.board.length).join('') !== state.board.join('')) throw new Error('Board contradicts public history.');
  const active = state.seats.map((s, i) => !s.folded ? i : -1).filter(i => i >= 0);
  if (!active.length) throw new Error('No eligible player.');
  if (!state.terminal && !(state.roundClosed && active.filter(i => state.seats[i].remaining > 0).length <= 1)) throw new Error('Non-terminal continuation requires solving.');
  if (active.length > 1 && board.length !== 5) throw new Error('Incomplete board.');
  const result = state.seats.map(s => -s.committed);
  if (active.length === 1) result[active[0]] += state.pot;
  else {
    const rank = holes.map((h, i) => active.includes(i) ? evaluateHoldem([...h, ...board]).score : -1);
    const pay = (chips: number, eligible: number[]) => {
      if (!chips) return;
      if (!eligible.length) throw new Error('Invalid empty side pot.');
      const maximum = Math.max(...eligible.map(i => rank[i]));
      const tied = eligible.filter(i => rank[i] === maximum);
      tied.forEach(i => result[i] += chips / tied.length);
    };
    const liveBets = state.seats.map(s => s.committed - s.ante);
    const endpoints = [...new Set([0, ...liveBets])].sort((a, b) => a - b);
    for (let j = 1; j < endpoints.length; j++) {
      const contributors = liveBets.map((b, i) => b >= endpoints[j] ? i : -1).filter(i => i >= 0);
      const amount = (endpoints[j] - endpoints[j - 1]) * contributors.length;
      if (contributors.length === 1) result[contributors[0]] += amount;
      else pay(amount, contributors.filter(i => active.includes(i)));
    }
    pay(state.seats.reduce((s, p) => s + p.ante, 0), active);
  }
  if (Math.abs(result.reduce((s, n) => s + n, 0)) > 1e-6) throw new Error('Independent payoff conservation failed.');
  return result.map(n => n / CHIP_UNITS_PER_BB);
}

export interface PreflopVerificationBudget { nodes: number; runtimeMs: number }
export function countFullChanceDeals(players: number, deadCards = 0): bigint {
  if (!Number.isInteger(players) || players < 2 || players > 9 || !Number.isInteger(deadCards) || deadCards < 0 || 2 * players + deadCards + 5 > 52) throw new Error('Invalid physical chance context.');
  let count = 1n, remaining = 52 - deadCards;
  for (let p = 0; p < players; p++) { count *= BigInt(remaining * (remaining - 1) / 2); remaining -= 2; }
  // Flop unordered, then distinct turn and river. Not C(remaining,5):
  // those 20 street assignments can induce different strategies.
  return count * BigInt(remaining * (remaining - 1) * (remaining - 2) / 6) * BigInt((remaining - 3) * (remaining - 4));
}

export function attemptFullPreflopVerification(input: StrategyContext, tree: PreflopTreeDefinition,
  candidate: Record<string, { actions: Record<string, number> }>, budget: PreflopVerificationBudget) {
  const started = performance.now(), context = canonicalStrategyContext(input);
  if (context.conditioning || context.board.length || context.gameType !== 'TOURNAMENT' || context.evaluationModel !== 'CHIP_EV') throw new Error('Only full physical preflop tournament ChipEV.');
  if (!Number.isInteger(budget.nodes) || budget.nodes < 1 || budget.nodes > 45_000 || !Number.isInteger(budget.runtimeMs) || budget.runtimeMs < 1) throw new Error('Invalid independent verification budget.');
  validateTree(tree);
  const profile: BehavioralProfile = {}, publicRoot = replayPublicHistory(context);
  let nodes = 0, terminalPayoffs = 0, dealsStarted = 0, visitedCandidateInfosets = 0, uniformDefaultInfosets = 0;
  class Limit extends Error {}
  const guard = () => {
    if (++nodes > budget.nodes) throw new Limit('EXACT_TREE_NODE_BUDGET');
    if (nodes % 64 === 1 && performance.now() - started >= budget.runtimeMs) throw new Limit('EXACT_TREE_RUNTIME_BUDGET');
  };
  const build = (state: TournamentState, history: PublicEvent[], raises: number, holes: Combo[], runout: Card[]): GameNode => {
    guard();
    if (state.terminal || (state.roundClosed && state.seats.filter(p => !p.folded && p.remaining > 0).length <= 1)) {
      terminalPayoffs++;
      return { kind: 'terminal', payoff: independentlySettleTournament(state, holes, runout) };
    }
    if (state.roundClosed) {
      const at = state.board.length, event: PublicEvent = { type: 'DEAL', cards: runout.slice(at, at + (at === 0 ? 3 : 1)) };
      return build(applyPublicEvent(state, event), [...history, event], 0, holes, runout);
    }
    const player = state.seats.findIndex(s => s.position === state.actor);
    const key = canonicalJson({ seat: state.actor, hole: holes[player], history });
    const edges = treeActions(state, raises, tree), ids = edges.map(e => e.id);
    const policy = candidate[key]?.actions ?? Object.fromEntries(ids.map(id => [id, 1 / ids.length]));
    if (Object.keys(policy).sort().join('|') !== [...ids].sort().join('|') || Object.values(policy).some(n => !Number.isFinite(n) || n < 0 || n > 1)
      || Math.abs(Object.values(policy).reduce((s, n) => s + n, 0) - 1) > 1e-10) throw new Error('Candidate information-set normalization/actions invalid.');
    if (!Object.hasOwn(profile, key)) {
      if (Object.hasOwn(candidate, key)) visitedCandidateInfosets++; else uniformDefaultInfosets++;
      profile[key] = policy;
    }
    return { kind: 'decision', player, informationSet: key, actions: edges.map(edge => ({ id: edge.id, child: build(edge.next, [...history, edge.action], edge.raises, holes, runout) })) };
  };
  const totalChanceDeals = countFullChanceDeals(context.players, context.deadCards.length);
  const branches: { probability: number; child: GameNode }[] = [];
  let rootRaises = 0, replay = initialTournamentState(context);
  for (const event of context.actionHistory) {
    const next = applyPublicEvent(replay, event);
    rootRaises = event.type === 'DEAL' ? 0 : rootRaises + Number(next.currentBet > replay.currentBet); replay = next;
  }
  const enumerate = (holes: Combo[], blocked: Card[]) => {
    if (holes.length < context.players) {
      for (const combo of allCombos(blocked)) enumerate([...holes, combo], [...blocked, ...combo]);
      return;
    }
    const deck = createDeck().filter(c => !blocked.includes(c));
    for (let a = 0; a < deck.length - 2; a++) for (let b = a + 1; b < deck.length - 1; b++) for (let c = b + 1; c < deck.length; c++) {
      const flop = [deck[a], deck[b], deck[c]].sort();
      for (const turn of deck) if (!flop.includes(turn)) for (const river of deck) if (!flop.includes(river) && river !== turn) {
        dealsStarted++;
        branches.push({ probability: 1 / Number(totalChanceDeals), child: build(publicRoot, context.actionHistory, rootRaises, holes, [...flop, turn, river]) });
      }
    }
  };
  try {
    enumerate([], context.deadCards);
    const report = measureCounterfactualBestResponses({ players: context.players, utilityUnit: 'BB_PER_HAND', root: { kind: 'chance', branches } }, profile);
    return { status: 'MEASURED' as const, reason: null, nodes, terminalPayoffs, dealsStarted, totalChanceDeals: String(totalChanceDeals), visitedCandidateInfosets, uniformDefaultInfosets, runtimeMs: performance.now() - started, report };
  } catch (error) {
    if (!(error instanceof Limit)) throw error;
    return { status: 'COMPUTE_LIMIT' as const, reason: error.message, nodes, terminalPayoffs, dealsStarted, totalChanceDeals: String(totalChanceDeals), visitedCandidateInfosets, uniformDefaultInfosets, runtimeMs: performance.now() - started, report: null };
  }
}
