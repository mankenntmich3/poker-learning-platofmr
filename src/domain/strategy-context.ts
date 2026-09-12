import { z } from 'zod';
import { assertUniqueCards, type Card } from './cards';
import { replayPublicHistory } from './tournament-state';

export type GameType = 'TOURNAMENT' | 'CASH';
export type EvaluationModel = 'CHIP_EV' | 'ICM' | 'PKO' | 'MYSTERY_BOUNTY';
export type AnteType = 'NONE' | 'BBA' | 'PLAYER_ANTE' | 'CUSTOM';
import { positionsFor, type TablePosition } from './positions';
export { positionsFor, seatRoles, TOURNAMENT_STACK_PRESETS, type TablePosition } from './positions';
const position = z.enum(['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']);
import { bbToUnits } from './chips';
export { bbToUnits, CHIP_UNITS_PER_BB } from './chips';
const amount = z.number().finite().nonnegative().refine(value => { try { bbToUnits(value); return true; } catch { return false; } }, 'Invalid chip precision');
const card = z.string().regex(/^[AKQJT2-9][shdc]$/).transform(value => value as Card);
const stack = z.object({ position, stackBb: amount.refine(value => value > 0) }).strict();
const action = z.discriminatedUnion('type', [
  z.object({ actor: position, type: z.enum(['FOLD', 'CHECK', 'CALL', 'LIMP', 'JAM']) }).strict(),
  z.object({ actor: position, type: z.literal('RAISE'), toBb: amount }).strict(),
]);
const event = z.union([action, z.object({ type: z.literal('DEAL'), cards: z.array(card).min(1).max(3) }).strict()]);
const ante = z.discriminatedUnion('type', [
  z.object({ type: z.literal('NONE'), amountBb: z.literal(0) }).strict(),
  z.object({ type: z.enum(['BBA', 'PLAYER_ANTE']), amountBb: amount }).strict(),
  z.object({ type: z.literal('CUSTOM'), payments: z.array(z.object({ position, amountBb: amount }).strict()).min(2).max(9) }).strict(),
]);
const rake = z.discriminatedUnion('type', [
  z.object({ type: z.literal('NONE') }).strict(),
  z.object({ type: z.literal('PERCENTAGE'), ruleVersion: z.string().min(1), rate: z.number().positive().max(1), capBb: amount, noFlopNoDrop: z.boolean(), minPlayersDealt: z.number().int().min(2).max(9), rounding: z.enum(['FLOOR', 'NEAREST']) }).strict(),
]);
const tournamentState = z.object({
  version: z.literal(1), playersRemaining: z.number().int().min(2),
  stage: z.enum(['EARLY', 'MIDDLE', 'BUBBLE', 'IN_THE_MONEY', 'FINAL_TABLE']),
  chipUnitBb: amount.refine(value => value > 0), currency: z.string().regex(/^[A-Z]{3}$/),
  allStacks: z.array(z.object({ playerId: z.string().min(1), chips: z.number().int().positive().max(1e12) }).strict()).min(2),
  tableSeats: z.array(z.object({ position, playerId: z.string().min(1) }).strict()).min(2).max(9),
  payoutsMinor: z.array(z.number().int().nonnegative()).min(1),
}).strict();
const bounty = z.object({
  version: z.literal(1), startingBountyMinor: z.number().int().positive(),
  progressiveShare: z.number().min(0).max(1),
  cashValues: z.array(z.object({ playerId: z.string().min(1), bountyMinor: z.number().int().nonnegative() }).strict()).min(2),
}).strict();
const evaluation = z.discriminatedUnion('model', [
  z.object({ model: z.literal('CHIP_EV') }).strict(),
  z.object({ model: z.literal('ICM'), tournament: tournamentState }).strict(),
  z.object({ model: z.literal('PKO'), tournament: tournamentState, bounty }).strict(),
  z.object({ model: z.literal('MYSTERY_BOUNTY'), tournament: tournamentState, mystery: z.object({
    version: z.literal(1), active: z.boolean(), awards: z.array(z.object({ amountMinor: z.number().int().nonnegative(), remaining: z.number().int().positive() }).strict()).min(1),
  }).strict() }).strict(),
]);
export const strategyContextSchema = z.object({
  schemaVersion: z.literal(2), rulesVersion: z.literal('rangeform-nlhe-public-v1'),
  game: z.literal('NLHE'), gameType: z.enum(['TOURNAMENT', 'CASH']),
  evaluationModel: z.enum(['CHIP_EV', 'ICM', 'PKO', 'MYSTERY_BOUNTY']), evaluation,
  players: z.number().int().min(2).max(9),
  blinds: z.object({ sbBb: amount.refine(value => value > 0 && value < 1), bbBb: z.literal(1) }).strict(),
  postingOrder: z.enum(['BLINDS_FIRST', 'ANTES_FIRST']), ante, rake,
  stacks: z.array(stack).min(2).max(9), hero: position,
  actionHistory: z.array(event).max(1000), board: z.array(card).max(5), deadCards: z.array(card).max(34),
}).strict();
export type StrategyContext = z.infer<typeof strategyContextSchema>;
export type PublicAction = z.infer<typeof action>;
export type PublicEvent = z.infer<typeof event>;
export type PlayerStack = z.infer<typeof stack>;
export type AnteConfiguration = z.infer<typeof ante>;

