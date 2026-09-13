import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createMemoryDatabase,migrate,type Database} from '@/server/db';
import {register,login,logout,exportAccount,deleteAccount} from '@/server/service';
import {verifiedNode,startVerifiedQuestion,answerVerifiedQuestion,verifiedProgress} from '@/server/verified-training';
import {findExactVerifiedSolution,solutionCoverage} from '@/server/solution-registry';
import {preflopContext,PREFLOP_TREE_SHA} from '@/domain/preflop-definition';
import {VerifiedStrategyProvider} from '@/strategy/verified-provider';
import type {StudyUser} from '@/shared/contracts';
import type {VerifiedSpotSelection} from '@/shared/verified-spot';

describe('verified preflop uses the real shared learning and persistence path',()=>{
  let db:Database,user:StudyUser,token:string;
  const email=`preflop-${randomUUID()}@example.test`,password='Preflop-test-only-123',spot:VerifiedSpotSelection={kind:'preflop',stack:15,ante:1};
  beforeAll(async()=>{db=await createMemoryDatabase();({user,token}=await register(db,{name:'Preflop Test',email,password}));});
  afterAll(async()=>db.close());
  it('publishes, loads all 1326 physical rows, and never substitutes another tree/context',async()=>{
    const a=await verifiedNode(db,spot);expect(a.strategies).toHaveLength(1326);
    expect(a.strategies.filter(r=>r.reach>0)).toHaveLength(26);
    expect(await findExactVerifiedSolution(db,preflopContext(),PREFLOP_TREE_SHA)).not.toBeNull();
    const full=preflopContext();delete full.conditioning;
    expect(await findExactVerifiedSolution(db,full,PREFLOP_TREE_SHA)).toBeNull();
    await expect(new VerifiedStrategyProvider(db).getComboStrategy({context:a.context,treeSha256:PREFLOP_TREE_SHA},['As','Ah'])).rejects.toThrow(/support/);
    const coverage=await solutionCoverage(db);expect(coverage.find(r=>r.players===2&&r.stackBb===15)).toMatchObject({verified:1,scope:'CONDITIONAL_SUBGAME'});
    await migrate(db);expect(await findExactVerifiedSolution(db,a.context,PREFLOP_TREE_SHA)).not.toBeNull();
  });
  it('isolates immutable stack versions and accounts and persists real EV feedback',async()=>{
    const q=await startVerifiedQuestion(db,user.id,'action','smart',spot);
    await expect(answerVerifiedQuestion(db,randomUUID(),{id:q.id,action:'jam'},spot)).rejects.toMatchObject({status:404});
    await expect(answerVerifiedQuestion(db,user.id,{id:q.id,action:'jam'},{kind:'preflop',stack:20,ante:1})).rejects.toMatchObject({status:409});
    const answer=await answerVerifiedQuestion(db,user.id,{id:q.id,action:'jam'},spot);
    expect(answer.feedback!.actions.every(a=>Number.isFinite(a.evBb))).toBe(true);
    expect(answer.feedback!.evLossBb).not.toBeNull();
    expect(await answerVerifiedQuestion(db,user.id,{id:q.id,action:'fold'},spot)).toEqual(answer);
    await expect(answerVerifiedQuestion(db,user.id,{id:q.id,action:'jam'},{kind:'preflop',stack:20,ante:1})).rejects.toMatchObject({status:409});
    await logout(db,token);({token}=await login(db,{email,password}));
    expect((await verifiedProgress(db,user.id,new Date(),spot)).decisions).toBe(1);
    expect((await verifiedProgress(db,user.id)).decisions).toBe(0);
    expect((await verifiedProgress(db,user.id,new Date(),{kind:'preflop',stack:20,ante:1})).decisions).toBe(0);
  });
  it('grades exact frequency recall, persists mastery/due dates and includes export/deletion',async()=>{
    const q=await startVerifiedQuestion(db,user.id,'recall','range',spot),a=await verifiedNode(db,spot),row=a.strategies.find(r=>r.combo.join('')===q.combo.join(''))!;
    await expect(answerVerifiedQuestion(db,user.id,{id:q.id,frequencies:{fold:20,jam:20}},spot)).rejects.toMatchObject({status:400});
    const answer=await answerVerifiedQuestion(db,user.id,{id:q.id,frequencies:Object.fromEntries(row.actions.map(x=>[x.actionId,x.frequency*100]))},spot);
    expect(answer.feedback!.score).toBeCloseTo(100);
    const progress=await verifiedProgress(db,user.id,new Date(),spot);expect(progress.decisions).toBe(2);
    expect(new Date(progress.items.find(i=>i.mode==='recall')!.dueAt).getTime()).toBeGreaterThan(Date.now()+23*3600000);
    expect((await exportAccount(db,user)).verifiedQuestions).toHaveLength(2);
    await deleteAccount(db,user,password);expect(await db.query('SELECT id FROM verified_training_questions WHERE user_id=$1',[user.id])).toEqual([]);
  });
});
