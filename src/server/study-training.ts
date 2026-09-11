import { randomInt,randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createCombo,boardTexture,type Card } from '@/domain/cards';
import { handFeatures,randomCards,randomFlop } from '@/domain/analysis';
import { BB,replayStudy,serializeStudy,type StudySpot,type LegalAction } from '@/domain/study';
import type { SolutionInfo,StudyFrequency } from '@/strategy/study-provider';
import { studyNode,studySpotSchema } from './study-service';
import { ApiError } from './errors';
import type { Database } from './db';
import { body,route } from './http';
import { requireUser } from './service';
import { readSessionToken,enforceRateLimit } from './security';
export const trainingOptions=z.object({mode:z.enum(['spot','street','full-hand']),boardFilter:z.enum(['fixed','random','ace-high','king-high','paired','monotone','two-tone','connected','low']),limit:z.union([z.literal(10),z.literal(25),z.literal(50),z.literal(100)])}).strict();
type Options=z.infer<typeof trainingOptions>;
type TrainingSession = {id:string;root_spot:StudySpot;options:Options;completed_at:string|null};
interface Snapshot {nodeId:string;actions:LegalAction[];strategy:StudyFrequency[];provenance:SolutionInfo;features:ReturnType<typeof handFeatures>;potBb:number;handClass:string}
type Question = {id:string;ordinal:number;spot:StudySpot;snapshot:Snapshot;feedback:Record<string,unknown>|null};
const random=()=>randomInt(1_000_000_000)/1_000_000_000;
function weighted<T>(rows:T[],weight:(row:T)=>number):T {const total=rows.reduce((n,c)=>n+weight(c),0);if(!total)throw new ApiError(422,'Die ausgewählte Lernrange ist leer. Wähle einen anderen Spot.','EMPTY_TRAINING_RANGE');let cursor=random()*total;for(const c of rows){cursor-=weight(c);if(cursor<0)return c;}return rows.at(-1)!;}
async function owned(db:Database,userId:string,id:string){const rows=await db.query<TrainingSession>('SELECT id,root_spot,options,completed_at FROM study_engine_sessions WHERE id=$1 AND user_id=$2',[id,userId]);if(!rows[0])throw new ApiError(404,'Trainingssitzung nicht gefunden.','SESSION_NOT_FOUND');return rows[0];}
async function questions(db:Database,id:string){return db.query<Question>('SELECT q.id,q.ordinal,q.spot,q.snapshot,d.feedback FROM study_engine_questions q LEFT JOIN study_engine_decisions d ON d.id=q.id WHERE session_id=$1 ORDER BY ordinal',[id]);}
async function toHero(spot:StudySpot):Promise<StudySpot>{
  for(let steps=0;steps<20;steps++){
    const state=replayStudy(spot);if(state.complete)return spot;
    if(state.awaitingBoard){const cards=randomCards(state.street==='preflop'?3:1,[...state.board,...spot.heroHand],random);spot={...spot,events:[...spot.events,{kind:'deal',cards}]};continue;}
    if(state.activePlayer===spot.config.hero)return spot;
    const node=await studyNode(spot);const available=node.legalActions;
    // Opponent is sampled from its reached, blocker-filtered policy; never from Hero's hand.
    const row=weighted(node.villain,c=>c.reach),strategy=weighted(row.actions,a=>a.frequency),action=available.find(a=>a.id===strategy.action)!;
    spot={...spot,events:[...spot.events,{kind:'action',actor:state.activePlayer!,action:action.action}]};
  }
  throw new ApiError(422,'Keine weitere Hero-Entscheidung in dieser Hand.','NO_HERO_DECISION');
}
async function freshQuestion(root:StudySpot,options:Options):Promise<StudySpot>{
  let spot=structuredClone(root);
  if(options.boardFilter!=='fixed'){
    const board=randomFlop(options.boardFilter,spot.heroHand,random);
    const events=spot.events.map(e=>e.kind==='deal'?{...e,cards:[] as Card[]}:e);
    let used=[...spot.heroHand,...board],first=true;
    for(const e of events)if(e.kind==='deal'){e.cards=first?board:randomCards(1,used,random);first=false;used=[...used,...(e.cards===board?[]:e.cards)];}
    spot={...spot,events};
  }
  const node=await studyNode(spot);if(node.unavailable)throw new ApiError(422,node.unavailable,'STRATEGY_UNAVAILABLE');
  const chosen=weighted(node.hero,c=>c.reach);spot={...spot,heroHand:chosen.cards};
  return spot;
}
async function ensureQuestion(db:Database,session:TrainingSession){
  const previous=await questions(db,session.id);if(session.completed_at||previous.length>=session.options.limit||previous.at(-1)&&!previous.at(-1)!.feedback)return;
  let spot:StudySpot|undefined;
  if(session.options.mode==='full-hand'&&previous.length){const last=previous.at(-1)!;const chosen=last.snapshot.actions.find(a=>a.id===last.feedback?.chosenAction);if(chosen){const state=replayStudy(last.spot);const next=await toHero({...last.spot,events:[...last.spot.events,{kind:'action',actor:state.activePlayer!,action:chosen.action}]});if(!replayStudy(next).complete)spot=next;}}
  if(!spot)spot=await freshQuestion(session.root_spot,session.options);
  const state=replayStudy(spot);if(state.activePlayer!==spot.config.hero)throw new ApiError(422,'Wähle im Explorer einen Node, an dem Hero am Zug ist.','HERO_NODE_REQUIRED');
  const node=await studyNode(spot),combo=node.hero.find(c=>c.cards.join('')===createCombo(...spot.heroHand).join(''))!;
  const snapshot:Snapshot={nodeId:node.id,actions:node.legalActions,strategy:combo.actions,provenance:node.provenance,features:handFeatures(spot.heroHand,state.board),potBb:state.pot/BB,handClass:combo.handClass};
  await db.query('INSERT INTO study_engine_questions (id,session_id,ordinal,spot,snapshot) SELECT $1,id,$3,$4::jsonb,$5::jsonb FROM study_engine_sessions WHERE id=$2 AND completed_at IS NULL ON CONFLICT (session_id,ordinal) DO NOTHING',[randomUUID(),session.id,previous.length+1,serializeStudy(spot),JSON.stringify(snapshot)]);
}
export async function getStudyTraining(db:Database,userId:string,id:string){const session=await owned(db,userId,id);const all=await questions(db,id),question=all.at(-1);return {id,options:session.options,complete:!!session.completed_at,answered:all.filter(q=>q.feedback).length,question:question?{id:question.id,ordinal:question.ordinal,spot:question.spot,actions:question.snapshot.actions,provenance:question.snapshot.provenance,feedback:question.feedback}:null};}
export async function startStudyTraining(db:Database,userId:string,input:{spot:StudySpot;options:Options;clientId:string}){
  const state=replayStudy(input.spot);if(state.activePlayer!==input.spot.config.hero||state.board.length<3)throw new ApiError(400,'Starte das Training an einer Postflop-Hero-Entscheidung.','HERO_NODE_REQUIRED');
  const id=randomUUID();await db.query('INSERT INTO study_engine_sessions (id,user_id,client_id,root_spot,options) VALUES ($1,$2,$3,$4::jsonb,$5::jsonb) ON CONFLICT (user_id,client_id) DO NOTHING',[id,userId,input.clientId,serializeStudy(input.spot),JSON.stringify(input.options)]);
  const rows=await db.query<{id:string;root_spot:StudySpot;options:Options}>('SELECT id,root_spot,options FROM study_engine_sessions WHERE user_id=$1 AND client_id=$2',[userId,input.clientId]);
  if(serializeStudy(rows[0].root_spot)!==serializeStudy(input.spot)||rows[0].options.mode!==input.options.mode||rows[0].options.limit!==input.options.limit||rows[0].options.boardFilter!==input.options.boardFilter)throw new ApiError(409,'Diese Start-ID gehört zu einem anderen Training.','START_CONFLICT');
  const session=await owned(db,userId,rows[0].id);await ensureQuestion(db,session);return getStudyTraining(db,userId,session.id);
}
export async function answerStudyTraining(db:Database,userId:string,id:string,questionId:string,actionId:string){
  const session=await owned(db,userId,id),all=await questions(db,id),q=all.at(-1);if(!q||q.id!==questionId)throw new ApiError(409,'Die Frage ist nicht mehr aktuell.','QUESTION_CHANGED');
  if(q.feedback){if(q.feedback.chosenAction!==actionId)throw new ApiError(409,'Diese Frage ist bereits beantwortet.','ANSWER_CONFLICT');return getStudyTraining(db,userId,id);}
  if(session.completed_at)throw new ApiError(409,'Training bereits abgeschlossen.','SESSION_COMPLETE');
  const chosen=q.snapshot.strategy.find(a=>a.action===actionId);if(!chosen)throw new ApiError(400,'Ungültige Aktion.','INVALID_ACTION');
  const best=q.snapshot.strategy.every(a=>a.ev!==null)?Math.max(...q.snapshot.strategy.map(a=>a.ev!)):null;
  const feedback={actions:q.snapshot.strategy,chosenAction:actionId,chosenFrequency:chosen.frequency,evLoss:best!==null&&chosen.ev!==null?best-chosen.ev:null,provenance:q.snapshot.provenance,features:q.snapshot.features,potBb:q.snapshot.potBb};
  await db.query(`INSERT INTO study_engine_decisions (id,user_id,node_id,spot,chosen_action,feedback,street,position,hand_class,board_texture) SELECT $1,user_id,$3,$4::jsonb,$5,$6::jsonb,$7,$8,$9,$10::jsonb FROM study_engine_sessions WHERE id=$2 AND completed_at IS NULL ON CONFLICT (id) DO NOTHING`,[q.id,id,q.snapshot.nodeId,serializeStudy(q.spot),actionId,JSON.stringify(feedback),replayStudy(q.spot).street,q.spot.config.hero,q.snapshot.handClass,JSON.stringify(boardTexture(replayStudy(q.spot).board))]);
  const stored=await getStudyTraining(db,userId,id);if(stored.question?.feedback?.chosenAction!==actionId)throw new ApiError(409,'Die Frage wurde gleichzeitig anders beantwortet.','ANSWER_CONFLICT');return stored;
}
export async function advanceStudyTraining(db:Database,userId:string,id:string,finish:boolean){const session=await owned(db,userId,id),all=await questions(db,id);if(!finish&&!all.at(-1)?.feedback)throw new ApiError(409,'Beantworte zuerst die aktuelle Frage.','ANSWER_REQUIRED');if(finish||all.length>=session.options.limit)await db.query('UPDATE study_engine_sessions SET completed_at=coalesce(completed_at,now()) WHERE id=$1 AND user_id=$2',[id,userId]);else await ensureQuestion(db,session);return getStudyTraining(db,userId,id);}
export const studyTrainingGet=route(async(request,db)=>getStudyTraining(db,(await requireUser(db,readSessionToken(request))).id,z.string().uuid().parse(new URL(request.url).searchParams.get('id'))));
export const studyTrainingPost=route(async(request,db)=>{const user=await requireUser(db,readSessionToken(request));await enforceRateLimit(db,`study-training:${user.id}`,240,900);const input=await body(request,z.discriminatedUnion('command',[z.object({command:z.literal('start'),spot:studySpotSchema,options:trainingOptions,clientId:z.string().uuid()}).strict(),z.object({command:z.literal('answer'),id:z.string().uuid(),questionId:z.string().uuid(),actionId:z.string().max(80)}).strict(),z.object({command:z.enum(['next','finish']),id:z.string().uuid()}).strict()]));if(input.command==='start')return startStudyTraining(db,user.id,input);if(input.command==='answer')return answerStudyTraining(db,user.id,input.id,input.questionId,input.actionId);return advanceStudyTraining(db,user.id,input.id,input.command==='finish');},{mutation:true});
