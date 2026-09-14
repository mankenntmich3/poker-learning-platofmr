import { createHash } from 'node:crypto';
import table from '../../data/verification/preflop-equity.json';
import { allCombos, type Card } from '@/domain/cards';
import { canonicalJson } from '@/domain/canonical';
import { preflopContext, preflopInfo } from '@/domain/preflop-definition';
import { replayPublicHistory, applyPublicAction } from '@/domain/tournament-state';
import type { BehavioralProfile } from './exact-best-response';
import type { ComboSolution } from '@/solver/verified-solution';

const suits='cdhs',ranks='23456789TJQKA';
const number=(c:string)=>ranks.indexOf(c[0])*4+suits.indexOf(c[1]);
const key=(a:number[])=>a.map(n=>String(n).padStart(2,'0')).join('');
const permutations:number[][]=[];
for(let a=0;a<4;a++)for(let b=0;b<4;b++)for(let c=0;c<4;c++)for(let d=0;d<4;d++)if(new Set([a,b,c,d]).size===4)permutations.push([a,b,c,d]);
const counts=new Map(table.matchups.map(r=>[key(r.cards.map(number)),r]));
export const equityEvidenceHash=()=>createHash('sha256').update(canonicalJson(table)).digest('hex');
const cache=new Map<string,number>();
/** Approved verifier-owned integer counts, independently enumerated by the
 * best-five oracle. NEVER takes an artifact-supplied equity/EV table. Runtime
 * suit/seat bijections preserve all blockers; no 169x169 strength approximation.
 */
export function exactPreflopEquity(hero:readonly Card[],villain:readonly Card[]):number {
  if(new Set([...hero,...villain]).size!==4)throw new Error('Colliding hole cards.');
  const raw=[...hero,...villain].join(''),cached=cache.get(raw);if(cached!==undefined)return cached;
  const hn=hero.map(number),vn=villain.map(number);
  let best='',swapped=false;
  for(const p of permutations){const transform=(cs:number[])=>cs.map(n=>Math.floor(n/4)*4+p[n%4]).sort((a,b)=>a-b),h=transform(hn),v=transform(vn);
    for(const [cs,swap] of [[h.concat(v),false],[v.concat(h),true]] as const){const k=key(cs);if(!best||k<best){best=k;swapped=swap;}}
  }
  const row=counts.get(best);
  if(!row || row.total!==1712304 || ![row.wins,row.ties,row.total].every(Number.isInteger) || row.wins<0 || row.ties<0 || row.wins+row.ties>row.total)throw new Error('Independent exact equity coverage unavailable.');
  const value=(row.wins+row.ties/2)/row.total,eq=swapped?1-value:value;cache.set(raw,eq);return eq;
}

/** Chip ledger is replayed independently of the Python generator formula.
 * Utilities are net change from BEFORE forced bets. A BBA is dead money;
 * uncalled live-bet excess is returned before dividing the showdown pot.
 */
