import {describe,it,expect} from 'vitest';
import {measureBestResponses,type FiniteGame,type GameNode} from '@/verification/exact-best-response';

// Analytic finite games, not poker artifacts; never enter the solution registry.
function pennies():FiniteGame {
  return {players:2,utilityUnit:'BB_PER_HAND',root:{kind:'decision',player:0,informationSet:'p0',actions:[0,1].map(x=>({
    id:String(x),child:{kind:'decision',player:1,informationSet:'p1',actions:[0,1].map(y=>({id:String(y),child:{kind:'terminal',payoff:x===y?[1,-1]:[-1,1]}}))},
  }))}};
}
describe('independent exhaustive best response',()=>{
  it('finds zero NashConv for analytic matching-pennies equilibrium without hidden-action leakage',()=>{
    const r=measureBestResponses(pennies(),{p0:{'0':.5,'1':.5},p1:{'0':.5,'1':.5}});
    expect(r.profileValues).toEqual([0,0]);expect(r.bestResponseValues).toEqual([0,0]);
    expect(r.nashConv).toBe(0);expect(r.exploitability).toBe(0);
  });
  it('measures unilateral improvement directly instead of trusting supplied EV',()=>{
    const r=measureBestResponses(pennies(),{p0:{'0':1,'1':0},p1:{'0':1,'1':0}});
    expect(r.profileValues).toEqual([1,-1]);expect(r.bestResponseValues).toEqual([1,1]);
    expect(r.improvements).toEqual([0,2]);expect(r.nashConv).toBe(2);expect(r.exploitability).toBe(1);
  });
  it('subtracts all players profile values for a general-sum multiway game',()=>{
    function tree(p:number,choices:number[]):GameNode {
      if(p===3)return {kind:'terminal',payoff:choices};
      return {kind:'decision',player:p,informationSet:'p'+p,actions:[0,1].map(x=>({id:String(x),child:tree(p+1,[...choices,x])}))};
    }
    const r=measureBestResponses({players:3,root:tree(0,[]),utilityUnit:'BB_PER_HAND'},{p0:{'0':.5,'1':.5},p1:{'0':.5,'1':.5},p2:{'0':.5,'1':.5}});
    expect(r.profileValues).toEqual([.5,.5,.5]);expect(r.improvements).toEqual([.5,.5,.5]);
    expect(r.nashConv).toBe(1.5);expect(r.exploitability).toBeNull();
  });
  it('weights hidden chance outcomes and chooses one action for the whole information set',()=>{
    const game:FiniteGame={players:2,utilityUnit:'BB_PER_HAND',root:{kind:'chance',branches:[0,1].map(x=>({
      probability:x===0?.75:.25,child:{kind:'decision',player:0,informationSet:'guess',actions:[0,1].map(y=>({id:String(y),child:{kind:'terminal',payoff:x===y?[1,-1]:[-1,1]}}))},
    }))}};
    const r=measureBestResponses(game,{guess:{'0':.5,'1':.5}});
    expect(r.bestResponseValues[0]).toBe(.5);expect(r.nashConv).toBe(.5);
  });
  it('rejects incomplete policies, nonfinite input, extra info sets and imperfect recall',()=>{
    expect(()=>measureBestResponses(pennies(),{p0:{'0':1,'1':0}})).toThrow(/Missing/);
    expect(()=>measureBestResponses(pennies(),{p0:{'0':NaN,'1':0},p1:{'0':1,'1':0}})).toThrow(/probability/);
    const game=pennies();if(game.root.kind==='decision')for(const a of game.root.actions)if(a.child.kind==='decision')a.child.player=0;
    expect(()=>measureBestResponses(game,{p0:{'0':.5,'1':.5},p1:{'0':.5,'1':.5}})).toThrow(/imperfect recall/);
  });
  it('refuses oversized exact enumeration, never substitutes a sampled lower bound',()=>{
    const game:FiniteGame={players:2,utilityUnit:'BB_PER_HAND',root:{kind:'chance',branches:Array.from({length:13},(_,i)=>({
      probability:1/13,child:{kind:'decision',player:0,informationSet:'i'+i,actions:[0,1].map(x=>({id:String(x),child:{kind:'terminal',payoff:[x,-x]}}))},
    }))}};
    const profile=Object.fromEntries(Array.from({length:13},(_,i)=>['i'+i,{'0':.5,'1':.5}]));
    expect(()=>measureBestResponses(game,profile)).toThrow(/resource limit/);
  });
});
