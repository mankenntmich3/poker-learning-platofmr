import { randomInt,randomUUID } from 'node:crypto';
import { z } from 'zod';
import { readFile } from 'node:fs/promises';
import { preflopContext,PREFLOP_TREE_SHA } from '@/domain/preflop-definition';
import { parseVerifiedSpot,type VerifiedSpotSelection } from '@/shared/verified-spot';
import packagedArtifact from '../../data/solutions/river-lp.json';
import { riverContext,RIVER_TREE_SHA } from '@/domain/river-definition';
import { createCombo } from '@/domain/cards';
import { VerifiedStrategyProvider } from '@/strategy/verified-provider';
import { replayPublicHistory } from '@/domain/tournament-state';
import { applyPublicAction } from '@/domain/tournament-state';
import type { VerifiedFeedback,VerifiedMastery,VerifiedProgress,VerifiedQuestion,VerifiedMode,VerifiedSelection } from '@/shared/verified-training';
import type { ComboSolution } from '@/solver/verified-solution';
import type { Database,SqlRow } from './db';
import { publishVerifiedSolution } from './solution-registry';
import { verifyForPublication } from './verify-solution';
import { requireUser } from './service';
import { readSessionToken,enforceRateLimit } from './security';
import { route,body } from './http';
import { ApiError } from './errors';