/** Display helper only. Strategy identity always includes the entire stack vector. */
export function effectiveStackBb(stacks: readonly PlayerStack[], involved: readonly TablePosition[]): number {
  if (involved.length < 2 || new Set(involved).size !== involved.length || new Set(stacks.map(s => s.position)).size !== stacks.length) throw new Error('Distinct involved players and stacks required.');
  const values = involved.map(p => stacks.find(s => s.position === p)?.stackBb);
  if (values.some(v => v === undefined || !Number.isFinite(v) || v <= 0)) throw new Error('Every involved player needs a positive stack.');
  return Math.min(...values as number[]);
}
/** Normalize sets only; preserve suits, seat ownership, bets and street chronology. */
export function canonicalStrategyContext(input: unknown): StrategyContext {
  const c = strategyContextSchema.parse(input), seats = positionsFor(c.players);
  if (c.stacks.length !== c.players || new Set(c.stacks.map(s => s.position)).size !== c.players || c.stacks.some(s => !seats.includes(s.position)) || !seats.includes(c.hero)) throw new Error('Stacks and hero must match the seated players.');
  if (c.evaluationModel !== c.evaluation.model) throw new Error('Evaluation state and model disagree.');
  if (c.gameType === 'CASH' && (c.evaluationModel !== 'CHIP_EV' || c.ante.type !== 'NONE')) throw new Error('Cash requires its own ChipEV context.');
  if (c.gameType === 'TOURNAMENT' && c.rake.type !== 'NONE') throw new Error('Tournament chip pots have no rake.');
  if (c.ante.type === 'CUSTOM') {
    if (c.ante.payments.length !== c.players || new Set(c.ante.payments.map(p => p.position)).size !== c.players || c.ante.payments.some(p => !seats.includes(p.position))) throw new Error('Custom ante requires every payer exactly once.');
    c.ante.payments.sort((a,b) => seats.indexOf(a.position) - seats.indexOf(b.position));
  }
  assertUniqueCards([...c.board, ...c.deadCards]);
  if (![0,3,4,5].includes(c.board.length) || c.deadCards.length + c.board.length + 2*c.players > 52) throw new Error('Invalid public card coverage.');
  c.stacks.sort((a,b) => seats.indexOf(a.position) - seats.indexOf(b.position));
  c.deadCards.sort();
  c.board = [...c.board.slice(0,3).sort(), ...c.board.slice(3)];
  c.actionHistory = c.actionHistory.map(e => e.type === 'DEAL' ? { ...e, cards: e.cards.length === 3 ? [...e.cards].sort() : e.cards } : e);
  if (c.evaluation.model !== 'CHIP_EV') {
    const t = c.evaluation.tournament, ids = new Set(t.allStacks.map(p => p.playerId));
    if (t.playersRemaining !== t.allStacks.length || ids.size !== t.playersRemaining || t.playersRemaining < c.players || t.tableSeats.length !== c.players || new Set(t.tableSeats.map(s => s.position)).size !== c.players || new Set(t.tableSeats.map(s => s.playerId)).size !== c.players) throw new Error('Incomplete tournament stack state.');
    for (const s of t.tableSeats) {
      const chips = t.allStacks.find(p => p.playerId === s.playerId)?.chips, local = c.stacks.find(p => p.position === s.position);
      if (!ids.has(s.playerId) || !local || chips === undefined || bbToUnits(chips*t.chipUnitBb) !== bbToUnits(local.stackBb)) throw new Error('Tournament and table stacks disagree.');
    }
    if (t.payoutsMinor.some((v,i) => i > 0 && v > t.payoutsMinor[i-1])) throw new Error('Payouts must be ordered by finishing position.');
    t.allStacks.sort((a,b) => a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0);
    t.tableSeats.sort((a,b) => seats.indexOf(a.position) - seats.indexOf(b.position));
    if (c.evaluation.model === 'PKO') {
      const b = c.evaluation.bounty;
      if (b.cashValues.length !== ids.size || new Set(b.cashValues.map(p => p.playerId)).size !== ids.size || b.cashValues.some(p => !ids.has(p.playerId))) throw new Error('Incomplete bounty ownership.');
      b.cashValues.sort((a,b) => a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0);
    }
    if (c.evaluation.model === 'MYSTERY_BOUNTY') {
      const awards = c.evaluation.mystery.awards;
      if (new Set(awards.map(a => a.amountMinor)).size !== awards.length) throw new Error('Mystery awards require one count per prize amount.');
      awards.sort((a,b) => a.amountMinor - b.amountMinor);
    }
  }
  const state = replayPublicHistory(c);
  if (state.actor !== c.hero) throw new Error('Hero must be the actor reached by the complete public history.');
  return c;
}
export function validateStrategyContext(context: unknown): void {
  const c = canonicalStrategyContext(context);
  if (c.evaluationModel !== 'CHIP_EV') throw new Error('Only ChipEV is currently implemented.');
  if (c.rake.type !== 'NONE') throw new Error('Raked Cash solving is not implemented.');
}
export function defaultTournamentContext(players = 8, stackBb = 15): StrategyContext {
  const seats = positionsFor(players), hero = seats[Math.max(0,seats.indexOf('HJ'))];
  return { schemaVersion: 2, rulesVersion: 'rangeform-nlhe-public-v1', game: 'NLHE', gameType: 'TOURNAMENT',
    evaluationModel: 'CHIP_EV', evaluation: { model: 'CHIP_EV' }, players,
    blinds: { sbBb: 0.5, bbBb: 1 }, postingOrder: 'BLINDS_FIRST', ante: { type: 'BBA', amountBb: 1 }, rake: { type: 'NONE' },
    stacks: seats.map(position => ({position,stackBb})), hero,
    actionHistory: seats.slice(0,seats.indexOf(hero)).map(actor => ({actor,type:'FOLD'})), board: [], deadCards: [] };
}
