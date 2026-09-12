import { describe,it,expect } from 'vitest';
import artifact from '../../data/solutions/river-lp.json';
import { generateRiverGame,projectRiverMatrix } from '@/solver/river-model';
import { verifyRiverProfile } from '@/verification/river-best-response';
import { measureBestResponses,measureCounterfactualBestResponses,type BehavioralProfile,type FiniteGame } from '@/verification/exact-best-response';
import { verifyForPublication } from '@/server/verify-solution';
import { solutionChecksum,type VerifiedSolutionArtifact } from '@/solver/verified-solution';
import { allCombos } from '@/domain/cards';
import { evaluateHoldem } from '@/domain/holdem';
import { showdownScore } from '@/domain/equity';
import { riverContext } from '@/domain/river-definition';

describe('real conditional NLHE river verification',()=>{
  it('cross-validates the executed HiGHS solution against a separate full-tree best response',()=>{
    const direct=verifyRiverProfile(artifact.fullProfile),generic=measureCounterfactualBestResponses(generateRiverGame(),artifact.fullProfile);
    expect(direct.report.nashConv).toBeLessThan(1e-10);
    expect(generic.nashConv).toBeCloseTo(direct.report.nashConv,12);
    generic.bestResponseValues.forEach((v,i)=>expect(v).toBeCloseTo(direct.report.bestResponseValues[i],12));
    expect(direct.report.profileValues[0]).toBeCloseTo(1199/980,12);
    expect(direct.report.compatibleDeals).toBe(56);
    expect(projectRiverMatrix(generateRiverGame(),artifact.fullProfile)).toEqual(direct.strategies);
    expect(direct.strategies).toHaveLength(1081);
    expect(direct.strategies.filter(r=>r.reach>0)).toHaveLength(8);
  });
  it('agrees for deliberately exploitable profiles, including zero-probability actions',()=>{
    for(const weight of [0,.1,.5,1]) {
      const profile:BehavioralProfile=Object.fromEntries(Object.keys(artifact.fullProfile).map(k=>[k,(k.startsWith('BTN')?{check:weight,half:(1-weight)*.3,jam:(1-weight)*.7}:{fold:weight,call:1-weight}) as Record<string,number>]));
      const a=verifyRiverProfile(profile).report,b=measureCounterfactualBestResponses(generateRiverGame(),profile);
      expect(a.nashConv).toBeCloseTo(b.nashConv,11);
      expect(a.nashConv).toBeGreaterThan(.1);
    }
  });
  it('cross-checks the generic dynamic method against exhaustive pure policies on a real NLHE subset',()=>{
    const game=generateRiverGame();if(game.root.kind!=='chance')throw new Error('chance');
    const limited:FiniteGame={...game,root:{kind:'chance',branches:game.root.branches.slice(0,2).map(b=>({...b,probability:.5}))}};
    const names=new Set<string>();
    function walk(n:FiniteGame['root']){if(n.kind==='decision'){names.add(n.informationSet);n.actions.forEach(a=>walk(a.child));}else if(n.kind==='chance')n.branches.forEach(b=>walk(b.child));}
    walk(limited.root);
    const profile=Object.fromEntries(Object.entries(artifact.fullProfile).filter(([key])=>names.has(key)));
    expect(measureCounterfactualBestResponses(limited,profile).nashConv).toBeCloseTo(measureBestResponses(limited,profile).nashConv,12);
  });
  it('independent seven-card evaluators agree on the ordering of every unblocked river combo',()=>{
    const board=riverContext().board,combos=allCombos(board);
    const a=combos.map(c=>showdownScore([...board,...c])),b=combos.map(c=>evaluateHoldem([...board,...c]).score);
    const order=combos.map((_,i)=>i).sort((i,j)=>a[i]-a[j]);
    for(let i=1;i<order.length;i++)expect(Math.sign(a[order[i]]-a[order[i-1]])).toBe(Math.sign(b[order[i]]-b[order[i-1]]));
  });
  it('accepts only this exact calibrated context and rejects forged strategy, EV, scope and provenance',()=>{
    expect(verifyForPublication(artifact).status).toBe('VERIFIED');
    const mutations:((a:VerifiedSolutionArtifact)=>void)[]=[
      a=>{a.strategies.find(r=>r.reach>0)!.actions[0].evBb!+=.01;},
      a=>{a.strategies.find(r=>r.reach>0)!.reach=.5;},
      a=>{a.context.stacks[0].stackBb=20;},
      a=>{a.context.conditioning!.ranges[0].combos[0].weight=.7;},
      a=>{a.provenance.licenseEvidenceSha256='0'.repeat(64);},
      a=>{a.sourceType='IMPORTED_VERIFIED';a.provenance.origin='LICENSED_IMPORT';},
      a=>{a.fullProfile.extra={check:1};},
      a=>{delete a.strategies[0].actions[0].evBb;a.strategies.pop();},
    ];
    for(const mutate of mutations){const a=structuredClone(artifact) as unknown as VerifiedSolutionArtifact;mutate(a);const {checksum:ignored,...unsigned}=a;void ignored;a.checksum=solutionChecksum(unsigned);expect(verifyForPublication(a).status).toBe('FAILED_VALIDATION');}
    const a=structuredClone(artifact) as unknown as VerifiedSolutionArtifact;
    a.convergence={metric:'NASH_CONV',value:999,threshold:99999,passed:false,unit:'BB_PER_HAND'};
    const {checksum:ignored,...unsigned}=a;void ignored;a.checksum=solutionChecksum(unsigned);
    expect(verifyForPublication(a).status).toBe('VERIFIED'); // claimed metrics grant no trust
  });
});
