import { afterEach,beforeEach,expect,test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createMemoryDatabase,type Database } from '@/server/db';
import { register,deleteAccount } from '@/server/service';
import { DEFAULT_STUDY,type StudySpot } from '@/domain/study';
import { getNlheProvider } from '@/strategy/nlhe-provider';
import { studyNode,recordStudyDecision,saveStudySpot } from '@/server/study-service';
import { startStudyTraining,answerStudyTraining,advanceStudyTraining,getStudyTraining } from '@/server/study-training';
import { studyMetrics } from '@/server/study-metrics';
import { StaticSolutionProvider } from '@/strategy/study-provider';
import { serializeStudy } from '@/domain/study';
const root:StudySpot={schema:2,config:DEFAULT_STUDY,heroHand:['As','Ks'],events:[{kind:'deal',cards:['Kh','8s','4c']},{kind:'action',actor:'BB',action:{type:'check'}}]};
let db:Database;let user:Awaited<ReturnType<typeof register>>['user'];const password='Study-engine-test-only!';
beforeEach(async()=>{db=await createMemoryDatabase();user=(await register(db,{name:'Study QA',email:`${randomUUID()}@example.test`,password})).user;});
afterEach(async()=>db.close());
test('size-specific nodes, full range, exact combo policy and action/card reach evolution',async()=>{
  const provider=await getNlheProvider(),base={game:'nlhe' as const,format:'6max-cash' as const,stackBb:30,hero:'BTN' as const,villain:null,scenario:'rfi' as const};
  const a=await provider.getRangeStrategy({...base,openBb:2}),b=await provider.getRangeStrategy({...base,openBb:2.5});expect(a.id).not.toBe(b.id);expect(a.classes).not.toEqual(b.classes);expect(a.combos).toHaveLength(1326);
  const first=await studyNode(root);expect(first.heroClasses).toHaveLength(169);expect(first.provenance.sourceType).toBe('APPROXIMATED');expect(first.hero.every(c=>c.actions.every(a=>a.ev===null))).toBe(true);
  const action=first.legalActions.find(a=>a.label.startsWith('Bet 33%'))!;
  const next:StudySpot={...root,events:[...root.events,{kind:'action',actor:'BTN',action:action.action},{kind:'action',actor:'BB',action:{type:'call'}},{kind:'deal',cards:['7s']}]};
  const turn=await studyNode(next);expect(turn.id).not.toBe(first.id);expect(turn.state.street).toBe('turn');expect(turn.hero.reduce((n,c)=>n+c.reach,0)).toBeLessThan(first.hero.reduce((n,c)=>n+c.reach,0));expect(turn.hero.some(c=>c.cards.includes('7s'))).toBe(false);expect(turn.villain.some(c=>c.cards.includes('As')||c.cards.includes('Ks'))).toBe(false);
});
test('persisted decision is idempotent, private, and removed with own account',async()=>{const node=await studyNode(root);const actionId=node.legalActions.find(a=>a.label.startsWith('Bet 33%'))!.id,attemptId=randomUUID();const feedback=await recordStudyDecision(db,user.id,{spot:root,actionId,attemptId});expect(feedback.evLoss).toBeNull();await recordStudyDecision(db,user.id,{spot:root,actionId,attemptId});expect(await db.query('SELECT id FROM study_engine_decisions')).toHaveLength(1);await expect(recordStudyDecision(db,user.id,{spot:root,actionId:'check',attemptId})).rejects.toMatchObject({status:409});await saveStudySpot(db,user.id,root,true);await deleteAccount(db,user,password);expect(await db.query('SELECT * FROM study_saved_spots')).toEqual([]);expect(await db.query('SELECT * FROM study_engine_decisions')).toEqual([]);});

test('ten-question sessions hide answers, persist snapshots and resume/finish idempotently',async()=>{
  const input={spot:root,options:{mode:'spot' as const,boardFilter:'fixed' as const,limit:10 as const},clientId:randomUUID()};
  let session=await startStudyTraining(db,user.id,input);expect((await startStudyTraining(db,user.id,input)).id).toBe(session.id);expect(JSON.stringify(session.question)).not.toContain('frequency');
  await expect(getStudyTraining(db,randomUUID(),session.id)).rejects.toMatchObject({status:404});
  for(let i=1;i<=10;i++){
    expect(session.question!.ordinal).toBe(i);expect(session.question!.feedback).toBeNull();
    session=await answerStudyTraining(db,user.id,session.id,session.question!.id,'check');expect(session.answered).toBe(i);
    expect((await answerStudyTraining(db,user.id,session.id,session.question!.id,'check')).answered).toBe(i);
    session=await advanceStudyTraining(db,user.id,session.id,false);
  }
  expect(session.complete).toBe(true);expect((await getStudyTraining(db,user.id,session.id)).answered).toBe(10);
  const metrics=await studyMetrics(db,user.id);expect(metrics.postflop.decisions).toBe(10);expect(metrics.postflop.ev_loss).toBeNull();expect(metrics.boards.length).toBeGreaterThan(0);
});

test('static solution adapter owns data and rejects unsupported accuracy/EV claims',async()=>{const node=await studyNode(root);const provider=new StaticSolutionProvider(new Map([[serializeStudy(root),node]]));node.hero[0].reach=123;expect((await provider.getNode(root)).hero[0].reach).not.toBe(123);const bad=await studyNode(root);bad.provenance.sourceType='COMPUTED';expect(()=>new StaticSolutionProvider(new Map([[serializeStudy(root),bad]]))).toThrow();});
test('random-board and full-hand sessions advance without duplicate cards or fake EV',async()=>{
  let session=await startStudyTraining(db,user.id,{spot:root,options:{mode:'full-hand',boardFilter:'ace-high',limit:10},clientId:randomUUID()});
  expect(session.question!.spot.events.some(e=>e.kind==='deal'&&e.cards.some(c=>c[0]==='A'))).toBe(true);
  session=await answerStudyTraining(db,user.id,session.id,session.question!.id,'check');
  expect(session.question!.feedback!.evLoss).toBeNull();session=await advanceStudyTraining(db,user.id,session.id,false);expect(session.question!.ordinal).toBe(2);
});
