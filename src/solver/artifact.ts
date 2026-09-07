import { createHash } from 'node:crypto';
import type { ActionEV, KuhnCard, KuhnHistory } from '../strategy/types';
import { assessStrategy } from './best-response';
import { conditionalActionValues, expectedValue, HISTORIES, infoKey, KUHN_CARDS, KUHN_CONFIG,
  legalActions, playerToAct, SOLVER_VERSION, solveKuhn, treeDescription, type StrategyProfile } from './kuhn';

export const TARGET_EXPLOITABILITY = 0.005;
export interface SolutionArtifact {
  schemaVersion: 1;
  id: 'kuhn-3card-ante1-bet1';
  version: string;
  sourceType: 'COMPUTED';
  solverVersion: string;
  generatedAt: string;
  config: typeof KUHN_CONFIG;
  configHash: string;
  rangeHash: string;
  treeHash: string;
  iterations: number;
  computeTimeMs: number;
  accuracy: { metric: 'exploitability'; value: number; nashConv: number; target: number; unit: 'ante/hand' };
  expectedValue: number;
  profile: StrategyProfile;
  nodes: { card: KuhnCard; history: KuhnHistory; player: 0 | 1; actions: ActionEV[]; totalEV: number }[];
  checksum: string;
}

/** Stable JSON is shared by hashes and export; object key order never affects identity. */
export function canonicalJSON(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map(key => `${JSON.stringify(key)}:${canonicalJSON(object[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function hash(value: unknown): string {
  return createHash('sha256').update(canonicalJSON(value)).digest('hex');
}

export function checksum(artifact: Omit<SolutionArtifact, 'checksum'> | SolutionArtifact): string {
  const payload = { ...artifact } as Partial<SolutionArtifact>;
  delete payload.checksum;
  return hash(payload);
}

export function buildArtifact(iterations = 100_000): SolutionArtifact {
  const started = performance.now();
  const profile = solveKuhn(iterations);
  const assessment = assessStrategy(profile);
  const artifact: SolutionArtifact = {
    schemaVersion: 1,
    id: 'kuhn-3card-ante1-bet1',
    version: `cfr1-${iterations}-${hash(profile).slice(0, 12)}`,
    sourceType: 'COMPUTED', solverVersion: SOLVER_VERSION, generatedAt: new Date().toISOString(),
    config: KUHN_CONFIG, configHash: hash(KUHN_CONFIG),
    rangeHash: hash({ orderedDeals: ['JQ', 'JK', 'QJ', 'QK', 'KJ', 'KQ'], probability: 1 / 6 }),
    treeHash: hash(treeDescription()), iterations,
    computeTimeMs: Math.round(performance.now() - started),
    accuracy: { metric: 'exploitability', value: assessment.exploitability,
      nashConv: assessment.nashConv, target: TARGET_EXPLOITABILITY, unit: 'ante/hand' },
    expectedValue: expectedValue(profile), profile,
    nodes: HISTORIES.flatMap(history => KUHN_CARDS.map(card => {
      const evs = conditionalActionValues(profile, card, history);
      const frequencies = profile[infoKey(card, history)]!;
      return { card, history, player: playerToAct(history),
        actions: legalActions(history).map((action, index) => ({ action, frequency: frequencies[index]!, ev: evs[index]! })),
        totalEV: frequencies[0] * evs[0] + frequencies[1] * evs[1] };
    })), checksum: '',
  };
  artifact.checksum = checksum(artifact);
  validateArtifact(artifact);
  return artifact;
}

function ensure(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid solution artifact: ${message}`);
}

function near(actual: number, expected: number, label: string): void {
  ensure(Number.isFinite(actual) && Math.abs(actual - expected) < 1e-10, label);
}

/** Fail closed. Loaded data is never available to the provider before independent
 * integrity, legal-policy, information-set EV, and convergence checks succeed. */
export function validateArtifact(artifact: SolutionArtifact): void {
  ensure(artifact.schemaVersion === 1 && artifact.sourceType === 'COMPUTED', 'schema / provenance');
  ensure(artifact.id === 'kuhn-3card-ante1-bet1' && artifact.solverVersion === SOLVER_VERSION, 'unsupported solution');
  ensure(Number.isFinite(Date.parse(artifact.generatedAt)), 'generatedAt');
  ensure(Number.isSafeInteger(artifact.iterations) && artifact.iterations > 0, 'iterations');
  ensure(Number.isFinite(artifact.computeTimeMs) && artifact.computeTimeMs >= 0, 'compute time');
  ensure(checksum(artifact) === artifact.checksum, 'checksum mismatch');
  ensure(hash(artifact.config) === hash(KUHN_CONFIG) && artifact.configHash === hash(KUHN_CONFIG), 'configuration');
  ensure(artifact.treeHash === hash(treeDescription()), 'tree hash');
  ensure(artifact.rangeHash === hash({ orderedDeals: ['JQ', 'JK', 'QJ', 'QK', 'KJ', 'KQ'], probability: 1 / 6 }), 'range hash');
  ensure(artifact.version === `cfr1-${artifact.iterations}-${hash(artifact.profile).slice(0, 12)}`, 'version');
  const expectedKeys = HISTORIES.flatMap(history => KUHN_CARDS.map(card => infoKey(card, history)));
  ensure(Object.keys(artifact.profile).length === expectedKeys.length, 'information-set count');
  for (const key of expectedKeys) {
    const values = artifact.profile[key];
    ensure(Array.isArray(values) && values.length === 2, `missing policy ${key}`);
    ensure(values.every(value => Number.isFinite(value) && value >= 0 && value <= 1), 'frequencies');
    near(values[0] + values[1], 1, 'frequency normalization');
  }
  ensure(artifact.nodes.length === expectedKeys.length, 'node count');
  const found = new Set<string>();
  for (const node of artifact.nodes) {
    ensure(KUHN_CARDS.includes(node.card) && HISTORIES.includes(node.history), 'illegal card/history');
    const key = infoKey(node.card, node.history);
    ensure(!found.has(key), 'duplicate information set');
    found.add(key);
    ensure(node.player === playerToAct(node.history), 'player to act');
    ensure(node.actions.length === 2, 'action count');
    const values = conditionalActionValues(artifact.profile, node.card, node.history);
    node.actions.forEach((action, index) => {
      ensure(action.action === legalActions(node.history)[index], 'illegal action');
      near(action.frequency, artifact.profile[key]![index]!, 'node policy');
      near(action.ev, values[index]!, 'conditional action EV');
    });
    near(node.totalEV, node.actions.reduce((sum, action) => sum + action.frequency * action.ev, 0), 'total EV');
  }
  const assessment = assessStrategy(artifact.profile);
  ensure(artifact.accuracy.metric === 'exploitability' && artifact.accuracy.unit === 'ante/hand', 'accuracy definition');
  ensure(artifact.accuracy.target === TARGET_EXPLOITABILITY, 'publication target');
  near(artifact.accuracy.value, assessment.exploitability, 'exploitability');
  near(artifact.accuracy.nashConv, assessment.nashConv, 'NashConv');
  ensure(assessment.exploitability <= TARGET_EXPLOITABILITY, 'insufficient convergence');
  near(artifact.expectedValue, expectedValue(artifact.profile), 'expected game value');
}
