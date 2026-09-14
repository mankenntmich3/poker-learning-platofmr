export const VERIFIED_PREFLOP_STACKS=[10,15,20,25,30,40,50,80,100] as const;
export type VerifiedSpotSelection={kind:'river'}|{kind:'preflop';stack:number;ante:number};
export function parseVerifiedSpot(params:URLSearchParams):VerifiedSpotSelection {
  const keys=[...params.keys()];
  if(keys.some(k=>!['kind','stack','ante'].includes(k)||params.getAll(k).length!==1||params.get(k)===''))throw new Error('Verified solution unavailable.');
  if(!params.has('kind')||params.get('kind')==='river'){
    if(params.has('stack')||params.has('ante'))throw new Error('Verified solution unavailable.');
    return {kind:'river'};
  }
  if(params.get('kind')!=='preflop')throw new Error('Verified solution unavailable.');
  const stack=Number(params.get('stack')??15),ante=Number(params.get('ante')??1);
  if(!(VERIFIED_PREFLOP_STACKS as readonly number[]).includes(stack)||![0,1].includes(ante))throw new Error('Verified solution unavailable.');
  return {kind:'preflop',stack,ante};
}
export function verifiedSpotSearch(s:VerifiedSpotSelection){return s.kind==='river'?'':`?kind=preflop&stack=${s.stack}&ante=${s.ante}`;}
