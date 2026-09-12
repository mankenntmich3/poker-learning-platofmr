import { validateSolutionStructure, type QualityLabel } from '@/solver/verified-solution';
import { VERIFICATION_POLICY } from './verification-policy';

export interface VerificationResult {
  status:'VERIFIED'|'FAILED_VALIDATION'; errors:string[]; quality:QualityLabel|null; policyVersion:string;
}
/** Only this server boundary can authorize publication. No verifier callback,
 * artifact-supplied report, env bypass or generator-selected threshold.
 *
 * A future approved NLHE adapter MUST independently construct the full game,
 * project/check every published combo (including EV/reach), evaluate all players'
 * strategies and bind its report to content, context, tree and policy hashes.
 * The finite-game BR oracle is executable but has NO approved NLHE adapter.
 */
export function verifyForPublication(input:unknown):VerificationResult {
  const structure=validateSolutionStructure(input,VERIFICATION_POLICY.frequencyTolerance);
  const errors=[...structure.errors], a=structure.artifact;
  if (a) {
    if (!VERIFICATION_POLICY.approvedLicenseEvidence.includes(a.provenance.licenseEvidenceSha256)) errors.push('No server-approved license/provenance evidence for this dataset.');
    if (!VERIFICATION_POLICY.approvedNlheModels.includes(a.modelId)) errors.push('No independently audited NLHE game-model verifier is approved.');
  }
  // Intentional fail-closed boundary until game construction, full-profile
  // projection, independent BR and calibrated model policy are integrated.
  errors.push('Independent NLHE best-response verification is unavailable; generator convergence claims cannot authorize publication.');
  return {status:'FAILED_VALIDATION',errors:[...new Set(errors)],quality:null,policyVersion:VERIFICATION_POLICY.version};
}
export function mayTrainAsGto(input:unknown):boolean {
  return verifyForPublication(input).status==='VERIFIED';
}
