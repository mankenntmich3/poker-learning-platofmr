import { describe, expect, it } from 'vitest';
import { contribute, effectiveStack, potFractionBet, requiredEquity, SIX_MAX_POSITIONS } from '../../src/domain/chips';

describe('integer chip accounting', () => {
  it('conserves chips, accumulates pot contributions and never mutates the input', () => {
    const initial = { pot: 3, stacks: [99, 98], contributed: [1, 2] };
    const next = contribute(initial, 0, 9);
    expect(next).toEqual({ pot: 12, stacks: [90, 98], contributed: [10, 2] });
    expect(next.pot + next.stacks.reduce((sum, stack) => sum + stack, 0)).toBe(200);
    expect(initial.stacks).toEqual([99, 98]);
    expect(contribute(next, 1, 98).stacks[1]).toBe(0);
  });
  it('rejects negative, fractional, overflow and insufficient-stack transfers', () => {
    const initial = { pot: 0, stacks: [100, 100], contributed: [0, 0] };
    for (const amount of [-1, 0.1, Infinity, NaN, 101]) expect(() => contribute(initial, 0, amount)).toThrow();
    expect(() => contribute(initial, 2, 1)).toThrow('Invalid player');
    expect(() => contribute({ ...initial, pot: Number.MAX_SAFE_INTEGER }, 0, 1)).toThrow('safe integer');
  });
  it('uses decision-time pot odds and caps rounded bet sizes to remaining stack', () => {
    expect(requiredEquity(30, 10)).toBe(0.25);
    expect(requiredEquity(0, 0)).toBe(0);
    expect(potFractionBet(100, 0.33, 200)).toBe(33);
    expect(potFractionBet(100, 1.5, 80)).toBe(80);
    expect(effectiveStack([100, 70])).toBe(70);
    expect(() => effectiveStack([100, 70, 50])).toThrow('heads-up');
    expect(() => potFractionBet(100, -1, 100)).toThrow();
    expect(SIX_MAX_POSITIONS).toEqual(['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']);
  });
});
