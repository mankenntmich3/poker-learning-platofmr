import { createHash } from 'node:crypto';
import { allCombos, allHandClasses, getHandClass, createCombo, assertUniqueCards, type Card, type Combo } from '@/domain/cards';
import { handFeatures } from '@/domain/analysis';
import { BB, initialStudyState, applyStudyEvent, replayStudy, serializeStudy, studyActions, studyLegal, type LegalAction, type PokerGameState, type StudySpot } from '@/domain/study';
import type { StrategyProvider, SourceType } from './types';
import { getNlheProvider } from './nlhe-provider';

export interface StudyFrequency { action:string; frequency:number; ev:number|null }
export interface StudyCombo { cards:Combo; handClass:string; reach:number; actions:StudyFrequency[] }
export interface StudyClass { handClass:string; combos:number; weightedCombos:number; reach:number; actions:StudyFrequency[] }
export interface SolutionInfo { sourceType:SourceType; solutionVersion:string; solverVersion:string|null; generatedAt:string; accuracy:{value:number|null;metric:string|null}; assumptions:string[]; rake:number; format:string; stack:number; betSizes:number[]; description:string; license:string }
export interface StudyNode { id:string; state:PokerGameState; legalActions:LegalAction[]; strategyActions:string[]; hero:StudyCombo[]; villain:StudyCombo[]; villainUnblocked:{cards:Combo;weight:number}[]; heroClasses:StudyClass[]; villainClasses:StudyClass[]; funnel:{label:string;hero:number;villain:number}[]; provenance:SolutionInfo; unavailable:string|null }
export type StudyStrategyProvider = StrategyProvider<StudySpot,Combo,StudyNode,StudyNode,StudyCombo,StudyFrequency>;
const sum=(rows:StudyCombo[])=>rows.reduce((n,c)=>n+c.reach,0);
const featuresCache=new Map<string,ReturnType<typeof handFeatures>>();
function features(cards:Combo,board:Card[]){const key=cards.join('')+board.join('');let result=featuresCache.get(key);if(!result){result=handFeatures(cards,board);if(featuresCache.size>=15000)featuresCache.clear();featuresCache.set(key,result);}return result;}
/** Transparent, deliberately coarse educational policy. Never an equilibrium/EV solver. */
function approximateActions(state:PokerGameState,cards:Combo):StudyFrequency[]{
  const legal=studyLegal(state),actions=studyActions(state);if(!legal||!state.board.length)return [];
  const f=features(cards,state.board),made=f.categoryRank>=2,strongDraw=f.flushDraw||f.straightDraw;
  const weights:number[]=actions.map(a=>{
    if(a.action.type==='fold')return made?0:strongDraw?1:f.topPair||f.overpair?1:4;
    if(a.action.type==='call')return made?4:strongDraw?4:f.categoryRank===1?3:1;
    if(a.action.type==='check')return made?2:f.categoryRank===1?4:strongDraw||f.backdoorFlush?3:5;
    const amount='toBb' in a.action?a.action.toBb*BB-legal.player.streetInvested:legal.player.stack;
    const large=amount>state.pot*0.8;
    return made?(large?4:3):strongDraw?2:f.topPair||f.overpair?(large?1:2):f.backdoorFlush?1:large?0:1;
  });
  const total=weights.reduce((n,w)=>n+w,0);return actions.map((a,i)=>({action:a.id,frequency:weights[i]/total,ev:null}));
}
export function aggregateStudy(rows:StudyCombo[],actions:LegalAction[]):StudyClass[]{
  const groups=new Map(allHandClasses().map(h=>[h,[] as StudyCombo[]]));for(const row of rows)groups.get(row.handClass)!.push(row);
  return [...groups].map(([handClass,group])=>{const weight=sum(group);return {handClass,combos:group.length,weightedCombos:weight,reach:group.length?weight/group.length:0,actions:actions.map(a=>({action:a.id,frequency:weight?group.reduce((n,c)=>n+c.reach*(c.actions.find(x=>x.action===a.id)?.frequency??0),0)/weight:0,ev:null}))};});
}
export class ApproximationProvider implements StudyStrategyProvider {
  async hasSolution(spot:StudySpot){try{replayStudy(spot);return true;}catch{return false;}}
  async getNode(spot:StudySpot):Promise<StudyNode>{return this.getRangeStrategy(spot);}
  async getRangeStrategy(spot:StudySpot):Promise<StudyNode>{
    const final=replayStudy(spot),config=spot.config,legacy=await getNlheProvider();
    const other=config.opener===config.hero?config.villain:config.hero;
    const common={game:'nlhe' as const,format:'6max-cash' as const,stackBb:config.stackBb,openBb:config.openBb,threeBetBb:config.threeBetBb,fourBetBb:config.fourBetBb};
    const open=await legacy.getRangeStrategy({...common,hero:config.opener,villain:null,scenario:'rfi'});
    const defense=await legacy.getRangeStrategy({...common,hero:other,villain:config.opener,scenario:'vs-open'});
    const opening=new Map(open.combos.map(c=>[c.cards.join(''),c.actions.find(a=>a.action==='raise')?.frequency??0]));
    const responses=new Map(defense.combos.map(c=>[c.cards.join(''),c.actions.find(a=>a.action===(config.line==='srp'?'call':'raise'))?.frequency??0]));
    let openerRows=allCombos().map(cards=>({cards,handClass:getHandClass(cards),reach:opening.get(cards.join(''))??0,actions:[] as StudyFrequency[]}));
    let defenderRows=allCombos().map(cards=>({cards,handClass:getHandClass(cards),reach:responses.get(cards.join(''))??0,actions:[] as StudyFrequency[]}));
    if(config.line!=='srp'){
      const continuation=await legacy.getRangeStrategy({...common,hero:config.opener,villain:other,scenario:'vs-3bet'});
      const frequency=new Map(continuation.combos.map(c=>[c.cards.join(''),c.actions.find(a=>a.action===(config.line==='3bet'?'call':'raise'))?.frequency??0]));
      openerRows=openerRows.map(c=>({...c,reach:c.reach*(frequency.get(c.cards.join(''))??0)}));
      // A 4-bet calling range has no supporting provider node. Do not silently manufacture it.
      if(config.line==='4bet')defenderRows=defenderRows.map(c=>({...c,reach:0}));
    }
    let hero=config.hero===config.opener?openerRows:defenderRows,villain=config.hero===config.opener?defenderRows:openerRows;
    let state=initialStudyState(config,spot.heroHand);
    const funnel=[{label:'Preflop',hero:sum(hero),villain:sum(villain)}];
    for(const event of spot.events){
      if(event.kind==='action'){
        const action=studyActions(state).find(a=>JSON.stringify(a.action)===JSON.stringify(event.action));
        const update=(rows:StudyCombo[])=>rows.map(c=>({...c,reach:c.reach*(action?approximateActions(state,c.cards).find(a=>a.action===action.id)?.frequency??0:0)}));
        if(!action)throw new Error('This bet size is not supported by the current solution set.');
        if(event.actor===config.hero)hero=update(hero);else villain=update(villain);
      }
      state=applyStudyEvent(state,event);
      if(event.kind==='deal'){
        hero=hero.filter(c=>!c.cards.some(card=>state.board.includes(card)));
        villain=villain.filter(c=>!c.cards.some(card=>state.board.includes(card)));
      }
      funnel.push({label:event.kind==='deal'?`${state.street}: ${state.board.join(' ')}`:`${state.street} ${event.actor} ${event.action.type}`,hero:sum(hero),villain:sum(villain)});
    }
    // Hero cards remove opponent combos only; hero's own range remains a range.
    const villainUnblocked=villain.map(c=>({cards:c.cards,weight:c.reach}));
    villain=villain.filter(c=>!c.cards.some(card=>spot.heroHand.includes(card)));
    hero=hero.map(c=>({...c,actions:final.activePlayer===config.hero?approximateActions(final,c.cards):[]}));
    villain=villain.map(c=>({...c,actions:final.activePlayer===config.villain?approximateActions(final,c.cards):[]}));
    const actions=studyActions(final),id=createHash('sha256').update(serializeStudy(spot)).digest('hex');
    return {id,state:final,legalActions:actions,strategyActions:config.line==='4bet'?[]:actions.map(a=>a.id),hero,villain,villainUnblocked,heroClasses:aggregateStudy(hero,actions),villainClasses:aggregateStudy(villain,actions),funnel,
      unavailable:config.line==='4bet'?'No solution available for this node: 4-bet calling range unavailable.':null,
      provenance:{sourceType:'APPROXIMATED',solutionVersion:`study-approx/2.0.0:${open.provenance.solutionVersion}`,solverVersion:null,generatedAt:'2026-09-10T00:00:00.000Z',accuracy:{value:null,metric:null},rake:0,format:'6-max NLHE ChipEV',stack:config.stackBb,betSizes:actions.flatMap(a=>'toBb' in a.action?[a.action.toBb]:[]),
        license:'Originale Rangeform-Lernregeln; keine übernommenen Solver-Daten.',description:'Approximate Training Strategy. Originale kategoriebasierte Lerngewichte, keine Solver-GTO-Daten.',assumptions:['Gleiche effektive Stacks; keine Antes, Rake 0.','Preflop-Priors stammen aus ausdrücklich heuristischen Rangeform-Lernranges.','Postflop: grobe Gewichte anhand Handkategorie, Draws und Betgröße; Frequenzen sind normierte Lerngewichte, keine gemessene Genauigkeit.','Range Evolution multipliziert Reach mit den Lernfrequenzen der gewählten Action.','Hero-Blocker gelten nur für die Villain-Range. Equity ist Showdown-Equity ohne zukünftige Folds; kein Action-EV.']}};
  }
  async getComboStrategy(spot:StudySpot,combo:Combo){const node=await this.getNode(spot);const cards=createCombo(...combo);const found=(node.state.activePlayer===spot.config.villain?node.villain:node.hero).find(c=>c.cards.join('')===cards.join(''));if(!found)throw new Error('Blocked combo');return found;}
  async getActionEVs(spot:StudySpot,combo:Combo){return (await this.getComboStrategy(spot,combo)).actions;}
  async getNextNodes(spot:StudySpot){const state=replayStudy(spot);return Promise.all(studyActions(state).map(a=>this.getNode({...spot,events:[...spot.events,{kind:'action',actor:state.activePlayer!,action:a.action}]})));}
}

