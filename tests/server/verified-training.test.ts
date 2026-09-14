import { beforeAll,afterAll,describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createMemoryDatabase,migrate,type Database } from '@/server/db';
import { register,login,logout,exportAccount,deleteAccount } from '@/server/service';
import { verifiedNode,startVerifiedQuestion,answerVerifiedQuestion,verifiedProgress,gradeVerified } from '@/server/verified-training';
import { findExactVerifiedSolution } from '@/server/solution-registry';
import { riverContext,RIVER_TREE_SHA } from '@/domain/river-definition';
import { defaultTournamentContext } from '@/domain/strategy-context';
import { VerifiedStrategyProvider } from '@/strategy/verified-provider';
import type { StudyUser } from '@/shared/contracts';

describe('real verified NLHE learning persistence',()=>{
  let db:Database,user:StudyUser,token:string;
  const email=`verified-${randomUUID()}@example.test`,password='Verified-test-only-123';
  beforeAll(async()=>{db=await createMemoryDatabase();({user,token}=await register(db,{name:'Verified Test',email,password}));});
  afterAll(async()=>db.close());
  it('publishes independently verified data, exact-looks up, and survives repeated migrations',async()=>{
    const a=await verifiedNode(db);expect(a.strategies.filter(r=>r.reach>0)).toHaveLength(8);
    expect(await findExactVerifiedSolution(db,riverContext(),RIVER_TREE_SHA)).not.toBeNull();
    expect(await findExactVerifiedSolution(db,defaultTournamentContext(8,15),RIVER_TREE_SHA)).toBeNull();
    await migrate(db);await migrate(db);
    expect(await findExactVerifiedSolution(db,riverContext(),RIVER_TREE_SHA)).not.toBeNull();
    const provider=new VerifiedStrategyProvider(db);
    await expect(provider.getComboStrategy({context:riverContext(),treeSha256:RIVER_TREE_SHA},['Ah','Ac'])).rejects.toThrow(/support/);
  });
  it('stores action feedback exactly once, isolates accounts, and retains it after logout/login',async()=>{
    const q=await startVerifiedQuestion(db,user.id,'action','range');
    await expect(answerVerifiedQuestion(db,randomUUID(),{id:q.id,action:'check'})).rejects.toMatchObject({status:404});
    const answer=await answerVerifiedQuestion(db,user.id,{id:q.id,action:'jam'});
    expect(answer.feedback!.evLossBb).not.toBeNull();
    expect(answer.feedback!.actions.every(a=>a.evBb!==undefined)).toBe(true);
    expect(await answerVerifiedQuestion(db,user.id,{id:q.id,action:'check'})).toEqual(answer);
    await logout(db,token);({token}=await login(db,{email,password}));
    const progress=await verifiedProgress(db,user.id);
    expect(progress.decisions).toBe(1);expect(progress.items).toHaveLength(1);
    expect(progress.recent[0].id).toBe(q.id);
  });
  it('grades frequency recall by total variation and schedules successful/weak reviews',async()=>{
    const q=await startVerifiedQuestion(db,user.id,'recall','mixed'),a=await verifiedNode(db),row=a.strategies.find(r=>r.combo.join('')===q.combo.join(''))!;
    await expect(answerVerifiedQuestion(db,user.id,{id:q.id,frequencies:{check:20,half:20,jam:20}})).rejects.toMatchObject({status:400});
    const answer=await answerVerifiedQuestion(db,user.id,{id:q.id,frequencies:Object.fromEntries(row.actions.map(a=>[a.actionId,a.frequency*100]))});
    expect(answer.feedback!.score).toBeCloseTo(100);expect(answer.feedback!.evLossBb).toBeNull();
    const progress=await verifiedProgress(db,user.id),item=progress.items.find(i=>i.combo===q.combo.join('') && i.mode==='recall')!;
    expect(item.mastery).toBeCloseTo(100);expect(new Date(item.dueAt).getTime()).toBeGreaterThan(Date.now()+23*3600000);
    const future=await verifiedProgress(db,user.id,new Date(Date.now()+31*86400000));expect(future.due).toBe(2);
    const supported=a.strategies.find(r=>r.actions.some(x=>x.frequency>.05&&x.frequency<.95))!;
    const mixed=supported.actions.find(x=>x.frequency>.05&&x.frequency<.95)!;
    expect(gradeVerified(supported,{action:mixed.actionId}).category).toBe('Valid Mixed Action');
  });
  it('includes real decisions in export and erases them with the account',async()=>{
    const exported=await exportAccount(db,user);expect((exported.verifiedQuestions as unknown[])).toHaveLength(2);
    await deleteAccount(db,user,password);expect(await db.query('SELECT id FROM verified_training_questions WHERE user_id=$1',[user.id])).toEqual([]);
  });
});
