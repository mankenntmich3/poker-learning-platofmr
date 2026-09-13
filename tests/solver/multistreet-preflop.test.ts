import { describe, expect, it } from 'vitest';
import { allCombos } from '@/domain/cards';
import { defaultTournamentContext } from '@/domain/strategy-context';
import { MULTI_ACTION_TREE } from '@/domain/preflop-tree';
import { generateRiverGame } from '@/solver/river-model';
import { runExternalSampling, SeededRandom, type SamplingGame } from '@/solver/external-sampling';
import { assertPhysicalRollout, createMultistreetPreflopGame, drawPhysicalDeal, expectedRootInformationKeys, rolloutInformationKey } from '@/solver/multistreet-preflop';
import { attemptFullPreflopVerification, countFullChanceDeals } from '@/verification/multistreet-preflop';
import { measureCounterfactualBestResponses, type GameNode } from '@/verification/exact-best-response';
import { verifyForPublication } from '@/server/verify-solution';

const limits = { iterations: 100, runtimeMs: 60000, nodes: 1_000_000, infosets: 200_000, heapBytes: 1024 ** 3 };
describe('actual full-prior multistreet solver attempt and independent fail-closed verification', () => {
  it('samples legal 52-card physical deals and hides opponent/future cards in infosets', () => {
    const c = defaultTournamentContext(2), rng = new SeededRandom(123);
    const game = createMultistreetPreflopGame(c, MULTI_ACTION_TREE), root = game.sampleRoot(rng);
    for (let i = 0; i < 500; i++) { const r = game.sampleRoot(rng); assertPhysicalRollout(r); }
    const altered = structuredClone(root); altered.runout.reverse(); altered.holes[1] = ['2c', '3c'];
    expect(rolloutInformationKey(altered)).toBe(rolloutInformationKey(root));
    altered.holes[0] = root.holes[0][0] === 'As' ? ['2c', '3c'] : ['As', 'Kh'];
    expect(rolloutInformationKey(altered)).not.toBe(rolloutInformationKey(root));
    const hand = drawPhysicalDeal(c, new SeededRandom(12));
    expect(hand).toEqual(drawPhysicalDeal(c, new SeededRandom(12)));
    expect(expectedRootInformationKeys(c)).toHaveLength(allCombos().length);
  });
  it('runs all root actions with real later streets; outputs remain unpublishable', () => {
    const c = defaultTournamentContext(2), game = createMultistreetPreflopGame(c, MULTI_ACTION_TREE);
    const result = runExternalSampling(game, 31, limits);
    expect(result.iterations).toBe(100); expect(result.completedRegretTraversals).toBe(200);
    expect(result.status).toBe('NON_CONVERGED'); expect(result.nashConv).toBeNull();
    expect(Object.keys(result.profile).some(k => k.includes('DEAL'))).toBe(true);
    const root = game.inspect(game.sampleRoot(new SeededRandom(12)));
    if (root.kind !== 'decision') throw new Error('Root');
    expect(root.actions.map(a => a.id)).toEqual(['fold', 'limp', 'raise-20000', 'raise-22000', 'jam']);
    const repeat = runExternalSampling(game, 31, limits);
    expect(repeat.profile).toEqual(result.profile);
    expect(verifyForPublication(result).status).toBe('FAILED_VALIDATION');
  });
  it('stops on deterministic resources without substituting a partial BR number', () => {
    const c = defaultTournamentContext(2), game = createMultistreetPreflopGame(c, MULTI_ACTION_TREE);
    const result = runExternalSampling(game, 3, { ...limits, nodes: 100 });
    expect(result.status).toBe('COMPUTE_LIMIT'); expect(result.reason).toBe('NODE_BUDGET');
    const report = attemptFullPreflopVerification(c, MULTI_ACTION_TREE, result.profile, { nodes: 100, runtimeMs: 30000 });
    expect(report.status).toBe('COMPUTE_LIMIT'); expect(report.report).toBeNull();
    expect(report.terminalPayoffs).toBeGreaterThan(0); expect(report.uniformDefaultInfosets).toBeGreaterThan(0);
    expect(countFullChanceDeals(2)).toBe(1624350n * 1712304n * 20n);
    const wrong = Object.fromEntries(expectedRootInformationKeys(c).map(key => [key, { actions: { fold: 1 } }]));
    expect(() => attemptFullPreflopVerification(c, MULTI_ACTION_TREE, wrong, { nodes: 100, runtimeMs: 30000 })).toThrow(/normalization\/actions/);
  });
  it('actually runs a smaller full-prior 3/6-player tree without all-in equity proxies for calls', () => {
    const tree = structuredClone(MULTI_ACTION_TREE); tree.preflop = { limp: false, raises: [] };
    for (const players of [3, 6]) {
      const c = defaultTournamentContext(players); c.hero = players === 3 ? 'BTN' : 'UTG'; c.actionHistory = [];
      const result = runExternalSampling(createMultistreetPreflopGame(c, tree), 77, { ...limits, iterations: 1000 });
      expect(result.iterations).toBe(1000); expect(result.completedRegretTraversals).toBe(players * 1000);
      expect(Object.keys(result.profile).some(k => k.includes('DEAL'))).toBe(false);
      expect(result.nashConv).toBeNull(); expect(result.exploitability).toBeNull();
    }
  });
  it('cross-checks sampled CFR mathematics against the independently measured real river game', () => {
    const game = generateRiverGame();
    if (game.root.kind !== 'chance') throw new Error('Root chance');
    const branches = game.root.branches;
    const sampling: SamplingGame<GameNode> = {
      players: 2, sampleRoot: random => branches[random.choose(branches.map(b => b.probability))].child,
      inspect: node => {
        if (node.kind === 'chance') throw new Error('Only initial deal chance in this fixed-board regression.');
        return node.kind === 'terminal' ? node : { ...node, key: node.informationSet };
      },
    };
    const result = runExternalSampling(sampling, 12345, { ...limits, iterations: 10000, nodes: 4_000_000 });
    const profile = Object.fromEntries(Object.entries(result.profile).map(([key, row]) => [key, row.actions]));
    const report = measureCounterfactualBestResponses(game, profile);
    expect(result.iterations).toBe(10000);
    expect(report.nashConv).toBeLessThan(.2);
    expect(report.exploitability).toBeCloseTo(report.nashConv / 2, 12);
  });
});
