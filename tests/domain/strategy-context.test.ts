import { describe, expect, it } from 'vitest';
import { defaultTournamentContext, effectiveStackBb, positionsFor, validateStrategyContext } from '@/domain/strategy-context';

describe('MTT strategy context', () => {
  it('uses the correct dynamic positions for every table size', () => {
    expect(positionsFor(2)).toEqual(['BTN', 'BB']);
    expect(positionsFor(6)).toEqual(['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']);
    expect(positionsFor(8)).toEqual(['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']);
    expect(positionsFor(9)).toEqual(['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']);
    for (let players = 2; players <= 9; players++) expect(positionsFor(players)).toHaveLength(players);
  });

  it('defaults to 8-handed Tournament ChipEV with a one-BB big-blind ante', () => {
    const context = defaultTournamentContext();
    expect(context).toMatchObject({ gameType: 'TOURNAMENT', evaluationModel: 'CHIP_EV', players: 8, hero: 'HJ', ante: { type: 'BBA', amountBb: 1 } });
    expect(() => validateStrategyContext(context)).not.toThrow();
  });

  it('defines effective stack as the smallest relevant stack', () => {
    expect(effectiveStackBb([{ position: 'HJ', stackBb: 15 }, { position: 'BB', stackBb: 40 }], ['HJ', 'BB'])).toBe(15);
  });

  it('rejects format mixing and future evaluation models', () => {
    expect(() => validateStrategyContext({ ...defaultTournamentContext(), gameType: 'CASH' })).toThrow(/Cash/);
    expect(() => validateStrategyContext({ ...defaultTournamentContext(), evaluationModel: 'ICM' })).toThrow(/Only ChipEV/);
  });
});
