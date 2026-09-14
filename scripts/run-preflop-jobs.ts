import { spawn } from 'node:child_process';
import { readFile,mkdir } from 'node:fs/promises';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import { createLocalDatabase } from '../src/server/db';
import { requireDevelopmentDatabase } from '../src/server/development';
import { queueSolverJob,publishVerifiedSolution } from '../src/server/solution-registry';
import { preflopContext,PREFLOP_TREE_SHA } from '../src/domain/preflop-definition';

/** Bounded local CLI worker, not a web-triggered compute service. Each selected
 * job really executes the solver, independently verifies, then publishes. */
async function main(){
  if(process.env.NODE_ENV && process.env.NODE_ENV!=='development')throw new Error('Local development worker only.');
  Object.assign(process.env,{NODE_ENV:'development'});loadEnvConfig(process.cwd(),true);requireDevelopmentDatabase();
  const stacks=(process.argv[2]??'10,15,20,25,30').split(',').map(Number),ante=Number(process.argv[3]??1);
  if(!stacks.length||stacks.length>9||new Set(stacks).size!==stacks.length)throw new Error('Select at most nine distinct stack presets.');
  const contexts=stacks.map(s=>preflopContext(s,ante));
  await mkdir('output/preflop-jobs',{recursive:true});
  const db=await createLocalDatabase(path.resolve(process.env.DATA_DIR??'.data/postgres'));
  try{
    for(const context of contexts){
      const stack=context.stacks[0].stackBb,id=await queueSolverJob(db,{context,bettingTreeId:PREFLOP_TREE_SHA,priority:1}),start=performance.now(),file=`output/preflop-jobs/${id}.json`;
      await db.query("UPDATE solver_jobs SET status='RUNNING',started_at=now() WHERE id=$1",[id]);
      try{
        await new Promise<void>((resolve,reject)=>{
          const child=spawn(process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/solve-preflop.ts',String(stack),String(ante),file],{windowsHide:true,stdio:['ignore','pipe','pipe']});let error='';
          const timer=setTimeout(()=>{child.kill();reject(new Error('Job exceeded 130-second budget.'));},130000);
          child.stdout.resume();child.stderr.on('data',s=>{error=(error+s).slice(-4000);});child.on('error',e=>{clearTimeout(timer);reject(e);});child.on('close',code=>{clearTimeout(timer);if(code)reject(new Error(error||'Solver process failed'));else resolve();});
        });
        await db.query("UPDATE solver_jobs SET status='VALIDATING' WHERE id=$1",[id]);
        const artifact=JSON.parse(await readFile(file,'utf8')),verifyStart=performance.now(),result=await publishVerifiedSolution(db,artifact);
        const metrics={artifactId:artifact.id,checksum:artifact.checksum,runtimeMs:performance.now()-start,solverRuntimeMs:artifact.runtimeMs,verificationRuntimeMs:performance.now()-verifyStart,iterations:artifact.iterations,informationSets:result.report?.informationSets??null,compatibleDeals:result.report?.compatibleDeals??null,nodeCount:result.report?1+result.report.compatibleDeals*5:null,maxRuntimeMs:130000,workerMemoryRssBytes:process.memoryUsage().rss,solverPeakMemoryBytes:null};
        await db.query('UPDATE solver_jobs SET status=$2,error=$3,completed_at=now(),config=config || $4::jsonb WHERE id=$1',[id,result.status,result.errors.join(' | ')||null,JSON.stringify(metrics)]);
        console.log(JSON.stringify({id,stack,ante,status:result.status,...metrics}));
        if(result.status!=='VERIFIED')throw new Error('Independent verification failed.');
      }catch(e){await db.query("UPDATE solver_jobs SET status='FAILED',error=$2,completed_at=now() WHERE id=$1 AND status IN ('RUNNING','VALIDATING')",[id,e instanceof Error?e.message:'Job failed']);throw e;}
    }
  }finally{await db.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
