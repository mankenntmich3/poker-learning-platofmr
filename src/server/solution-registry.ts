import { createHash, randomUUID } from 'node:crypto';
import type { Database, SqlRow } from './db';
import { effectiveStackBb, positionsFor, type StrategyContext } from '@/domain/strategy-context';
import { validateVerifiedSolution, type QualityLabel, type VerifiedSolutionArtifact } from '@/solver/verified-solution';

export interface SolutionCoverageRow extends SqlRow { players:number; stackBb:number; anteType:string; heroPosition:string; verified:number; pending:number; failed:number }
export interface SolverJobInput { context:StrategyContext; bettingTreeId:string; priority:1|2|3 }

function canonical(value:unknown):string{
  if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
  if(value&&typeof value==='object')return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>`${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  return JSON.stringify(value);
}

export function exactContextKey(context:StrategyContext,bettingTreeId:string):string{
  return createHash('sha256').update(canonical({context,bettingTreeId})).digest('hex');
}

export async function queueSolverJob(db:Database,input:SolverJobInput):Promise<string>{
  const id=randomUUID(),contextKey=exactContextKey(input.context,input.bettingTreeId);
  await db.query(`INSERT INTO solver_jobs (id,context_key,config,priority,status) VALUES ($1,$2,$3::jsonb,$4,'QUEUED')`,[id,contextKey,JSON.stringify(input),input.priority]);
  return id;
}

export async function publishVerifiedSolution(db:Database,artifact:VerifiedSolutionArtifact):Promise<{status:'VERIFIED'|'FAILED_VALIDATION';quality:QualityLabel|null;errors:string[]}>{
  const validation=validateVerifiedSolution(artifact),contextKey=exactContextKey(artifact.context,artifact.bettingTree.id);
  if(validation.status==='FAILED_VALIDATION'){
    await db.query(`INSERT INTO solver_jobs (id,context_key,config,priority,status,error,completed_at) VALUES ($1,$2,$3::jsonb,1,'FAILED_VALIDATION',$4,now())`,[randomUUID(),contextKey,JSON.stringify({artifactId:artifact.id}),validation.errors.join(' | ')]);
    return validation;
  }
  const positions=positionsFor(artifact.context.players),active=positions.filter(position=>!artifact.context.actionHistory.some(action=>action.actor===position&&action.type==='FOLD'));
  const stack=effectiveStackBb(artifact.context.stacks,active),published={...artifact,status:'VERIFIED' as const};
  await db.query(`INSERT INTO verified_solution_artifacts (id,context_key,game,game_type,evaluation_model,players,stack_bb,ante_type,hero_position,action_history,board,betting_tree_id,source_type,status,quality_label,convergence_metric,convergence_value,convergence_threshold,exploitability_bb_per_hand,checksum,artifact,generated_at,published_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12,$13,'VERIFIED',$14,$15,$16,$17,$18,$19,$20::jsonb,$21,now())
    ON CONFLICT (id) DO NOTHING`,[artifact.id,contextKey,artifact.context.game,artifact.context.gameType,artifact.context.evaluationModel,artifact.context.players,stack,artifact.context.ante.type,artifact.context.hero,JSON.stringify(artifact.context.actionHistory),JSON.stringify(artifact.context.board),artifact.bettingTree.id,artifact.sourceType,validation.quality,artifact.convergence.metric,artifact.convergence.value,artifact.convergence.threshold,artifact.exploitabilityBbPerHand??null,artifact.checksum,JSON.stringify(published),artifact.generatedAt]);
  const rows=await db.query<{checksum:string}>('SELECT checksum FROM verified_solution_artifacts WHERE id=$1',[artifact.id]);
  if(rows[0]?.checksum!==artifact.checksum)throw new Error('Immutable solution id already contains different data.');
  return validation;
}

export async function findExactVerifiedSolution(db:Database,context:StrategyContext,bettingTreeId:string):Promise<VerifiedSolutionArtifact|null>{
  const rows=await db.query<{artifact:VerifiedSolutionArtifact}>('SELECT artifact FROM verified_solution_artifacts WHERE context_key=$1 AND betting_tree_id=$2 AND status=\'VERIFIED\' ORDER BY published_at DESC LIMIT 1',[exactContextKey(context,bettingTreeId),bettingTreeId]);
  return rows[0]?.artifact??null;
}

export async function solutionCoverage(db:Database):Promise<SolutionCoverageRow[]>{
  return db.query<SolutionCoverageRow>(`SELECT players,stack_bb::float8 AS "stackBb",ante_type AS "anteType",hero_position AS "heroPosition",count(*) FILTER (WHERE status='VERIFIED')::int AS verified,count(*) FILTER (WHERE status='PENDING_VALIDATION')::int AS pending,count(*) FILTER (WHERE status='FAILED_VALIDATION')::int AS failed FROM verified_solution_artifacts WHERE game='NLHE' AND game_type='TOURNAMENT' AND evaluation_model='CHIP_EV' GROUP BY players,stack_bb,ante_type,hero_position ORDER BY players,stack_bb,hero_position`);
}
