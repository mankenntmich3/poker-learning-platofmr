import { allCombos } from '@/domain/cards';
import { canonicalJson } from '@/domain/canonical';
import { evaluateHoldem } from '@/domain/holdem';
import { riverContext, riverInfo } from '@/domain/river-definition';
import { applyPublicAction, replayPublicHistory } from '@/domain/tournament-state';
import { CHIP_UNITS_PER_BB } from '@/domain/chips';
import type { BehavioralProfile } from './exact-best-response';
import type { ComboSolution } from '@/solver/verified-solution';

/** Independent exact response for this one-round conditional game. Each player
 * acts at most once along a path, so maximizing per private information set is
 * a complete best response (not perfect-information / per-deal maximization).
 * No generator game, terminal utilities, EVs or convergence metadata are read.
 */
export function verifyRiverProfile(profile:BehavioralProfile) {
  const context=riverContext(), state=replayPublicHistory(context), unit=CHIP_UNITS_PER_BB;
  const rootPot=state.pot/unit;
  const hRange=context.conditioning!.ranges.find(r=>r.position==='BTN')!.combos;
  const vRange=context.conditioning!.ranges.find(r=>r.position==='BB')!.combos;
  const expected=new Map<string,string[]>();
  hRange.forEach(h=>expected.set(riverInfo('BTN',h.cards),['check','half','jam']));
  vRange.forEach(v=>['half','jam'].forEach(b=>expected.set(riverInfo('BB',v.cards,b),['fold','call'])));
  if(Object.keys(profile).length!==expected.size) throw new Error('Incorrect full-profile information-set coverage.');
  for(const [key,actions] of expected) {
    const p=Object.hasOwn(profile,key)?profile[key]:undefined;
    if(!p || canonicalJson(Object.keys(p).sort())!==canonicalJson(actions.sort()) || Object.values(p).some(x=>!Number.isFinite(x)||x<0||x>1) || Math.abs(Object.values(p).reduce((s,x)=>s+x,0)-1)>1e-10) throw new Error('Invalid full-profile policy.');
  }
  const payouts=new Map<string,{fold:number;win:number;lose:number;tie:number}>();
  for(const id of ['half','jam']) {
    const bet=applyPublicAction(state,id==='half'?{actor:'BTN',type:'RAISE',toBb:2.75}:{actor:'BTN',type:'JAM'});
    const end=applyPublicAction(bet,{actor:'BB',type:'CALL'});
    const paid=(position:'BTN'|'BB')=>(end.seats.find(s=>s.position===position)!.committed-state.seats.find(s=>s.position===position)!.committed)/unit;
    // Return any unmatched all-in excess. Two live players: no side pot exists.
    const matched=Math.min(paid('BTN'),paid('BB')), distributable=rootPot+2*matched;
    payouts.set(id,{fold:rootPot/2,win:distributable-matched-rootPot/2,lose:-matched-rootPot/2,tie:distributable/2-matched-rootPot/2});
  }
  const deals=hRange.flatMap(h=>vRange.filter(v=>!h.cards.some(c=>v.cards.includes(c))).map(v=>({h,v,weight:h.weight*v.weight})));
  const mass=deals.reduce((s,d)=>s+d.weight,0);
  if(!mass) throw new Error('No compatible deals.');
  const hValues=new Map<string,number[]>(),hMass=new Map<string,number>(),vValues=new Map<string,number[]>();
  let baseline=0,checkDefender=0;
  for(const {h,v,weight} of deals) {
    const p=weight/mass,key=riverInfo('BTN',h.cards),hp=profile[key];
    const cmp=Math.sign(evaluateHoldem([...context.board,...h.cards]).score-evaluateHoldem([...context.board,...v.cards]).score);
    const values=[cmp*rootPot/2];
    for(const id of ['half','jam']) {
      const vi=riverInfo('BB',v.cards,id),vp=profile[vi],pay=payouts.get(id)!;
      const call=cmp>0?pay.win:cmp<0?pay.lose:pay.tie;
      values.push(vp.fold*pay.fold+vp.call*call);
      const total=vValues.get(vi)??[0,0];total[0]-=p*hp[id]*pay.fold;total[1]-=p*hp[id]*call;vValues.set(vi,total);
    }
    const total=hValues.get(key)??[0,0,0];values.forEach((ev,i)=>total[i]+=p*ev);hValues.set(key,total);
    hMass.set(key,(hMass.get(key)??0)+p);
    baseline+=p*(hp.check*values[0]+hp.half*values[1]+hp.jam*values[2]);
    checkDefender-=p*hp.check*values[0];
  }
  const brHero=[...hValues.values()].reduce((s,v)=>s+Math.max(...v),0);
  const brVillain=checkDefender+[...vValues.values()].reduce((s,v)=>s+Math.max(...v),0);
  if(brHero<baseline-1e-9 || brVillain<-baseline-1e-9)throw new Error('Best response below profile value; verification failed.');
  const improvements=[Math.max(0,brHero-baseline),Math.max(0,brVillain+baseline)];
  const nashConv=improvements[0]+improvements[1];
  const strategies:ComboSolution[]=allCombos([...context.board,...context.deadCards]).map(combo=>{
    const key=riverInfo('BTN',combo),reach=hMass.get(key)??0,values=hValues.get(key);
    return {combo:[...combo],reach,actions:['check','half','jam'].map((actionId,i)=>({actionId,frequency:reach?profile[key][actionId]:0,...(values?{evBb:values[i]/reach}:{})}))};
  });
  return {strategies,report:{method:'EXACT_CONDITIONAL_RIVER_BEST_RESPONSE',verifierVersion:'rangeform-river-br-v1',
    profileValues:[baseline,-baseline],bestResponseValues:[brHero,brVillain],improvements,nashConv,exploitability:nashConv/2,
    utilityUnit:'BB_PER_HAND',compatibleDeals:deals.length,informationSets:expected.size,
    scope:'FIXED_RANGE_RIVER_SUBGAME_ONLY',numericalAllowanceBb:1e-9}};
}