const initialized=new WeakMap<Database,Map<string,Promise<void>>>();
const riverSelection:VerifiedSpotSelection={kind:'river'};
export async function verifiedNode(db:Database,spot:VerifiedSpotSelection=riverSelection){
  const context=spot.kind==='river'?riverContext():preflopContext(spot.stack,spot.ante);
  const key=spot.kind==='river'?'river':`preflop-${spot.stack}-${spot.ante}`;
  let entries=initialized.get(db);if(!entries){entries=new Map();initialized.set(db,entries);}
  let ready=entries.get(key);
  if(!ready){
    const tracked=entries;
    ready=(async()=>{const artifact=spot.kind==='river'?packagedArtifact:JSON.parse(await readFile(`data/solutions/${key}.json`,'utf8'));
      const r=await publishVerifiedSolution(db,artifact);if(r.status!=='VERIFIED')throw new ApiError(409,'Verified solution unavailable.','UNAVAILABLE');
    })().catch(e=>{tracked.delete(key);throw e;});entries.set(key,ready);
  }
  await ready;
  return new VerifiedStrategyProvider(db).getNode({context,treeSha256:spot.kind==='river'?RIVER_TREE_SHA:PREFLOP_TREE_SHA});
}
function requestSpot(request:Request){try{return parseVerifiedSpot(new URL(request.url).searchParams);}catch{throw new ApiError(404,'Verified solution unavailable.','UNAVAILABLE');}}
interface QuestionRow extends SqlRow {id:string;combo:string;mode:VerifiedMode;artifact_checksum:string;feedback:VerifiedFeedback|null;submitted?:{action?:string};answered_at:string|Date|null}
function publicQuestion(q:QuestionRow):VerifiedQuestion {return {id:q.id,combo:[...createCombo(q.combo.slice(0,2),q.combo.slice(2))],mode:q.mode,feedback:q.feedback,...(q.submitted?.action?{action:q.submitted.action}:{})};}
export function gradeVerified(row:ComboSolution,input:{action?:string;frequencies?:Record<string,number>}):VerifiedFeedback {
  if(input.frequencies){
    if(Object.keys(input.frequencies).length!==row.actions.length || row.actions.some(a=>!Object.hasOwn(input.frequencies!,a.actionId)) || Object.values(input.frequencies).some(v=>!Number.isFinite(v)||v<0||v>100) || Math.abs(Object.values(input.frequencies).reduce((s,x)=>s+x,0)-100)>1e-8)throw new ApiError(400,'Frequenzen müssen zusammen 100 % ergeben.','INVALID_FREQUENCIES');
    const distance=row.actions.reduce((sum,a)=>sum+Math.abs(input.frequencies![a.actionId]/100-a.frequency),0)/2;
    return {category:'Frequency Recall',score:Math.max(0,100*(1-distance)),evLossBb:null,chosenFrequency:null,actions:row.actions};
  }
  const action=row.actions.find(a=>a.actionId===input.action);
  if(!action || action.evBb===undefined)throw new ApiError(400,'Aktion ist in diesem gelösten Spielbaum nicht verfügbar.','INVALID_ACTION');
  const loss=Math.max(0,Math.max(...row.actions.map(a=>a.evBb!))-action.evBb);
  const f=action.frequency,category=f<=1e-7?'Zero-Frequency Error':f<.05?'Low-Frequency Action':f>=.95?'Dominant Action':'Valid Mixed Action';
  return {category,score:Math.max(0,100*(1-loss/.25))*(f<=1e-7?.5:1),evLossBb:loss,chosenFrequency:f,actions:row.actions};
}
export async function verifiedProgress(db:Database,userId:string,now=new Date(),spot:VerifiedSpotSelection=riverSelection):Promise<VerifiedProgress>{
  const a=await verifiedNode(db,spot);
  const rows=await db.query<QuestionRow>('SELECT id,combo,mode,artifact_checksum,feedback,answered_at FROM verified_training_questions WHERE user_id=$1 AND artifact_checksum=$2 AND answered_at IS NOT NULL ORDER BY answered_at,id',[userId,a.checksum]);
  const groups=new Map<string,VerifiedMastery & {streak:number}>();
  for(const r of rows){const key=r.combo+':'+r.mode,old=groups.get(key),score=r.feedback!.score,streak=score>=85?(old?.streak??0)+1:0;
    const delay=streak?[1,3,7,14,30][Math.min(streak-1,4)]*86400000:600000;
    groups.set(key,{combo:r.combo,mode:r.mode,attempts:(old?.attempts??0)+1,mastery:old?.attempts?old.mastery*.65+score*.35:score,lastScore:score,streak,dueAt:new Date(new Date(r.answered_at!).getTime()+delay).toISOString()});}
  const items=[...groups.values()].map(({streak,...item})=>{void streak;return item;});
  return {decisions:rows.length,mastery:items.length?items.reduce((s,i)=>s+i.mastery,0)/items.length:null,due:items.filter(i=>new Date(i.dueAt)<=now).length,items,recent:rows.slice(-10).reverse().map(r=>({id:r.id,combo:r.combo,mode:r.mode,feedback:r.feedback!,answeredAt:new Date(r.answered_at!).toISOString()}))};
}
export async function startVerifiedQuestion(db:Database,userId:string,mode:VerifiedMode,selection:VerifiedSelection,spot:VerifiedSpotSelection=riverSelection):Promise<VerifiedQuestion>{
  const [a,progress]=await Promise.all([verifiedNode(db,spot),verifiedProgress(db,userId,new Date(),spot)]);
  let rows=a.strategies.filter(r=>r.reach>0);
  const mastery=(r:ComboSolution)=>progress.items.find(i=>i.combo===r.combo.join('') && i.mode===mode);
  if(selection==='mixed')rows=rows.filter(r=>r.actions.filter(x=>x.frequency>.01).length>1);
  if(selection==='weaknesses')rows=rows.filter(r=>mastery(r)! && mastery(r)!.mastery<80);
  if(selection==='due')rows=rows.filter(r=>!mastery(r) || new Date(mastery(r)!.dueAt)<=new Date());
  if(!rows.length)throw new ApiError(409,'Für diese Auswahl ist aktuell keine passende Hand fällig. Wähle die gesamte Range.','NO_REVIEW_DUE');
  const weights=rows.map(r=>selection==='smart'?r.reach*(1+(100-(mastery(r)?.mastery??0))/25+(!mastery(r)||new Date(mastery(r)!.dueAt)<=new Date()?3:0)):r.reach);
  let sample=randomInt(1_000_000)/1_000_000*weights.reduce((s,w)=>s+w,0),chosen=rows.at(-1)!;
  for(let i=0;i<rows.length;i++){sample-=weights[i];if(sample<0){chosen=rows[i];break;}}
  const id=randomUUID();
  await db.query('INSERT INTO verified_training_questions (id,user_id,artifact_id,artifact_checksum,combo,mode) VALUES ($1,$2,$3,$4,$5,$6)',[id,userId,a.id,a.checksum,chosen.combo.join(''),mode]);
  return {id,combo:[...createCombo(...chosen.combo)],mode,feedback:null};
}
export async function answerVerifiedQuestion(db:Database,userId:string,input:{id:string;action?:string;frequencies?:Record<string,number>},spot:VerifiedSpotSelection=riverSelection):Promise<VerifiedQuestion>{
  const rows=await db.query<QuestionRow>('SELECT * FROM verified_training_questions WHERE id=$1 AND user_id=$2',[input.id,userId]),q=rows[0];
  if(!q)throw new ApiError(404,'Trainingshand nicht gefunden.','NOT_FOUND');
  const a=await verifiedNode(db,spot);
  if(q.artifact_checksum!==a.checksum)throw new ApiError(409,'Solution-Version geändert. Bitte neue Hand starten.','VERSION_CHANGED');
  if(q.feedback)return publicQuestion(q);
  if((q.mode==='recall')!==Boolean(input.frequencies) || (q.mode==='action')!==Boolean(input.action))throw new ApiError(400,'Antwort passt nicht zum Trainingsmodus.','INVALID_MODE');
  const row=a.strategies.find(r=>r.combo.join('')===q.combo && r.reach>0);
  if(!row)throw new ApiError(409,'Diese Combo ist nicht gelöst.','UNAVAILABLE');
  const feedback=gradeVerified(row,input);
  const saved=await db.query<QuestionRow>('UPDATE verified_training_questions SET feedback=$3::jsonb,submitted=$4::jsonb,answered_at=now() WHERE id=$1 AND user_id=$2 AND answered_at IS NULL RETURNING *',[q.id,userId,JSON.stringify(feedback),JSON.stringify(input)]);
  return publicQuestion(saved[0]??(await db.query<QuestionRow>('SELECT * FROM verified_training_questions WHERE id=$1 AND user_id=$2',[q.id,userId]))[0]);
}
export const verifiedStudyGet=route(async(request,db)=>{
  const user=await requireUser(db,readSessionToken(request)),spot=requestSpot(request);
  const [a,progress]=await Promise.all([verifiedNode(db,spot),verifiedProgress(db,user.id,new Date(),spot)]);
  let state=replayPublicHistory(a.context);
  const latest=await db.query<QuestionRow>('SELECT * FROM verified_training_questions WHERE user_id=$1 AND artifact_checksum=$2 ORDER BY created_at DESC LIMIT 1',[user.id,a.checksum]);
  const question=latest[0]?publicQuestion(latest[0]):null;
  if(question?.action && question.feedback){const action=a.actions.find(x=>x.id===question.action);if(action)state=applyPublicAction(state,action.type==='RAISE'?{actor:a.context.hero,type:'RAISE',toBb:action.toBb}:{actor:a.context.hero,type:action.type});}
  return {artifact:a,verification:verifyForPublication(a),state,progress,question};
});
export const verifiedTrainingPost=route(async(request,db)=>{
  const user=await requireUser(db,readSessionToken(request)),spot=requestSpot(request);await enforceRateLimit(db,`verified-training:${user.id}`,240,900);
  const input=await body(request,z.discriminatedUnion('operation',[
    z.object({operation:z.literal('start'),mode:z.enum(['action','recall']),selection:z.enum(['range','smart','due','weaknesses','mixed'])}).strict(),
    z.object({operation:z.literal('answer'),id:z.string().uuid(),action:z.string().max(32).optional(),frequencies:z.record(z.string().max(32),z.number().finite().min(0).max(100)).optional()}).strict(),
  ]));
  const question=input.operation==='start'?await startVerifiedQuestion(db,user.id,input.mode,input.selection,spot):await answerVerifiedQuestion(db,user.id,input,spot);
  const a=await verifiedNode(db,spot);let state=replayPublicHistory(a.context);
  if(question.action && question.feedback){const action=a.actions.find(x=>x.id===question.action);if(action)state=applyPublicAction(state,action.type==='RAISE'?{actor:a.context.hero,type:'RAISE',toBb:action.toBb}:{actor:a.context.hero,type:action.type});}
  return {question,progress:await verifiedProgress(db,user.id,new Date(),spot),state};
},{mutation:true});
