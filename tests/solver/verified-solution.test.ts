import { describe, expect, it } from 'vitest';
import { defaultTournamentContext, positionsFor } from '@/domain/strategy-context';
import { mayTrainAsGto, solutionChecksum, validateVerifiedSolution, type VerifiedSolutionArtifact } from '@/solver/verified-solution';

function artifact(): VerifiedSolutionArtifact {
  const context = defaultTournamentContext();
  const actions = [{ id: 'fold', type: 'FOLD' as const }, { id: 'raise-2', type: 'RAISE' as const, toBb: 2 }, { id: 'jam', type: 'JAM' as const }];
  const unsigned: Omit<VerifiedSolutionArtifact, 'checksum'> = { schemaVersion: 1, id: 'mtt-8h-15-hj-rfi-test', sourceType: 'VERIFIED_SOLVER', status: 'PENDING_VALIDATION', context,
    positions: [...positionsFor(8)], actions, strategies: [{ combo: ['As', 'Qd'], reach: 1, actions: [{ actionId: 'fold', frequency: 0 }, { actionId: 'raise-2', frequency: 0.72, evBb: 0.4 }, { actionId: 'jam', frequency: 0.28, evBb: 0.39 }] }],
    solver: { name: 'Test oracle', version: '1.0.0', algorithm: 'DCFR' }, bettingTree: { id: 'rfi-2x-jam-v1', description: 'Fixture tree', allowedActions: actions },
    convergence: { metric: 'NASH_CONV', value: 0.004, threshold: 0.01, unit: 'BB_PER_HAND', passed: true }, exploitabilityBbPerHand: 0.002,
    iterations: 1_000_000, runtimeMs: 1000, abstraction: { card: 'none', action: 'declared tree', chance: 'exact' }, generatedAt: '2026-09-11T00:00:00.000Z', license: 'Test-only fixture', source: 'Independent test oracle' };
  return { ...unsigned, checksum: solutionChecksum(unsigned) };
}

describe('verified solution quality gate', () => {
  it('accepts a normalized, converged and checksummed pending artifact', () => expect(validateVerifiedSolution(artifact())).toEqual({ status: 'VERIFIED', errors: [], quality: 'HIGH' }));
  it('fails convergence, checksum and frequency tampering', () => {
    const changed = artifact(); changed.convergence.passed = false; changed.strategies[0]!.actions[1]!.frequency = 0.5;
    const result = validateVerifiedSolution(changed);
    expect(result.status).toBe('FAILED_VALIDATION'); expect(result.errors).toEqual(expect.arrayContaining(['Convergence threshold not met.', 'Every combo must contain one normalized frequency per action.', 'Checksum mismatch.']));
  });
  it('never permits approximate, demo, interpolated or unvalidated nodes in GTO training', () => {
    expect(mayTrainAsGto('VERIFIED_SOLVER', 'VERIFIED')).toBe(true);
    expect(mayTrainAsGto('IMPORTED_VERIFIED', 'VERIFIED')).toBe(true);
    for (const source of ['APPROXIMATED', 'DEMO', 'INTERPOLATED'] as const) expect(mayTrainAsGto(source, 'VERIFIED')).toBe(false);
    expect(mayTrainAsGto('VERIFIED_SOLVER', 'PENDING_VALIDATION')).toBe(false);
    expect(mayTrainAsGto('VERIFIED_SOLVER', 'FAILED_VALIDATION')).toBe(false);
  });
});
