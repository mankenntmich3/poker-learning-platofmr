import { createHash } from 'node:crypto';
import { canonicalJson } from '@/domain/canonical';
import { createCombo, type Card } from '@/domain/cards';
import { canonicalStrategyContext, defaultTournamentContext, type StrategyContext } from '@/domain/strategy-context';

export const RIVER_MODEL_ID='nlhe-river-polarized-bba-v1';
export const ENGINE_SHA='68f7015142929829385453d5ce55eb7a1d51efd5f3adb666f99f4e5c125cb933';
export const LICENSE_SHA='5eb65665809f5f7449c5e347207c7a87fb869a390e63d5e2fa6fd815f6510aa2';
export const ENGINE_COMMIT='f78f1b2bc338dd8cbb5226ecb8398bbdb3635676';
export const riverTree={version:1,root:'BTN after BB river check',actions:['check','half','jam'],responses:['fold','call'],raisesAfterBet:0,cardAbstraction:'NONE',utility:'NET_FUTURE_CHIPS_PLUS_HALF_ROOT_POT'} as const;
export const RIVER_TREE_SHA=createHash('sha256').update(canonicalJson(riverTree)).digest('hex');
export const riverActions=[{id:'check',type:'CHECK'},{id:'half',type:'RAISE',toBb:2.75},{id:'jam',type:'JAM'}] as const;
export function riverContext():StrategyContext {
  const c=defaultTournamentContext(8,15);
  c.hero='BTN';c.board=['As','7d','2c','Kh','Tc'];
  c.actionHistory=[...c.stacks.slice(0,5).map(s=>({actor:s.position,type:'FOLD' as const})),
    {actor:'BTN',type:'RAISE',toBb:2},{actor:'SB',type:'FOLD'},{actor:'BB',type:'CALL'},
    {type:'DEAL',cards:['As','7d','2c']},{actor:'BB',type:'CHECK'},{actor:'BTN',type:'CHECK'},
    {type:'DEAL',cards:['Kh']},{actor:'BB',type:'CHECK'},{actor:'BTN',type:'CHECK'},
    {type:'DEAL',cards:['Tc']},{actor:'BB',type:'CHECK'}];
  c.conditioning={version:1,type:'FIXED_RANGE_SUBGAME',meaning:'STUDY_INPUT_NOT_SOLVED_ANCESTRY',ranges:[
    {position:'BTN',combos:['QsJs','QhJh','QdJd','QcJc','9s8s','9h8h','9d8d','9c8c'].map(s=>({cards:[...createCombo(s.slice(0,2),s.slice(2))],weight:1/8}))},
    {position:'BB',combos:['KsQs','KsJs','KcQc','KcJc','AdQd','AdJd','AhQh','AhJh'].map(s=>({cards:[...createCombo(s.slice(0,2),s.slice(2))],weight:1/8}))},
  ]};
  return canonicalStrategyContext(c);
}
export function riverInfo(player:'BTN'|'BB',cards:readonly Card[],bet?:string):string {
  return `${player}:${cards.join('')}${bet?':'+bet:''}`;
}
