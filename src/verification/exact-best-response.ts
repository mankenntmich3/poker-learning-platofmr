/** Independent evaluator: no solver imports, no reported EV/convergence input.
 * Enumerates pure information-set policies for finite perfect-recall games.
 * Exponential reference implementation, deliberately bounded, never a sampled
 * lower bound masquerading as an exploitability certificate.
 */
export type GameNode =
  | { kind: 'terminal'; payoff: number[] }
  | { kind: 'chance'; branches: { probability: number; child: GameNode }[] }
  | { kind: 'decision'; player: number; informationSet: string; actions: { id: string; child: GameNode }[] };
export interface FiniteGame { players: number; root: GameNode; utilityUnit: 'BB_PER_HAND' }
export type BehavioralProfile = Record<string, Record<string, number>>;
export interface BestResponseReport {
  method: 'EXHAUSTIVE_INFORMATION_SET_BEST_RESPONSE'|'COUNTERFACTUAL_INFORMATION_SET_BEST_RESPONSE'; verifierVersion: 'rangeform-exact-br-v1';
  profileValues: number[]; bestResponseValues: number[]; improvements: number[];
  nashConv: number; exploitability: number | null; nodes: number; evaluatedPolicies: number;
  utilityUnit: 'BB_PER_HAND';
}
const LIMITS = Object.freeze({ nodes: 50_000, depth: 128, policies: 4096, work: 5_000_000, tolerance: 1e-10 });

