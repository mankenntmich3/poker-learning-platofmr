/** Server-owned, reviewed policy. An artifact cannot nominate its acceptance
 * threshold, evaluator, license approval, game tree, or verification report.
 * Only the explicitly conditioned river model is approved; no preflop model.
 */
import { RIVER_MODEL_ID } from '@/domain/river-definition';
import { RIVER_LICENSE_SHA } from './river-approval';
export const VERIFICATION_POLICY = Object.freeze({
  version: 'rangeform-verification-v3-river1',
  artifactSchemaVersion: 2,
  frequencyTolerance: 1e-9,
  approvedNlheModels: Object.freeze([RIVER_MODEL_ID] as readonly string[]),
  approvedLicenseEvidence: Object.freeze([RIVER_LICENSE_SHA] as readonly string[]),
  // See docs/qa/river-calibration.json and the independent reference tests.
  modelAccuracyLimits: Object.freeze({[RIVER_MODEL_ID]:Object.freeze({nashConvMaxBbPerHand:1e-7,veryHighMaxBbPerHand:1e-8,verifierVersion:'rangeform-river-br-v1',calibrationEvidenceSha256:'050e73817c55154a4870629bc8c1470a6e70454c11ac7f249c379c932bfc3add'})} as Readonly<Record<string, {
    nashConvMaxBbPerHand: number; veryHighMaxBbPerHand: number;
    verifierVersion: string; calibrationEvidenceSha256: string;
  }>>),
});
