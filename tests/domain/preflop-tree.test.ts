import { describe, expect, it } from 'vitest';
import { allHandClasses, getHandClass, type Combo } from '@/domain/cards';
import { defaultTournamentContext, positionsFor, type PublicAction } from '@/domain/strategy-context';
import { applyPublicAction, replayPublicHistory } from '@/domain/tournament-state';
import { MULTI_ACTION_TREE, fullPreflopPrior, treeActions, validateTree } from '@/domain/preflop-tree';
import { tournamentPayoffs } from '@/domain/tournament-payoff';
import { independentlySettleTournament } from '@/verification/multistreet-preflop';

const context = (players = 2, stack = 15) => {
  const c = defaultTournamentContext(players, stack); c.hero = positionsFor(players)[0]; c.actionHistory = []; return c;
};
describe('physical prior, multi-action preflop and terminal chip accounting', () => {
  it('covers all 1326 combos and 169 classes uniformly without conditional premium inputs', () => {
    const prior = fullPreflopPrior(context());
    expect(prior).toHaveLength(1326);
    expect(new Set(prior.map(r => r.combo.join(''))).size).toBe(1326);
    expect(new Set(prior.map(r => getHandClass(r.combo))).size).toBe(allHandClasses().length);
    expect(prior.reduce((s, r) => s + r.probability, 0)).toBeCloseTo(1, 12);
    const c = context(); c.deadCards = ['As'];
    expect(fullPreflopPrior(c)).toHaveLength(1275);
    expect(fullPreflopPrior(c).some(r => r.combo.includes('As'))).toBe(false);
  });
  it('plays HU BTN/SB limp, BB check and keeps the flop continuation unsolved', () => {
    const s = replayPublicHistory(context());
    expect(s.seats.map(s => s.position)).toEqual(['BTN', 'BB']); expect(s.actor).toBe('BTN');
    const limp = treeActions(s, 0, MULTI_ACTION_TREE).find(a => a.id === 'limp')!;
    expect(limp.next.actor).toBe('BB'); expect(limp.next.pot).toBe(30000);
    const choices = treeActions(limp.next, 0, MULTI_ACTION_TREE);
    expect(choices.map(a => a.id)).toEqual(['check', 'raise-20000', 'raise-22000', 'jam']);
    const check = choices[0].next;
    expect(check.roundClosed).toBe(true); expect(check.terminal).toBe(false);
    expect(() => tournamentPayoffs(check, [['As', 'Kh'], ['Qc', 'Qd']], ['2c', '3d', '4h', '5s', '9c'])).toThrow(/Unsolved continuation/);
  });
  it('executes open → 3bet → 4bet → jam/call with legal actual stack caps', () => {
    let state = replayPublicHistory(context(2, 25)), raises = 0;
    for (const id of ['raise-20000', 'raise-60000', 'raise-100000', 'jam', 'call']) {
      const e = treeActions(state, raises, MULTI_ACTION_TREE).find(e => e.id === id);
      expect(e, `${id} missing`).toBeDefined(); state = e!.next; raises = e!.raises;
    }
    expect(state.roundClosed).toBe(true);
    expect(state.seats.map(s => s.remaining)).toEqual([10000, 0]);
    expect(state.pot).toBe(490000);
  });
  it('accepts parameterized pot-after-call sizes and rejects invalid configuration', () => {
    const tree = structuredClone(MULTI_ACTION_TREE);
    tree.preflop.raises[0] = [{ kind: 'POT_AFTER_CALL', value: .5 }];
    const root = replayPublicHistory(context());
    // current 1 + .5 * (2.5 + .5) = raise to 2.5 BB
    expect(treeActions(root, 0, tree).map(e => e.id)).toContain('raise-25000');
    tree.preflop.raises[0][0].value = NaN;
    expect(() => validateTree(tree)).toThrow(/size/);
  });
  it('preserves 3/6-player action order, full unequal stacks and genuine BB response', () => {
    for (const players of [3, 6]) {
      const c = context(players, 20); c.stacks[0].stackBb = 22; c.stacks.at(-1)!.stackBb = 35;
      let state = replayPublicHistory(c);
      expect(state.seats.map(s => s.position)).toEqual(positionsFor(players));
      const open: PublicAction = { actor: positionsFor(players)[0], type: 'RAISE', toBb: 2 };
      state = applyPublicAction(state, open);
      for (const actor of positionsFor(players).slice(1, -1)) { expect(state.actor).toBe(actor); state = applyPublicAction(state, { actor, type: 'FOLD' }); }
      expect(state.actor).toBe('BB');
      expect(treeActions(state, 1, MULTI_ACTION_TREE).map(e => e.id)).toEqual(['fold', 'call', 'raise-50000', 'raise-60000', 'jam']);
      expect(state.seats[0].initial).toBe(220000); expect(state.seats.at(-1)!.initial).toBe(350000);
    }
  });
  it('separates BBA from live all-in money and independently returns the uncalled BB', () => {
    const c = context(), s = applyPublicAction(applyPublicAction(replayPublicHistory(c), { actor: 'BTN', type: 'JAM' }), { actor: 'BB', type: 'CALL' });
    const holes: Combo[] = [['As', 'Kh'], ['Qc', 'Qd']];
    const tie = ['2c', '3c', '4c', '5c', '6c'] as const;
    expect(tournamentPayoffs(s, holes, tie)).toEqual([.5, -.5]);
    expect(independentlySettleTournament(s, holes, tie)).toEqual([.5, -.5]);
    const won = ['Ac', '3d', '7h', '8s', '9c'] as const;
    expect(tournamentPayoffs(s, holes, won)).toEqual([15, -15]);
    expect(independentlySettleTournament(s, holes, won)).toEqual([15, -15]);
  });
  it('pays actual 3-player unequal-stack side pots plus dead ante independently', () => {
    const c = context(3); c.stacks = [{ position: 'BTN', stackBb: 10 }, { position: 'SB', stackBb: 20 }, { position: 'BB', stackBb: 30 }];
    let state = replayPublicHistory(c);
    for (const actor of ['BTN', 'SB', 'BB'] as const) state = applyPublicAction(state, { actor, type: actor === 'BB' ? 'CALL' : 'JAM' });
    const holes: Combo[] = [['As', 'Ah'], ['Ks', 'Kh'], ['Qs', 'Qh']], board = ['2c', '4d', '7h', '8s', '9c'] as const;
    // BTN wins 3*10 + dead ante 1. SB wins 2*10 side pot. BB loses 20+1.
    expect(tournamentPayoffs(state, holes, board)).toEqual([21, 0, -21]);
    expect(independentlySettleTournament(state, holes, board)).toEqual([21, 0, -21]);
  });
});
