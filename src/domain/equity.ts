import { assertUniqueCards, createDeck, RANKS, type Card, type Combo, type Rank } from './cards';

/** Exact seven-card rank ordering; no enumeration of 21 five-card subsets needed. */
export function showdownScore(cards: readonly Card[]): number {
  if (cards.length !== 7) throw new Error('Showdown requires seven cards');
  const counts = Array<number>(15).fill(0), suits: Record<string, number[]> = {s:[],h:[],d:[],c:[]};
  for (const c of cards) { const rank = 14 - RANKS.indexOf(c[0] as Rank); counts[rank]++; suits[c[1]].push(rank); }
  const ranks = Array.from({length:13},(_,i)=>14-i).filter(r=>counts[r]);
  const straight = (values: number[]) => { const set = new Set(values); if(set.has(14))set.add(1); for(let high=14;high>=5;high--) if([0,1,2,3,4].every(n=>set.has(high-n)))return high; return 0; };
  const score = (category: number, kickers: number[]) => { let value=category;for(let i=0;i<5;i++)value=value*15+(kickers[i]??0);return value; };
  const flush = Object.values(suits).find(s=>s.length>=5)?.sort((a,b)=>b-a);
  if(flush && straight(flush))return score(8,[straight(flush)]);
  const quads=ranks.find(r=>counts[r]===4);if(quads)return score(7,[quads,ranks.find(r=>r!==quads)!]);
  const trips=ranks.filter(r=>counts[r]>=3), pairs=ranks.filter(r=>counts[r]>=2);
  if(trips.length && pairs.some(r=>r!==trips[0]))return score(6,[trips[0],pairs.find(r=>r!==trips[0])!]);
  if(flush)return score(5,flush.slice(0,5));
  const run=straight(ranks);if(run)return score(4,[run]);
  if(trips.length)return score(3,[trips[0],...ranks.filter(r=>r!==trips[0]).slice(0,2)]);
  if(pairs.length>=2)return score(2,[...pairs.slice(0,2),ranks.find(r=>!pairs.slice(0,2).includes(r))!]);
  if(pairs.length)return score(1,[pairs[0],...ranks.filter(r=>r!==pairs[0]).slice(0,3)]);
  return score(0,ranks.slice(0,5));
}
export interface WeightedCombo { cards: Combo; weight: number }
export interface EquityResult { hero: number; villain: number; tie: number; samples: number; method: 'exact'|'monte-carlo'; standardError: number; seed: number }
export function equity(hero: WeightedCombo[], villain: WeightedCombo[], board: Card[], samples=5000, seed=20260910): EquityResult {
  assertUniqueCards(board);if(board.length<3||board.length>5)throw new Error('Equity benötigt Flop, Turn oder River.');
  if(!Number.isInteger(samples)||samples<100||samples>20000)throw new Error('Equity sample limit: 100–20000');
  const filter = (range: WeightedCombo[]) => range.filter(c=> {assertUniqueCards(c.cards);if(c.cards.length!==2||!Number.isFinite(c.weight)||c.weight<0||c.weight>1)throw new Error('Invalid range weight');return c.weight>0&&!c.cards.some(card=>board.includes(card));});
  const h=filter(hero),v=filter(villain);if(!h.length||!v.length)throw new Error('Keine unblocked Range-Combos verfügbar.');
  let wins=0,ties=0,total=0,sumSquares=0;
  const compare=(a:Combo,b:Combo,runout:Card[])=>{const x=showdownScore([...a,...runout]),y=showdownScore([...b,...runout]);const result=x>y?1:x===y?0.5:0;wins+=result;ties+=x===y?1:0;sumSquares+=result*result;total++;};
  if(h.length===1&&v.length===1){
    assertUniqueCards([...h[0].cards,...v[0].cards,...board]);
    const deck=createDeck().filter(c=>![...h[0].cards,...v[0].cards,...board].includes(c));
    if(board.length===5)compare(h[0].cards,v[0].cards,board);
    else for(let i=0;i<deck.length;i++)if(board.length===4)compare(h[0].cards,v[0].cards,[...board,deck[i]]);else for(let j=i+1;j<deck.length;j++)compare(h[0].cards,v[0].cards,[...board,deck[i],deck[j]]);
    return {hero:wins/total,villain:1-wins/total,tie:ties/total,samples:total,method:'exact',standardError:0,seed};
  }
  let rng=seed>>>0;const random=()=>{rng+=0x6D2B79F5;let t=rng;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
  const sampler=(range:WeightedCombo[])=>{let total=0;const cumulative=range.map(c=>total+=c.weight);return()=>{const x=random()*total;let lo=0,hi=cumulative.length-1;while(lo<hi){const mid=(lo+hi)>>>1;if(cumulative[mid]>x)hi=mid;else lo=mid+1;}return range[lo].cards;};};
  const hs=sampler(h),vs=sampler(v),deck=createDeck();
  for(let attempts=0;total<samples&&attempts<samples*100;attempts++){
    const a=hs(),b=vs();if(a.some(c=>b.includes(c)))continue;
    const available=deck.filter(c=>![...a,...b,...board].includes(c));const runout=[...board];
    while(runout.length<5){const i=Math.floor(random()*available.length);runout.push(available[i]);available[i]=available.at(-1)!;available.pop();}
    compare(a,b,runout);
  }
  if(total<samples)throw new Error('Ranges überschneiden sich zu stark für die Equity-Berechnung.');
  const mean=wins/total;
  return {hero:mean,villain:1-mean,tie:ties/total,samples:total,method:'monte-carlo',standardError:Math.sqrt(Math.max(0,sumSquares/total-mean*mean)/(total-1)),seed};
}
