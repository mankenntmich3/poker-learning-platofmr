import { describe, expect, it } from 'vitest';
import { allCombos, SUIT_PERMUTATIONS, SUITS, createCombo, type Card, type Combo, type Suit } from '@/domain/cards';
import { encodedInformationKey } from '@/domain/information-encoding';
import { defaultTournamentContext, type PublicEvent } from '@/domain/strategy-context';
import { MULTI_ACTION_TREE } from '@/domain/preflop-tree';
import { addObservation, empiricalBernsteinLower, measurePreflopDeviations, type FrozenPreflopCandidate } from '@/verification/preflop-deviations';
import { verifyForPublication } from '@/server/verify-solution';

describe('independent scalable deviation bounds and exact suit identity', () => {
  it('uses all 1326 physical combos, with exactly 169 lossless preflop suit orbits', () => {
    expect(new Set(allCombos().map(h => encodedInformationKey('BTN', h, [], 'GLOBAL_SUIT_ISOMORPHISM_V1'))).size).toBe(169);
    const hole: Combo = ['As', 'Kh'], history: PublicEvent[] = [{ actor: 'BTN', type: 'LIMP' }, { actor: 'BB', type: 'CHECK' }, { type: 'DEAL', cards: ['Qs', 'Js', '2h'] }, { actor: 'BB', type: 'CHECK' }, { type: 'DEAL', cards: ['7d'] }];
    const expected = encodedInformationKey('BTN', hole, history, 'GLOBAL_SUIT_ISOMORPHISM_V1');
    for (const permutation of SUIT_PERMUTATIONS) {
      const map = Object.fromEntries(SUITS.map((s, i) => [s, permutation[i]])) as Record<Suit, Suit>;
      const rename = (c: Card) => `${c[0]}${map[c[1] as Suit]}` as Card;
      const renamed = history.map(e => e.type === 'DEAL' ? { ...e, cards: e.cards.map(rename) } : e);
      const h = createCombo(rename(hole[0]), rename(hole[1]));
      expect(encodedInformationKey('BTN', h, renamed, 'GLOBAL_SUIT_ISOMORPHISM_V1')).toBe(expected);
      // Earlier information is recoverable from the full chronological record.
      const parsed = JSON.parse(expected) as { hole: Combo; history: PublicEvent[] };
      expect(encodedInformationKey('BTN', parsed.hole, parsed.history.slice(0, 3), 'GLOBAL_SUIT_ISOMORPHISM_V1')).toBe(encodedInformationKey('BTN', hole, history.slice(0, 3), 'GLOBAL_SUIT_ISOMORPHISM_V1'));
    }
    expect(encodedInformationKey('BTN', ['As', 'Ks'], history, 'GLOBAL_SUIT_ISOMORPHISM_V1')).not.toBe(expected);
  });
  it('uses support width rather than observed range and penalizes confidence/sample count correctly', () => {
    const moments = { n: 0, mean: 0, m2: 0 }; for (let i = 0; i < 1000; i++) addObservation(moments, 2.5);
    expect(moments.mean).toBe(2.5); expect(moments.m2).toBe(0);
    expect(empiricalBernsteinLower(moments, 60, .001)).toBeLessThan(2.5);
    expect(empiricalBernsteinLower(moments, 60, .00001)).toBeLessThan(empiricalBernsteinLower(moments, 60, .001));
    expect(empiricalBernsteinLower(moments, 120, .001)).toBeLessThan(empiricalBernsteinLower(moments, 60, .001));
  });
  it('independently detects an analytically known +2.5 BB root deviation, never approves it', () => {
    const c = defaultTournamentContext(2), profile: FrozenPreflopCandidate['profile'] = {};
    for (const hole of allCombos()) {
      profile[encodedInformationKey('BTN', hole, [])] = { actions: { fold: 1, limp: 0, 'raise-20000': 0, 'raise-22000': 0, jam: 0 } };
      profile[encodedInformationKey('BB', hole, [{ actor: 'BTN', type: 'JAM' }])] = { actions: { fold: 1, call: 0 } };
    }
    const report = measurePreflopDeviations({ context: c, tree: MULTI_ACTION_TREE, profile, defaultPolicy: 'UNIFORM_UNVISITED_INFORMATION_SETS' }, '12'.repeat(32), 1000, .01);
    const jam = report.witnesses.find(w => w.rule === 'ROOT_ACTION' && w.actionId === 'jam')!;
    expect(jam.mean).toBe(2.5); expect(jam.variance).toBe(0); expect(jam.lowerGainBb).toBeGreaterThan(1);
    expect(report.status).toBe('POSITIVE_DEVIATION_WITNESS'); expect(report.nashConvUpperBoundBb).toBeNull();
    expect(report.publicationEligible).toBe(false); expect(verifyForPublication(report).status).toBe('FAILED_VALIDATION');
  });
  it('cannot compute a confidence certificate from a timed-out optional prefix', () => {
    const report = measurePreflopDeviations({ context: defaultTournamentContext(2), tree: MULTI_ACTION_TREE, profile: {}, defaultPolicy: 'UNIFORM_UNVISITED_INFORMATION_SETS' }, '34'.repeat(32), 100000, 1e-9, 1);
    expect(report.status).toBe('COMPUTE_LIMIT'); expect(report.nashConvLowerBoundBb).toBeNull();
    expect(report.witnesses.every(w => w.lowerGainBb === null)).toBe(true);
  });
  it('rejects illegal probabilities from an experimental numeric policy mapping', () => {
    expect(() => measurePreflopDeviations({ context: defaultTournamentContext(2), tree: MULTI_ACTION_TREE, profile: {}, defaultPolicy: 'UNIFORM_UNVISITED_INFORMATION_SETS' }, '56'.repeat(32), 100, .01, 10000,
      (_state, _hole, _history, legal) => Object.fromEntries(legal.map(a => [a, Number.NaN])))).toThrow('Invalid frozen policy');
  });
});
