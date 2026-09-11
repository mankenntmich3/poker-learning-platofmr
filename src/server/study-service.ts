import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { SIX_MAX_POSITIONS } from '@/domain/chips';
import { BB, parseStudy, serializeStudy, type StudySpot } from '@/domain/study';
import { boardTexture, createCombo } from '@/domain/cards';
import { handFeatures } from '@/domain/analysis';
import { equity } from '@/domain/equity';
import { rangeDensities } from '@/domain/range-analysis';
import { studyProvider, type StudyNode } from '@/strategy/study-provider';
import type { Database } from './db';
import { ApiError } from './errors';
import { body, route } from './http';
import { requireUser } from './service';
import { enforceRateLimit, readSessionToken } from './security';

const card=z.string().regex(/^[AKQJT2-9][shdc]$/);
const position=z.enum(SIX_MAX_POSITIONS);
const action=z.union([z.object({type:z.enum(['fold','check','call','all-in'])}).strict(),z.object({type:z.enum(['bet','raise']),toBb:z.number().finite()}).strict()]);
const event=z.discriminatedUnion('kind',[z.object({kind:z.literal('deal'),cards:z.array(card).min(1).max(3)}).strict(),z.object({kind:z.literal('action'),actor:position,action}).strict()]);
export const studySpotSchema=z.object({schema:z.literal(2),config:z.object({game:z.literal('NLHE'),format:z.literal('6max'),players:z.literal(6),stackBb:z.number(),hero:position,villain:position,opener:position,line:z.enum(['srp','3bet','4bet']),openBb:z.number(),threeBetBb:z.number(),fourBetBb:z.number()}).strict(),heroHand:z.tuple([card,card]),events:z.array(event).max(100)}).strict().transform(input=>{
  try{return parseStudy(JSON.stringify(input));}catch(error){throw new ApiError(400,error instanceof Error?error.message:'Ungültiger Pokerzustand.','INVALID_STUDY_STATE');}
});
const cache=new Map<string,Promise<StudyNode>>();
export function studyNode(spot:StudySpot):Promise<StudyNode>{const key=serializeStudy(spot);let node=cache.get(key);if(!node){if(cache.size>=12)cache.delete(cache.keys().next().value!);node=studyProvider.getNode(spot).catch(error=>{cache.delete(key);throw new ApiError(422,error instanceof Error?error.message:'No solution available for this node.','STRATEGY_UNAVAILABLE');});cache.set(key,node);}return node.then(n=>structuredClone(n));}
export const studyNodePost=route(async(request,db)=>{const user=await requireUser(db,readSessionToken(request));await enforceRateLimit(db,`study-node:${user.id}`,240,900);return studyNode(await body(request,studySpotSchema));},{mutation:true});
export const studyEquityPost=route(async(request,db)=>{
  const user=await requireUser(db,readSessionToken(request));await enforceRateLimit(db,`study-equity:${user.id}`,30,900);
  const input=await body(request,z.object({spot:studySpotSchema,mode:z.enum(['hand-range','range-range','hand-hand']),villainHand:z.tuple([card,card]).optional()}).strict());
  const node=await studyNode(input.spot);
  try{
    const hero=input.mode==='range-range'?node.hero.map(c=>({cards:c.cards,weight:c.reach})):[{cards:input.spot.heroHand,weight:1}];
    const villain=input.mode==='hand-hand'?[{cards:createCombo(...(input.villainHand??['Qh','Qd'])),weight:1}]:input.mode==='range-range'?node.villainUnblocked:node.villain.map(c=>({cards:c.cards,weight:c.reach}));
    return equity(hero,villain,node.state.board);
  }catch(error){throw new ApiError(400,error instanceof Error?error.message:'Equity nicht verfügbar.','EQUITY_UNAVAILABLE');}
},{mutation:true});
export const studyAnalysisPost=route(async(request,db)=>{const user=await requireUser(db,readSessionToken(request));await enforceRateLimit(db,`study-analysis:${user.id}`,30,900);const spot=await body(request,studySpotSchema);const node=await studyNode(spot);if(node.state.board.length<3)throw new ApiError(400,'Wähle zuerst einen vollständigen Flop.','BOARD_REQUIRED');return rangeDensities(node.hero,node.villain,node.state.board);},{mutation:true});
export async function saveStudySpot(db:Database,userId:string,spot:StudySpot,favorite:boolean){const node=await studyNode(spot);await db.query(`INSERT INTO study_saved_spots (user_id,node_id,spot,label,favorite) VALUES ($1,$2,$3::jsonb,$4,$5) ON CONFLICT (user_id,node_id) DO UPDATE SET last_seen=now(),favorite=study_saved_spots.favorite OR EXCLUDED.favorite`,[userId,node.id,serializeStudy(spot),`${spot.config.hero} vs ${spot.config.villain} · ${spot.config.stackBb} BB · ${node.state.street} · ${node.state.board.join(' ')}`,favorite]);return {id:node.id};}
export const studySavedGet=route(async(request,db)=>{const user=await requireUser(db,readSessionToken(request));return db.query('SELECT node_id AS id,spot,label,favorite,last_seen FROM study_saved_spots WHERE user_id=$1 ORDER BY favorite DESC,last_seen DESC LIMIT 50',[user.id]);});
export const studySavedPost=route(async(request,db)=>{const user=await requireUser(db,readSessionToken(request));const input=await body(request,z.object({spot:studySpotSchema,favorite:z.boolean()}).strict());await enforceRateLimit(db,`study-save:${user.id}`,120,900);return saveStudySpot(db,user.id,input.spot,input.favorite);},{mutation:true});
export const studySavedDelete=route(async(request,db)=>{const user=await requireUser(db,readSessionToken(request));const {id}=await body(request,z.object({id:z.string().regex(/^[a-f0-9]{64}$/)}).strict());await db.query('DELETE FROM study_saved_spots WHERE user_id=$1 AND node_id=$2',[user.id,id]);return {ok:true};},{mutation:true});
export async function recordStudyDecision(db:Database,userId:string,input:{spot:StudySpot;actionId:string;attemptId:string}){
  const node=await studyNode(input.spot);if(node.unavailable)throw new ApiError(422,node.unavailable,'STRATEGY_UNAVAILABLE');
  if(node.state.activePlayer!==input.spot.config.hero)throw new ApiError(400,'Der Trainer wartet auf eine Hero-Entscheidung.','WRONG_ACTOR');
  const combo=node.hero.find(c=>c.cards.join('')===createCombo(...input.spot.heroHand).join(''));
  if(!combo||!combo.reach)throw new ApiError(422,'Diese Hand erreicht den Node in der Lernrange nicht.','UNREACHABLE_HAND');
  const chosen=combo.actions.find(a=>a.action===input.actionId);if(!chosen)throw new ApiError(400,'Diese Action ist nicht in der aktuellen Strategie.','UNSUPPORTED_ACTION');
  const evs=combo.actions.map(a=>a.ev);const bestEv=evs.every(ev=>ev!==null)?Math.max(...evs as number[]):null;
  const feedback={actions:combo.actions,chosenAction:input.actionId,chosenFrequency:chosen.frequency,evLoss:chosen.ev!==null&&bestEv!==null?bestEv-chosen.ev:null,provenance:node.provenance,features:handFeatures(input.spot.heroHand,node.state.board),potBb:node.state.pot/BB};
  const rows=await db.query(`INSERT INTO study_engine_decisions (id,user_id,node_id,spot,chosen_action,feedback,street,position,hand_class,board_texture) VALUES ($1,$2,$3,$4::jsonb,$5,$6::jsonb,$7,$8,$9,$10::jsonb) ON CONFLICT (id) DO NOTHING RETURNING id`,[input.attemptId,userId,node.id,serializeStudy(input.spot),input.actionId,JSON.stringify(feedback),node.state.street,input.spot.config.hero,combo.handClass,JSON.stringify(boardTexture(node.state.board))]);
  if(!rows.length){const previous=await db.query<{node_id:string;chosen_action:string;feedback:typeof feedback}>('SELECT node_id,chosen_action,feedback FROM study_engine_decisions WHERE id=$1 AND user_id=$2',[input.attemptId,userId]);if(!previous[0]||previous[0].node_id!==node.id||previous[0].chosen_action!==input.actionId)throw new ApiError(409,'Diese Antwort wurde bereits anders gespeichert.','DECISION_CONFLICT');return previous[0].feedback;}
  return feedback;
}
export const studyDecisionPost=route(async(request,db)=>{const user=await requireUser(db,readSessionToken(request));await enforceRateLimit(db,`study-answer:${user.id}`,240,900);return recordStudyDecision(db,user.id,await body(request,z.object({spot:studySpotSchema,actionId:z.string().max(80),attemptId:z.string().uuid()}).strict()));},{mutation:true});
export const studyProgressGet=route(async(request,db)=>{const user=await requireUser(db,readSessionToken(request));return {total:await db.query('SELECT count(*)::int AS decisions FROM study_engine_decisions WHERE user_id=$1',[user.id]),recent:await db.query('SELECT id,spot,chosen_action,feedback,created_at FROM study_engine_decisions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20',[user.id]),byPosition:await db.query(`SELECT position,street,count(*)::int AS decisions,avg((feedback->>'chosenFrequency')::numeric) AS policy_frequency FROM study_engine_decisions WHERE user_id=$1 GROUP BY position,street`,[user.id])};});
export function newAttempt(){return randomUUID();}
