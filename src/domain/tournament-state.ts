import { assertUniqueCards, type Card } from './cards';
import { bbToUnits } from './chips';
import { positionsFor, seatRoles } from './positions';
import type { PublicAction, PublicEvent, StrategyContext, TablePosition } from './strategy-context';

export interface TournamentSeat {
  position: TablePosition; initial: number; remaining: number;
  committed: number; ante: number; streetCommitted: number;
  folded: boolean; actedAtBet: number | null;
}
export interface TournamentState {
  street: 'preflop' | 'flop' | 'turn' | 'river'; seats: TournamentSeat[];
  board: Card[]; deadCards: Card[]; pot: number; currentBet: number; lastFullRaise: number;
  actor: TablePosition | null; roundClosed: boolean; terminal: boolean; bigBlind: number;
}
function pay(s: TournamentState, p: TournamentSeat, units: number, ante = false) {
  const paid = Math.min(units, p.remaining);
  if (!Number.isSafeInteger(paid) || paid < 0) throw new Error('Invalid chip payment.');
  p.remaining -= paid; p.committed += paid; s.pot += paid;
  if (ante) p.ante += paid; else p.streetCommitted += paid;
}
function nextSeats(s: TournamentState, after: number) {
  return Array.from({length:s.seats.length},(_,i) => s.seats[(after+i+1)%s.seats.length]);
}
function updateTurn(s: TournamentState, after: number) {
  const live = s.seats.filter(p => !p.folded);
  s.terminal = live.length === 1;
  const able = live.filter(p => p.remaining > 0);
  // With only one solvent player, nominal bring-in cannot create a wager
  // nobody can match. Outstanding real all-in commitments still require a call.
  if (able.length === 1) s.currentBet = Math.max(...live.map(p => p.streetCommitted));
  const pending = nextSeats(s,after).filter(p => !p.folded && p.remaining > 0 && (p.actedAtBet === null || p.streetCommitted < s.currentBet));
  if (able.length <= 1 && able.every(p => p.streetCommitted >= s.currentBet)) pending.length = 0;
  s.roundClosed = !pending.length || s.terminal;
  if (s.roundClosed && s.street === 'river') s.terminal = true;
  s.actor = s.roundClosed ? null : pending[0].position;
}
/** Public betting replay. No hole cards, random draws, solver payoffs or effective-stack truncation. */
export function initialTournamentState(c: StrategyContext): TournamentState {
  const seats = positionsFor(c.players).map(position => {
    const initial = bbToUnits(c.stacks.find(p => p.position === position)!.stackBb);
    return {position,initial,remaining:initial,committed:0,ante:0,streetCommitted:0,folded:false,actedAtBet:null};
  });
  const s: TournamentState = {street:'preflop',seats,board:[],deadCards:[...c.deadCards],pot:0,currentBet:bbToUnits(c.blinds.bbBb),lastFullRaise:bbToUnits(c.blinds.bbBb),bigBlind:bbToUnits(c.blinds.bbBb),actor:null,roundClosed:false,terminal:false};
  const postBlinds = () => seats.forEach(p => {
    const roles = seatRoles(c.players,p.position);
    if (roles.smallBlind) pay(s,p,bbToUnits(c.blinds.sbBb));
    if (roles.bigBlind) pay(s,p,bbToUnits(c.blinds.bbBb));
  });
  const postAntes = () => seats.forEach(p => {
    const a = c.ante;
    const amount = a.type === 'CUSTOM' ? a.payments.find(x => x.position === p.position)!.amountBb
      : a.type === 'PLAYER_ANTE' || (a.type === 'BBA' && p.position === 'BB') ? a.amountBb : 0;
    pay(s,p,bbToUnits(amount),true);
  });
  if (c.postingOrder === 'BLINDS_FIRST') { postBlinds(); postAntes(); } else { postAntes(); postBlinds(); }
  updateTurn(s,seats.length-1);
  return s;
}
export function applyPublicAction(state: TournamentState, action: PublicAction): TournamentState {
  const s = structuredClone(state);
  if (s.terminal || s.roundClosed || s.actor !== action.actor) throw new Error('Action is out of turn or after street closure.');
  const index = s.seats.findIndex(p => p.position === action.actor), p = s.seats[index];
  const owed = Math.max(0,s.currentBet-p.streetCommitted), max = p.streetCommitted+p.remaining;
  const canRaise = max > s.currentBet && s.seats.some(q => q !== p && !q.folded && q.remaining > 0)
    && (p.actedAtBet === null || s.currentBet-p.actedAtBet >= s.lastFullRaise);
  switch (action.type) {
    case 'FOLD':
      if (!owed) throw new Error('Fold is excluded when checking is free.');
      p.folded = true; break;
    case 'CHECK':
      if (owed) throw new Error('Cannot check facing a wager.');
      break;
    case 'LIMP':
      if (s.street !== 'preflop' || s.currentBet !== s.bigBlind || !owed) throw new Error('Limp requires an unopened preflop wager.');
      pay(s,p,owed); break;
    case 'CALL':
      if (!owed) throw new Error('Nothing to call.');
      pay(s,p,owed); break;
    case 'RAISE':
    case 'JAM': {
      const to = action.type === 'RAISE' ? bbToUnits(action.toBb) : max;
      if (action.type === 'JAM' && max <= s.currentBet) {
        if (!owed) throw new Error('Invalid all-in call.');
        pay(s,p,p.remaining); break;
      }
      // An opening short all-in may be completed to one BB.
      const minimum = s.currentBet < s.bigBlind ? s.bigBlind : s.currentBet+s.lastFullRaise;
      if (!canRaise || to <= s.currentBet || to > max || (to < minimum && to !== max)) throw new Error('Illegal raise size or betting not reopened.');
      const increase = to-s.currentBet;
      pay(s,p,to-p.streetCommitted);
      if (increase >= s.lastFullRaise) s.lastFullRaise = increase;
      s.currentBet = to; break;
    }
    default: throw new Error('Unknown public action.');
  }
  p.actedAtBet = s.currentBet;
  updateTurn(s,index);
  if (s.seats.reduce((sum,p) => sum+p.remaining,0)+s.pot !== s.seats.reduce((sum,p) => sum+p.initial,0)) throw new Error('Chip conservation failed.');
  return s;
}
export function applyPublicEvent(state: TournamentState, event: PublicEvent): TournamentState {
  if (event.type !== 'DEAL') return applyPublicAction(state,event);
  if (!state.roundClosed || state.terminal || state.street === 'river') throw new Error('Board dealt before legal street closure.');
  if (event.cards.length !== (state.street === 'preflop' ? 3 : 1)) throw new Error('Invalid street card count.');
  assertUniqueCards([...state.board,...state.deadCards,...event.cards]);
  const s = structuredClone(state);
  s.board.push(...(event.cards.length === 3 ? [...event.cards].sort() : event.cards));
  s.street = s.street === 'preflop' ? 'flop' : s.street === 'flop' ? 'turn' : 'river';
  s.currentBet = 0; s.lastFullRaise = s.bigBlind;
  for (const p of s.seats) { p.streetCommitted = 0; p.actedAtBet = null; }
  updateTurn(s,s.seats.findIndex(p => p.position === 'BTN'));
  return s;
}
export function replayPublicHistory(c: StrategyContext): TournamentState {
  let s = initialTournamentState(c);
  for (const event of c.actionHistory) s = applyPublicEvent(s,event);
  const board = [...c.board.slice(0,3).sort(),...c.board.slice(3)];
  if (s.board.join('') !== board.join('')) throw new Error('Board does not match the replayed public history.');
  return s;
}
