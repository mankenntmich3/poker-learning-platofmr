import { assertUniqueCards, type Card, type Combo } from './cards';
import { CHIP_UNITS_PER_BB } from './chips';
import { showdownScore } from './equity';
import type { TournamentState } from './tournament-state';

/** Net chips from before forced posts. Antes are common dead money, NOT a
 * player's live side-pot contribution. Splits are fractional chip EV.
 * Only completed hands (or closed all-ins) may be evaluated: a called small
 * raise is never replaced by showdown equity.
 */
export function tournamentPayoffs(state: TournamentState, holes: readonly Combo[], board: readonly Card[]): number[] {
  if (holes.length !== state.seats.length) throw new Error('Every dealt seat needs its two cards, including folded blockers.');
  assertUniqueCards([...holes.flat(), ...board, ...state.deadCards]);
  const live = state.seats.map((p, i) => !p.folded ? i : -1).filter(i => i >= 0);
  if (!live.length) throw new Error('No live player.');
  const allIn = state.roundClosed && live.filter(i => state.seats[i].remaining > 0).length <= 1;
  if (!state.terminal && !allIn) throw new Error('Unsolved continuation: non-terminal payoff requested.');
  if (live.length > 1 && board.length !== 5) throw new Error('Showdown requires the complete actual board.');
  if (board.slice(0, state.board.length).join('') !== state.board.join('')) throw new Error('Runout does not extend the public board.');
  const awards = Array(holes.length).fill(0) as number[];
  const scores = live.length > 1 ? holes.map((h, i) => live.includes(i) ? showdownScore([...h, ...board]) : -Infinity) : [];
  const distribute = (amount: number, eligible: number[]) => {
    if (!amount) return;
    if (!eligible.length) throw new Error('Pot layer without an eligible player.');
    const best = eligible.length > 1 ? Math.max(...eligible.map(i => scores[i])) : 0;
    const winners = eligible.length === 1 ? eligible : eligible.filter(i => scores[i] === best);
    for (const i of winners) awards[i] += amount / winners.length;
  };
  if (live.length === 1) awards[live[0]] = state.pot;
  else {
    distribute(state.seats.reduce((n, p) => n + p.ante, 0), live);
    const committed = state.seats.map(p => p.committed - p.ante);
    const levels = [...new Set(committed)].filter(Boolean).sort((a, b) => a - b);
    let previous = 0;
    for (const level of levels) {
      const contributors = committed.map((c, i) => c >= level ? i : -1).filter(i => i >= 0);
      const amount = (level - previous) * contributors.length;
      previous = level;
      if (contributors.length === 1) awards[contributors[0]] += amount; // uncalled live wager
      else distribute(amount, contributors.filter(i => live.includes(i)));
    }
  }
  const payoffs = state.seats.map((p, i) => (p.remaining + awards[i] - p.initial) / CHIP_UNITS_PER_BB);
  if (Math.abs(awards.reduce((s, v) => s + v, 0) - state.pot) > 1e-6 || Math.abs(payoffs.reduce((s, v) => s + v, 0)) > 1e-9) throw new Error('Payoff conservation failed.');
  return payoffs;
}
