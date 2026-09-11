import type { Card } from './cards';

export type GameType = 'TOURNAMENT' | 'CASH';
export type EvaluationModel = 'CHIP_EV' | 'ICM' | 'PKO' | 'MYSTERY_BOUNTY';
export type AnteType = 'NONE' | 'BBA' | 'PLAYER_ANTE' | 'CUSTOM';
export type TablePosition = 'UTG' | 'UTG+1' | 'UTG+2' | 'LJ' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';

export interface AnteConfiguration { type: AnteType; amountBb: number }
export interface BlindConfiguration { sbBb: number; bbBb: number }
export interface PlayerStack { position: TablePosition; stackBb: number }
export interface PublicAction { actor: TablePosition; type: 'FOLD' | 'CHECK' | 'CALL' | 'LIMP' | 'RAISE' | 'JAM'; toBb?: number }

export interface StrategyContext {
  game: 'NLHE';
  gameType: GameType;
  evaluationModel: EvaluationModel;
  players: number;
  blinds: BlindConfiguration;
  ante: AnteConfiguration;
  stacks: PlayerStack[];
  hero: TablePosition;
  actionHistory: PublicAction[];
  board: Card[];
}

const POSITIONS: Readonly<Record<number, readonly TablePosition[]>> = {
  2: ['BTN', 'BB'],
  3: ['BTN', 'SB', 'BB'],
  4: ['CO', 'BTN', 'SB', 'BB'],
  5: ['HJ', 'CO', 'BTN', 'SB', 'BB'],
  6: ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  7: ['UTG', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  8: ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  9: ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
};

export const TOURNAMENT_STACK_PRESETS = [10, 12, 15, 17, 20, 25, 30, 40, 50, 60, 80, 100, 150, 200] as const;

export function positionsFor(players: number): readonly TablePosition[] {
  const positions = POSITIONS[players];
  if (!positions) throw new Error('Player count must be between 2 and 9.');
  return positions;
}

export function effectiveStackBb(stacks: readonly PlayerStack[], involved: readonly TablePosition[]): number {
  if (involved.length < 2) throw new Error('Effective stack requires at least two involved players.');
  const byPosition = new Map(stacks.map((seat) => [seat.position, seat.stackBb]));
  const values = involved.map((position) => byPosition.get(position));
  if (values.some((value) => value === undefined || !Number.isFinite(value) || value <= 0)) throw new Error('Every involved player needs a positive stack.');
  return Math.min(...values as number[]);
}

export function validateStrategyContext(context: StrategyContext): void {
  const positions = positionsFor(context.players);
  if (context.evaluationModel !== 'CHIP_EV') throw new Error('Only ChipEV is currently implemented.');
  if (context.gameType === 'CASH' && context.ante.type !== 'NONE') throw new Error('Cash and tournament solution contexts must remain separate.');
  if (!(context.blinds.sbBb > 0 && context.blinds.bbBb > context.blinds.sbBb)) throw new Error('Invalid blind structure.');
  if (!Number.isFinite(context.ante.amountBb) || context.ante.amountBb < 0) throw new Error('Invalid ante.');
  if (context.ante.type === 'NONE' && context.ante.amountBb !== 0) throw new Error('NONE ante must be zero.');
  if (context.stacks.length !== context.players || new Set(context.stacks.map((seat) => seat.position)).size !== context.players) throw new Error('Stacks must match every seat exactly once.');
  if (context.stacks.some((seat) => !positions.includes(seat.position) || !Number.isFinite(seat.stackBb) || seat.stackBb <= 0)) throw new Error('Invalid seat stack.');
  if (!positions.includes(context.hero)) throw new Error('Hero is not seated at this table size.');
  if (context.actionHistory.some((action) => !positions.includes(action.actor) || ((action.type === 'RAISE') !== (action.toBb !== undefined)))) throw new Error('Invalid public action.');
  if (new Set(context.board).size !== context.board.length || context.board.length > 5) throw new Error('Invalid board.');
}

export function defaultTournamentContext(players = 8, stackBb = 15): StrategyContext {
  const positions = positionsFor(players);
  return { game: 'NLHE', gameType: 'TOURNAMENT', evaluationModel: 'CHIP_EV', players,
    blinds: { sbBb: 0.5, bbBb: 1 }, ante: { type: 'BBA', amountBb: 1 },
    stacks: positions.map((position) => ({ position, stackBb })), hero: positions[Math.max(0, positions.indexOf('HJ'))]!, actionHistory: [], board: [] };
}
