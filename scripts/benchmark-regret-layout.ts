/** Storage-only microbenchmark, not poker convergence evidence. */
import { writeFileSync } from 'node:fs';
const infosets = 100000, updates = 2000000, actions = 4;
const results = [];
for (const kind of ['INDEXED_FLOAT64', 'STRING_MAP_OBJECT']) {
  global.gc?.();
  const before = process.memoryUsage(), started = performance.now();
  const flat = kind === 'INDEXED_FLOAT64' ? new Float64Array(infosets * actions * 2) : null;
  const map = new Map<string, { regret: number[]; sum: number[] }>();
  if (!flat) for (let i = 0; i < infosets; i++) map.set(`public-node:1/player:0/private:${i}`, { regret: [0, 0, 0, 0], sum: [0, 0, 0, 0] });
  const allocated = process.memoryUsage(), allocatedMs = performance.now() - started;
  const t = performance.now();
  let checksum = 0;
  for (let k = 0; k < updates; k++) {
    const id = (k * 7919) % infosets, action = k % actions, value = (k % 7) - 3;
    if (flat) { flat[id * 8 + action] += value; flat[id * 8 + 4 + action] += .25; }
    else { const row = map.get(`public-node:1/player:0/private:${id}`)!; row.regret[action] += value; row.sum[action] += .25; }
  }
  const seconds = (performance.now() - t) / 1000;
  if (flat) for (const v of flat) checksum += v;
  else for (const row of map.values()) checksum += [...row.regret, ...row.sum].reduce((s, x) => s + x, 0);
  results.push({ kind, infosets, updates, seconds, updatesPerSecond: updates / seconds, allocatedMs,
    heapDelta: allocated.heapUsed - before.heapUsed, arrayBufferDelta: allocated.arrayBuffers - before.arrayBuffers, checksum });
}
if (results[0].checksum !== results[1].checksum) throw new Error('Different benchmark work');
const report = { node: process.version, scope: 'STORAGE_ONLY_NOT_TRAVERSAL_OR_CONVERGENCE', results };
writeFileSync(process.argv[2] ?? 'output/regret-layout.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
