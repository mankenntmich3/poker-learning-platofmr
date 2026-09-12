export const SIX_MAX_POSITIONS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const;
export type Position = (typeof SIX_MAX_POSITIONS)[number];
export type Street = 'preflop' | 'flop' | 'turn' | 'river';
export interface ChipLedger { pot: number; stacks: readonly number[]; contributed: readonly number[] }

function chips(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Chips must be a nonnegative safe integer');
}

/** Accounting primitive only; game engines separately authorize legal actions.
 * Uses integer chips and conserves chips exactly. It does not settle side pots.
 */
export function contribute(ledger: ChipLedger, player: number, amount: number): ChipLedger {
  chips(ledger.pot);
  chips(amount);
  ledger.stacks.forEach(chips);
  ledger.contributed.forEach(chips);
  if (ledger.stacks.length !== ledger.contributed.length || !Number.isInteger(player)
    || player < 0 || player >= ledger.stacks.length) throw new Error('Invalid player ledger');
  if (amount > ledger.stacks[player]!) throw new Error('Insufficient stack');
  const stacks = [...ledger.stacks];
  const contributed = [...ledger.contributed];
  stacks[player]! -= amount;
  contributed[player]! += amount;
  const pot = ledger.pot + amount;
  chips(pot);
  chips(contributed[player]!);
  return { pot, stacks, contributed };
}

export function effectiveStack(stacks: readonly number[]): number {
  if (stacks.length !== 2) throw new Error('Effective stack helper is heads-up only');
  stacks.forEach(chips);
  return Math.min(...stacks);
}

/** Pot odds at the decision: call / (pot currently visible + call). */
export function requiredEquity(pot: number, call: number): number {
  chips(pot); chips(call);
  if (pot + call === 0) return 0;
  return call / (pot + call);
}

export function potFractionBet(pot: number, fraction: number, stack: number): number {
  chips(pot); chips(stack);
  if (!Number.isFinite(fraction) || fraction < 0) throw new Error('Invalid bet fraction');
  return Math.min(stack, Math.round(pot * fraction));
}

export const CHIP_UNITS_PER_BB = 10_000;
export function bbToUnits(value: number): number {
  const units = Math.round(value * CHIP_UNITS_PER_BB);
  if (!Number.isFinite(value) || value < 0 || units > 1e12 || Math.abs(units - value * CHIP_UNITS_PER_BB) > 1e-7) throw new Error('BB amount must use exact 0.0001 BB chip units.');
  return units;
}
