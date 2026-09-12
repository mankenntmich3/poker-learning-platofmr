import { readFile } from 'node:fs/promises';
import { verifyForPublication } from '../src/server/verify-solution';
import { generateRiverGame } from '../src/solver/river-model';
import { measureCounterfactualBestResponses } from '../src/verification/exact-best-response';

async function main(){
  const artifact=JSON.parse(await readFile(process.argv[2]??'data/solutions/river-lp.json','utf8'));
  const result=verifyForPublication(artifact);
  if(result.status!=='VERIFIED')throw new Error(result.errors.join('\n'));
  const crosscheck=measureCounterfactualBestResponses(generateRiverGame(),artifact.fullProfile);
  if(Math.abs(crosscheck.nashConv-result.report!.nashConv)>1e-10)throw new Error('Independent evaluators disagree.');
  console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
