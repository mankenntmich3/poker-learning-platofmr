import { copyFile, constants } from 'node:fs/promises';
import { loadEnvConfig } from '@next/env';
import { createLocalDatabase } from '../src/server/db';
import { DEVELOPMENT_DEMO, requireDevelopmentDatabase } from '../src/server/development';
import { seedDevelopmentAccount } from '../src/server/seed';
import path from 'node:path';

async function main() {
  const command = process.argv[2];
  if (!['setup', 'migrate', 'seed', 'reset'].includes(command)) throw new Error('Erwartet: setup, migrate, seed oder reset.');
  if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') throw new Error('Dieser Befehl ist nur für NODE_ENV=development erlaubt.');
  Object.assign(process.env, { NODE_ENV: 'development' });
  if (command === 'setup') {
    try { await copyFile('.env.example', '.env.local', constants.COPYFILE_EXCL); }
    catch (error) { if (!(error instanceof Error) || !('code' in error) || error.code !== 'EEXIST') throw error; }
  }
  loadEnvConfig(process.cwd(), true);
  requireDevelopmentDatabase();
  if (command === 'reset' && !process.argv.includes('--confirm')) throw new Error('Reset löscht lokale Konten und Fortschritt. Bestätigen: pnpm db:reset --confirm');
  const directory = path.resolve(process.cwd(), process.env.DATA_DIR || '.data/postgres');
  const db = await createLocalDatabase(directory);
  try {
    if (command === 'seed') {
      await seedDevelopmentAccount(db);
      console.log(`Demo-Zugang bereit: ${DEVELOPMENT_DEMO.email} / ${DEVELOPMENT_DEMO.password}`);
    } else if (command === 'reset') {
      await db.query('TRUNCATE study_users, study_sessions, lesson_completions, training_decisions, request_limits CASCADE;');
      console.log('Lokale Konten und Fortschritt gelöscht. Nächster Schritt: pnpm db:seed');
    } else console.log(`Lokale Datenbank und Migrationen bereit: ${directory}`);
  } finally { await db.close(); }
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Lokale Einrichtung fehlgeschlagen.'); process.exitCode = 1; });
