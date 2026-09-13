import { readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { canonicalJson } from '../src/domain/canonical';
import { PREFLOP_STACKS } from '../src/domain/preflop-definition';
import { equityEvidenceHash,verifyPreflopProfile } from '../src/verification/preflop-best-response';
import type { VerifiedSolutionArtifact } from '../src/solver/verified-solution';

async function main(){
  const reports=[];
  for(const stack of PREFLOP_STACKS)for(const ante of [0,1]){
    const a=JSON.parse(await readFile(`data/solutions/preflop-${stack}-${ante}.json`,'utf8')) as VerifiedSolutionArtifact;
    const start=performance.now(),measured=verifyPreflopProfile(a.fullProfile,stack,ante);
    if(measured.report.nashConv>1e-8)throw new Error('Calibration failed');
    for(const r of a.strategies){const target=measured.strategies.find(x=>x.combo.join('')===r.combo.join(''))!;
      if(Math.abs(r.reach-target.reach)>1e-10 || r.actions.some((x,i)=>Math.abs(x.frequency-target.actions[i].frequency)>1e-10 || (x.evBb===undefined)!==(target.actions[i].evBb===undefined) || Math.abs((x.evBb??0)-(target.actions[i].evBb??0))>1e-9))throw new Error('Independent projection differs');}
    reports.push({stack,ante,checksum:a.checksum,verificationRuntimeMs:performance.now()-start,...measured.report});
  }
  const generator=JSON.parse(await readFile('output/preflop-generator-equity.json','utf8')),independent=JSON.parse(await readFile('output/preflop-independent-equity.json','utf8'));
  if(canonicalJson(generator.matchups)!==canonicalJson(independent.matchups))throw new Error('Exhaustive evaluators disagree');
  const report={scope:'CONDITIONAL_HU_PUSH_FOLD_ONLY; 26 supported physical combos per seat; NOT complete HU preflop',equityEvidenceSha256:equityEvidenceHash(),matchups:21,boardsPerMatchup:1712304,exactBoardEvaluationsPerImplementation:21*1712304,generatorRuntimeSeconds:generator.runtimeSeconds,independentEnumerationRuntimeSeconds:independent.runtimeSeconds,method:'direct seven-card generator versus independent 21-subset five-card oracle; identical integer wins/ties/total for every matchup',reports};
  const content=JSON.stringify(report,null,2)+'\n';await writeFile('docs/qa/preflop-calibration.json',content);console.log(createHash('sha256').update(content).digest('hex'));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
