import {describe,it,expect} from 'vitest';
import {createPostgresDatabase} from '@/server/db';
import {queueSolverJob,publishVerifiedSolution,findExactVerifiedSolution} from '@/server/solution-registry';
import {TEST_TREE_SHA,untrustedSolution} from '../fixtures/untrusted-solution';
import {verifiedNode,startVerifiedQuestion,answerVerifiedQuestion,verifiedProgress} from '@/server/verified-training';
import {register,deleteAccount} from '@/server/service';
import {randomUUID} from 'node:crypto';

describe.runIf(Boolean(process.env.TEST_DATABASE_URL))('PostgreSQL verification boundary',()=>{
  it('persists a real independently verified NLHE solution and training answer on PostgreSQL',async()=>{
    const db=await createPostgresDatabase(process.env.TEST_DATABASE_URL!),password='CI-verified-river-only';
    const {user}=await register(db,{name:'PG River',email:`pg-river-${randomUUID()}@example.test`,password});
    try{
      const a=await verifiedNode(db);expect(await findExactVerifiedSolution(db,a.context,a.bettingTree.definitionSha256)).not.toBeNull();
      const q=await startVerifiedQuestion(db,user.id,'action','range');
      const answer=await answerVerifiedQuestion(db,user.id,{id:q.id,action:'jam'});
      expect(answer.feedback!.evLossBb).not.toBeNull();expect((await verifiedProgress(db,user.id)).decisions).toBe(1);
    }finally{await deleteAccount(db,user,password);await db.close();}
  });
  it('persists failed mathematical validation while keeping the exact node unavailable',async()=>{
    const db=await createPostgresDatabase(process.env.TEST_DATABASE_URL!),a=untrustedSolution();
    let job:string|undefined;
    try {
      job=await queueSolverJob(db,{context:a.context,bettingTreeId:TEST_TREE_SHA,priority:1});
      expect((await publishVerifiedSolution(db,a)).status).toBe('FAILED_VALIDATION');
      expect((await db.query<{status:string}>("SELECT status FROM solver_jobs WHERE config->>'artifactId'=$1",[a.id]))[0].status).toBe('FAILED_VALIDATION');
      expect(await findExactVerifiedSolution(db,a.context,TEST_TREE_SHA)).toBeNull();
    } finally {
      await db.query("DELETE FROM solver_jobs WHERE id=$1 OR config->>'artifactId'=$2",[job??null,a.id]);
      await db.close();
    }
  });
});
