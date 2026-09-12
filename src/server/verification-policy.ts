/** Server-owned, reviewed policy. An artifact cannot nominate its acceptance
 * threshold, evaluator, license approval, game tree, or verification report.
 * Empty model approvals are intentional: no calibrated NLHE verifier yet.
 */
export const VERIFICATION_POLICY = Object.freeze({
  version: 'rangeform-verification-v2',
  artifactSchemaVersion: 2,
  frequencyTolerance: 1e-9,
  approvedNlheModels: Object.freeze([] as readonly string[]),
  approvedLicenseEvidence: Object.freeze([] as readonly string[]),
  // No arbitrary BB threshold until a model has an independently audited
  // evaluator, numerical error budget, cross-checks and calibration evidence.
  modelAccuracyLimits: Object.freeze({} as Readonly<Record<string, {
    nashConvMaxBbPerHand: number; veryHighMaxBbPerHand: number;
    verifierVersion: string; calibrationEvidenceSha256: string;
  }>>),
});
