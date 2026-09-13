import { readFile, writeFile } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import { canonicalJson } from '../src/domain/canonical';
import { measurePreflopDeviations } from '../src/verification/preflop-deviations';

async function main() {
  const file = process.argv[2], samples = Number(process.argv[3] ?? 20000), output = process.argv[4] ?? 'output/preflop-deviations.json';
  if (!file) throw new Error('Provide frozen preflop experiment path.');
  const raw = await readFile(file, 'utf8'), candidate = JSON.parse(raw);
  if (candidate.schemaVersion !== 'PREFLOP_EXPERIMENT_1' || candidate.contextSha256 !== createHash('sha256').update(canonicalJson(candidate.context)).digest('hex') || candidate.treeSha256 !== createHash('sha256').update(canonicalJson(candidate.tree)).digest('hex')) throw new Error('Frozen candidate identity mismatch.');
  const seed = process.argv[5] ?? randomBytes(32).toString('hex');
  const files = ['src/verification/preflop-deviations.ts', 'src/verification/multistreet-preflop.ts', 'src/domain/holdem.ts', 'src/domain/tournament-state.ts', 'src/domain/preflop-tree.ts', 'src/domain/strategy-context.ts', 'src/domain/information-encoding.ts', 'src/domain/cards.ts', 'src/domain/canonical.ts', 'src/domain/chips.ts', 'src/domain/positions.ts'];
  const sourceHash = async () => {
    const hash = createHash('sha256'); for (const f of files) hash.update(f + '\n' + (await readFile(f, 'utf8')).replace(/\r\n/g, '\n'));
    return hash.digest('hex');
  };
  const verifierSourceSha256 = await sourceHash();
  console.log(JSON.stringify({ started: true, file, samples, seed }));
  const report = measurePreflopDeviations(candidate, seed, samples);
  if (await sourceHash() !== verifierSourceSha256) throw new Error('Verifier source changed during the measurement. Rerun on a frozen build.');
  await writeFile(output, JSON.stringify({ candidateSha256: createHash('sha256').update(raw).digest('hex'), context: candidate.context,
    tree: candidate.tree, verifierSourceSha256, verifierSourceFiles: files, ...report }, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ ...report, witnesses: report.witnesses.map(({ player, rule, actionId, mean, lowerGainBb }) => ({ player, rule, actionId, mean, lowerGainBb })), output }));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
