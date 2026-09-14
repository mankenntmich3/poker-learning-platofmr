/** Execute the existing independent external-sampling algorithm on V2's same finite game. */
import { readFileSync, writeFileSync } from 'node:fs';
import { runExternalSampling, type SamplingGame } from '../src/solver/external-sampling';
const input = readFileSync('output/v2-language-input.bin'); let cursor = 0;
const int = () => { const x = input.readInt32LE(cursor); cursor += 4; return x; };
const double = () => { const x = input.readDoubleLE(cursor); cursor += 8; return x; };
if (int() !== 0x32564652) throw new Error('Wrong interchange');
const n = int(), worlds = int(), size = int();
const nodes = Array.from({ length: n }, () => ({ actor: int(), street: int(), count: int(), offset: int(), child: Array.from({ length: 5 }, int), payoff: Array.from({ length: 3 }, double) }));
const data = new Int16Array(input.buffer, input.byteOffset + cursor, worlds * 5);
const game: SamplingGame<{ node: number; world: number }> = {
  players: 2,
  sampleRoot: random => ({ node: 0, world: random.integer(worlds) }),
  inspect: state => {
    const x = nodes[state.node];
    if (x.actor < 0) { const value = x.payoff[data[state.world * 5 + 4]]; return { kind: 'terminal', payoff: [value, -value] }; }
    return { kind: 'decision', player: x.actor, key: String(x.offset + data[state.world * 5 + x.actor + 2 * x.street] * x.count),
      actions: x.child.slice(0, x.count).map((node, a) => ({ id: String(a), child: { node, world: state.world } })) };
  },
};
const result = runExternalSampling(game, 17, { iterations: 256000, runtimeMs: 30000, nodes: 30000000, infosets: 300000, heapBytes: 768 * 1024 * 1024 });
const average = new Float64Array(size);
for (const x of nodes) if (x.actor >= 0) for (let h = 0; h < (x.street ? 9126 : 169); h++) {
  const at = x.offset + h * x.count, row = result.profile[String(at)];
  for (let a = 0; a < x.count; a++) average[at + a] = row?.actions[String(a)] ?? 1 / x.count;
}
writeFileSync('output/v2-external-profile.bin', Buffer.from(average.buffer));
const { profile: _profile, observedRootInformationSets: _roots, ...report } = result;
void _profile; void _roots;
writeFileSync('output/v2-external-benchmark.json', JSON.stringify({ ...report, scope: 'FINITE_V2_ABSTRACT_GAME', publicationEligible: false }, null, 2));
console.log(JSON.stringify({ algorithm: result.algorithm, nodes: result.nodes, runtimeMs: result.runtimeMs, iterations: result.iterations, infosets: result.infosets, publicationEligible: false }));
