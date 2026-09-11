import { createHash } from 'node:crypto';
import { assertUniqueCards, createCombo, type Card, type Combo } from '@/domain/cards';
import { effectiveStackBb, positionsFor, validateStrategyContext, type PublicAction, type StrategyContext, type TablePosition } from '@/domain/strategy-context';

export type VerifiedSource = 'VERIFIED_SOLVER' | 'IMPORTED_VERIFIED';
export type UnverifiedSource = 'APPROXIMATED' | 'DEMO' | 'INTERPOLATED';
export type SolutionStatus = 'PENDING_VALIDATION' | 'VERIFIED' | 'FAILED_VALIDATION';
export type QualityLabel = 'VERY_HIGH' | 'HIGH' | 'EXPERIMENTAL';
export interface SolverAction { id: string; type: PublicAction['type']; toBb?: number }
export interface ComboAction { actionId: string; frequency: number; evBb?: number }
export interface ComboSolution { combo: Combo; reach: number; actions: ComboAction[] }
export interface VerifiedSolutionArtifact {
  schemaVersion: 1; id: string; sourceType: VerifiedSource; status: SolutionStatus;
  context: StrategyContext; positions: TablePosition[]; actions: SolverAction[]; strategies: ComboSolution[];
  solver: { name: string; version: string; algorithm: string };
  bettingTree: { id: string; description: string; allowedActions: SolverAction[] };
  convergence: { metric: 'NASH_CONV' | 'EXPLOITABILITY'; value: number; threshold: number; unit: 'BB_PER_HAND'; passed: boolean };
  exploitabilityBbPerHand?: number; iterations: number; runtimeMs: number;
  abstraction: { card: string; action: string; chance: string };
  generatedAt: string; checksum: string; license: string; source: string;
}

export interface ValidationResult { status: Extract<SolutionStatus, 'VERIFIED' | 'FAILED_VALIDATION'>; errors: string[]; quality: QualityLabel | null }

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([key,item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  return JSON.stringify(value);
}

export function solutionChecksum(artifact: Omit<VerifiedSolutionArtifact, 'checksum'>): string {
  return createHash('sha256').update(canonical(artifact)).digest('hex');
}

function qualityFor(metric: number, threshold: number): QualityLabel {
  if (metric <= threshold * 0.25) return 'VERY_HIGH';
  if (metric <= threshold * 0.6) return 'HIGH';
  return 'EXPERIMENTAL';
}

export function validateVerifiedSolution(artifact: VerifiedSolutionArtifact): ValidationResult {
  const errors: string[] = [];
  try { validateStrategyContext(artifact.context); } catch (error) { errors.push(error instanceof Error ? error.message : 'Invalid context.'); }
  const seats = positionsFor(artifact.context.players);
  if (artifact.schemaVersion !== 1) errors.push('Unsupported schema version.');
  if (artifact.status !== 'PENDING_VALIDATION') errors.push('Only pending artifacts may enter the quality gate.');
  if (artifact.positions.join('|') !== seats.join('|')) errors.push('Position list does not match table size.');
  if (!artifact.solver.name || !artifact.solver.version || !artifact.solver.algorithm) errors.push('Complete solver identity is required.');
  if (!artifact.license || !artifact.source) errors.push('License and source are required.');
  if (!Number.isSafeInteger(artifact.iterations) || artifact.iterations < 1 || !Number.isFinite(artifact.runtimeMs) || artifact.runtimeMs < 0) errors.push('Invalid compute metadata.');
  if (!Number.isFinite(Date.parse(artifact.generatedAt))) errors.push('Invalid generation timestamp.');
  if (!Number.isFinite(artifact.convergence.value) || artifact.convergence.value < 0 || !Number.isFinite(artifact.convergence.threshold) || artifact.convergence.threshold <= 0) errors.push('Invalid convergence metric.');
  if (!artifact.convergence.passed || artifact.convergence.value > artifact.convergence.threshold) errors.push('Convergence threshold not met.');
  if (artifact.exploitabilityBbPerHand !== undefined && (!Number.isFinite(artifact.exploitabilityBbPerHand) || artifact.exploitabilityBbPerHand < 0)) errors.push('Invalid exploitability.');
  const actionIds = new Set(artifact.actions.map((action) => action.id));
  if (!artifact.actions.length || actionIds.size !== artifact.actions.length || artifact.actions.some((action) => !action.id || (action.type === 'RAISE') !== (action.toBb !== undefined))) errors.push('Invalid action set.');
  if (canonical(artifact.actions) !== canonical(artifact.bettingTree.allowedActions)) errors.push('Artifact actions differ from the declared betting tree.');
  const combos = new Set<string>();
  for (const row of artifact.strategies) {
    try { createCombo(...row.combo); assertUniqueCards([...row.combo, ...artifact.context.board] as Card[]); } catch { errors.push('Blocked or invalid combo.'); continue; }
    const key = row.combo.join(''); if (combos.has(key)) errors.push('Duplicate combo.'); combos.add(key);
    if (!Number.isFinite(row.reach) || row.reach < 0 || row.reach > 1) errors.push('Invalid reach.');
    const frequency = row.actions.reduce((sum, action) => sum + action.frequency, 0);
    if (row.actions.length !== actionIds.size || new Set(row.actions.map((action) => action.actionId)).size !== actionIds.size || Math.abs(frequency - 1) > 1e-9) errors.push('Every combo must contain one normalized frequency per action.');
    for (const action of row.actions) if (!actionIds.has(action.actionId) || !Number.isFinite(action.frequency) || action.frequency < 0 || action.frequency > 1 || (action.evBb !== undefined && !Number.isFinite(action.evBb))) errors.push('Invalid combo action.');
  }
  try { effectiveStackBb(artifact.context.stacks, seats.filter((seat) => !artifact.context.actionHistory.some((action) => action.actor === seat && action.type === 'FOLD'))); } catch { errors.push('Effective stack cannot be derived.'); }
  const { checksum, ...unsigned } = artifact;
  void checksum;
  if (solutionChecksum(unsigned) !== artifact.checksum) errors.push('Checksum mismatch.');
  return errors.length ? { status: 'FAILED_VALIDATION', errors: [...new Set(errors)], quality: null } : { status: 'VERIFIED', errors: [], quality: qualityFor(artifact.convergence.value, artifact.convergence.threshold) };
}

export function mayTrainAsGto(sourceType: VerifiedSource | UnverifiedSource, status: SolutionStatus): boolean {
  return status === 'VERIFIED' && (sourceType === 'VERIFIED_SOLVER' || sourceType === 'IMPORTED_VERIFIED');
}
