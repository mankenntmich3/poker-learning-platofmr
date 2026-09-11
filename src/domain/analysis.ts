import { assertUniqueCards, boardTexture, createDeck, RANKS, type Card, type Combo, type Rank } from './cards';
import { evaluateHoldem } from './holdem';
export function handFeatures(hand: Combo, board: Card[]) {
  assertUniqueCards([...hand,...board]);
  if(board.length<3||board.length>5)throw new Error('Vollständigen Flop wählen.');
  const value=evaluateHoldem([...hand,...board]);
  const ranks=(cards:readonly Card[])=>cards.map(c=>14-RANKS.indexOf(c[0] as Rank));
  const all=[...hand,...board], counts=['s','h','d','c'].map(s=>({s,count:all.filter(c=>c[1]===s).length,held:hand.some(c=>c[1]===s)}));
  const flushDraw=board.length<5&&counts.some(c=>c.count===4&&c.held);
  const backdoorFlush=board.length===3&&counts.some(c=>c.count===3&&c.held);
  const straightHigh=(cards:Card[])=>{const set=new Set(ranks(cards));if(set.has(14))set.add(1);return [14,13,12,11,10,9,8,7,6,5].find(h=>[0,1,2,3,4].every(n=>set.has(h-n)))??0;};
  const straightOutRanks=board.length<5&&!straightHigh(all)?RANKS.filter(r=>straightHigh([...all,`${r}s` as Card])>0):[];
  const distinct=new Set(ranks(all));if(distinct.has(14))distinct.add(1);
  const backdoorStraight=board.length===3&&straightOutRanks.length===0&&!straightHigh(all)&&[1,2,3,4,5,6,7,8,9,10].some(low=>[0,1,2,3,4].filter(n=>distinct.has(low+n)).length===3&&ranks(hand).some(r=>r>=low&&r<=low+4));
  const top=Math.max(...ranks(board));
  const topPair=value.category===1&&ranks(hand).includes(top)&&new Set(ranks(board)).size===board.length;
  const overpair=value.category===1&&hand[0][0]===hand[1][0]&&ranks(hand)[0]>top;
  const set=value.category===3&&hand[0][0]===hand[1][0]&&board.some(c=>c[0]===hand[0][0]);
  return {category:value.name,categoryRank:value.category,topPair,overpair,set,flushDraw,backdoorFlush,straightDraw:straightOutRanks.length>0,straightOutRanks,backdoorStraight,
    air:value.category===0&&!flushDraw&&straightOutRanks.length===0, blockers:hand.map(c=>`${c} blockiert alle gegnerischen Kombinationen mit dieser Karte.`), texture:boardTexture(board)};
}
export function randomCards(count:number,blocked:readonly Card[],random= Math.random):Card[]{assertUniqueCards(blocked);const pool=createDeck().filter(c=>!blocked.includes(c));if(count>pool.length)throw new Error('Nicht genug freie Karten.');const result:Card[]=[];while(result.length<count){const index=Math.floor(random()*pool.length);result.push(pool.splice(index,1)[0]);}return result;}
export function randomFlop(filter:string,blocked:readonly Card[],random=Math.random):Card[]{for(let n=0;n<10000;n++){const cards=randomCards(3,blocked,random);if(filter==='random'||boardTexture(cards).includes(filter))return cards;}throw new Error('Kein passender Flop gefunden. Ändere Filter oder Hand.');}
