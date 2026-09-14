import { riverContext, riverInfo } from '@/domain/river-definition';
import { showdownScore } from '@/domain/equity';
import type { FiniteGame, GameNode } from '@/verification/exact-best-response';
import type { BehavioralProfile } from '@/verification/exact-best-response';
import type { ComboSolution } from './verified-solution';
import { allCombos } from '@/domain/cards';
/** Generator uses the direct seven-card evaluator. Verifier reconstructs utilities independently. */
export function generateRiverGame():FiniteGame {
  const c=riverContext(), hero=c.conditioning!.ranges.find(r=>r.position==='BTN')!, villain=c.conditioning!.ranges.find(r=>r.position==='BB')!;
  const branches:{probability:number;child:GameNode}[]=[];
  for(const h of hero.combos) for(const v of villain.combos) {
    if(h.cards.some(card=>v.cards.includes(card))) continue;
    const result=Math.sign(showdownScore([...c.board,...h.cards])-showdownScore([...c.board,...v.cards]));
    const terminal=(amount:number):GameNode=>({kind:'terminal',payoff:[amount,-amount]});
    const child:GameNode={kind:'decision',player:0,informationSet:riverInfo('BTN',h.cards),actions:[
      {id:'check',child:terminal(result*2.75)},
      ...[{id:'half',matched:2.75},{id:'jam',matched:12}].map(b=>({id:b.id,child:{kind:'decision' as const,player:1,informationSet:riverInfo('BB',v.cards,b.id),actions:[
        {id:'fold',child:terminal(2.75)},{id:'call',child:terminal(result*(2.75+b.matched))},
      ]}})),
    ]};
    branches.push({probability:h.weight*v.weight,child});
  }
  const mass=branches.reduce((s,b)=>s+b.probability,0);
  return {players:2,utilityUnit:'BB_PER_HAND',root:{kind:'chance',branches:branches.map(b=>({...b,probability:b.probability/mass}))}};
}

/** Generator projection from its explicit tree; separately reconstructed by the verifier. */
export function projectRiverMatrix(game:FiniteGame,profile:BehavioralProfile):ComboSolution[] {
  if(game.root.kind!=='chance')throw new Error('Expected root deals.');
  function value(n:GameNode):number {
    if(n.kind==='terminal')return n.payoff[0];
    if(n.kind==='chance')return n.branches.reduce((s,b)=>s+b.probability*value(b.child),0);
    return n.actions.reduce((s,a)=>s+profile[n.informationSet][a.id]*value(a.child),0);
  }
  const rows=new Map<string,{reach:number;values:Record<string,number>}>();
  for(const b of game.root.branches) {
    if(b.child.kind!=='decision')throw new Error('Expected BTN root.');
    const key=b.child.informationSet,r=rows.get(key)??{reach:0,values:{check:0,half:0,jam:0}};
    r.reach+=b.probability;b.child.actions.forEach(a=>r.values[a.id]+=b.probability*value(a.child));rows.set(key,r);
  }
  return allCombos(riverContext().board).map(combo=>{
    const key=riverInfo('BTN',combo),r=rows.get(key);
    return {combo:[...combo],reach:r?.reach??0,actions:['check','half','jam'].map(actionId=>({actionId,frequency:r?profile[key][actionId]:0,...(r?{evBb:r.values[actionId]/r.reach}:{})}))};
  });
}
