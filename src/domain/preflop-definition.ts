import { createHash } from 'node:crypto';
import { allCombos, getHandClass, type Card } from './cards';
import { canonicalJson } from './canonical';
import { canonicalStrategyContext, defaultTournamentContext } from './strategy-context';
import { VERIFIED_PREFLOP_STACKS } from '@/shared/verified-spot';

export const PREFLOP_MODEL_ID='nlhe-hu-conditional-pushfold-v1';
export const PREFLOP_STACKS=VERIFIED_PREFLOP_STACKS;
export const preflopTree={version:1,players:2,root:'BTN/SB',actions:['fold','jam'],response:['fold','call'],cardAbstraction:'NONE',chance:'ALL_C_48_5_RUNOUTS',conditioning:'AKo QQ A5s 76s; uniform physical combos before collision removal',utility:'NET_CHIPS_FROM_BEFORE_FORCED_POSTS'} as const;
export const PREFLOP_TREE_SHA=createHash('sha256').update(canonicalJson(preflopTree)).digest('hex');
export const preflopActions=[{id:'fold',type:'FOLD'},{id:'jam',type:'JAM'}] as const;
export function preflopContext(stack=15,ante=1){
  if(!(PREFLOP_STACKS as readonly number[]).includes(stack) || ![0,1].includes(ante))throw new Error('Unapproved preflop stack/ante.');
  const c=defaultTournamentContext(2,stack);c.hero='BTN';c.ante=ante?{type:'BBA',amountBb:ante}:{type:'NONE',amountBb:0};
  const combos=allCombos().filter(h=>['AKo','QQ','A5s','76s'].includes(getHandClass(h)));
  c.conditioning={version:1,type:'FIXED_RANGE_SUBGAME',meaning:'STUDY_INPUT_NOT_SOLVED_ANCESTRY',ranges:['BTN','BB'].map(position=>({position:position as 'BTN'|'BB',combos:combos.map(cards=>({cards:[...cards],weight:1/combos.length}))}))};
  return canonicalStrategyContext(c);
}
export const preflopInfo=(position:'BTN'|'BB',cards:readonly Card[])=>`${position}:${cards.join('')}`;
