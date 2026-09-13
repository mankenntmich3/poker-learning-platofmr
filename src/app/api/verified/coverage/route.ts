import { route } from '@/server/http';
import { requireUser } from '@/server/service';
import { readSessionToken } from '@/server/security';
import { verifiedNode } from '@/server/verified-training';
import { VERIFIED_PREFLOP_STACKS } from '@/shared/verified-spot';

export const GET=route(async(request,db)=>{
  await requireUser(db,readSessionToken(request));
  const rows=[];
  // Small finite library: each call actually publishes/revalidates the exact
  // artifact. No display status is derived from a static VERIFIED label.
  for(const stack of VERIFIED_PREFLOP_STACKS)for(const ante of [0,1]){
    try{const a=await verifiedNode(db,{kind:'preflop',stack,ante});rows.push({stack,ante,players:2,hero:'BTN',scope:'CONDITIONAL_PUSH_FOLD',status:'VERIFIED',checksum:a.checksum});}
    catch{rows.push({stack,ante,players:2,hero:'BTN',scope:'CONDITIONAL_PUSH_FOLD',status:'FAILED',checksum:null});}
  }
  return {rows,fullPreflopNodes:0};
});
