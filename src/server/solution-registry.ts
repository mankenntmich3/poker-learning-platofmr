import { createHash, randomUUID } from 'node:crypto';
import type { Database, SqlRow } from './db';
import { canonicalJson } from '@/domain/canonical';
import { canonicalStrategyContext, validateStrategyContext, type StrategyContext } from '@/domain/strategy-context';
import { solutionArtifactSchema, type VerifiedSolutionArtifact } from '@/solver/verified-solution';
import { verifyForPublication } from './verify-solution';
import { VERIFICATION_POLICY } from './verification-policy';

export interface SolutionCoverageRow extends SqlRow { players:number; stackBb:number; anteType:string; heroPosition:string; verified:number; pending:number; failed:number }
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
  await db.query("INSERT INTO solver_jobs (id,context_key,config,priority,status,error,completed_at) VALUES ($1,$2,$3::jsonb,1,'FAILED_VALIDATION',$4,now())",
    [randomUUID(),contextKey,JSON.stringify({artifactId:parsed.success?parsed.data.id:null,policyVersion:validation.policyVersion}),validation.errors.join(' | ')]);
  // No artifact write is possible until an audited NLHE verifier and an atomic
  // certificate-bound publisher are implemented. Failure is explicit and durable.
  return validation;
}
export async function findExactVerifiedSolution(db:Database,context:StrategyContext,bettingTreeId:string):Promise<VerifiedSolutionArtifact|null> {
  const rows=await db.query<{artifact:VerifiedSolutionArtifact}>(
    "SELECT artifact FROM verified_solution_artifacts WHERE context_key=$1 AND betting_tree_id=$2 AND status='VERIFIED' AND verification_policy=$3 AND verification_report IS NOT NULL ORDER BY published_at DESC",
    [exactContextKey(context,bettingTreeId),bettingTreeId,VERIFICATION_POLICY.version]);
  // A status flag or manually inserted report is not a certificate.
  for(const row of rows) if(verifyForPublication(row.artifact).status==='VERIFIED') return row.artifact;
  return null;
}
export async function solutionCoverage(db:Database):Promise<SolutionCoverageRow[]> {
  // No certified NLHE model exists. Legacy records count as pending/failed only.
  return db.query<SolutionCoverageRow>("SELECT players,stack_bb::float8 AS \"stackBb\",ante_type AS \"anteType\",hero_position AS \"heroPosition\",0::int AS verified,count(*) FILTER (WHERE status='PENDING_VALIDATION')::int AS pending,count(*) FILTER (WHERE status='FAILED_VALIDATION')::int AS failed FROM verified_solution_artifacts WHERE game='NLHE' AND game_type='TOURNAMENT' AND evaluation_model='CHIP_EV' GROUP BY players,stack_bb,ante_type,hero_position ORDER BY players,stack_bb,hero_position");
}
