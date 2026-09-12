import { createHash } from 'node:crypto';
import { z } from 'zod';
import { allCombos, createCombo } from '@/domain/cards';
import { canonicalJson } from '@/domain/canonical';
import { canonicalStrategyContext, positionsFor, strategyContextSchema, validateStrategyContext, type PublicAction } from '@/domain/strategy-context';
import { applyPublicAction, replayPublicHistory } from '@/domain/tournament-state';

export type VerifiedSource = 'VERIFIED_SOLVER' | 'IMPORTED_VERIFIED';
export type UnverifiedSource = 'APPROXIMATED' | 'DEMO' | 'INTERPOLATED';
export type SolutionStatus = 'PENDING_VALIDATION' | 'VERIFIED' | 'FAILED_VALIDATION';
export type QualityLabel = 'VERY_HIGH' | 'HIGH' | 'EXPERIMENTAL';
const sha = z.string().regex(/^[a-f0-9]{64}$/);
const text = z.string().trim().min(1).max(2000);
const probability = z.number().finite().min(0).max(1);
const solverActionSchema = z.discriminatedUnion('type', [
  z.object({ id: text, type: z.enum(['FOLD','CHECK','CALL','LIMP','JAM']) }).strict(),
  z.object({ id: text, type: z.literal('RAISE'), toBb: z.number().finite().positive() }).strict(),
]);
export const solutionArtifactSchema = z.object({
  schemaVersion: z.literal(2), id: text,
  sourceType: z.enum(['VERIFIED_SOLVER','IMPORTED_VERIFIED']),
  status: z.enum(['PENDING_VALIDATION','VERIFIED','FAILED_VALIDATION']),
  context: strategyContextSchema, modelId: text,
  positions: z.array(z.enum(['UTG','UTG+1','UTG+2','LJ','HJ','CO','BTN','SB','BB'])),
  actions: z.array(solverActionSchema).min(1).max(32),
  strategies: z.array(z.object({
    combo: z.tuple([z.string(),z.string()]), reach: probability,
    actions: z.array(z.object({actionId:text,frequency:probability,evBb:z.number().finite().optional()}).strict()).min(1).max(32),
  }).strict()).max(1326),
  // Full joint behavioral profile; a Hero matrix cannot establish NashConv.
  fullProfile: z.record(z.string(), z.record(z.string(), probability)),
  solver: z.object({name:text,version:text,algorithm:text,buildSha256:sha}).strict(),
  bettingTree: z.object({id:text,description:text,definitionSha256:sha,allowedActions:z.array(solverActionSchema)}).strict(),
  // Generator claims are retained for diagnostics, NEVER acceptance criteria.
  convergence: z.object({metric:z.enum(['NASH_CONV','EXPLOITABILITY']),value:z.number().finite().nonnegative(),threshold:z.number().finite().positive(),unit:z.literal('BB_PER_HAND'),passed:z.boolean()}).strict(),
  exploitabilityBbPerHand:z.number().finite().nonnegative().optional(),
  iterations:z.number().int().positive(),runtimeMs:z.number().finite().nonnegative(),
  abstraction:z.object({card:text,action:text,chance:text}).strict(),
  generatedAt:z.string().datetime(),checksum:sha,license:text,source:text,
  provenance:z.object({
    datasetId:text,revision:text,origin:z.enum(['ORIGINAL_COMPUTATION','LICENSED_IMPORT']),
    sourceSha256:sha,licenseEvidenceSha256:sha,parametersSha256:sha,
  }).strict(),
}).strict();
export type VerifiedSolutionArtifact = z.infer<typeof solutionArtifactSchema>;
export type SolverAction = z.infer<typeof solverActionSchema>;
export type ComboSolution = VerifiedSolutionArtifact['strategies'][number];
export type ComboAction = ComboSolution['actions'][number];
export interface StructureResult {
  status:'STRUCTURALLY_VALID'|'FAILED_VALIDATION'; errors:string[];
  artifact:VerifiedSolutionArtifact|null;
}
export function solutionChecksum(artifact:Omit<VerifiedSolutionArtifact,'checksum'>):string {
  return createHash('sha256').update(canonicalJson(artifact)).digest('hex');
}
export function parameterChecksum(context:unknown, modelId:string, treeDefinitionSha256:string):string {
  return createHash('sha256').update(canonicalJson({context:canonicalStrategyContext(context),modelId,treeDefinitionSha256})).digest('hex');
}
/** Schema, legal-state and completeness checks ONLY; cannot issue VERIFIED. */
export function validateSolutionStructure(input:unknown, frequencyTolerance = 1e-9):StructureResult {
  const parsed=solutionArtifactSchema.safeParse(input);
  if (!parsed.success) return {status:'FAILED_VALIDATION',errors:['Invalid artifact schema: '+parsed.error.issues.map(i=>i.path.join('.')+': '+i.message).join('; ')],artifact:null};
  const a=parsed.data, errors:string[]=[];
  try {
    validateStrategyContext(a.context);
    const context=canonicalStrategyContext(a.context), state=replayPublicHistory(context);
    if (a.positions.join('|')!==positionsFor(context.players).join('|')) errors.push('Position list does not match table size.');
    const actionIds=a.actions.map(action=>action.id);
    if (new Set(actionIds).size!==actionIds.length) errors.push('Duplicate action ids.');
    if (canonicalJson(a.actions)!==canonicalJson(a.bettingTree.allowedActions)) errors.push('Actions differ from the declared betting tree.');
    const successors=new Set<string>();
    for (const action of a.actions) {
      const publicAction = action.type==='RAISE' ? {actor:context.hero,type:action.type,toBb:action.toBb} : {actor:context.hero,type:action.type};
      const next=applyPublicAction(state,publicAction as PublicAction), identity=canonicalJson(next);
      if (successors.has(identity)) errors.push('Duplicate equivalent actions.');
      successors.add(identity);
    }
    const expected=new Set(allCombos([...context.board,...context.deadCards]).map(combo=>combo.join('')));
    const seen=new Set<string>();
    for (const row of a.strategies) {
      const key=createCombo(row.combo[0],row.combo[1]).join('');
      if (!expected.has(key)) errors.push('Blocked or invalid combo.');
      if (seen.has(key)) errors.push('Duplicate physical combo.');
      seen.add(key);
      if (row.actions.length!==actionIds.length || new Set(row.actions.map(x=>x.actionId)).size!==actionIds.length || row.actions.some(x=>!actionIds.includes(x.actionId)) || Math.abs(row.actions.reduce((sum,x)=>sum+x.frequency,0)-1)>frequencyTolerance) errors.push('Every combo must contain one normalized frequency per action.');
    }
    if (seen.size!==expected.size || [...expected].some(key=>!seen.has(key))) errors.push('Incomplete expected physical-combo coverage, including zero-reach combos.');
    if (!Object.keys(a.fullProfile).length) errors.push('Full joint strategy profile is required.');
    for (const policy of Object.values(a.fullProfile)) {
      if (!Object.keys(policy).length || Math.abs(Object.values(policy).reduce((sum,p)=>sum+p,0)-1)>frequencyTolerance) errors.push('Full-profile information-set policies must be normalized.');
    }
    if (a.provenance.parametersSha256!==parameterChecksum(context,a.modelId,a.bettingTree.definitionSha256)) errors.push('Provenance parameter identity mismatch.');
    if ((a.sourceType==='VERIFIED_SOLVER')!==(a.provenance.origin==='ORIGINAL_COMPUTATION')) errors.push('Source type and provenance origin disagree.');
  } catch(error) { errors.push(error instanceof Error ? error.message : 'Invalid strategy state.'); }
  const {checksum,...unsigned}=a;
  if (solutionChecksum(unsigned)!==checksum) errors.push('Checksum mismatch.');
  return {status:errors.length?'FAILED_VALIDATION':'STRUCTURALLY_VALID',errors:[...new Set(errors)],artifact:a};
}
