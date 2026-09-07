import { randomUUID } from 'node:crypto';
import { link, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { validateArtifact, type SolutionArtifact } from '../solver/artifact';

export interface SolutionStorage {
  read(version: string): Promise<SolutionArtifact>;
  publish(artifact: SolutionArtifact): Promise<void>;
}

function safeVersion(version: string): string {
  if (!/^cfr1-\d+-[a-f0-9]{12}$/.test(version)) throw new Error('Invalid solution version');
  return version;
}

/** Immutable object storage adapter; replace with versioned S3 objects in production. */
export class FileSolutionStorage implements SolutionStorage {
  constructor(private readonly directory = path.join(process.cwd(), 'data', 'solutions')) {}

  async read(version: string): Promise<SolutionArtifact> {
    const artifact = JSON.parse(await readFile(path.join(this.directory, `${safeVersion(version)}.json`), 'utf8')) as SolutionArtifact;
    validateArtifact(artifact);
    if (artifact.version !== version) throw new Error('Artifact version does not match requested object');
    return artifact;
  }

  async publish(artifact: SolutionArtifact): Promise<void> {
    validateArtifact(artifact);
    await mkdir(this.directory, { recursive: true });
    const filename = path.join(this.directory, `${safeVersion(artifact.version)}.json`);
    const temporary = path.join(this.directory, `.${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, `${JSON.stringify(artifact, null, 2)}\n`, { flag: 'wx', flush: true });
      // Hard-link publication is atomic and cannot replace an existing object.
      await link(temporary, filename);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const existing = await this.read(artifact.version);
      if (existing.checksum !== artifact.checksum) throw new Error('Immutable solution already exists; refusing overwrite');
    } finally {
      await unlink(temporary).catch(error => { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; });
    }
  }
}
