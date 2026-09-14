import { describe,it,expect } from 'vitest';
import {parseVerifiedSpot} from '@/shared/verified-spot';
import {safeReturnTo} from '@/shared/navigation';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import artifact from '../../data/solutions/preflop-15-1.json';
import { preflopContext,preflopInfo,PREFLOP_STACKS } from '@/domain/preflop-definition';
import { exactPreflopEquity,preflopPayoffs,verifyPreflopProfile,equityEvidenceHash } from '@/verification/preflop-best-response';
import { verifyForPublication } from '@/server/verify-solution';
import { PREFLOP_BUILD_SHA,PREFLOP_EQUITY_SHA } from '@/server/preflop-approval';
import { solutionChecksum,parameterChecksum,type VerifiedSolutionArtifact } from '@/solver/verified-solution';
import { measureBestResponses,measureCounterfactualBestResponses,type FiniteGame,type BehavioralProfile } from '@/verification/exact-best-response';

function explicitGame():FiniteGame{
  const h=preflopContext().conditioning!.ranges[0].combos,deals=h.flatMap(a=>h.filter(b=>!a.cards.some(c=>b.cards.includes(c))).map(b=>({a,b})));
  return {players:2,utilityUnit:'BB_PER_HAND',root:{kind:'chance',branches:deals.map(({a,b})=>{const call=29*exactPreflopEquity(a.cards,b.cards)-14;return {probability:1/deals.length,child:{kind:'decision',player:0,informationSet:preflopInfo('BTN',a.cards),actions:[{id:'fold',child:{kind:'terminal',payoff:[-.5,.5]}},{id:'jam',child:{kind:'decision',player:1,informationSet:preflopInfo('BB',b.cards),actions:[{id:'fold',child:{kind:'terminal',payoff:[2,-2]}},{id:'call',child:{kind:'terminal',payoff:[call,-call]}}]}}]}};})}};
}
describe('actual conditional HU preflop LP and independent verification',()=>{
  it('keeps engine/calibration/equity identities pinned and accepts all 18 computed nodes',()=>{
    const hash=createHash('sha256');for(const f of ['scripts/solve-preflop-lp.py','scripts/preflop_equity.py'])hash.update(readFileSync(f,'utf8').replace(/\r\n/g,'\n'));
    expect(hash.digest('hex')).toBe(PREFLOP_BUILD_SHA);expect(equityEvidenceHash()).toBe(PREFLOP_EQUITY_SHA);
    for(const stack of PREFLOP_STACKS)for(const ante of [0,1]){
      const a=JSON.parse(readFileSync(`data/solutions/preflop-${stack}-${ante}.json`,'utf8')),v=verifyForPublication(a);
      expect(v.errors).toEqual([]);expect(v.status).toBe('VERIFIED');expect(v.report!.nashConv).toBeLessThan(1e-10);
      expect(a.strategies).toHaveLength(1326);expect(a.strategies.filter((r:{reach:number})=>r.reach>0)).toHaveLength(26);
    }
  });
  it('replays HU BBA chip ledgers including the live-bet uncalled return and ties',()=>{
    expect(preflopContext().stacks.map(s=>s.position)).toEqual(['BTN','BB']);
    expect(preflopPayoffs(15,1)).toEqual({fold:-.5,win:2,pot:29,heroCost:14,villainCost:15,returned:1});
    expect(preflopPayoffs(15,0)).toEqual({fold:-.5,win:1,pot:30,heroCost:15,villainCost:15,returned:0});
    expect(exactPreflopEquity(['Qc','Qd'],['Qh','Qs'])).toBe(.5);
    expect(()=>exactPreflopEquity(['Ac','Kd'],['Ac','5c'])).toThrow(/Colliding/);
    const c=preflopContext().conditioning!.ranges[0].combos;
    for(const a of c)for(const b of c)if(!a.cards.some(x=>b.cards.includes(x)))expect(exactPreflopEquity(a.cards,b.cards)+exactPreflopEquity(b.cards,a.cards)).toBeCloseTo(1,14);
  });
  it('cross-checks full-tree BR on solved and deliberately exploitable profiles',()=>{
    const game=explicitGame();
    for(const weight of [null,0,.3,1]){
      const profile:BehavioralProfile=weight===null?artifact.fullProfile:Object.fromEntries(Object.keys(artifact.fullProfile).map(k=>[k,(k.startsWith('BTN')?{fold:weight,jam:1-weight}:{fold:weight,call:1-weight}) as Record<string,number>]));
      const a=verifyPreflopProfile(profile).report,b=measureCounterfactualBestResponses(game,profile);
      expect(a.nashConv).toBeCloseTo(b.nashConv,10);b.bestResponseValues.forEach((v,i)=>expect(v).toBeCloseTo(a.bestResponseValues[i],10));
      if(weight!==null)expect(a.nashConv).toBeGreaterThan(.01);
    }
    if(game.root.kind!=='chance')throw new Error('chance');
    const tiny:FiniteGame={...game,root:{kind:'chance',branches:game.root.branches.slice(0,2).map(b=>({...b,probability:.5}))}};
    const keys=new Set<string>();const collect=(n:FiniteGame['root'])=>{if(n.kind==='chance')n.branches.forEach(b=>collect(b.child));else if(n.kind==='decision'){keys.add(n.informationSet);n.actions.forEach(a=>collect(a.child));}};collect(tiny.root);
    const p=Object.fromEntries(Object.entries(artifact.fullProfile).filter(([k])=>keys.has(k)));
    expect(measureCounterfactualBestResponses(tiny,p).nashConv).toBeCloseTo(measureBestResponses(tiny,p).nashConv,12);
  });
  it('rejects unsupported URL contexts and retains exact approved login destinations',()=>{
    expect(safeReturnTo('/mtt/preflop?stack=40&ante=0')).toBe('/mtt/preflop?kind=preflop&stack=40&ante=0');
    for(const query of ['kind=preflop&players=3','kind=preflop&stack=53','kind=preflop&hero=BB','kind=preflop&ante=','kind=preflop&stack=15&stack=20'])expect(()=>parseVerifiedSpot(new URLSearchParams(query))).toThrow(/unavailable/);
  });
  it('rejects incomplete coverage, forged EV/reach, unrestricted priors, contexts and imports',()=>{
    const mutations:((a:VerifiedSolutionArtifact)=>void)[]=[a=>{a.strategies.pop();},a=>{a.strategies[0]=a.strategies[1];},a=>{a.strategies.find(r=>r.reach>0)!.actions[0].evBb=99;},a=>{a.strategies.find(r=>r.reach>0)!.reach=.5;},a=>{a.strategies.find(r=>r.reach>0)!.actions.pop();},a=>{delete a.context.conditioning;},a=>{a.context.stacks[1].stackBb=20;},a=>{a.context.ante={type:'PLAYER_ANTE',amountBb:1};},a=>{a.context.hero='BB';},a=>{a.fullProfile.extra={fold:1};},a=>{a.sourceType='IMPORTED_VERIFIED';a.provenance.origin='LICENSED_IMPORT';},a=>{for(const [k,p]of Object.entries(a.fullProfile))Object.assign(p,k.startsWith('BTN')?{fold:1,jam:0}:{fold:1,call:0});}];
    for(const change of mutations){const a=structuredClone(artifact) as unknown as VerifiedSolutionArtifact;change(a);try{a.provenance.parametersSha256=parameterChecksum(a.context,a.modelId,a.bettingTree.definitionSha256);}catch{}const {checksum:ignored,...unsigned}=a;void ignored;a.checksum=solutionChecksum(unsigned);expect(verifyForPublication(a).status).toBe('FAILED_VALIDATION');}
    const a=structuredClone(artifact) as unknown as VerifiedSolutionArtifact;a.convergence.value=999;a.convergence.threshold=999;a.convergence.passed=false;const {checksum:ignored,...unsigned}=a;void ignored;a.checksum=solutionChecksum(unsigned);expect(verifyForPublication(a).status).toBe('VERIFIED');
  });
});
