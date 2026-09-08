import { describe, expect, test } from 'vitest';
import { createDeck, type Card, type Combo } from '@/domain/cards';
import { actHoldem, createHoldemHand, evaluateHoldem, legalHoldemActions } from '@/domain/holdem';

function deckFor(holes: Combo[], board: Card[]): Card[] {
  const fixed = [...holes.flat(), ...board]; const rest = createDeck().filter(c => !fixed.includes(c));
  return [...holes.map(h => h[0]), ...holes.map(h => h[1]), rest.shift()!, ...board.slice(0, 3), rest.shift()!, board[3], rest.shift()!, board[4], ...rest];
}
describe('real no-limit Hold’em rules', () => {
  test('recognizes a wheel and selects the best five of seven without suit tiebreaks', () => {
    expect(evaluateHoldem(['As', '2d', '3h', '4c', '5s', 'Kh', 'Kd']).kickers).toEqual([5]);
    expect(evaluateHoldem(['As', 'Ah', 'Ad', 'Ks', 'Kh', 'Kd', '2c']).kickers).toEqual([14, 13]);
    expect(evaluateHoldem(['As', 'Ks', 'Qs', 'Js', 'Ts', '2h', '3d']).category).toBe(8);
    expect(evaluateHoldem(['Ac', 'Kd', 'Qs', 'Jh', 'Tc']).score).toBe(evaluateHoldem(['Ad', 'Kc', 'Qh', 'Js', 'Ts']).score);
    expect(() => evaluateHoldem(['As', 'As', 'Ks', 'Qs', 'Js'])).toThrow(/Duplicate/);
  });
  test('posts blinds, enforces the call price and begins flop action in the small blind', () => {
    let state = createHoldemHand(Array(6).fill(10000));
    expect(state.pot).toBe(150); expect(state.actor).toBe(0);
    expect(() => actHoldem(state, { type: 'check' })).toThrow();
    expect(() => actHoldem(state, { type: 'raise', to: 150 })).toThrow();
    for (let i = 0; i < 5; i++) state = actHoldem(state, { type: 'call' });
    state = actHoldem(state, { type: 'check' });
    expect(state.street).toBe('flop'); expect(state.board).toHaveLength(3); expect(state.actor).toBe(4);
    expect(state.pot).toBe(600);
    while (!state.complete) state = actHoldem(state, { type: 'check' });
    expect(state.board).toHaveLength(5); expect(state.players.reduce((n, p) => n + p.stack, 0)).toBe(60000);
  });
  test('a short all-in does not reopen a raise, but cumulative full-sized increases do', () => {
    let state = createHoldemHand([2000, 2000, 400, 500, 2000, 2000]);
    state = actHoldem(state, { type: 'raise', to: 300 });
    state = actHoldem(state, { type: 'call' });
    state = actHoldem(state, { type: 'all-in' });
    let short = actHoldem(state, { type: 'fold' });
    short = actHoldem(short, { type: 'fold' }); short = actHoldem(short, { type: 'fold' });
    expect(short.actor).toBe(0); expect(legalHoldemActions(short).canRaise).toBe(false);
    expect(() => actHoldem(short, { type: 'raise', to: 600 })).toThrow(/reopened/);
    state = actHoldem(state, { type: 'all-in' });
    state = actHoldem(state, { type: 'fold' }); state = actHoldem(state, { type: 'fold' });
    expect(legalHoldemActions(state).canRaise).toBe(true); expect(legalHoldemActions(state).minRaiseTo).toBe(700);
  });
  test('settles multiple all-ins and returns uncalled excess without creating chips', () => {
    const deck = deckFor([['As', 'Ah'], ['Ks', 'Kh'], ['Qs', 'Qh'], ['Js', 'Jh'], ['Ts', 'Th'], ['9s', '9h']], ['2c', '3d', '4h', '8s', 'Tc']);
    let state = createHoldemHand([100, 200, 300, 1000, 1000, 1000], 10, deck);
    for (let i = 0; i < 3; i++) state = actHoldem(state, { type: 'all-in' });
    for (let i = 0; i < 3; i++) state = actHoldem(state, { type: 'fold' });
    expect(state.complete).toBe(true); expect(state.payouts).toEqual([315, 200, 100, 0, 0, 0]);
    expect(state.players.reduce((n, p) => n + p.stack, state.pot)).toBe(3600);
  });
  test('awards an uncontested pot and preserves the input state', () => {
    const initial = createHoldemHand(Array(6).fill(10000)); let state = initial;
    for (let i = 0; i < 5; i++) state = actHoldem(state, { type: 'fold' });
    expect(state.complete).toBe(true); expect(state.players[5].stack).toBe(10050);
    expect(initial.pot).toBe(150); expect(initial.players[0].folded).toBe(false);
  });
});
