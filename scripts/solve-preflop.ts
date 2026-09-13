import { spawn } from 'node:child_process';
import { readFile,mkdir,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { allCombos } from '../src/domain/cards';
import { preflopContext,preflopActions,PREFLOP_MODEL_ID,PREFLOP_TREE_SHA } from '../src/domain/preflop-definition';
import { solutionChecksum,parameterChecksum,type VerifiedSolutionArtifact,type ComboSolution } from '../src/solver/verified-solution';
import type { BehavioralProfile } from '../src/verification/exact-best-response';
import { RIVER_LICENSE_SHA } from '../src/server/river-approval';

async function main(){
  const stack=Number(process.argv[2]??15),ante=Number(process.argv[3]??1),output=process.argv[4]??`data/solutions/preflop-${stack}-${ante}.json`,context=preflopContext(stack,ante);
  const build=createHash('sha256').update((await readFile('scripts/solve-preflop-lp.py','utf8')).replace(/\r\n/g,'\n')).update((await readFile('scripts/preflop_equity.py','utf8')).replace(/\r\n/g,'\n')).digest('hex');
  const result=await new Promise<{profile:BehavioralProfile;rows:ComboSolution[];runtimeMs:number;iterations:number;engine:string;lowerValue:number;upperValue:number}>((resolve,reject)=>{
    const child=spawn(process.env.PYTHON_EXECUTABLE??'python',['scripts/solve-preflop-lp.py'],{windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='';
    const timer=setTimeout(()=>{child.kill();reject(new Error('Preflop solve exceeded 120-second budget.'));},120000);
    child.stdout.on('data',s=>out+=s);child.stderr.on('data',s=>err+=s);child.on('error',e=>{clearTimeout(timer);reject(e);});child.on('close',code=>{clearTimeout(timer);if(code)reject(new Error(err));else try{resolve(JSON.parse(out));}catch(e){reject(e);}});
    child.stdin.end(JSON.stringify({stack,ante,combos:context.conditioning!.ranges[0].combos.map(h=>h.cards),equityFile:process.env.PREFLOP_GENERATOR_EQUITY??'output/preflop-generator-equity.json'}));
  });
  const rows=new Map(result.rows.map(r=>[r.combo.join(''),r]));
  const unsigned:Omit<VerifiedSolutionArtifact,'checksum'>={schemaVersion:2,id:`${PREFLOP_MODEL_ID}-${stack}-${ante}`,sourceType:'VERIFIED_SOLVER',status:'PENDING_VALIDATION',context,modelId:PREFLOP_MODEL_ID,positions:context.stacks.map(s=>s.position),actions:preflopActions.map(a=>({...a})),strategies:allCombos().map(c=>rows.get(c.join(''))??{combo:[...c],reach:0,actions:preflopActions.map(a=>({actionId:a.id,frequency:0}))}),fullProfile:result.profile,
    solver:{name:'SciPy/HiGHS',version:result.engine,algorithm:'SEQUENCE_FORM_LINEAR_PROGRAM',buildSha256:build},bettingTree:{id:PREFLOP_MODEL_ID,definitionSha256:PREFLOP_TREE_SHA,description:'Conditional HU push/fold: BTN/SB fold or jam; BB fold or call. Only AKo QQ A5s 76s input ranges. Not unrestricted HU preflop; no limp, small raise or postflop surrogate.',allowedActions:preflopActions.map(a=>({...a}))},
    convergence:{metric:'NASH_CONV',value:Math.max(0,result.upperValue-result.lowerValue),threshold:1e-7,unit:'BB_PER_HAND',passed:result.upperValue-result.lowerValue<1e-7},iterations:Math.max(1,result.iterations),runtimeMs:result.runtimeMs,
    abstraction:{card:'None inside the fixed 26-combo-per-player study inputs; all other physical combos have zero support.',action:'Push/fold only. BB fold/call. No limp or small raise. Not unrestricted NLHE.',chance:'All 1,712,304 boards per compatible four-card matchup; exact suit/seat bijections.'},generatedAt:new Date().toISOString(),license:'SciPy BSD-3-Clause / HiGHS MIT; original Rangeform configuration',source:'https://github.com/scipy/scipy/tree/v1.16.2',provenance:{datasetId:PREFLOP_MODEL_ID,revision:'1',origin:'ORIGINAL_COMPUTATION',sourceSha256:build,licenseEvidenceSha256:RIVER_LICENSE_SHA,parametersSha256:parameterChecksum(context,PREFLOP_MODEL_ID,PREFLOP_TREE_SHA)}};
  unsigned.id+='-'+solutionChecksum(unsigned).slice(0,16);const artifact={...unsigned,checksum:solutionChecksum(unsigned)};
  await mkdir('data/solutions',{recursive:true});await writeFile(output,JSON.stringify(artifact));console.log(JSON.stringify({output,stack,ante,lower:result.lowerValue,upper:result.upperValue,runtimeMs:result.runtimeMs}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
