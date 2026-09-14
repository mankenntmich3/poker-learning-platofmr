/** Replays the compiled public tree and independently checks every terminal ledger. */
import { readFileSync } from 'node:fs';
import { canonicalStrategyContext, type StrategyContext, type PublicAction } from '../src/domain/strategy-context';
import { initialTournamentState, applyPublicAction, applyPublicEvent, type TournamentState } from '../src/domain/tournament-state';
import { independentlySettleTournament } from '../src/verification/multistreet-preflop';
import type { Card, Combo } from '../src/domain/cards';

const model = JSON.parse(readFileSync(process.argv[2] ?? 'output/preflop-model-v2.json', 'utf8')) as {
  contract: { context: StrategyContext }; nodes: { actor: number; street: number; actions: string[]; edges: number[]; payoff: number[] }[];
};
const seen = new Set<number>();
const complete = (input: TournamentState, board: Card[]) => {
  let state = input;
  while (!state.terminal && !(state.roundClosed && state.seats.filter(s => !s.folded && s.remaining > 0).length <= 1)) {
    if (state.roundClosed) { const at = state.board.length; state = applyPublicEvent(state, { type: 'DEAL', cards: board.slice(at, at + (at ? 1 : 3)) }); }
    else state = applyPublicAction(state, { actor: state.actor!, type: 'CHECK' });
  }
  return state;
};
function visit(id: number, input: TournamentState) {
  if (seen.has(id) || !model.nodes[id]) throw new Error('Duplicate, cyclic or missing public node'); seen.add(id);
  const n = model.nodes[id]; let state = input;
  if (state.street === 'preflop' && state.roundClosed && !state.terminal && state.seats.filter(s => !s.folded && s.remaining > 0).length === 2) {
    state = applyPublicEvent(state, { type: 'DEAL', cards: ['2c', '3d', '4h'] });
  }
  if (n.actor < 0) {
    if (n.actions.length || n.edges.length || n.payoff.length !== 3 || !state.terminal && !state.roundClosed) throw new Error('Premature or malformed terminal');
    for (let outcome = 0; outcome < 3; outcome++) {
      const board: Card[] = outcome === 1 ? ['2c', '3d', '4h', '5s', '6c'] : ['2c', '3d', '4h', '9s', 'Tc'];
      const holes: Combo[] = outcome === 0 ? [['Ks', 'Kh'], ['As', 'Ah']] : [['As', 'Ah'], ['Ks', 'Kh']];
      const expected = independentlySettleTournament(complete(state, board), holes, board)[0];
      if (Math.abs(expected - n.payoff[outcome]) > 1e-10) throw new Error(`Terminal ledger mismatch at ${id}`);
    }
    return;
  }
  if (state.seats[n.actor].position !== state.actor || n.street !== (state.street === 'preflop' ? 0 : 1) || n.actions.length !== n.edges.length || new Set(n.actions).size !== n.actions.length) throw new Error('Invalid actor/action identity');
  n.actions.forEach((id, a) => {
    const action = id.startsWith('raise-') ? { actor: state.actor!, type: 'RAISE' as const, toBb: Number(id.slice(6)) / 10000 }
      : { actor: state.actor!, type: id.toUpperCase() } as PublicAction;
    visit(n.edges[a], applyPublicAction(state, action));
  });
}
visit(0, initialTournamentState(canonicalStrategyContext(model.contract.context)));
if (seen.size !== model.nodes.length) throw new Error('Unreachable compiled nodes');
console.log(JSON.stringify({ publicNodesChecked: seen.size, terminalPayoffs: 'INDEPENDENT_LEGAL_CHECKDOWN_LEDGER_REPLAY', publicationEligible: false }));
