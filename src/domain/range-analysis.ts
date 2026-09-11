import { allCombos, type Card, type Combo } from './cards';
import { handFeatures } from './analysis';
import { evaluateHoldem } from './holdem';
export interface RangeDensity { combos:number;topPair:number;overpair:number;set:number;strongDraw:number;air:number;currentNuts:number }
/** Current-street nuts = best made hand possible on this board, not river equity or solver strategy. */
export function rangeDensities(hero:{cards:Combo;reach:number}[],villain:{cards:Combo;reach:number}[],board:Card[]):{hero:RangeDensity;villain:RangeDensity;nutAdvantage:number}{
  if(board.length<3||board.length>5)throw new Error('Flop, Turn oder River erforderlich.');
  let nuts=-Infinity;for(const cards of allCombos(board))nuts=Math.max(nuts,evaluateHoldem([...cards,...board]).score);
  const density=(rows:{cards:Combo;reach:number}[])=>{
    const total=rows.reduce((n,c)=>n+c.reach,0);const result:RangeDensity={combos:total,topPair:0,overpair:0,set:0,strongDraw:0,air:0,currentNuts:0};
    if(!total)return result;
    for(const combo of rows){if(!combo.reach)continue;const f=handFeatures(combo.cards,board);const weight=combo.reach/total;if(f.topPair)result.topPair+=weight;if(f.overpair)result.overpair+=weight;if(f.set)result.set+=weight;if(f.flushDraw||f.straightDraw)result.strongDraw+=weight;if(f.air)result.air+=weight;if(evaluateHoldem([...combo.cards,...board]).score===nuts)result.currentNuts+=weight;}
    return result;
  };
  const h=density(hero),v=density(villain);return {hero:h,villain:v,nutAdvantage:h.currentNuts-v.currentNuts};
}
