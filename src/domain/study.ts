import { assertUniqueCards, createCombo, type Card, type Combo } from './cards';
import { SIX_MAX_POSITIONS, type Position, type Street } from './chips';

/** 10,000 integer units per BB retain 2.25 opens and percentage bets without float drift. */
export const BB = 10_000;
export const BET_PERCENTAGES = [20, 25, 33, 50, 66, 75, 100, 125, 150] as const;
export interface StudyConfig {
  game: 'NLHE'; format: '6max'; players: 6; stackBb: number;
  hero: Position; villain: Position; opener: Position; line: 'srp' | '3bet' | '4bet';
  openBb: number; threeBetBb: number; fourBetBb: number;
}
export const DEFAULT_STUDY: StudyConfig = { game: 'NLHE', format: '6max', players: 6, stackBb: 30, hero: 'BTN', villain: 'BB', opener: 'BTN', line: 'srp', openBb: 2, threeBetBb: 8, fourBetBb: 18 };
export type StudyAction = { type: 'fold' | 'check' | 'call' | 'all-in' } | { type: 'bet' | 'raise'; toBb: number };
export type StudyEvent = { kind: 'action'; actor: Position; action: StudyAction } | { kind: 'deal'; cards: Card[] };
export interface StudySpot { schema: 2; config: StudyConfig; heroHand: Combo; events: StudyEvent[] }
export interface StudyPlayer { position: Position; stack: number; invested: number; streetInvested: number; actedAtBet: number | null; folded: boolean }
export interface PokerAction { street: Street; actor: Position; action: StudyAction['type']; sizeBb: number; paidBb: number }
export interface LegalAction { id: string; label: string; action: StudyAction }
export interface PokerGameState {
  config: StudyConfig; street: Street; board: Card[]; heroHand: Combo; players: StudyPlayer[];
  pot: number; currentBet: number; lastRaise: number; activePlayer: Position | null;
  awaitingBoard: boolean; complete: boolean; actionHistory: PokerAction[];
}
const chipAmount = (value: number) => {
  if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(Math.round(value * BB)) || Math.abs(Math.round(value * BB) - value * BB) > 1e-6) throw new Error('Ungültiger Chipbetrag.');
  return Math.round(value * BB);
};
export function studySizes(stack: number, position: Position) {
  const opens = stack <= 20 ? [2, 2.1, 2.2] : stack <= 40 ? [2, 2.1, 2.2, 2.25] : stack <= 75 ? [2.2, 2.25, 2.3, 2.5] : [2.3, 2.5, 3];
  const recommended = position === 'SB' ? (stack <= 30 ? 2.5 : 3) : stack <= 40 ? 2 : 2.5;
  return { recommended, opens: [...new Set([...opens, recommended])].sort((a,b) => a-b) };
}
export function validateStudyConfig(config: StudyConfig): void {
  if (config.game !== 'NLHE' || config.format !== '6max' || config.players !== 6 || config.stackBb < 10 || config.stackBb > 500
    || !SIX_MAX_POSITIONS.includes(config.hero) || !SIX_MAX_POSITIONS.includes(config.villain) || config.hero === config.villain
    || ![config.hero, config.villain].includes(config.opener) || !['srp', '3bet', '4bet'].includes(config.line)) throw new Error('Wähle einen gültigen 6-max Heads-Up-Spot mit 10–500 BB.');
  const responder = config.opener === config.hero ? config.villain : config.hero;
  if (SIX_MAX_POSITIONS.indexOf(config.opener) >= SIX_MAX_POSITIONS.indexOf(responder)) throw new Error('Der Opener muss preflop vor dem Caller handeln.');
  const stack = chipAmount(config.stackBb), open = chipAmount(config.openBb), three = chipAmount(config.threeBetBb), four = chipAmount(config.fourBetBb);
  if (open < 2 * BB || open > stack) throw new Error('Open muss mindestens 2 BB und höchstens den Stack betragen.');
  if (config.line !== 'srp' && (three <= open || three > stack || (three < 2 * open - BB && three !== stack))) throw new Error('Ungültige 3-Bet: Minimum-Raise oder Stack verletzt.');
  if (config.line === '4bet' && (four <= three || four > stack || (four < 2 * three - open && four !== stack))) throw new Error('Ungültige 4-Bet: Minimum-Raise oder Stack verletzt.');
}
const blind = (position: Position) => position === 'BB' ? BB : position === 'SB' ? BB / 2 : 0;
const postOrder = (position: Position) => ['SB', 'BB', 'UTG', 'HJ', 'CO', 'BTN'].indexOf(position);
function payment(state: PokerGameState, player: StudyPlayer, amount: number) {
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > player.stack) throw new Error('Stack überschritten.');
  player.stack -= amount; player.invested += amount; player.streetInvested += amount; state.pot += amount;
}
export function initialStudyState(config: StudyConfig, heroHand: Combo): PokerGameState {
  validateStudyConfig(config); assertUniqueCards(heroHand);
  if (heroHand.length !== 2) throw new Error('Wähle zwei Hero-Karten.');
  const state: PokerGameState = { config: { ...config }, street: 'preflop', board: [], heroHand: createCombo(...heroHand),
    players: [config.hero, config.villain].sort((a,b)=>postOrder(a)-postOrder(b)).map(position => ({ position, stack: chipAmount(config.stackBb), invested: 0, streetInvested: 0, actedAtBet: null, folded: false })),
    pot: 1.5 * BB - blind(config.hero) - blind(config.villain), currentBet: 0, lastRaise: BB, activePlayer: null, awaitingBoard: true, complete: false, actionHistory: [] };
  for (const player of state.players) payment(state, player, blind(player.position));
  const opener = state.players.find(p=>p.position===config.opener)!;
  const responder = state.players.find(p=>p!==opener)!;
  const pre = (player: StudyPlayer, action: 'raise'|'call', to: number) => {
    const paid = chipAmount(to) - player.streetInvested;
    payment(state, player, paid);
    state.actionHistory.push({ street: 'preflop', actor: player.position, action, sizeBb: to, paidBb: paid / BB });
  };
  pre(opener, 'raise', config.openBb);
  if (config.line === 'srp') pre(responder, 'call', config.openBb);
  else {
    pre(responder, 'raise', config.threeBetBb);
    if (config.line === '3bet') pre(opener, 'call', config.threeBetBb);
    else { pre(opener, 'raise', config.fourBetBb); pre(responder, 'call', config.fourBetBb); }
  }
  return state;
}
export function studyLegal(state: PokerGameState) {
  const player = state.players.find(p=>p.position===state.activePlayer);
  if (!player || state.complete || state.awaitingBoard) return null;
  const opponent = state.players.find(p=>p!==player)!;
  const call = Math.min(player.stack, state.currentBet - player.streetInvested);
  const maxTo = player.streetInvested + player.stack;
  const canRaise = opponent.stack > 0 && maxTo > state.currentBet && (player.actedAtBet === null || state.currentBet - player.actedAtBet >= state.lastRaise);
  return { call, minTo: state.currentBet + state.lastRaise, maxTo, canRaise, player, opponent };
}
export function applyStudyEvent(original: PokerGameState, event: StudyEvent): PokerGameState {
  const state = structuredClone(original);
  if (!event || !['deal','action'].includes(event.kind)) throw new Error('Unbekanntes Ereignis.');
  if (state.complete) throw new Error('Diese Hand ist beendet. Springe zu einem früheren Node.');
  if (event.kind === 'deal') {
    if (!state.awaitingBoard) throw new Error('Zuerst die aktuelle Setzrunde abschließen.');
    const count = state.street === 'preflop' ? 3 : 1;
    if (event.cards.length !== count || state.street === 'river') throw new Error('Ungültige Street-Reihenfolge.');
    assertUniqueCards([...state.heroHand, ...state.board, ...event.cards]);
    state.board.push(...event.cards); state.street = state.street === 'preflop' ? 'flop' : state.street === 'flop' ? 'turn' : 'river';
    state.currentBet = 0; state.lastRaise = BB;
    state.players.forEach(p=>{ p.streetInvested = 0; p.actedAtBet = null; });
    state.awaitingBoard = state.players.some(p=>p.stack === 0);
    state.complete = state.awaitingBoard && state.street === 'river';
    state.activePlayer = state.awaitingBoard ? null : state.players[0].position;
    return state;
  }
  const legal = studyLegal(state);
  if (!event.action || !['fold','check','call','all-in','bet','raise'].includes(event.action.type)) throw new Error('Unbekannte Action.');
  if (!legal || event.actor !== state.activePlayer) throw new Error('Falscher Spieler oder keine legale Entscheidung.');
  const { player, opponent } = legal;
  const before = player.stack;
  let action = event.action;
  if (action.type === 'all-in') action = legal.maxTo > state.currentBet ? { type: state.currentBet ? 'raise' : 'bet', toBb: legal.maxTo / BB } : { type: 'call' };
  if (action.type === 'fold') { if (!legal.call) throw new Error('Ohne Einsatz ist Check statt Fold verfügbar.'); player.folded = true; state.complete = true; }
  else if (action.type === 'check') { if (legal.call) throw new Error('Check gegen einen Einsatz ist nicht erlaubt.'); }
  else if (action.type === 'call') { if (!legal.call) throw new Error('Kein Betrag zu callen.'); payment(state, player, legal.call); }
  else if ('toBb' in action) {
    const to = chipAmount(action.toBb);
    if ((action.type === 'bet') !== (state.currentBet === 0) || !legal.canRaise || to <= state.currentBet || to > legal.maxTo || (to < legal.minTo && to !== legal.maxTo)) throw new Error('Ungültige Bet/Raise: Minimum, Stack oder wiedereröffnete Action prüfen.');
    const increase = to - state.currentBet;
    payment(state, player, to - player.streetInvested);
    if (increase >= state.lastRaise) state.lastRaise = increase;
    state.currentBet = to;
  }
  player.actedAtBet = state.currentBet;
  state.actionHistory.push({ street: state.street, actor: event.actor, action: event.action.type, sizeBb: player.streetInvested / BB, paidBb: (before - player.stack) / BB });
  const roundClosed = state.players.every(p=>p.actedAtBet !== null && p.streetInvested === state.currentBet);
  if (state.complete) state.activePlayer = null;
  else if (roundClosed) { state.complete = state.street === 'river'; state.awaitingBoard = !state.complete; state.activePlayer = null; }
  else state.activePlayer = opponent.position;
  return state;
}
export function replayStudy(spot: StudySpot): PokerGameState {
  if (spot.schema !== 2 || !Array.isArray(spot.events) || spot.events.length > 100) throw new Error('Ungültige oder zu lange Action-Historie.');
  return spot.events.reduce(applyStudyEvent, initialStudyState(spot.config, spot.heroHand));
}
export function studyActions(state: PokerGameState): LegalAction[] {
  const legal = studyLegal(state); if (!legal) return [];
  const actions: LegalAction[] = legal.call ? [{ id: 'fold', label: 'Fold', action: { type: 'fold' } }, { id: 'call', label: `Call ${legal.call / BB} BB`, action: { type: 'call' } }]
    : [{ id: 'check', label: 'Check', action: { type: 'check' } }];
  if (legal.canRaise) {
    const type = state.currentBet ? 'raise' : 'bet';
    const sizes = type === 'bet' ? BET_PERCENTAGES.map(pct=>({ pct, to: Math.round(state.pot * pct / 100) })) : [50,100].map(pct=>({pct, to: state.currentBet + Math.round((state.pot + legal.call) * pct / 100)}));
    for (const {pct, to} of sizes) if (to >= legal.minTo && to < legal.maxTo && !actions.some(a=>a.id===`${type}:${to}`)) actions.push({id:`${type}:${to}`,label: type === 'bet' ? `Bet ${pct}% · ${to / BB} BB` : `Raise auf ${to / BB} BB`,action:{type,toBb:to/BB}});
    if (!actions.some(a=>('toBb' in a.action) && a.action.toBb * BB === legal.minTo) && legal.minTo < legal.maxTo) actions.push({id:`${type}:${legal.minTo}`, label:`Min-${type} ${legal.minTo / BB} BB`,action:{type,toBb:legal.minTo/BB}});
    actions.push({id:'all-in',label:`All-in ${legal.maxTo / BB} BB`,action:{type:'all-in'}});
  }
  return actions;
}
export function serializeStudy(spot: StudySpot): string {
  replayStudy(spot);const c=spot.config;
  return JSON.stringify({schema:2,config:{game:c.game,format:c.format,players:c.players,stackBb:c.stackBb,hero:c.hero,villain:c.villain,opener:c.opener,line:c.line,openBb:c.openBb,threeBetBb:c.threeBetBb,fourBetBb:c.fourBetBb},heroHand:createCombo(...spot.heroHand),events:spot.events.map(e=>e.kind==='deal'?{kind:'deal',cards:e.cards}:{kind:'action',actor:e.actor,action:'toBb' in e.action?{type:e.action.type,toBb:e.action.toBb}:{type:e.action.type}})});
}
export function parseStudy(text: string): StudySpot { if (text.length > 12000) throw new Error('Spot-Link ist zu lang.'); const spot = JSON.parse(text) as StudySpot; replayStudy(spot); return spot; }
export function studyUrl(spot: StudySpot): string { return `/postflop?spot=${encodeURIComponent(serializeStudy(spot))}`; }