export function measureCounterfactualBestResponses(game:FiniteGame,profile:BehavioralProfile):BestResponseReport {
  return measureBestResponses(game,profile,'counterfactual');
}
export function measureBestResponses(game: FiniteGame, profile: BehavioralProfile, method:'exhaustive'|'counterfactual'='exhaustive'): BestResponseReport {
  if (!Number.isInteger(game.players) || game.players < 2 || game.players > 9 || game.utilityUnit !== 'BB_PER_HAND') throw new Error('Unsupported finite-game identity.');
  const infos = new Map<string,{player:number;actions:string[];recall:string}>();
  const seen = new Set<GameNode>();
  let nodes = 0, zeroSum = true;
  const probabilities = (values:number[]) => {
    if (values.some(v => !Number.isFinite(v) || v < 0 || v > 1) || Math.abs(values.reduce((a,b)=>a+b,0)-1)>LIMITS.tolerance) throw new Error('Invalid probability distribution.');
  };
  function audit(node:GameNode, recall:string[][], depth:number) {
    if (++nodes>LIMITS.nodes || depth>LIMITS.depth) throw new Error('Exact verifier resource limit exceeded.');
    if (seen.has(node)) throw new Error('Game must be an explicit acyclic tree.');
    seen.add(node);
    if (node.kind==='terminal') {
      if (node.payoff.length!==game.players || node.payoff.some(v=>!Number.isFinite(v) || Math.abs(v)>1e8)) throw new Error('Invalid terminal utility vector.');
      if (Math.abs(node.payoff.reduce((a,b)=>a+b,0))>LIMITS.tolerance) zeroSum=false;
    } else if (node.kind==='chance') {
      if (!node.branches.length) throw new Error('Empty chance node.');
      probabilities(node.branches.map(b=>b.probability));
      node.branches.forEach(b=>audit(b.child,recall,depth+1));
    } else if (node.kind==='decision') {
      if (!Number.isInteger(node.player) || node.player<0 || node.player>=game.players || !node.informationSet || !node.actions.length) throw new Error('Invalid information set.');
      const actions=node.actions.map(a=>a.id), key=node.informationSet, memory=JSON.stringify(recall[node.player]);
      if (actions.some(a=>!a) || new Set(actions).size!==actions.length) throw new Error('Duplicate or empty action.');
      const previous=infos.get(key);
      if (previous && (previous.player!==node.player || JSON.stringify(previous.actions)!==JSON.stringify(actions) || previous.recall!==memory)) throw new Error('Inconsistent information set or imperfect recall.');
      infos.set(key,{player:node.player,actions,recall:memory});
      const policy=Object.hasOwn(profile,key) ? profile[key] : undefined;
      if (!policy || Object.keys(policy).sort().join('|')!==[...actions].sort().join('|')) throw new Error('Missing or extra strategy actions.');
      probabilities(actions.map(a=>policy[a]));
      node.actions.forEach(a => {
        const next=recall.map(row=>[...row]); next[node.player].push(JSON.stringify([key,a.id]));
        audit(a.child,next,depth+1);
      });
    } else throw new Error('Unknown game node.');
  }
  audit(game.root,Array.from({length:game.players},()=>[]),0);
  if (Object.keys(profile).length!==infos.size) throw new Error('Full profile contains extraneous information sets.');
  const policyCounts=Array.from({length:game.players},(_,player)=>[...infos.values()].filter(i=>i.player===player).reduce((n,i)=>n*i.actions.length,1));
  if (method==='exhaustive' && (policyCounts.some(n=>n>LIMITS.policies) || (1+policyCounts.reduce((a,b)=>a+b,0))*nodes>LIMITS.work)) throw new Error('Exact verifier resource limit exceeded.');
  let work=0;
  function value(node:GameNode, deviator:number, pure:Map<string,string>):number[] {
    if(method==='counterfactual' && ++work>LIMITS.work) throw new Error('Exact verifier resource limit exceeded.');
    if (node.kind==='terminal') return node.payoff;
    const result=Array(game.players).fill(0) as number[];
    const edges=node.kind==='chance' ? node.branches : node.actions.map(a=>({
      child:a.child, probability:node.player===deviator ? Number(pure.get(node.informationSet)===a.id) : profile[node.informationSet][a.id],
    }));
    for (const edge of edges) {
      if (edge.probability===0) continue;
      const child=value(edge.child,deviator,pure);
      for (let p=0;p<game.players;p++) result[p]+=edge.probability*child[p];
    }
    return result;
  }
  const profileValues=value(game.root,-1,new Map()), bestResponseValues:number[]=[];
  let evaluatedPolicies=0;
  for (let p=0;p<game.players;p++) {
    const choices=[...infos.entries()].filter(([,i])=>i.player===p), pure=new Map<string,string>();
    if(method==='counterfactual') {
      const occurrences=new Map<string,{node:Extract<GameNode,{kind:'decision'}>;reach:number}[]>();
      function collect(node:GameNode,reach:number) {
        if(node.kind==='terminal')return;
        if(node.kind==='chance'){node.branches.forEach(b=>collect(b.child,reach*b.probability));return;}
        if(node.player===p) {
          const list=occurrences.get(node.informationSet)??[];list.push({node,reach});occurrences.set(node.informationSet,list);
        }
        node.actions.forEach(a=>collect(a.child,reach*(node.player===p?1:profile[node.informationSet][a.id])));
      }
      collect(game.root,1);
      // Perfect recall makes own-decision ancestry a DAG. Descendant choices
      // are fixed before their ancestors; hidden states share ONE action.
      choices.sort((a,b)=>(JSON.parse(b[1].recall) as string[]).length-(JSON.parse(a[1].recall) as string[]).length);
      for(const [key,info] of choices) {
        let best=-Infinity,selected=info.actions[0];
        for(const action of info.actions) {
          const ev=occurrences.get(key)!.reduce((s,o)=>s+o.reach*value(o.node.actions.find(a=>a.id===action)!.child,p,pure)[p],0);
          if(ev>best){best=ev;selected=action;}
        }
        pure.set(key,selected);
      }
      evaluatedPolicies++;bestResponseValues.push(value(game.root,p,pure)[p]);continue;
    }
    let best=-Infinity;
    function enumerate(index:number) {
      if (index===choices.length) { evaluatedPolicies++; best=Math.max(best,value(game.root,p,pure)[p]); return; }
      const [key,info]=choices[index];
      for (const a of info.actions) { pure.set(key,a); enumerate(index+1); }
    }
    enumerate(0); bestResponseValues.push(best);
  }
  const improvements=bestResponseValues.map((v,p)=>{
    if (v<profileValues[p]-LIMITS.tolerance) throw new Error('Best response fell below the profile value.');
    return Math.max(0,v-profileValues[p]);
  });
  const nashConv=improvements.reduce((a,b)=>a+b,0);
  return {method:method==='exhaustive'?'EXHAUSTIVE_INFORMATION_SET_BEST_RESPONSE':'COUNTERFACTUAL_INFORMATION_SET_BEST_RESPONSE',verifierVersion:'rangeform-exact-br-v1',
    profileValues,bestResponseValues,improvements,nashConv,
    exploitability:game.players===2 && zeroSum ? nashConv/2 : null,
    nodes,evaluatedPolicies,utilityUnit:'BB_PER_HAND'};
}
