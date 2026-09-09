import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { buildNlheRange, validateNlheRange, type NlhePolicy } from '@/strategy/nlhe-policy';
import { SIX_MAX_POSITIONS } from '@/domain/chips';
import { STACK_DEPTHS, POSTFLOP_CONFIG, possibleVillains, type NlheConfig, type NlheProvenance } from '@/shared/nlhe';

const fractions = z.record(z.string(), z.number().min(0).max(1));
const policySchema = z.object({ algorithm: z.literal('rangeform-nlhe-heuristic/1.0.0'), authorship: z.string().min(1),
  openCoverage: fractions, vsOpenContinue: fractions, vsOpenRaise: fractions, vs3betContinue: z.number().min(0).max(1),
  vs3betRaise: z.number().min(0).max(1), mixStep: z.literal(0.25), boundaryCombos: z.number().int().positive() }).strict();
export interface NlheArtifact { schemaVersion: 1; version: string; checksum: string; algorithmChecksum: string; generatedAt: string; policy: NlhePolicy }
export const digest = (data: string) => createHash('sha256').update(data).digest('hex');
function payload(artifact: Pick<NlheArtifact, 'algorithmChecksum' | 'generatedAt' | 'policy'>) {
  return JSON.stringify({ schemaVersion: 1, algorithmChecksum: artifact.algorithmChecksum, generatedAt: artifact.generatedAt, policy: artifact.policy });
}
export function createNlheArtifact(policy: NlhePolicy, algorithmChecksum: string, generatedAt: string): NlheArtifact {
  policySchema.parse(policy);
  for (const position of SIX_MAX_POSITIONS.slice(0, -1)) if (![policy.openCoverage[position], policy.vsOpenContinue[position], policy.vsOpenRaise[position]].every(Number.isFinite)) throw new Error('Missing positional policy');
  const checksum = digest(payload({ policy, algorithmChecksum, generatedAt }));
  return { schemaVersion: 1, version: `nlhe-approx-v1-${checksum.slice(0, 12)}`, checksum, algorithmChecksum, generatedAt, policy };
}
export function validateNlheArtifact(artifact: NlheArtifact, algorithmChecksum: string): void {
  const expected = createNlheArtifact(artifact.policy, algorithmChecksum, artifact.generatedAt);
  if (artifact.schemaVersion !== 1 || artifact.algorithmChecksum !== algorithmChecksum || artifact.checksum !== expected.checksum || artifact.version !== expected.version) throw new Error('NLHE artifact integrity/version failure; run pnpm ranges:generate after changing the policy');
}
export function nlheProvenance(artifact: NlheArtifact): NlheProvenance {
  return { sourceType: 'APPROXIMATED', solutionVersion: artifact.version, solverVersion: null, generatedAt: artifact.generatedAt,
    method: artifact.policy.algorithm, accuracy: { status: 'unmeasured', metric: null, value: null },
    license: 'Eigene Rangeform-Lernregeln; keine übernommenen Range-Daten.',
    assumptions: ['6-max NLHE Cash · gleiche effektive Anfangsstacks', 'Blinds 0,5 / 1 BB · keine Antes · Rake 0', 'Open 2,5 BB; SB 3 BB · 3-Bet 9 BB IP / 11 BB OOP, am Stack begrenzt', 'Nur Raise/Fold-RFI, ein Open oder eine 3-Bet; keine Limps, Caller oder Squeezes'],
    limitations: ['APPROXIMATED: handgeordnete Lernregeln, kein Gleichgewicht und keine validierte GTO-Range.', 'Mischungen in groben 25-%-Schritten; kein gemessener EV und keine gemessene Solver-Genauigkeit.', 'Stackwechsel berechnet dieselbe Heuristik neu; es sind keine separat gelösten Stack-Daten.', 'Flop ausschließlich BTN vs BB, 100 BB, A♠ 7♦ 2♣, nach BB-Check; Check oder Bet 1,8 BB.'] };
}
export function preflopConfigurations(): NlheConfig[] {
  return STACK_DEPTHS.flatMap(stackBb => SIX_MAX_POSITIONS.flatMap(hero => {
    const base = { game: 'nlhe' as const, format: '6max-cash' as const, stackBb, hero };
    return [...(hero !== 'BB' ? [{ ...base, scenario: 'rfi' as const, villain: null }] : []),
      ...(['vs-open', 'vs-3bet'] as const).flatMap(scenario => possibleVillains({ hero, scenario }).map(villain => ({ ...base, scenario, villain })))];
  }));
}
export async function algorithmChecksum(): Promise<string> {
  // Normalize checkouts with CRLF. These source files are included in deployment traces.
  const sources = await Promise.all(['src/strategy/nlhe-policy.ts', 'src/domain/holdem.ts'].map(file => readFile(path.join(process.cwd(), file), 'utf8')));
  return digest(sources.map(source => source.replace(/\r\n/g, '\n')).join('\n'));
}
export async function publishNlhePolicy(): Promise<{ artifact: NlheArtifact; validatedSpots: number }> {
  const policy = policySchema.parse(JSON.parse(await readFile('data/nlhe-policy.json', 'utf8')));
  const hash = await algorithmChecksum();
  // Stable generation identity: identical inputs reproduce exactly the same artifact.
  const artifact = createNlheArtifact(policy, hash, '2026-09-08T00:00:00.000Z');
  const configurations = [...preflopConfigurations(), POSTFLOP_CONFIG];
  for (const config of configurations) validateNlheRange(buildNlheRange(config, policy, nlheProvenance(artifact)));
  const directory = path.join(process.cwd(), 'data/nlhe'); await mkdir(directory, { recursive: true });
  const text = JSON.stringify(artifact, null, 2) + '\n'; const file = path.join(directory, `${artifact.version}.json`);
  try { await writeFile(file, text, { flag: 'wx' }); }
  catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'EEXIST' || await readFile(file, 'utf8') !== text) throw error;
  }
  await writeFile(path.join(directory, 'index.json'), JSON.stringify({ version: artifact.version, checksum: artifact.checksum, sourceType: 'APPROXIMATED' }, null, 2) + '\n');
  return { artifact, validatedSpots: configurations.length };
}
