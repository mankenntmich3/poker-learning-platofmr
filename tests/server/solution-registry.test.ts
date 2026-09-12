import { afterEach,beforeEach,describe,expect,it } from 'vitest';
import { createMemoryDatabase,migrate,type Database } from '@/server/db';
import { defaultTournamentContext } from '@/domain/strategy-context';
import { exactContextKey,findExactVerifiedSolution,publishVerifiedSolution,queueSolverJob,solutionCoverage } from '@/server/solution-registry';
import { TEST_TREE_SHA,untrustedSolution } from '../fixtures/untrusted-solution';

describe('verified solution registry',()=>{
  let db:Database;
  beforeEach(async()=>{db=await createMemoryDatabase();});
  afterEach(async()=>db.close());
  it('queues canonical contexts, preserving each player stack and game identity',async()=>{
    const c=defaultTournamentContext(),base=exactContextKey(c,TEST_TREE_SHA);
    expect(exactContextKey({...c,stacks:[...c.stacks].reverse()},TEST_TREE_SHA)).toBe(base);
    expect(exactContextKey({...c,gameType:'CASH',ante:{type:'NONE',amountBb:0}},TEST_TREE_SHA)).not.toBe(base);
    const changed=structuredClone(c);changed.stacks[7].stackBb=100;
    expect(exactContextKey(changed,TEST_TREE_SHA)).not.toBe(base);
    expect(exactContextKey({...c,postingOrder:'ANTES_FIRST'},TEST_TREE_SHA)).not.toBe(base);
    expect(exactContextKey(c,'9'.repeat(64))).not.toBe(base);
    expect(()=>exactContextKey(c,'mutable-tree-name')).toThrow();
    const id=await queueSolverJob(db,{context:c,bettingTreeId:TEST_TREE_SHA,priority:1});
    expect((await db.query<{status:string}>('SELECT status FROM solver_jobs WHERE id=$1',[id]))[0].status).toBe('QUEUED');
  });
  it('cannot publish a structurally complete self-certified artifact',async()=>{
    const a=untrustedSolution(),result=await publishVerifiedSolution(db,a);
    expect(result.status).toBe('FAILED_VALIDATION');
    expect(await findExactVerifiedSolution(db,a.context,TEST_TREE_SHA)).toBeNull();
    expect(await db.query('SELECT id FROM verified_solution_artifacts')).toEqual([]);
    expect((await db.query<{status:string}>('SELECT status FROM solver_jobs'))[0].status).toBe('FAILED_VALIDATION');
    expect(await solutionCoverage(db)).toEqual([]);
  });
  it('records malformed artifacts without throwing or publishing',async()=>{
    expect((await publishVerifiedSolution(db,{context:{players:99}})).status).toBe('FAILED_VALIDATION');
  });
  it('quarantines historical VERIFIED rows idempotently without deleting evidence',async()=>{
    await db.query("INSERT INTO verified_solution_artifacts (id,context_key,game,game_type,evaluation_model,players,stack_bb,ante_type,hero_position,action_history,board,betting_tree_id,source_type,status,convergence_metric,convergence_value,convergence_threshold,checksum,artifact,generated_at) VALUES ('legacy','old','NLHE','TOURNAMENT','CHIP_EV',8,15,'BBA','HJ','[]','[]','old','VERIFIED_SOLVER','VERIFIED','NASH_CONV',0,999,'legacy-checksum','{}',now())");
    await migrate(db); await migrate(db);
    expect((await db.query<{status:string;checksum:string}>("SELECT status,checksum FROM verified_solution_artifacts WHERE id='legacy'"))[0]).toEqual({status:'PENDING_VALIDATION',checksum:'legacy-checksum'});
    expect(await solutionCoverage(db)).toEqual([expect.objectContaining({verified:0,pending:1})]);
    const a=untrustedSolution();
    await db.query("UPDATE verified_solution_artifacts SET status='VERIFIED',context_key=$1,betting_tree_id=$2,artifact=$3::jsonb,verification_policy='rangeform-verification-v2',verification_report='{\"nashConv\":0}' WHERE id='legacy'",
      [exactContextKey(a.context,TEST_TREE_SHA),TEST_TREE_SHA,JSON.stringify(a)]);
    expect(await findExactVerifiedSolution(db,a.context,TEST_TREE_SHA)).toBeNull();
  });
});
