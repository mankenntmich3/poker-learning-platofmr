import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { checksum, validateArtifact, type SolutionArtifact } from '../../src/solver/artifact';
import { jobId, runSolverJob, type SolverJob } from '../../src/solver/pipeline';
import { solveKuhn } from '../../src/solver/kuhn';
import { evaluateDecision, getSolutionSummary, getStrategyNode, getTrainingSpots } from '../../src/strategy';
import { StaticDatasetProvider } from '../../src/strategy/provider';
import { FileSolutionStorage } from '../../src/strategy/storage';

let artifact: SolutionArtifact;
const temporaryDirectories: string[] = [];
async function temporaryDirectory() {
  const directory = await mkdtemp(path.join(tmpdir(), 'poker-solver-test-'));
  temporaryDirectories.push(directory);
  return directory;
}
beforeAll(async () => {
  const index = JSON.parse(await readFile('data/solutions/index.json', 'utf8')) as { version: string };
  artifact = await new FileSolutionStorage().read(index.version);
});
afterEach(async () => {
  for (const directory of temporaryDirectories.splice(0)) await rm(directory, { recursive: true, force: true });
});

describe('computed artifact integrity and immutability', () => {
  it('validates the checked-in actual solve with independent accuracy and EV checks', () => {
    expect(() => validateArtifact(artifact)).not.toThrow();
    expect(artifact.sourceType).toBe('COMPUTED');
    expect(artifact.nodes).toHaveLength(12);
    expect(artifact.accuracy.value).toBeLessThan(0.005);
    expect(artifact.expectedValue).toBeCloseTo(-1 / 18, 5);
    expect(artifact.checksum).toMatch(/^[a-f0-9]{64}$/);
  });
  it('reproduces every checked-in frequency by rerunning the recorded CFR iteration count', () => {
    expect(solveKuhn(artifact.iterations)).toEqual(artifact.profile);
  });
  it('rejects corruption before serving any node', () => {
    const bad = structuredClone(artifact);
    bad.nodes[0]!.actions[0]!.ev += 1;
    expect(() => new StaticDatasetProvider(bad)).toThrow('checksum');
  });
  it('rejects wrong EVs and falsely advertised accuracy even if checksum is recomputed', () => {
    const wrongEV = structuredClone(artifact);
    wrongEV.nodes[0]!.actions[0]!.ev += 1;
    wrongEV.checksum = checksum(wrongEV);
    expect(() => validateArtifact(wrongEV)).toThrow('conditional action EV');
    const wrongAccuracy = structuredClone(artifact);
    wrongAccuracy.accuracy.value = 0;
    wrongAccuracy.checksum = checksum(wrongAccuracy);
    expect(() => validateArtifact(wrongAccuracy)).toThrow('exploitability');
  });
  it('rejects illegal frequencies, cards and duplicate information sets after valid checksum', () => {
    const invalid = structuredClone(artifact);
    invalid.nodes[0]!.actions[0]!.frequency = -0.1;
    invalid.checksum = checksum(invalid);
    expect(() => validateArtifact(invalid)).toThrow('node policy');
    const duplicate = structuredClone(artifact);
    duplicate.nodes[1] = structuredClone(duplicate.nodes[0]!);
    duplicate.checksum = checksum(duplicate);
    expect(() => validateArtifact(duplicate)).toThrow('duplicate');
  });
  it('atomically publishes, reloads and refuses to overwrite a published version', async () => {
    const directory = await temporaryDirectory();
    const storage = new FileSolutionStorage(directory);
    await storage.publish(artifact);
    await storage.publish(artifact);
    expect(await storage.read(artifact.version)).toEqual(artifact);
    const changedMetadata = structuredClone(artifact);
    changedMetadata.generatedAt = '2020-01-01T00:00:00.000Z';
    changedMetadata.checksum = checksum(changedMetadata);
    await expect(storage.publish(changedMetadata)).rejects.toThrow('Immutable');
    expect(await readdir(directory)).toEqual([`${artifact.version}.json`]);
    await expect(storage.read('../../secret')).rejects.toThrow('Invalid solution version');
  });
});

