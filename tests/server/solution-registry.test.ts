import { afterEach,beforeEach,describe,expect,it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createMemoryDatabase,type Database } from '@/server/db';
import { defaultTournamentContext,positionsFor } from '@/domain/strategy-context';
import { exactContextKey,findExactVerifiedSolution,publishVerifiedSolution,queueSolverJob,solutionCoverage } from '@/server/solution-registry';
import { solutionChecksum,type VerifiedSolutionArtifact } from '@/solver/verified-solution';

function fixture():VerifiedSolutionArtifact{
  const context=defaultTournamentContext(),actions=[{id:'fold',type:'FOLD' as const},{id:'raise-2',type:'RAISE' as const,toBb:2},{id:'jam',type:'JAM' as const}];
  const unsigned:Omit<VerifiedSolutionArtifact,'checksum'>={schemaVersion:1,id:`fixture-${randomUUID()}`,sourceType:'VERIFIED_SOLVER',status:'PENDING_VALIDATION',context,positions:[...positionsFor(8)],actions,strategies:[{combo:['As','Qd'],reach:1,actions:[{actionId:'fold',frequency:0},{actionId:'raise-2',frequency:.72,evBb:.4},{actionId:'jam',frequency:.28,evBb:.39}]}],solver:{name:'Independent fixture',version:'1',algorithm:'DCFR'},bettingTree:{id:'rfi-2x-jam-v1',description:'Test tree',allowedActions:actions},convergence:{metric:'NASH_CONV',value:.004,threshold:.01,unit:'BB_PER_HAND',passed:true},exploitabilityBbPerHand:.002,iterations:1_000_000,runtimeMs:1000,abstraction:{card:'none',action:'declared',chance:'exact'},generatedAt:'2026-09-11T00:00:00.000Z',license:'Test-only fixture',source:'Independent test oracle'};
  return {...unsigned,checksum:solutionChecksum(unsigned)};
}

describe('verified solution registry',()=>{
  let db:Database;
  beforeEach(async()=>{db=await createMemoryDatabase();});
  afterEach(async()=>db.close());
  it('queues exact jobs and never shares keys across format, stack or ante',async()=>{
    const context=defaultTournamentContext(),base=exactContextKey(context,'tree');
    expect(exactContextKey({...context,gameType:'CASH',ante:{type:'NONE',amountBb:0}},'tree')).not.toBe(base);
    expect(exactContextKey({...context,stacks:context.stacks.map(row=>({...row,stackBb:20}))},'tree')).not.toBe(base);
    expect(exactContextKey({...context,ante:{type:'PLAYER_ANTE',amountBb:.125}},'tree')).not.toBe(base);
    const id=await queueSolverJob(db,{context,bettingTreeId:'tree',priority:1});
    expect((await db.query<{status:string}>('SELECT status FROM solver_jobs WHERE id=$1',[id]))[0].status).toBe('QUEUED');
  });
  it('publishes only passed artifacts and retrieves only the exact context',async()=>{
    const artifact=fixture(),result=await publishVerifiedSolution(db,artifact);
    expect(result).toMatchObject({status:'VERIFIED',quality:'HIGH',errors:[]});
    expect((await findExactVerifiedSolution(db,artifact.context,artifact.bettingTree.id))?.id).toBe(artifact.id);
    expect(await findExactVerifiedSolution(db,defaultTournamentContext(9),artifact.bettingTree.id)).toBeNull();
    expect(await solutionCoverage(db)).toEqual([expect.objectContaining({players:8,stackBb:15,anteType:'BBA',heroPosition:'HJ',verified:1})]);
  });
  it('records failed validation without publishing strategy data',async()=>{
    const artifact=fixture();artifact.convergence.passed=false;
    expect((await publishVerifiedSolution(db,artifact)).status).toBe('FAILED_VALIDATION');
    expect(await findExactVerifiedSolution(db,artifact.context,artifact.bettingTree.id)).toBeNull();
    expect((await db.query<{status:string}>('SELECT status FROM solver_jobs'))[0].status).toBe('FAILED_VALIDATION');
  });
});
