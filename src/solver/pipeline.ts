import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { FileSolutionStorage } from '../strategy/storage';
import { buildArtifact, hash, type SolutionArtifact } from './artifact';
import { KUHN_CONFIG, SOLVER_VERSION } from './kuhn';

export interface SolverJob {
  id: string;
  status: 'queued' | 'running' | 'validating' | 'completed' | 'failed';
  iterations: number;
  configHash: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  computeTimeMs?: number;
  solutionVersion?: string;
  exploitability?: number;
  error?: string;
}

async function atomicJSON(filename: string, value: unknown): Promise<void> {
  const temporary = `${filename}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', flush: true });
    await rename(temporary, filename);
  } finally {
    await unlink(temporary).catch(error => { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; });
  }
}

export function jobId(iterations: number): string {
  return `kuhn-${hash({ config: KUHN_CONFIG, solver: SOLVER_VERSION, iterations }).slice(0, 24)}`;
}

/** Local single-job worker. The exclusive lock deduplicates simultaneous jobs;
 * durable state supports inspection/retry. This is not a distributed scheduler.
 * After a process crash, an operator verifies no worker is alive, removes the
 * stale .lock file, and reruns. A completed artifact is never mutated.
 */
export async function runSolverJob(directory: string, iterations = 100_000): Promise<SolutionArtifact> {
  if (!Number.isSafeInteger(iterations) || iterations < 1 || iterations > 10_000_000) throw new Error('Invalid iterations');
  await mkdir(path.join(directory, 'jobs'), { recursive: true });
  const id = jobId(iterations);
  const filename = path.join(directory, 'jobs', `${id}.json`);
  const lock = path.join(directory, 'jobs', `${id}.lock`);
  const storage = new FileSolutionStorage(directory);
  await writeFile(lock, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }), { flag: 'wx', flush: true });
  let job: SolverJob = { id, status: 'queued', iterations, configHash: hash(KUHN_CONFIG), createdAt: new Date().toISOString() };
  try {
    try {
      const previous = JSON.parse(await readFile(filename, 'utf8')) as SolverJob;
      if (previous.id !== id || previous.configHash !== job.configHash || previous.iterations !== iterations) {
        throw new Error('Job metadata integrity failure');
      }
      if (previous.status === 'completed' && previous.solutionVersion) return await storage.read(previous.solutionVersion);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    await atomicJSON(filename, job);
    job = { ...job, status: 'running', startedAt: new Date().toISOString() };
    await atomicJSON(filename, job);
    let artifact: SolutionArtifact | undefined;
    try {
      const index = JSON.parse(await readFile(path.join(directory, 'index.json'), 'utf8')) as { version: string; checksum: string };
      const existing = await storage.read(index.version);
      if (existing.checksum !== index.checksum) throw new Error('Solution index integrity failure');
      if (existing.iterations === iterations && existing.solverVersion === SOLVER_VERSION) artifact = existing;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    artifact ??= buildArtifact(iterations);
    // Recover an object published before a worker crashed while updating its index.
    // The validated version binds the deterministic policy; preserve original metadata.
    try {
      artifact = await storage.read(artifact.version);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    job = { ...job, status: 'validating' };
    await atomicJSON(filename, job);
    await storage.publish(artifact);
    // Publish discoverability only after the immutable object passes validation.
    await atomicJSON(path.join(directory, 'index.json'), { id: artifact.id, version: artifact.version, checksum: artifact.checksum });
    job = { ...job, status: 'completed', completedAt: new Date().toISOString(), computeTimeMs: artifact.computeTimeMs,
      solutionVersion: artifact.version, exploitability: artifact.accuracy.value };
    await atomicJSON(filename, job);
    return artifact;
  } catch (error) {
    await atomicJSON(filename, { ...job, status: 'failed', completedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown failure' });
    throw error;
  } finally {
    await unlink(lock);
  }
}
