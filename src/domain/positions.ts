export type TablePosition = 'UTG' | 'UTG+1' | 'UTG+2' | 'LJ' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';
const POSITIONS: Readonly<Record<number, readonly TablePosition[]>> = {
  2: ['BTN', 'BB'], 3: ['BTN', 'SB', 'BB'], 4: ['CO', 'BTN', 'SB', 'BB'],
  5: ['HJ', 'CO', 'BTN', 'SB', 'BB'], 6: ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  7: ['UTG', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  8: ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  9: ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
};
export const TOURNAMENT_STACK_PRESETS = [10, 12, 15, 17, 20, 25, 30, 40, 50, 60, 80, 100, 150, 200] as const;
export function positionsFor(players: number): readonly TablePosition[] {
  if (!Number.isInteger(players) || !POSITIONS[players]) throw new Error('Player count must be between 2 and 9.');
  return POSITIONS[players];
}
export function seatRoles(players: number, seat: TablePosition) {
  if (!positionsFor(players).includes(seat)) throw new Error('Seat is not present.');
  return { button: seat === 'BTN', smallBlind: seat === (players === 2 ? 'BTN' : 'SB'), bigBlind: seat === 'BB' };
}