describe('provider and server trainer facade', () => {
  it('returns exact Kuhn strategies and legal subsequent decision nodes', async () => {
    const provider = new StaticDatasetProvider(artifact);
    const state = { game: 'kuhn', history: '' } as const;
    const root = await provider.getNode(state);
    expect(root.pot).toBe(2);
    expect(root.range.map(combo => combo.combo)).toEqual(['J', 'Q', 'K']);
    expect((await provider.getNextNodes(state)).map(node => node.state.history)).toEqual(['x', 'b']);
    expect(await provider.getNextNodes({ game: 'kuhn', history: 'b' })).toEqual([]);
    expect((await provider.getComboStrategy(state, { game: 'kuhn', card: 'K' })).actions).toHaveLength(2);
    const range = await provider.getRangeStrategy(state);
    expect(range.provenance.solutionVersion).toBe(artifact.version);
    // Returned objects are snapshots: caller mutations never poison cached strategy data.
    root.range[0]!.actions[0]!.frequency = -99;
    expect((await provider.getNode(state)).range[0]!.actions[0]!.frequency).toBeGreaterThanOrEqual(0);
  });
  it('explicitly declines missing NLHE solutions instead of supplying toy or demo values', async () => {
    const provider = new StaticDatasetProvider(artifact);
    expect(await provider.hasSolution({ game: 'nlhe', stack: 100 })).toBe(false);
    await expect(provider.getNode({ game: 'nlhe', stack: 100 })).rejects.toThrow('No validated solution');
    await expect(provider.getComboStrategy({ game: 'kuhn', history: '' }, { game: 'nlhe', cards: ['As', 'Ks'] }))
      .rejects.toThrow('No validated solution');
  });
  it('serves 12 answer-free spots and evaluates only legal decisions from the published artifact', async () => {
    const spots = await getTrainingSpots();
    expect(spots).toHaveLength(12);
    expect(new Set(spots.map(spot => spot.id)).size).toBe(12);
    for (const spot of spots) {
      expect(spot.sourceType).toBe('COMPUTED');
      expect(JSON.stringify(spot)).not.toMatch(/frequency|"ev"|opponentCard/);
      for (const action of spot.actions) {
        const result = await evaluateDecision(spot.id, action.id);
        expect(result.solutionVersion).toBe(artifact.version);
        expect(result.regret).toBeCloseTo(result.bestEv - result.chosenEv, 12);
        expect(result.regret).toBeGreaterThanOrEqual(0);
        expect(result.actions.reduce((sum, entry) => sum + entry.frequency, 0)).toBeCloseTo(1, 12);
      }
    }
    expect((await getSolutionSummary()).checksum).toBe(artifact.checksum);
    expect((await getStrategyNode(spots[0]!.id)).state.history).toBe('b');
    await expect(evaluateDecision(spots[0]!.id, 'raise')).rejects.toThrow('Illegal training action');
    await expect(evaluateDecision('forged-spot', 'call')).rejects.toThrow('Unknown training spot');
  });
  it('does not grade a mixed action by its frequency', async () => {
    const result = await evaluateDecision('kuhn:Q:b', 'call');
    expect(result.actions.find(action => action.action === 'call')!.frequency).toBeLessThan(0.5);
    expect(result.regret).toBeLessThan(0.02);
  });
  it('binds server evaluation to the version shown when the training spot was loaded', async () => {
    const spot = (await getTrainingSpots())[0]!;
    expect((await evaluateDecision(spot.id, spot.actions[0]!.id, spot.solutionVersion)).solutionVersion).toBe(spot.solutionVersion);
    await expect(evaluateDecision(spot.id, spot.actions[0]!.id, 'stale-version')).rejects.toThrow('Solution version mismatch');
  });
});

describe('durable local solver job pipeline', () => {
  it('computes a fresh artifact, records completion and deduplicates the same configuration', async () => {
    const directory = await temporaryDirectory();
    const result = await runSolverJob(directory, 20_000);
    const job = JSON.parse(await readFile(path.join(directory, 'jobs', `${jobId(20_000)}.json`), 'utf8')) as SolverJob;
    expect(job.status).toBe('completed');
    expect(job.solutionVersion).toBe(result.version);
    expect(job.startedAt).toBeTruthy();
    expect(job.completedAt).toBeTruthy();
    expect((await runSolverJob(directory, 20_000)).checksum).toBe(result.checksum);
    const index = JSON.parse(await readFile(path.join(directory, 'index.json'), 'utf8')) as { checksum: string };
    expect(index.checksum).toBe(result.checksum);
    expect((await readdir(path.join(directory, 'jobs'))).some(name => name.endsWith('.lock'))).toBe(false);
  });
  it('records failure and never publishes an insufficiently converged solution', async () => {
    const directory = await temporaryDirectory();
    await expect(runSolverJob(directory, 1)).rejects.toThrow('insufficient convergence');
    const job = JSON.parse(await readFile(path.join(directory, 'jobs', `${jobId(1)}.json`), 'utf8')) as SolverJob;
    expect(job.status).toBe('failed');
    expect(job.error).toContain('insufficient convergence');
    expect(await readdir(directory)).toEqual(['jobs']);
    expect(await readdir(path.join(directory, 'jobs'))).toEqual([`${jobId(1)}.json`]);
  });
  it('recovers a validated orphan object without replacing its original generation metadata', async () => {
    const directory = await temporaryDirectory();
    await new FileSolutionStorage(directory).publish(artifact);
    const result = await runSolverJob(directory, artifact.iterations);
    expect(result.checksum).toBe(artifact.checksum);
    expect(result.generatedAt).toBe(artifact.generatedAt);
    const index = JSON.parse(await readFile(path.join(directory, 'index.json'), 'utf8')) as { checksum: string };
    expect(index.checksum).toBe(artifact.checksum);
  });
  it('leaves existing published data intact when a later solve fails', async () => {
    const directory = await temporaryDirectory();
    const result = await runSolverJob(directory, 20_000);
    await expect(runSolverJob(directory, 1)).rejects.toThrow('insufficient convergence');
    const index = JSON.parse(await readFile(path.join(directory, 'index.json'), 'utf8')) as { checksum: string };
    expect(index.checksum).toBe(result.checksum);
    expect((await new FileSolutionStorage(directory).read(result.version)).checksum).toBe(result.checksum);
  });
  it('refuses concurrent ownership of an already locked job', async () => {
    const directory = await temporaryDirectory();
    await runSolverJob(directory, 20_000);
    const lock = path.join(directory, 'jobs', `${jobId(20_000)}.lock`);
    await writeFile(lock, '{}');
    await expect(runSolverJob(directory, 20_000)).rejects.toMatchObject({ code: 'EEXIST' });
    expect(await readFile(lock, 'utf8')).toBe('{}');
  });
});
