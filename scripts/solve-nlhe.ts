import { RIVER_LP_BUILD_SHA, RIVER_LICENSE_SHA } from '../src/server/river-approval';
import { canonicalJson } from '../src/domain/canonical';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { generateRiverGame, projectRiverMatrix } from '../src/solver/river-model';
import { riverContext, riverActions, RIVER_MODEL_ID, RIVER_TREE_SHA, ENGINE_SHA, LICENSE_SHA, ENGINE_COMMIT } from '../src/domain/river-definition';
import { verifyRiverProfile } from '../src/verification/river-best-response';
import { parameterChecksum, solutionChecksum, type VerifiedSolutionArtifact } from '../src/solver/verified-solution';
import type { BehavioralProfile, GameNode } from '../src/verification/exact-best-response';

async function main() {
  const lp=process.argv[2]==='lp';
  const iterations=lp?1:Number(process.argv[2]??2000);
  if(!Number.isInteger(iterations)||iterations<1||iterations>1_000_000) throw new Error('Iterations must be 1–1000000.');
  const hash=(s:Uint8Array)=>createHash('sha256').update(s).digest('hex');
  if(hash(await readFile('vendor/poker_solver/dcfr.py'))!==ENGINE_SHA || hash(await readFile('vendor/poker_solver/LICENSE'))!==LICENSE_SHA) throw new Error('Pinned engine or license changed.');
  const game=generateRiverGame();
  const result=await new Promise<{profile:Record<string,number[]>;runtimeMs:number;engine?:string;iterations?:number;lowerValue?:number;upperValue?:number}>((resolve,reject)=>{
    const child=spawn(process.env.PYTHON_EXECUTABLE??'python',[lp?'scripts/solve-river-lp.py':'scripts/solve-river.py'],{stdio:['pipe','pipe','pipe'],windowsHide:true});
    let output='',error='';child.stdout.on('data',s=>output+=s);child.stderr.on('data',s=>error+=s);
    child.on('error',reject);child.on('close',code=>{if(code)reject(new Error(error));else try{resolve(JSON.parse(output));}catch(e){reject(e);}});
    child.stdin.end(JSON.stringify({root:game.root,iterations}));
  });
  const profile:BehavioralProfile={};
  function project(n:GameNode) {if(n.kind==='chance')n.branches.forEach(b=>project(b.child));else if(n.kind==='decision'){profile[n.informationSet]=Object.fromEntries(n.actions.map((a,i)=>[a.id,result.profile[n.informationSet][i]]));n.actions.forEach(a=>project(a.child));}}
  project(game.root);
  const measured=verifyRiverProfile(profile), context=riverContext();
  const unsigned:Omit<VerifiedSolutionArtifact,'checksum'>={schemaVersion:2,id:`${RIVER_MODEL_ID}-${lp?'lp':'dcfr-'+iterations}`,sourceType:'VERIFIED_SOLVER',status:'PENDING_VALIDATION',context,modelId:RIVER_MODEL_ID,positions:context.stacks.map(s=>s.position),actions:riverActions.map(a=>({...a})),strategies:projectRiverMatrix(game,profile),fullProfile:profile,
    solver:{name:lp?'SciPy/HiGHS':'amaster97/poker_solver',version:lp?result.engine!:ENGINE_COMMIT+' / iteration-frozen-v1',algorithm:lp?'SEQUENCE_FORM_LINEAR_PROGRAM':'DCFR',buildSha256:lp?hash(await readFile('scripts/solve-river-lp.py')):ENGINE_SHA},
    bettingTree:{id:RIVER_MODEL_ID,definitionSha256:RIVER_TREE_SHA,description:'Conditional river: BTN check / 50% pot / jam; BB fold / call; no raises. Starting ranges are study inputs, not solved ancestry.',allowedActions:riverActions.map(a=>({...a}))},
    convergence:{metric:'NASH_CONV',value:measured.report.nashConv,threshold:0.001,unit:'BB_PER_HAND',passed:measured.report.nashConv<=0.001},iterations:result.iterations??iterations,runtimeMs:result.runtimeMs,
    abstraction:{card:'None: all compatible physical deals in the explicitly conditioned ranges.',action:'One river bet; check, 50% pot, jam; fold or call; no raises.',chance:'Exact enumeration; fixed board and input ranges, not a preflop solution.'},generatedAt:new Date().toISOString(),license:lp?'SciPy BSD-3-Clause / HiGHS MIT; original Rangeform configuration':'MIT; original Rangeform configuration',source:lp?'https://github.com/scipy/scipy/tree/v1.16.2':`https://github.com/amaster97/poker_solver/tree/${ENGINE_COMMIT}`,
    provenance:{datasetId:RIVER_MODEL_ID,revision:'1',origin:'ORIGINAL_COMPUTATION',sourceSha256:lp?RIVER_LP_BUILD_SHA:ENGINE_SHA,licenseEvidenceSha256:lp?RIVER_LICENSE_SHA:LICENSE_SHA,parametersSha256:parameterChecksum(context,RIVER_MODEL_ID,RIVER_TREE_SHA)}};
  const artifact={...unsigned,checksum:solutionChecksum(unsigned)};
  // Each newly executed run receives an immutable identity; a regeneration
  // never overwrites a different artifact with the same database primary key.
  unsigned.id+='-'+createHash('sha256').update(canonicalJson(unsigned)).digest('hex').slice(0,16);
  artifact.id=unsigned.id;artifact.checksum=solutionChecksum(unsigned);
  const output=process.argv[3]??`data/solutions/river-${lp?'lp':iterations}.json`;
  await mkdir(path.dirname(output),{recursive:true});
  await writeFile(output,JSON.stringify(artifact));
  console.log(JSON.stringify({file:output,runtimeMs:result.runtimeMs,...measured.report},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
