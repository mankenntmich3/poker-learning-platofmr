/** Same chance draws/updates as the standalone C++ diagnostic kernel. */
import { readFileSync, writeFileSync } from 'node:fs';
const input = readFileSync(process.argv[2]); let cursor = 0;
const int = () => { const x = input.readInt32LE(cursor); cursor += 4; return x; };
const double = () => { const x = input.readDoubleLE(cursor); cursor += 8; return x; };
if (int() !== 0x32564652) throw new Error('Invalid interchange');
const n = int(), worlds = int(), size = int();
if (n < 1 || n > 1000 || worlds < 1 || worlds > 2000000 || size < 1 || size > 4000000) throw new Error('Bounded diagnostic input required');
const nodes = Array.from({ length: n }, () => ({ actor: int(), street: int(), count: int(), offset: int(), child: Array.from({ length: 5 }, int), payoff: Array.from({ length: 3 }, double) }));
const data = new Int16Array(input.buffer, input.byteOffset + cursor, worlds * 5);
const regret = new Float64Array(size), sum = new Float64Array(size), policy = new Float64Array(size), delta = new Float64Array(size), average = new Float64Array(size);
const value = new Float64Array(n), reach = new Float64Array(2 * n), index = new Int32Array(n);
const iterations = Number(process.argv[4]); if (!Number.isInteger(iterations) || iterations < 1 || iterations > 10000) throw new Error('Iteration bound');
let rng = 17, visits = 0;
const random = () => { rng ^= rng << 13; rng ^= rng >>> 17; rng ^= rng << 5; return rng >>> 0; };
const sample = () => { const limit = Math.floor(0xffffffff / worlds) * worlds; let x: number; do { x = random() - 1; } while (x >= limit); return x % worlds; };
const start = performance.now();
for (let iteration = 0; iteration < iterations; iteration++) {
  delta.fill(0);
  for (const x of nodes) if (x.actor >= 0) for (let h = 0; h < (x.street ? 9126 : 169); h++) {
    const at = x.offset + h * x.count; let total = 0;
    for (let a = 0; a < x.count; a++) total += Math.max(0, regret[at + a]);
    for (let a = 0; a < x.count; a++) policy[at + a] = total > 0 ? Math.max(0, regret[at + a]) / total : 1 / x.count;
  }
  for (let draw = 0; draw < 256; draw++) {
    const w = sample(); reach.fill(0); reach[0] = reach[n] = 1;
    for (let i = 0; i < n; i++) {
      const x = nodes[i]; if (x.actor < 0) { value[i] = x.payoff[data[w * 5 + 4]]; continue; }
      if (reach[i] === 0 && reach[n + i] === 0) continue;
      const at = x.offset + data[w * 5 + x.actor + 2 * x.street] * x.count; index[i] = at;
      for (let a = 0; a < x.count; a++) { reach[x.actor * n + x.child[a]] = reach[x.actor * n + i] * policy[at + a]; reach[(1 - x.actor) * n + x.child[a]] = reach[(1 - x.actor) * n + i]; }
    }
    for (let i = n - 1; i >= 0; i--) {
      const x = nodes[i]; if (x.actor < 0) continue; const at = index[i]; let v = 0;
      for (let a = 0; a < x.count; a++) v += policy[at + a] * value[x.child[a]]; value[i] = v;
      if (reach[i] === 0 && reach[n + i] === 0) continue; visits++;
      for (let a = 0; a < x.count; a++) { delta[at + a] += reach[(1 - x.actor) * n + i] * (value[x.child[a]] - v) * (x.actor ? -1 : 1) / 256; sum[at + a] += reach[x.actor * n + i] * policy[at + a] / 256; }
    }
  }
  for (let k = 0; k < size; k++) regret[k] += delta[k];
}
for (const x of nodes) if (x.actor >= 0) for (let h = 0; h < (x.street ? 9126 : 169); h++) {
  const at = x.offset + h * x.count; let total = 0;
  for (let a = 0; a < x.count; a++) total += sum[at + a];
  for (let a = 0; a < x.count; a++) average[at + a] = total > 0 ? sum[at + a] / total : 1 / x.count;
}
const seconds = (performance.now() - start) / 1000;
writeFileSync(process.argv[3], Buffer.from(average.buffer));
console.log(JSON.stringify({ language: 'TypeScript/Node', seconds, visitedDecisionNodes: visits, nodesPerSecond: visits / seconds, numericBufferBytes: (size * 5 + n * 3) * 8, publicationEligible: false }));
