import { createHash, randomUUID } from 'node:crypto';
import type { Database, SqlRow } from './db';
import { canonicalJson } from '@/domain/canonical';
import { canonicalStrategyContext, validateStrategyContext, type StrategyContext } from '@/domain/strategy-context';
import { solutionArtifactSchema, type VerifiedSolutionArtifact } from '@/solver/verified-solution';
import { verifyForPublication } from './verify-solution';
import { VERIFICATION_POLICY } from './verification-policy';

export interface SolutionCoverageRow extends SqlRow { players:number; stackBb:number; anteType:string; heroPosition:string; modelId:string; scope:string; verified:number; pending:number; failed:number }
export interface SolverJobInput { context:StrategyContext; bettingTreeId:string; priority:1|2|3 }
/** Betting-tree identifiers are content hashes, never mutable display names. */
export function exactContextKey(context:unknown,bettingTreeId:string):string {
  if (!/^[a-f0-9]{64}$/.test(bettingTreeId)) throw new Error('Exact lookup requires the betting-tree definition SHA-256.');
  return createHash('sha256').update(canonicalJson({
    keyVersion:2,context:canonicalStrategyContext(context),bettingTreeDefinitionSha256:bettingTreeId,
  })).digest('hex');
}
export async function queueSolverJob(db:Database,input:SolverJobInput):Promise<string> {
  validateStrategyContext(input.context);
  if (![1,2,3].includes(input.priority)) throw new Error('Invalid job priority.');
  const context=canonicalStrategyContext(input.context), id=randomUUID();
  await db.query("INSERT INTO solver_jobs (id,context_key,config,priority,status) VALUES ($1,$2,$3::jsonb,$4,'QUEUED')",
    [id,exactContextKey(context,input.bettingTreeId),JSON.stringify({...input,context}),input.priority]);
  return id;
}
export async function publishVerifiedSolution(db:Database,input:unknown) {
  const validation=verifyForPublication(input), parsed=solutionArtifactSchema.safeParse(input);
  let contextKey='invalid-'+randomUUID();
  if(parsed.success) {
    try { contextKey=exactContextKey(parsed.data.context,parsed.data.bettingTree.definitionSha256); } catch { /* record failure without trusting malformed identity */ }
  }
  if(validation.status==='VERIFIED' && parsed.success && validation.report) {
    const a=parsed.data,c=canonicalStrategyContext(a.context);
    await db.query(`WITH published AS (
      INSERT INTO verified_solution_artifacts
      (id,context_key,game,game_type,evaluation_model,players,stack_bb,ante_type,hero_position,action_history,board,betting_tree_id,source_type,status,quality_label,convergence_metric,convergence_value,convergence_threshold,exploitability_bb_per_hand,checksum,artifact,generated_at,published_at,verification_policy,verification_report,stack_vector)
      VALUES ($1,$2,'NLHE',$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12,'VERIFIED',$13,'NASH_CONV',$14,$15,$16,$17,$18::jsonb,$19,now(),$20,$21::jsonb,$22::jsonb)
      ON CONFLICT (checksum) DO UPDATE SET status='VERIFIED',quality_label=EXCLUDED.quality_label,verification_policy=EXCLUDED.verification_policy,verification_report=EXCLUDED.verification_report,published_at=now()
      RETURNING id
    ) INSERT INTO solver_jobs (id,context_key,config,priority,status,completed_at)
      SELECT $23,$2,$24::jsonb,1,'VERIFIED',now() FROM published`,
    [a.id,contextKey,c.gameType,c.evaluationModel,c.players,Math.min(...c.stacks.map(s=>s.stackBb)),c.ante.type,c.hero,JSON.stringify(c.actionHistory),JSON.stringify(c.board),a.bettingTree.definitionSha256,a.sourceType,validation.quality,validation.report.nashConv,VERIFICATION_POLICY.modelAccuracyLimits[a.modelId].nashConvMaxBbPerHand,validation.report.exploitability,a.checksum,JSON.stringify(a),a.generatedAt,validation.policyVersion,JSON.stringify(validation.report),JSON.stringify(c.stacks),randomUUID(),JSON.stringify({artifactId:a.id,checksum:a.checksum})]);
    return validation;
  }
  await db.query("INSERT INTO solver_jobs (id,context_key,config,priority,status,error,completed_at) VALUES ($1,$2,$3::jsonb,1,'FAILED_VALIDATION',$4,now())",
    [randomUUID(),contextKey,JSON.stringify({artifactId:parsed.success?parsed.data.id:null,policyVersion:validation.policyVersion}),validation.errors.join(' | ')]);
  return validation;
}
export async function findExactVerifiedSolution(db:Database,context:StrategyContext,bettingTreeId:string):Promise<VerifiedSolutionArtifact|null> {
  const rows=await db.query<{artifact:VerifiedSolutionArtifact}>(
    "SELECT artifact FROM verified_solution_artifacts WHERE context_key=$1 AND betting_tree_id=$2 AND status='VERIFIED' AND verification_policy=$3 AND verification_report IS NOT NULL ORDER BY published_at DESC",
    [exactContextKey(context,bettingTreeId),bettingTreeId,VERIFICATION_POLICY.version]);
  // A status flag or manually inserted report is not a certificate.
  for(const row of rows) if(verifyForPublication(row.artifact).status==='VERIFIED' && exactContextKey(row.artifact.context,row.artifact.bettingTree.definitionSha256)===exactContextKey(context,bettingTreeId)) return row.artifact;
  return null;
}
export async function solutionCoverage(db:Database):Promise<SolutionCoverageRow[]> {
  const rows=await db.query<{artifact:unknown;status:string;verification_policy:string;context_key:string;betting_tree_id:string;players:number;stack_bb:number;ante_type:string;hero_position:string}>("SELECT artifact,status,verification_policy,context_key,betting_tree_id,players,stack_bb,ante_type,hero_position FROM verified_solution_artifacts WHERE game='NLHE' AND game_type='TOURNAMENT' AND evaluation_model='CHIP_EV' AND jsonb_array_length(board)=0");
  const groups=new Map<string,SolutionCoverageRow>();
  for(const row of rows){
    const parsed=solutionArtifactSchema.safeParse(row.artifact);
    if(!parsed.success){
      const key='legacy:'+row.context_key,group=groups.get(key)??{players:row.players,stackBb:Number(row.stack_bb),anteType:row.ante_type,heroPosition:row.hero_position,modelId:'UNVALIDATED_LEGACY',scope:'UNKNOWN',verified:0,pending:0,failed:0};
      if(row.status==='FAILED_VALIDATION')group.failed++;else group.pending++;groups.set(key,group);continue;
    }
    const a=parsed.data,c=a.context,key=canonicalJson({context:c,modelId:a.modelId,tree:a.bettingTree.definitionSha256});
    if(c.board.length)continue;
    const group=groups.get(key)??{players:c.players,stackBb:Math.min(...c.stacks.map(s=>s.stackBb)),anteType:c.ante.type,heroPosition:c.hero,modelId:a.modelId,scope:c.conditioning?'CONDITIONAL_SUBGAME':'FULL_PRIOR',verified:0,pending:0,failed:0};
    if(row.status==='VERIFIED'&&row.verification_policy===VERIFICATION_POLICY.version&&verifyForPublication(a).status==='VERIFIED'&&row.context_key===exactContextKey(c,a.bettingTree.definitionSha256)&&row.betting_tree_id===a.bettingTree.definitionSha256)group.verified=1;
    else if(row.status==='FAILED_VALIDATION')group.failed++;else group.pending++;
    groups.set(key,group);
  }
  return [...groups.values()].sort((a,b)=>a.players-b.players||a.stackBb-b.stackBb||a.heroPosition.localeCompare(b.heroPosition));
}
