import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { generateRiverGame } from '../src/solver/river-model';
import { verifyRiverProfile } from '../src/verification/river-best-response';
import { measureCounterfactualBestResponses } from '../src/verification/exact-best-response';

async function main(){
  const artifact=JSON.parse(await readFile('data/solutions/river-lp.json','utf8'));
  const a=verifyRiverProfile(artifact.fullProfile).report,b=measureCounterfactualBestResponses(generateRiverGame(),artifact.fullProfile);
  if(a.nashConv>1e-10 || Math.abs(a.nashConv-b.nashConv)>1e-10)throw new Error('Calibration failed');
  const record={version:1,model:artifact.modelId,artifactChecksum:artifact.checksum,independentRiver:a,genericTree:b,
    policy:{acceptNashConvUpperBb:1e-7,veryHighUpperBb:1e-8,numericalAllowanceBb:1e-9},
    bounds:'56 exact deals; 24 information sets; max |utility| 14.75 BB; fewer than 10000 scalar arithmetic operations. 1e-9 BB allowance exceeds standard gamma_n roundoff bounds on these bounded sums. No claim of exact real arithmetic.',
    tests:'tests/solver/river-verification.test.ts; full-tree BR; exhaustive subset; exploitable profiles; all 1081 evaluator orderings; tamper rejection.',
    scope:'Only fixed-range river subgame; input ranges and preceding history are not GTO-certified.'};
  await mkdir('docs/qa',{recursive:true});const text=JSON.stringify(record,null,2)+'\n';
  await writeFile('docs/qa/river-calibration.json',text);
  console.log(createHash('sha256').update(text).digest('hex'));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
