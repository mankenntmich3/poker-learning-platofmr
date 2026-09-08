import { createPostgresDatabase } from '../src/server/db';

async function main() {
  if (!process.env.DATABASE_URL || process.env.ALLOW_LOCAL_DB) throw new Error('Hosted migration requires DATABASE_URL, without ALLOW_LOCAL_DB.');
  const db = await createPostgresDatabase(process.env.DATABASE_URL);
  await db.close();
  console.log('Hosted PostgreSQL migrations applied. No demo account or user data seeded.');
}
main().catch(() => { console.error('Hosted migration failed. Check the configured database connection; connection details are not logged.'); process.exitCode = 1; });
