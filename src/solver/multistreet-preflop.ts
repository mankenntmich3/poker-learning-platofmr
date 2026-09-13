import { allCombos, assertUniqueCards, createCombo, createDeck, type Card, type Combo } from '@/domain/cards';
import { canonicalStrategyContext, type PublicEvent, type StrategyContext } from '@/domain/strategy-context';
import { applyPublicEvent, initialTournamentState, replayPublicHistory, type TournamentState } from '@/domain/tournament-state';
import { tournamentPayoffs } from '@/domain/tournament-payoff';
import { treeActions, validateTree, type PreflopTreeDefinition } from '@/domain/preflop-tree';
import type { SamplingGame, SeededRandom } from './external-sampling';
import { encodedInformationKey, type InformationEncoding } from '@/domain/information-encoding';

export interface PreflopRollout {
  state: TournamentState; holes: Combo[]; runout: Card[];
  history: PublicEvent[]; raises: number;
  encoding?: InformationEncoding;
  observationCache?: Map<string, { hole: Combo; deals: Card[][] }>;
}
/** Future cards are private chance outcomes until dealt. Info keys contain ONLY
 * the acting seat's cards and observable chronological events (perfect recall).
 */
export function rolloutInformationKey(rollout: PreflopRollout): string {
  const actor = rollout.state.seats.findIndex(s => s.position === rollout.state.actor);
  if (actor < 0) throw new Error('No decision.');
  return encodedInformationKey(rollout.state.actor!, rollout.holes[actor], rollout.history, rollout.encoding, rollout.observationCache);
}
export function drawPhysicalDeal(context: StrategyContext, random: SeededRandom): { holes: Combo[]; runout: Card[] } {
  const deck = createDeck().filter(c => !context.deadCards.includes(c) && !context.board.includes(c));
  const needed = context.players * 2 + 5 - context.board.length;
  for (let i = 0; i < needed; i++) {
    const j = i + random.integer(deck.length - i);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const holes = Array.from({ length: context.players }, (_, i) => createCombo(deck[i * 2], deck[i * 2 + 1]));
  const runout = [...context.board, ...deck.slice(context.players * 2, needed)];
  runout.splice(0, 3, ...runout.slice(0, 3).sort());
  return { holes, runout };
}
function raiseDepth(context: StrategyContext): number {
  let state = initialTournamentState(context), count = 0;
  for (const event of context.actionHistory) {
    const next = applyPublicEvent(state, event);
    count = event.type === 'DEAL' ? 0 : count + Number(next.currentBet > state.currentBet);
    state = next;
  }
  return count;
}
export function createMultistreetPreflopGame(input: StrategyContext, tree: PreflopTreeDefinition, encoding: InformationEncoding = 'PHYSICAL'): SamplingGame<PreflopRollout> {
  const context = canonicalStrategyContext(input);
  if (context.conditioning || context.board.length || context.gameType !== 'TOURNAMENT' || context.evaluationModel !== 'CHIP_EV') throw new Error('This sampled experiment requires full-prior tournament preflop ChipEV.');
  validateTree(tree);
  if (!['PHYSICAL', 'GLOBAL_SUIT_ISOMORPHISM_V1'].includes(encoding) || encoding !== 'PHYSICAL' && context.deadCards.length) throw new Error('Suit quotient requires an unblocked full prior.');
  const root = replayPublicHistory(context);
  return {
    players: context.players,
    sampleRoot: random => ({ state: root, ...drawPhysicalDeal(context, random), history: context.actionHistory, raises: raiseDepth(context), encoding, observationCache: new Map() }),
    inspect: initial => {
      let rollout = initial;
      while (rollout.state.roundClosed && !rollout.state.terminal) {
        const live = rollout.state.seats.filter(s => !s.folded && s.remaining > 0);
        if (live.length <= 1) return { kind: 'terminal', payoff: tournamentPayoffs(rollout.state, rollout.holes, rollout.runout) };
        const start = rollout.state.board.length, count = start === 0 ? 3 : 1;
        const event: PublicEvent = { type: 'DEAL', cards: rollout.runout.slice(start, start + count) };
        rollout = { ...rollout, state: applyPublicEvent(rollout.state, event), history: [...rollout.history, event], raises: 0 };
      }
      if (rollout.state.terminal) return { kind: 'terminal', payoff: tournamentPayoffs(rollout.state, rollout.holes, rollout.runout) };
      const state = rollout.state;
      return { kind: 'decision', player: state.seats.findIndex(s => s.position === state.actor), key: rolloutInformationKey(rollout),
        actions: treeActions(state, rollout.raises, tree).map(e => ({ id: e.id, child: { ...rollout, state: e.next, raises: e.raises, history: [...rollout.history, e.action] } })) };
    },
  };
}

export function expectedRootInformationKeys(context: StrategyContext, encoding: InformationEncoding = 'PHYSICAL'): string[] {
  const state = replayPublicHistory(context);
  return allCombos(context.deadCards).map(hole => encodedInformationKey(state.actor!, hole, context.actionHistory, encoding));
}

export function assertPhysicalRollout(rollout: PreflopRollout): void {
  if (rollout.holes.length !== rollout.state.seats.length || rollout.runout.length !== 5) throw new Error('Incomplete physical deal.');
  assertUniqueCards([...rollout.holes.flat(), ...rollout.runout, ...rollout.state.deadCards]);
}