/** Imported artifacts must be validated before publication; no supplied dataset is bundled. */
export class StaticSolutionProvider implements StudyStrategyProvider {
  private readonly nodes:ReadonlyMap<string,StudyNode>;
  constructor(nodes:ReadonlyMap<string,StudyNode>){
    const owned=new Map<string,StudyNode>();
    for(const [key,node] of nodes){
      const spot=JSON.parse(key) as StudySpot,state=replayStudy(spot),p=node.provenance;
      if(serializeStudy(spot)!==key||JSON.stringify(state)!==JSON.stringify(node.state)||!p.solutionVersion||!p.description||!p.license||!Number.isFinite(Date.parse(p.generatedAt)))throw new Error('Invalid static solution identity/provenance');
      if(p.sourceType==='COMPUTED'&&(!p.solverVersion||p.accuracy.value===null||!p.accuracy.metric))throw new Error('Computed solution requires solver version and measured accuracy');
      if(p.accuracy.value!==null&&(!Number.isFinite(p.accuracy.value)||p.accuracy.value<0))throw new Error('Invalid accuracy');
      const legal=studyActions(state).map(a=>a.id);
      for(const range of [node.hero,node.villain])for(const combo of range){
        assertUniqueCards([...combo.cards,...state.board]);if(combo.reach<0||combo.reach>1||!Number.isFinite(combo.reach))throw new Error('Invalid static reach');
        if(combo.actions.length&&Math.abs(combo.actions.reduce((n,a)=>n+a.frequency,0)-1)>1e-8)throw new Error('Static frequencies must sum to one');
        for(const a of combo.actions)if(!legal.includes(a.action)||!Number.isFinite(a.frequency)||a.frequency<0||a.frequency>1||a.ev!==null&&!Number.isFinite(a.ev)||(p.sourceType==='APPROXIMATED'||p.sourceType==='DEMO')&&a.ev!==null)throw new Error('Invalid static strategy/EV');
      }
      owned.set(key,structuredClone(node));
    }
    this.nodes=owned;
  }
  async hasSolution(spot:StudySpot){return this.nodes.has(serializeStudy(spot));}
  async getNode(spot:StudySpot){const node=this.nodes.get(serializeStudy(spot));if(!node)throw new Error('No solution available for this node.');return structuredClone(node);}
  async getRangeStrategy(spot:StudySpot){return this.getNode(spot);}
  async getComboStrategy(spot:StudySpot,combo:Combo){const node=await this.getNode(spot);const cards=createCombo(...combo);const found=(node.state.activePlayer===spot.config.villain?node.villain:node.hero).find(c=>c.cards.join('')===cards.join(''));if(!found)throw new Error('No solution for this combo.');return found;}
  async getActionEVs(spot:StudySpot,combo:Combo){return (await this.getComboStrategy(spot,combo)).actions;}
  async getNextNodes(spot:StudySpot){const state=replayStudy(spot);const next=studyActions(state).map(a=>({...spot,events:[...spot.events,{kind:'action' as const,actor:state.activePlayer!,action:a.action}]}));const available=await Promise.all(next.map(s=>this.hasSolution(s)));return Promise.all(next.filter((_,i)=>available[i]).map(s=>this.getNode(s)));}
}
export const studyProvider:StudyStrategyProvider=new ApproximationProvider();
