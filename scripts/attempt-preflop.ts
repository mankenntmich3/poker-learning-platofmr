import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { cpus, totalmem } from 'node:os';
import { canonicalJson } from '../src/domain/canonical';
import { canonicalStrategyContext, defaultTournamentContext, positionsFor } from '../src/domain/strategy-context';
import { fullPreflopPrior, MULTI_ACTION_TREE } from '../src/domain/preflop-tree';
import { runExternalSampling } from '../src/solver/external-sampling';
import { createMultistreetPreflopGame, expectedRootInformationKeys } from '../src/solver/multistreet-preflop';
import { attemptFullPreflopVerification } from '../src/verification/multistreet-preflop';

async function main() {
const players = Number(process.argv[2] ?? 2), stack = Number(process.argv[3] ?? 15), seconds = Number(process.argv[4] ?? 60);
const output = process.argv[5] ?? `output/preflop-attempt-${players}-${stack}.json`;
const treeMode = process.argv[6] ?? 'multi-action', ante = Number(process.argv[7] ?? 1);
if (![2, 3, 6].includes(players) || !Number.isFinite(stack) || stack < 10 || stack > 100 || !Number.isInteger(seconds) || seconds < 1 || seconds > 600 || !['multi-action', 'push-fold'].includes(treeMode) || ![0, 1].includes(ante)) throw new Error('Usage: attempt-preflop.ts [2|3|6] [stack 10..100] [seconds 1..600] [output] [multi-action|push-fold] [ante 0|1]');
const context = defaultTournamentContext(players, stack);
context.hero = positionsFor(players)[0]; context.actionHistory = [];
context.ante = ante ? { type: 'BBA', amountBb: 1 } : { type: 'NONE', amountBb: 0 };
const c = canonicalStrategyContext(context), tree = structuredClone(MULTI_ACTION_TREE);
if (treeMode === 'push-fold') { tree.id = 'rangeform-full-prior-pushfold-experiment-v1'; tree.preflop = { limp: false, raises: [] }; }
const limits = { iterations: 1_000_000, runtimeMs: seconds * 1000, nodes: 20_000_000, infosets: 500_000, heapBytes: 768 * 1024 * 1024 };
const sourceFiles = ['src/domain/cards.ts', 'src/domain/canonical.ts', 'src/domain/chips.ts', 'src/domain/positions.ts', 'src/domain/strategy-context.ts', 'src/domain/preflop-tree.ts', 'src/domain/tournament-state.ts', 'src/domain/tournament-payoff.ts', 'src/domain/equity.ts', 'src/solver/external-sampling.ts', 'src/solver/multistreet-preflop.ts'];
const source = await Promise.all(sourceFiles.map(async file => [file, await readFile(file, 'utf8')] as const));
const buildHash = createHash('sha256');
for (const [file, contents] of source) buildHash.update(file + '\n' + contents.replace(/\r\n/g, '\n'));
const verifierFiles = ['src/domain/holdem.ts', 'src/verification/exact-best-response.ts', 'src/verification/multistreet-preflop.ts'];
const verifierHash = createHash('sha256');
for (const file of verifierFiles) verifierHash.update(file + '\n' + (await readFile(file, 'utf8')).replace(/\r\n/g, '\n'));
console.log(JSON.stringify({ started: true, players, stack, ante: c.ante, expectedCombos: fullPreflopPrior(c).length, limits }));
const result = runExternalSampling(createMultistreetPreflopGame(c, tree), 20260913, limits);
const expected = expectedRootInformationKeys(c);
const roots = expected.map(key => ({ key, ...result.profile[key], learned: (result.profile[key]?.averageSamples ?? 0) > 0 }));
const { profile, ...metrics } = result;
const verification = attemptFullPreflopVerification(c, tree, profile, { nodes: 20_000, runtimeMs: 10_000 });
const report = {
  schemaVersion: 'PREFLOP_EXPERIMENT_1', publishable: false,
  rangeScope: 'FULL_PRIOR_UNVERIFIED', treeScope: treeMode === 'push-fold' ? 'PUSH_FOLD_ONLY' : 'PARTIAL_TREE',
  context: c, tree, prior: 'UNIFORM_PHYSICAL_WITHOUT_REPLACEMENT',
  contextSha256: createHash('sha256').update(canonicalJson(c)).digest('hex'),
  treeSha256: createHash('sha256').update(canonicalJson(tree)).digest('hex'),
  sourceSha256: buildHash.digest('hex'), sourceFiles, verifierSha256: verifierHash.digest('hex'), verifierFiles,
  license: 'ORIGINAL_RANGEFORM_CODE_PRIVATE_REPOSITORY',
  baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  hardware: { cpu: cpus()[0]?.model, logicalCpus: cpus().length, memoryBytes: totalmem(), node: process.version },
  limits, ...metrics, expectedRootCombos: expected.length,
  visitedRootCombos: expected.filter(key => Object.hasOwn(profile, key)).length,
  averagedRootCombos: roots.filter(r => r.learned).length,
  verification,
  roots, profile,
};
await mkdir(path.dirname(output), { recursive: true });
const serialized = JSON.stringify(report);
await writeFile(output, serialized, 'utf8');
const { roots: omittedRoots, profile: omittedProfile, ...summary } = report;
void omittedRoots; void omittedProfile;
await writeFile(output + '.summary.json', JSON.stringify({ ...summary, reportSha256: createHash('sha256').update(serialized).digest('hex') }, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ...metrics, expectedRootCombos: expected.length, visitedRootCombos: report.visitedRootCombos,
  averagedRootCombos: report.averagedRootCombos, sourceSha256: report.sourceSha256, verification, output, publishable: false }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
