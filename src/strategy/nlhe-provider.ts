import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createCombo, type Combo } from '@/domain/cards';
import { algorithmChecksum, nlheProvenance, validateNlheArtifact, type NlheArtifact } from '@/solver/nlhe-artifact';
import { buildNlheRange, validateNlheRange } from './nlhe-policy';
import { applyStudySizing } from './sizing-approximation';
import { studyVersion } from './study-version';
import type { StrategyProvider } from './types';
import { validNlheConfig, type NlheConfig, type NlheNode, type NlheRange, type NlheComboStrategy, type NlheFrequency } from '@/shared/nlhe';

/** Same provider contract as the regression solver; NLHE EVs are explicitly unavailable. */
export class NlhePolicyProvider implements StrategyProvider<NlheConfig, Combo, NlheNode, NlheRange, NlheComboStrategy, NlheFrequency> {
  constructor(private readonly artifact: NlheArtifact) {}
  async hasSolution(state: NlheConfig) { return validNlheConfig(state); }
  async getRangeStrategy(state: NlheConfig): Promise<NlheRange> {
    const range = buildNlheRange(state, this.artifact.policy, nlheProvenance(this.artifact));
    validateNlheRange(range); const result=applyStudySizing(range, state);
    if(state.openBb!==undefined && state.scenario!=='flop-srp')result.provenance.solutionVersion=`${range.provenance.solutionVersion}:${await studyVersion()}`;
    return result;
  }
  async getNode(state: NlheConfig): Promise<NlheNode> {
    const range = await this.getRangeStrategy(state);
    const { combos, ...node } = range; void combos; return node;
  }
  async getComboStrategy(state: NlheConfig, combo: Combo) {
    const cards = createCombo(...combo);
    const found = (await this.getRangeStrategy(state)).combos.find(c => c.cards.join('') === cards.join(''));
    if (!found) throw new Error('Blocked or unknown NLHE combo'); return found;
  }
  async getActionEVs(state: NlheConfig, combo: Combo) { return (await this.getComboStrategy(state, combo)).actions; }
  async getNextNodes(state: NlheConfig) { return Promise.all((await this.getNode(state)).related.map(next => this.getNode(next))); }
}
let pending: Promise<NlhePolicyProvider> | undefined;
export function getNlheProvider(): Promise<NlhePolicyProvider> {
  if (!pending) pending = (async () => {
    const index = JSON.parse(await readFile(path.join(process.cwd(), 'data/nlhe/index.json'), 'utf8')) as { version: string; checksum: string };
    if (!/^nlhe-approx-v1-[a-f0-9]{12}$/.test(index.version)) throw new Error('Invalid NLHE index');
    const artifact = JSON.parse(await readFile(path.join(process.cwd(), 'data/nlhe', `${index.version}.json`), 'utf8')) as NlheArtifact;
    validateNlheArtifact(artifact, await algorithmChecksum());
    if (artifact.checksum !== index.checksum || artifact.version !== index.version) throw new Error('NLHE index mismatch');
    return new NlhePolicyProvider(artifact);
  })().catch(error => { pending = undefined; throw error; });
  return pending;
}
