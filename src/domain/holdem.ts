import { assertUniqueCards, createDeck, RANKS, type Card, type Combo, type Rank } from './cards';
import { SIX_MAX_POSITIONS, type Position, type Street } from './chips';

export const HAND_NAMES = ['High Card', 'Paar', 'Zwei Paare', 'Drilling', 'Straight', 'Flush', 'Full House', 'Vierling', 'Straight Flush'] as const;
export interface HandValue { category: number; kickers: number[]; score: number; name: string }

/** Exact best-five-card ordering. Suits never break a showdown tie. */
export function evaluateFive(cards: readonly Card[]): HandValue {
  if (cards.length !== 5) throw new Error('Five cards required');
  assertUniqueCards(cards);
  const values = cards.map(c => 14 - RANKS.indexOf(c[0] as Rank)).sort((a, b) => b - a);
  const groups = [...new Set(values)].map(rank => ({ rank, count: values.filter(v => v === rank).length }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);
  const unique = [...new Set(values)];
  const straight = unique.length === 5 && unique[0] - unique[4] === 4 ? unique[0]
    : unique.join(',') === '14,5,4,3,2' ? 5 : 0;
  const flush = cards.every(c => c[1] === cards[0][1]);
  let category: number; let kickers: number[];
  if (straight && flush) { category = 8; kickers = [straight]; }
  else if (groups[0].count === 4) { category = 7; kickers = groups.map(g => g.rank); }
  else if (groups[0].count === 3 && groups[1].count === 2) { category = 6; kickers = groups.map(g => g.rank); }
  else if (flush) { category = 5; kickers = values; }
  else if (straight) { category = 4; kickers = [straight]; }
  else if (groups[0].count === 3) { category = 3; kickers = groups.map(g => g.rank); }
  else if (groups[0].count === 2 && groups[1].count === 2) { category = 2; kickers = groups.map(g => g.rank); }
  else if (groups[0].count === 2) { category = 1; kickers = groups.map(g => g.rank); }
  else { category = 0; kickers = values; }
  let score = category;
  for (let i = 0; i < 5; i++) score = score * 15 + (kickers[i] ?? 0);
  return { category, kickers, score, name: HAND_NAMES[category] };
}

export function evaluateHoldem(cards: readonly Card[]): HandValue {
  if (cards.length < 5 || cards.length > 7) throw new Error('Five to seven cards required');
  assertUniqueCards(cards);
  let best: HandValue | undefined;
  for (let a = 0; a < cards.length - 4; a++) for (let b = a + 1; b < cards.length - 3; b++)
    for (let c = b + 1; c < cards.length - 2; c++) for (let d = c + 1; d < cards.length - 1; d++)
      for (let e = d + 1; e < cards.length; e++) {
        const value = evaluateFive([cards[a], cards[b], cards[c], cards[d], cards[e]]);
        if (!best || value.score > best.score) best = value;
      }
  return best!;
}

export interface HoldemPlayer {
  position: Position; stack: number; hole: Combo; folded: boolean;
  committed: number; streetCommitted: number; actedAtBet: number | null;
}
export type HoldemAction = { type: 'fold' | 'check' | 'call' | 'all-in' } | { type: 'raise'; to: number };
export interface HoldemHand {
  game: 'nlhe'; street: Street; players: HoldemPlayer[]; board: Card[]; remaining: Card[];
  pot: number; bigBlind: number; currentBet: number; lastFullRaise: number;
  actor: number | null; pending: number[]; complete: boolean; payouts: number[];
  history: { street: Street; position: Position; action: HoldemAction; paid: number }[];
}
const integer = (n: number) => Number.isSafeInteger(n) && n >= 0;
const nextSeats = (after: number) => Array.from({ length: 6 }, (_, i) => (after + i + 1) % 6);

/** Integer chip units, six seats, no ante/rake. Supply a shuffled unique deck for play. */
export function createHoldemHand(stacks: readonly number[], bigBlind = 100, deck: readonly Card[] = createDeck()): HoldemHand {
  if (stacks.length !== 6 || stacks.some(n => !integer(n) || n === 0) || !integer(bigBlind) || bigBlind < 2 || bigBlind % 2) throw new Error('Invalid six-max stakes');
  if (deck.length !== 52) throw new Error('A full deck is required');
  assertUniqueCards(deck);
  const state: HoldemHand = { game: 'nlhe', street: 'preflop', board: [], remaining: [...deck.slice(12)],
    players: SIX_MAX_POSITIONS.map((position, i) => ({ position, stack: stacks[i], hole: [deck[i], deck[i + 6]], folded: false, committed: 0, streetCommitted: 0, actedAtBet: null })),
    pot: 0, bigBlind, currentBet: bigBlind, lastFullRaise: bigBlind, actor: 0, pending: [], complete: false, payouts: Array(6).fill(0), history: [] };
  pay(state, 4, Math.min(stacks[4], bigBlind / 2));
  pay(state, 5, Math.min(stacks[5], bigBlind));
  state.pending = [0, 1, 2, 3, 4, 5].filter(i => state.players[i].stack > 0);
  advance(state);
  return state;
}

function pay(state: HoldemHand, seat: number, amount: number) {
  const p = state.players[seat];
  if (!integer(amount) || amount > p.stack) throw new Error('Invalid contribution');
  p.stack -= amount; p.committed += amount; p.streetCommitted += amount; state.pot += amount;
}

export function legalHoldemActions(state: HoldemHand): { canCheck: boolean; call: number; minRaiseTo: number; maxRaiseTo: number; canRaise: boolean } {
  if (state.complete || state.actor === null) throw new Error('Hand has no decision');
  const player = state.players[state.actor];
  const owed = Math.max(0, state.currentBet - player.streetCommitted);
  const maxRaiseTo = player.streetCommitted + player.stack;
  const canRaise = maxRaiseTo > state.currentBet
    && (player.actedAtBet === null || state.currentBet - player.actedAtBet >= state.lastFullRaise)
    && state.players.some((p, i) => i !== state.actor && !p.folded && p.stack > 0);
  return { canCheck: owed === 0, call: Math.min(owed, player.stack), minRaiseTo: state.currentBet + state.lastFullRaise, maxRaiseTo, canRaise };
}

export function actHoldem(hand: HoldemHand, action: HoldemAction): HoldemHand {
  const state = structuredClone(hand);
  const legal = legalHoldemActions(state);
  const seat = state.actor!; const player = state.players[seat];
  const before = player.stack;
  let resolved = action;
  if (action.type === 'all-in') resolved = legal.maxRaiseTo > state.currentBet ? { type: 'raise', to: legal.maxRaiseTo } : { type: 'call' };
  if (resolved.type === 'fold') player.folded = true;
  else if (resolved.type === 'check') { if (!legal.canCheck) throw new Error('Cannot check facing a bet'); }
  else if (resolved.type === 'call') { if (!legal.call) throw new Error('Nothing to call'); pay(state, seat, legal.call); }
  else if (resolved.type === 'raise') {
    if (!legal.canRaise || !integer(resolved.to) || resolved.to <= state.currentBet || resolved.to > legal.maxRaiseTo
      || (resolved.to < legal.minRaiseTo && resolved.to !== legal.maxRaiseTo)) throw new Error('Illegal raise or action not reopened');
    const increase = resolved.to - state.currentBet;
    pay(state, seat, resolved.to - player.streetCommitted);
    if (increase >= state.lastFullRaise) state.lastFullRaise = increase;
    state.currentBet = resolved.to;
  }
  player.actedAtBet = state.currentBet;
  state.history.push({ street: state.street, position: player.position, action, paid: before - player.stack });
  state.pending = nextSeats(seat).filter(i => {
    const p = state.players[i];
    return !p.folded && p.stack > 0 && (p.actedAtBet === null || p.streetCommitted < state.currentBet);
  });
  advance(state);
  return state;
}

function drawStreet(state: HoldemHand) {
  state.remaining.shift(); // Burn card.
  const count = state.street === 'preflop' ? 3 : 1;
  state.board.push(...state.remaining.splice(0, count));
  state.street = state.street === 'preflop' ? 'flop' : state.street === 'flop' ? 'turn' : 'river';
  state.currentBet = 0; state.lastFullRaise = state.bigBlind;
  state.players.forEach(p => { p.streetCommitted = 0; p.actedAtBet = null; });
}

function advance(state: HoldemHand) {
  const live = state.players.filter(p => !p.folded);
  if (live.length === 1) { settle(state); return; }
  const withChips = state.players.filter(p => !p.folded && p.stack > 0);
  // A lone solvent player may only need to call an outstanding wager.
  if (withChips.length <= 1 && withChips.every(p => p.streetCommitted >= state.currentBet)) state.pending = [];
  if (state.pending.length) { state.actor = state.pending[0]; return; }
  if (state.street === 'river') { settle(state); return; }
  drawStreet(state);
  state.pending = [4, 5, 0, 1, 2, 3].filter(i => !state.players[i].folded && state.players[i].stack > 0);
  advance(state);
}

/** Layered side pots; excess sole contributions are returned. Odd chips start left of BTN. */
function settle(state: HoldemHand) {
  const levels = [...new Set(state.players.map(p => p.committed))].filter(Boolean).sort((a, b) => a - b);
  let previous = 0;
  for (const level of levels) {
    const contributors = state.players.map((p, i) => p.committed >= level ? i : -1).filter(i => i >= 0);
    const amount = (level - previous) * contributors.length; previous = level;
    const eligible = contributors.filter(i => !state.players[i].folded);
    let winners: number[];
    if (contributors.length === 1) winners = contributors;
    else if (eligible.length === 1) winners = eligible;
    else {
      const scores = eligible.map(i => ({ i, score: evaluateHoldem([...state.players[i].hole, ...state.board]).score }));
      const best = Math.max(...scores.map(s => s.score)); winners = scores.filter(s => s.score === best).map(s => s.i);
    }
    if (!winners.length) throw new Error('Side pot has no eligible winner');
    winners.sort((a, b) => nextSeats(3).indexOf(a) - nextSeats(3).indexOf(b));
    winners.forEach((i, index) => { state.payouts[i] += Math.floor(amount / winners.length) + (index < amount % winners.length ? 1 : 0); });
  }
  state.players.forEach((p, i) => { p.stack += state.payouts[i]; });
  state.pot = 0; state.complete = true; state.actor = null; state.pending = [];
}
