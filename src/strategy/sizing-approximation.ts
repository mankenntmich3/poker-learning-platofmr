import type { NlheConfig, NlheRange } from '@/shared/nlhe';
import { studySizes } from '@/domain/study';

/** Explicit educational sensitivity rule, not an equilibrium or an equity calculation. */
export function applyStudySizing(range: NlheRange, config: NlheConfig): NlheRange {
  if(config.scenario==='flop-srp'||config.openBb===undefined)return range;
  const opener=config.scenario==='vs-open'?config.villain!:config.hero;
  const open=config.openBb??studySizes(config.stackBb,opener).recommended;
  const three=config.threeBetBb??Math.min(config.stackBb,open* (['SB','BB'].includes(config.scenario==='vs-open'?config.hero:config.villain??'BB')?4:3));
  const four=config.fourBetBb??Math.min(config.stackBb,Math.max(three*2.2,2*three-open));
  if(open<2||three<=open||three>config.stackBb||(three<2*open-1&&three!==config.stackBb)||four<three||four>config.stackBb||(four<2*three-open&&four!==config.stackBb))throw new Error('Ungültige Preflop-Sizes.');
  const blind=(p:string|null)=>p==='BB'?1:p==='SB'?0.5:0;
  const baseline=opener==='SB'?3:2.5;
  const sensitivity=Math.max(0.5,Math.min(1.3,baseline/open));
  const allowed=range.actions.filter(a=>a.id!=='raise'||config.scenario!=='vs-3bet'||three<config.stackBb);
  if(config.scenario==='vs-3bet'&&three<config.stackBb&&!allowed.some(a=>a.id==='raise'))allowed.push({id:'raise',label:'Raise',toBb:four,allIn:four===config.stackBb});
  const adjust=(actions:NlheRange['classes'][number]['actions'])=>{
    const continuation=actions.filter(a=>a.action!=='fold').reduce((n,a)=>n+a.frequency,0);
    const target=Math.min(1,Math.round(continuation*sensitivity*4)/4);
    return allowed.map(a=>({action:a.id,frequency:a.id==='fold'?1-target:continuation?target*(actions.find(x=>x.action===a.id)?.frequency??0)/continuation:0,ev:null}));
  };
  const result=structuredClone(range);result.config={...config};result.actions=structuredClone(allowed);
  if(config.scenario==='rfi')result.actions.find(a=>a.id==='raise')!.toBb=open;
  else {
    result.investedBb=config.scenario==='vs-open'?blind(config.hero):open;
    result.potBb=config.scenario==='vs-open'?1.5+open-blind(config.villain):1.5+open-blind(config.hero)+three-blind(config.villain);
    result.toCallBb=(config.scenario==='vs-open'?open:three)-result.investedBb;
    result.actions.find(a=>a.id==='call')!.toBb=config.scenario==='vs-open'?open:three;
    const raise=result.actions.find(a=>a.id==='raise');if(raise)raise.toBb=config.scenario==='vs-open'?three:four;
  }
  result.actions=result.actions.filter(a=>a.id!=='raise'||config.scenario!=='vs-3bet'||three<config.stackBb).map(a=>({...a,allIn:a.toBb===config.stackBb,label:a.id==='fold'?'Fold':a.id==='call'?`Call ${result.toCallBb} BB`:`${a.toBb===config.stackBb?'All-in':'Raise auf'} ${a.toBb} BB`}));
  // When a 3-bet consumes the stack, all continuation is call (a raise cannot exist).
  const corrected=(actions:NlheRange['classes'][number]['actions'])=>{const rows=adjust(actions);if(!result.actions.some(a=>a.id==='raise')){const missing=1-rows.reduce((n,a)=>n+a.frequency,0);const call=rows.find(a=>a.action==='call');if(call)call.frequency+=missing;}return rows;};
  const reach=(value:number)=>config.scenario==='vs-3bet'?Math.min(1,Math.round(value*sensitivity*4)/4):value;
  result.classes=result.classes.map(row=>({...row,reach:reach(row.reach),actions:corrected(row.actions)}));
  result.combos=result.combos.map(row=>({...row,reach:reach(row.reach),actions:corrected(row.actions)}));
  result.id+=`:open${open}:3bet${three}:4bet${four}`;
  result.context=`${config.scenario==='rfi'?'Alle folden zu dir.':`${opener} eröffnet auf ${open} BB.`} Open ${open} BB; 3-Bet ${three} BB; 4-Bet ${four} BB. Recommended Study Size: Lernannahme, keine Solver-Empfehlung.`;
  result.provenance.solutionVersion+='-sizing-v2';
  result.provenance.assumptions=[`6-max NLHE ChipEV · Rake 0 · Stack ${config.stackBb} BB`,`Open ${open} BB · 3-Bet ${three} BB · 4-Bet ${four} BB`,'Originale Lernannahme: Fortsetzungsmasse skaliert invers zur Open Size und wird grob gerundet. Keine separat gelöste Size.'];
  result.provenance.limitations=['Approximate Training Strategy: keine Solver-Solution.','Sizing-Anpassung und Mischungen sind didaktische Annahmen, keine gemessene Spielqualität.','EV data unavailable.'];
  result.related=result.related.map(next=>({...next,openBb:open,threeBetBb:three,fourBetBb:four}));
  if(config.scenario==='rfi')result.related.push({...config,hero:'BB',villain:config.hero,scenario:'vs-open'});
  return result;
}
