import { describe, expect, test } from 'vitest';
import { getNlheProvider } from '@/strategy/nlhe-provider';
import { preflopConfigurations } from '@/solver/nlhe-artifact';
import { configFromSearch, DEFAULT_NLHE, POSTFLOP_CONFIG, validNlheConfig } from '@/shared/nlhe';
import { SIX_MAX_POSITIONS } from '@/domain/chips';
import { actHoldem, createHoldemHand, legalHoldemActions } from '@/domain/holdem';
import { allCombos } from '@/domain/cards';

describe('NLHE policy provenance and exact context', () => {
  test('all 385 preflop presets have 169 classes, 1326 combos and normalized non-GTO frequencies', async () => {
    const provider = await getNlheProvider(); const configs = preflopConfigurations(); expect(configs).toHaveLength(385);
    for (const config of configs) {
      const range = await provider.getRangeStrategy(config);
      expect(range.config).toEqual(config); expect(range.classes).toHaveLength(169); expect(range.combos).toHaveLength(1326);
      expect(new Set(range.combos.map(c => c.cards.join(''))).size).toBe(1326);
      expect(range.provenance.sourceType).toBe('APPROXIMATED'); expect(range.provenance.solverVersion).toBeNull();
      expect(range.provenance.accuracy.value).toBeNull();
      for (const row of range.classes) {
        expect(row.actions.reduce((n, a) => n + a.frequency, 0)).toBeCloseTo(1);
        expect(row.actions.every(a => a.ev === null && a.frequency >= 0 && a.frequency <= 1)).toBe(true);
      }
    }
  });
  test('independent no-limit engine accepts every offered action and reproduces pot/call amounts', async () => {
    const provider = await getNlheProvider();
    for (const config of preflopConfigurations().filter(c => [10, 15, 100, 200].includes(c.stackBb))) {
      const range = await provider.getRangeStrategy(config);
      let state = createHoldemHand(Array(6).fill(config.stackBb * 100));
      const hero = SIX_MAX_POSITIONS.indexOf(config.hero); const villain = config.villain ? SIX_MAX_POSITIONS.indexOf(config.villain) : -1;
      if (config.scenario === 'rfi') while (state.actor !== hero) state = actHoldem(state, { type: 'fold' });
      else if (config.scenario === 'vs-open') {
        while (state.actor !== villain) state = actHoldem(state, { type: 'fold' });
        state = actHoldem(state, { type: 'raise', to: config.villain === 'SB' ? 300 : 250 });
        while (state.actor !== hero) state = actHoldem(state, { type: 'fold' });
      } else {
        while (state.actor !== hero) state = actHoldem(state, { type: 'fold' });
        state = actHoldem(state, { type: 'raise', to: config.hero === 'SB' ? 300 : 250 });
        while (state.actor !== villain) state = actHoldem(state, { type: 'fold' });
        state = actHoldem(state, { type: 'raise', to: Math.min(config.stackBb * 100, ['SB', 'BB'].includes(config.villain!) ? 1100 : 900) });
        while (state.actor !== hero) state = actHoldem(state, { type: 'fold' });
      }
      expect(state.pot).toBeCloseTo(range.potBb * 100); expect(legalHoldemActions(state).call).toBeCloseTo(range.toCallBb * 100);
      for (const action of range.actions) expect(() => actHoldem(state, action.id === 'raise' ? { type: 'raise', to: Math.round(action.toBb! * 100) } : { type: action.id as 'fold' | 'call' })).not.toThrow();
    }
  });
  test('stack switching changes the policy, arbitrary depths work and impossible histories are rejected', async () => {
    const provider = await getNlheProvider();
    const shallow = await provider.getNode({ ...DEFAULT_NLHE, stackBb: 10 }); const deep = await provider.getNode({ ...DEFAULT_NLHE, stackBb: 200 });
    expect(shallow.classes).not.toEqual(deep.classes);
    expect((await provider.getNode({ ...DEFAULT_NLHE, stackBb: 62.5 })).config.stackBb).toBe(62.5);
    expect(validNlheConfig({ ...DEFAULT_NLHE, stackBb: 10.12 })).toBe(true);
    expect(validNlheConfig({ ...DEFAULT_NLHE, stackBb: 10.123 })).toBe(false);
    expect(() => configFromSearch(new URLSearchParams('scenario=flop-srp&stack=200'))).toThrow();
    expect(validNlheConfig({ ...DEFAULT_NLHE, hero: 'BB' })).toBe(false);
    expect(validNlheConfig({ ...DEFAULT_NLHE, scenario: 'vs-open', hero: 'UTG', villain: 'BTN' })).toBe(false);
    const reraised = await provider.getRangeStrategy({ ...DEFAULT_NLHE, scenario: 'vs-3bet', villain: 'BB' });
    const opening = await provider.getRangeStrategy(DEFAULT_NLHE);
    expect(reraised.classes.find(c => c.handClass === '72o')!.reach).toBe(0);
    for (const row of reraised.classes) expect(row.reach).toBe(opening.classes.find(c => c.handClass === row.handClass)!.actions.find(a => a.action === 'raise')!.frequency);
    expect((await provider.getNode({ ...DEFAULT_NLHE, scenario: 'vs-3bet', villain: 'BB', stackBb: 10 })).actions.map(a => a.id)).toEqual(['fold', 'call']);
  });
  test('flop lookup uses five real cards and removes all board blockers', async () => {
    const range = await (await getNlheProvider()).getRangeStrategy(POSTFLOP_CONFIG);
    expect(range.board).toEqual(['As', '7d', '2c']); expect(range.combos).toHaveLength(1176);
    expect(range.combos.map(c => c.cards)).toEqual(allCombos(range.board));
    expect(range.actions.map(a => a.id)).toEqual(['check', 'bet']); expect(range.potBb).toBe(5.5);
    expect(range.combos.find(c => c.cards.join('') === 'AhAd')!.actions.find(a => a.action === 'bet')!.frequency).toBe(0.75);
  });
});
