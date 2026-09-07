import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { runSolverJob } from '../src/solver/pipeline';
import { FileSolutionStorage } from '../src/strategy/storage';

async function main() {
  const iterations = Number(process.argv[2] ?? 100_000);
  const directory = path.join(process.cwd(), 'data', 'solutions');
  const indexPath = path.join(directory, 'index.json');
  const storage = new FileSolutionStorage(directory);
  // Idempotent default build: a published version is revalidated, never regenerated.
  if (!process.argv[2]) {
    try {
      const index = JSON.parse(await readFile(indexPath, 'utf8')) as { version: string; checksum: string; id: string };
      const existing = await storage.read(index.version);
      if (existing.checksum !== index.checksum || existing.id !== index.id) throw new Error('Solution index integrity failure');
      console.log(JSON.stringify({ status: 'validated', version: existing.version, exploitability: existing.accuracy.value }));
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  const artifact = await runSolverJob(directory, iterations);
  console.log(JSON.stringify({ status: 'completed', version: artifact.version, exploitability: artifact.accuracy.value,
    expectedValue: artifact.expectedValue, nodes: artifact.nodes.length, computeTimeMs: artifact.computeTimeMs }));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