export function preflopPayoffs(stack:number,ante:number){
  const root=replayPublicHistory(preflopContext(stack,ante));
  if(root.seats.length!==2 || root.actor!=='BTN' || root.seats.some(s=>s.position==='SB'))throw new Error('Invalid HU roles.');
  const fold=applyPublicAction(root,{actor:'BTN',type:'FOLD'}),jam=applyPublicAction(root,{actor:'BTN',type:'JAM'});
  const win=applyPublicAction(jam,{actor:'BB',type:'FOLD'}),call=applyPublicAction(jam,{actor:'BB',type:'CALL'});
  const [h,v]=call.seats,returned=Math.max(0,h.streetCommitted-v.streetCommitted);
  const returnedVillain=Math.max(0,v.streetCommitted-h.streetCommitted),pot=call.pot-returned-returnedVillain;
  const foldEv=(fold.seats[0].remaining-fold.seats[0].initial)/10000;
  const winEv=(win.pot+win.seats[0].remaining-win.seats[0].initial)/10000;
  const heroCost=(h.committed-returned)/10000,villainCost=(v.committed-returnedVillain)/10000;
  if(Math.abs(heroCost+villainCost-pot/10000)>1e-10)throw new Error('Payoff conservation failed.');
  return {fold:foldEv,win:winEv,pot:pot/10000,heroCost,villainCost,returned:returned/10000};
}
export function verifyPreflopProfile(profile:BehavioralProfile,stack=15,ante=1){
  const context=preflopContext(stack,ante),hands=context.conditioning!.ranges[0].combos;
  const expected=new Map<string,string[]>();for(const h of hands){expected.set(preflopInfo('BTN',h.cards),['fold','jam']);expected.set(preflopInfo('BB',h.cards),['fold','call']);}
  if(Object.keys(profile).length!==expected.size)throw new Error('Incomplete preflop full-profile coverage.');
  for(const [k,actions] of expected){const p=Object.hasOwn(profile,k)?profile[k]:undefined;if(!p || canonicalJson(Object.keys(p).sort())!==canonicalJson([...actions].sort()) || Object.values(p).some(v=>!Number.isFinite(v)||v<0||v>1) || Math.abs(Object.values(p).reduce((s,v)=>s+v,0)-1)>1e-10)throw new Error('Invalid preflop information-set policy.');}
  const deals=hands.flatMap(h=>hands.filter(v=>!h.cards.some(c=>v.cards.includes(c))).map(v=>({h,v,weight:h.weight*v.weight})));
  const mass=deals.reduce((s,d)=>s+d.weight,0),pay=preflopPayoffs(stack,ante);
  const heroValues=new Map<string,number[]>(),heroMass=new Map<string,number>(),villainValues=new Map<string,number[]>();
  let baseline=0,foldConstant=0;
  for(const {h,v,weight} of deals){
    const p=weight/mass,hk=preflopInfo('BTN',h.cards),vk=preflopInfo('BB',v.cards),hp=profile[hk],vp=profile[vk];
    const showdown=pay.pot*exactPreflopEquity(h.cards,v.cards)-pay.heroCost;
    const jamEv=vp.fold*pay.win+vp.call*showdown;
    baseline+=p*(hp.fold*pay.fold+hp.jam*jamEv);foldConstant-=p*hp.fold*pay.fold;
    const hv=heroValues.get(hk)??[0,0];hv[0]+=p*pay.fold;hv[1]+=p*jamEv;heroValues.set(hk,hv);heroMass.set(hk,(heroMass.get(hk)??0)+p);
    const vv=villainValues.get(vk)??[0,0];vv[0]-=p*hp.jam*pay.win;vv[1]-=p*hp.jam*showdown;villainValues.set(vk,vv);
  }
  const brHero=[...heroValues.values()].reduce((s,v)=>s+Math.max(...v),0),brVillain=foldConstant+[...villainValues.values()].reduce((s,v)=>s+Math.max(...v),0);
  if(brHero<baseline-1e-9||brVillain<-baseline-1e-9)throw new Error('BR below profile value.');
  const improvements=[Math.max(0,brHero-baseline),Math.max(0,brVillain+baseline)],nashConv=improvements.reduce((s,v)=>s+v,0);
  const strategies:ComboSolution[]=allCombos().map(combo=>{const k=preflopInfo('BTN',combo),reach=heroMass.get(k)??0,evs=heroValues.get(k);return {combo:[...combo],reach,actions:['fold','jam'].map((actionId,i)=>({actionId,frequency:reach?profile[k][actionId]:0,...(evs?{evBb:evs[i]/reach}:{})}))};});
  return {strategies,report:{method:'EXACT_CONDITIONAL_PREFLOP_BEST_RESPONSE',verifierVersion:'rangeform-preflop-br-v1',profileValues:[baseline,-baseline],bestResponseValues:[brHero,brVillain],improvements,nashConv,exploitability:nashConv/2,utilityUnit:'BB_PER_HAND',compatibleDeals:deals.length,informationSets:expected.size,scope:'CONDITIONAL_HU_PUSH_FOLD_ONLY',numericalAllowanceBb:1e-9,equityEvidenceSha256:equityEvidenceHash(),boardsPerMatchup:1712304}};
}
