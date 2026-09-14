import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import { createLocalDatabase } from '../src/server/db';
import { requireDevelopmentDatabase } from '../src/server/development';
import { recordUnverifiedAttempt } from '../src/server/solver-attempts';

async function main() {
  if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') throw new Error('Development-only diagnostic recorder.');
  Object.assign(process.env, { NODE_ENV: 'development' }); loadEnvConfig(process.cwd(), true); requireDevelopmentDatabase();
  const files = process.argv.slice(2);
  if (!files.length || files.length > 8) throw new Error('Provide one to eight experiment reports.');
  const db = await createLocalDatabase(path.resolve(process.env.DATA_DIR ?? '.data/preflop-attempts'));
  try {
    for (const file of files) {
      const report: unknown = JSON.parse(await readFile(file, 'utf8'));
      console.log(JSON.stringify({ jobId: await recordUnverifiedAttempt(db, report), file, published: false }));
    }
  } finally { await db.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
