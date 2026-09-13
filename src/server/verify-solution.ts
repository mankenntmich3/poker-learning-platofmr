import { validateSolutionStructure, type QualityLabel } from '@/solver/verified-solution';
import { VERIFICATION_POLICY } from './verification-policy';
import { canonicalJson } from '@/domain/canonical';
import { canonicalStrategyContext } from '@/domain/strategy-context';
import { riverContext, RIVER_MODEL_ID, RIVER_TREE_SHA, riverActions } from '@/domain/river-definition';
import { verifyRiverProfile } from '@/verification/river-best-response';
import { RIVER_LP_BUILD_SHA } from './river-approval';
import { PREFLOP_MODEL_ID,PREFLOP_TREE_SHA,preflopActions,preflopContext } from '@/domain/preflop-definition';
import { equityEvidenceHash,verifyPreflopProfile } from '@/verification/preflop-best-response';
import { PREFLOP_BUILD_SHA,PREFLOP_EQUITY_SHA } from './preflop-approval';

export interface VerificationResult {
  status:'VERIFIED'|'FAILED_VALIDATION'; errors:string[]; quality:QualityLabel|null; policyVersion:string;
  report?:ReturnType<typeof verifyRiverProfile>['report'] & {artifactChecksum:string;policyVersion:string;calibrationEvidenceSha256:string};
}
/** Only this server boundary can authorize publication. No verifier callback,
 * artifact-supplied report, env bypass or generator-selected threshold.
 *
 * Approved adapters independently reconstruct the conditional river / HU push-fold
 * game and every published combo EV/reach, with policy-owned numeric limits.
 * Other models, full-prior MTT preflop and imported datasets fail closed.
 */
export function verifyForPublication(input:unknown):VerificationResult {
  const structure=validateSolutionStructure(input,VERIFICATION_POLICY.frequencyTolerance);
  const errors=[...structure.errors], a=structure.artifact;
  if (a) {
    if (!VERIFICATION_POLICY.approvedLicenseEvidence.includes(a.provenance.licenseEvidenceSha256)) errors.push('No server-approved license/provenance evidence for this dataset.');
    if (!VERIFICATION_POLICY.approvedNlheModels.includes(a.modelId)) errors.push('No independently audited NLHE game-model verifier is approved.');
  }
  if(a && !errors.length && [RIVER_MODEL_ID,PREFLOP_MODEL_ID].includes(a.modelId)) {
    try {
      const preflop=a.modelId===PREFLOP_MODEL_ID,stack=a.context.stacks[0].stackBb,ante=a.context.ante.type==='BBA'?a.context.ante.amountBb:0;
      const context=preflop?preflopContext(stack,ante):riverContext(),tree=preflop?PREFLOP_TREE_SHA:RIVER_TREE_SHA,actions=preflop?preflopActions:riverActions,build=preflop?PREFLOP_BUILD_SHA:RIVER_LP_BUILD_SHA;
      if(canonicalJson(canonicalStrategyContext(a.context))!==canonicalJson(context) || a.bettingTree.definitionSha256!==tree || a.bettingTree.id!==a.modelId || canonicalJson(a.actions)!==canonicalJson(actions)) throw new Error('Unapproved exact subgame context, priors or action tree.');
      if(a.sourceType!=='VERIFIED_SOLVER' || a.provenance.datasetId!==a.modelId || a.provenance.revision!=='1' || a.provenance.sourceSha256!==build || a.solver.buildSha256!==build || a.solver.algorithm!=='SEQUENCE_FORM_LINEAR_PROGRAM' || a.solver.name!=='SciPy/HiGHS' || a.solver.version!=='SciPy 1.16.2 / HiGHS 1.8.0' || a.source!=='https://github.com/scipy/scipy/tree/v1.16.2' || a.license!=='SciPy BSD-3-Clause / HiGHS MIT; original Rangeform configuration') throw new Error('Unapproved execution/provenance identity. Imported datasets require separate approval.');
      if(preflop && equityEvidenceHash()!==PREFLOP_EQUITY_SHA)throw new Error('Unapproved independently enumerated equity evidence.');
      const measured=preflop?verifyPreflopProfile(a.fullProfile,stack,ante):verifyRiverProfile(a.fullProfile),expected=new Map(measured.strategies.map(r=>[[...r.combo].sort().join(''),r]));
      for(const row of a.strategies) {
        const ref=expected.get([...row.combo].sort().join(''))!;
        if(Math.abs(row.reach-ref.reach)>1e-10) throw new Error('Incorrect combo reach projection.');
        for(const action of row.actions) {
          const target=ref.actions.find(x=>x.actionId===action.actionId)!;
          if(Math.abs(action.frequency-target.frequency)>1e-10 || (target.evBb===undefined ? action.evBb!==undefined : action.evBb===undefined || Math.abs(action.evBb-target.evBb)>1e-9)) throw new Error('Incorrect combo frequency/EV projection.');
        }
      }
      const limit=VERIFICATION_POLICY.modelAccuracyLimits[a.modelId];
      if(measured.report.verifierVersion!==limit.verifierVersion)throw new Error('Verifier version does not match calibrated policy.');
      if(measured.report.numericalAllowanceBb!==limit.numericalToleranceBb)throw new Error('Numerical allowance differs from calibrated server policy.');
      const upper=measured.report.nashConv+limit.numericalToleranceBb;
      if(upper>limit.nashConvMaxBbPerHand) throw new Error('Independently measured NashConv exceeds server policy.');
      return {status:'VERIFIED',errors:[],quality:upper<=limit.veryHighMaxBbPerHand?'VERY_HIGH':upper<=limit.highMaxBbPerHand?'HIGH':'EXPERIMENTAL',policyVersion:VERIFICATION_POLICY.version,
        report:{...measured.report,artifactChecksum:a.checksum,policyVersion:VERIFICATION_POLICY.version,calibrationEvidenceSha256:limit.calibrationEvidenceSha256}};
    } catch(error) {errors.push(error instanceof Error?error.message:'Independent verification failed.');}
  }
  if(!errors.length) errors.push('Independent NLHE best-response verification unavailable for this model.');
  return {status:'FAILED_VALIDATION',errors:[...new Set(errors)],quality:null,policyVersion:VERIFICATION_POLICY.version};
}
export function mayTrainAsGto(input:unknown):boolean {
  return verifyForPublication(input).status==='VERIFIED';
}
