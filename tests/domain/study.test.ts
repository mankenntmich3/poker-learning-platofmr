import { expect,test } from 'vitest';
import { BB, DEFAULT_STUDY, initialStudyState, applyStudyEvent, replayStudy, serializeStudy, parseStudy, studyActions, type StudySpot } from '@/domain/study';
import { randomFlop, handFeatures, randomCards } from '@/domain/analysis';
import { boardTexture, createDeck } from '@/domain/cards';
import { equity, showdownScore } from '@/domain/equity';
import { evaluateHoldem } from '@/domain/holdem';
const root:StudySpot={schema:2,config:DEFAULT_STUDY,heroHand:['As','Ks'],events:[{kind:'deal',cards:['Kh','8s','4c']}]};
test('6-max dead blinds, 33% bet/call, turn/river and exact integer conservation',()=>{
  let state=replayStudy(root);expect(state.pot).toBe(4.5*BB);expect(state.players.map(p=>p.stack)).toEqual([28*BB,28*BB]);
  state=applyStudyEvent(state,{kind:'action',actor:'BB',action:{type:'check'}});
  expect(studyActions(state).find(a=>a.label.startsWith('Bet 33%'))?.action).toEqual({type:'bet',toBb:1.485});
  state=applyStudyEvent(state,{kind:'action',actor:'BTN',action:{type:'bet',toBb:1.485}});
  expect(state.pot).toBe(5.985*BB);
  expect(()=>applyStudyEvent(state,{kind:'deal',cards:['7s']})).toThrow();
  state=applyStudyEvent(state,{kind:'action',actor:'BB',action:{type:'call'}});expect(state.pot).toBe(7.47*BB);
  state=applyStudyEvent(state,{kind:'deal',cards:['7s']});expect(state.activePlayer).toBe('BB');
  for(const actor of ['BB','BTN'] as const)state=applyStudyEvent(state,{kind:'action',actor,action:{type:'check'}});
  state=applyStudyEvent(state,{kind:'deal',cards:['2d']});for(const actor of ['BB','BTN'] as const)state=applyStudyEvent(state,{kind:'action',actor,action:{type:'check'}});
  expect(state.complete).toBe(true);expect(state.players.reduce((n,p)=>n+p.stack,0)+state.pot).toBe(60.5*BB);
});
test('reject duplicate cards, wrong actor, invalid raises, stack overflow and bad street order',()=>{
  const state=replayStudy(root);
  expect(()=>replayStudy({...root,heroHand:['Kh','Ks']})).toThrow();
  expect(()=>applyStudyEvent(state,{kind:'action',actor:'BTN',action:{type:'check'}})).toThrow();
  for(const toBb of [0.5,31,NaN])expect(()=>applyStudyEvent(state,{kind:'action',actor:'BB',action:{type:'bet',toBb}})).toThrow();
  const bet=applyStudyEvent(state,{kind:'action',actor:'BB',action:{type:'bet',toBb:3}});
  expect(()=>applyStudyEvent(bet,{kind:'action',actor:'BTN',action:{type:'raise',toBb:5}})).toThrow();
  expect(()=>applyStudyEvent(bet,{kind:'action',actor:'BTN',action:{type:'check'}})).toThrow();
  expect(()=>applyStudyEvent(initialStudyState(DEFAULT_STUDY,['As','Ks']),{kind:'deal',cards:['Kh']})).toThrow();
});
test('all-in call runs out remaining streets without extra betting; 3-bet pot includes dead blind',()=>{
  let state=replayStudy(root);state=applyStudyEvent(state,{kind:'action',actor:'BB',action:{type:'all-in'}});
  expect(studyActions(state).map(a=>a.id)).toEqual(['fold','call']);state=applyStudyEvent(state,{kind:'action',actor:'BTN',action:{type:'call'}});
  state=applyStudyEvent(state,{kind:'deal',cards:['7s']});expect(state.awaitingBoard).toBe(true);state=applyStudyEvent(state,{kind:'deal',cards:['2d']});expect(state.complete).toBe(true);
  expect(replayStudy({...root,config:{...DEFAULT_STUDY,line:'3bet',threeBetBb:11}}).pot).toBe(22.5*BB);
  expect(()=>replayStudy({...root,config:{...DEFAULT_STUDY,line:'3bet',threeBetBb:2.5}})).toThrow();
});
test('serialization and independently branched histories round trip',()=>{expect(parseStudy(serializeStudy(root))).toEqual(root);const branch={...root,events:[...root.events,{kind:'action' as const,actor:'BB' as const,action:{type:'check' as const}}]};expect(replayStudy(branch).activePlayer).toBe('BTN');expect(replayStudy(root).activePlayer).toBe('BB');});
test('exact equity handles ties, made hands and all legal turn runouts',()=>{
  const pair=[{cards:['As','Ah'] as const,weight:1}],kings=[{cards:['Ks','Kh'] as const,weight:1}];
  expect(equity(pair,kings,['2c','3d','7h','8c','9s']).hero).toBe(1);
  const tie=equity([{cards:['2s','3s'],weight:1}],[{cards:['4h','5h'],weight:1}],['As','Kd','Qh','Jc','Ts']);expect(tie.hero).toBe(.5);expect(tie.tie).toBe(1);
  const turn=equity(pair,kings,['2c','3d','7h','8c']);expect(turn.samples).toBe(44);expect(turn.hero).toBeCloseTo(42/44,10);
  expect(()=>equity(pair,kings,['As','3d','7h'])).toThrow();
});
test('fast seven-card ordering matches independent best-five enumeration',()=>{for(let i=0;i<200;i++){const cards=randomCards(7,[]);expect(showdownScore(cards)).toBe(evaluateHoldem(cards).score);}});
test('Monte Carlo uses weighted, compatible physical combos and reports sampling uncertainty',()=>{const result=equity([{cards:['As','Ah'],weight:1}],[{cards:['Ks','Kh'],weight:1},{cards:['Qs','Qh'],weight:.5}],['2c','3d','7h','8c'],5000,7);expect(result.hero).toBeCloseTo(42/44,1);expect(result.standardError).toBeGreaterThan(0);expect(result.hero+result.villain).toBe(1);});
test('suits, backdoors, blockers and filtered random boards are concrete',()=>{expect(handFeatures(['As','Ks'],['Js','8d','3c']).backdoorFlush).toBe(true);expect(handFeatures(['Ah','Kh'],['Js','8d','3c']).backdoorFlush).toBe(false);expect(handFeatures(['As','Ks'],['Kh','8s','4c','7s']).flushDraw).toBe(true);for(const filter of ['ace-high','king-high','paired','monotone','two-tone','connected','low']){const board=randomFlop(filter,['As','Ks']);expect(boardTexture(board)).toContain(filter);expect(board.some(c=>['As','Ks'].includes(c))).toBe(false);}expect(createDeck()).toHaveLength(52);});
