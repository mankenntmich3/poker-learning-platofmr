import { readFile } from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { Pool } from 'pg';

export type SqlRow = Record<string, unknown>;
export interface Database {
  query<T extends SqlRow = SqlRow>(sql: string, params?: unknown[]): Promise<T[]>;
  close(): Promise<void>;
}

/** The identical versioned SQL runs against PostgreSQL and local PostgreSQL WASM. */
export async function migrate(db: Database): Promise<void> {
  const sql = await readFile(path.join(process.cwd(), 'migrations/001_initial.sql'), 'utf8');
  await db.query(`BEGIN;\n${sql}\nCOMMIT;`);
}

export async function createMemoryDatabase(): Promise<Database> {
  const engine = new PGlite();
  const db: Database = {
    query: async <T extends SqlRow>(sql: string, params?: unknown[]) => {
      if (!params && sql.includes(';')) { await engine.exec(sql); return [] as T[]; }
      return (await engine.query<T>(sql, params)).rows;
    },
    close: () => engine.close(),
  };
  await migrate(db);
  return db;
}

async function connectDatabase(): Promise<Database> {
  if (process.env.DATABASE_URL) {
    return createPostgresDatabase(process.env.DATABASE_URL);
  }
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_LOCAL_DB !== '1') {
    throw new Error('Production requires DATABASE_URL; explicit single-process local mode requires ALLOW_LOCAL_DB=1.');
  }
  return createLocalDatabase(path.resolve(process.cwd(), process.env.DATA_DIR ?? '.data/postgres'));
}

export async function createLocalDatabase(directory: string): Promise<Database> {
  await mkdir(directory, { recursive: true });
  const engine = new PGlite(directory);
  const db: Database = {
    query: async <T extends SqlRow>(sql: string, params?: unknown[]) => {
      if (!params && sql.includes(';')) { await engine.exec(sql); return [] as T[]; }
      return (await engine.query<T>(sql, params)).rows;
    },
    close: () => engine.close(),
  };
  try { await migrate(db); return db; } catch (error) { await db.close(); throw error; }
}

/** TEST_DATABASE_URL must point to a dedicated test database when used in tests. */
export async function createPostgresDatabase(connectionString: string): Promise<Database> {
  const pool = new Pool({ connectionString, max: 5,
    connectionTimeoutMillis: 5_000, idleTimeoutMillis: 30_000,
    // TLS policy is part of DATABASE_URL. Never disable certificate verification.
  });
  pool.on('error', () => { console.error(JSON.stringify({ event: 'database.pool_error' })); });
  const db: Database = {
    query: async <T extends SqlRow>(sql: string, params?: unknown[]) => {
      const result = await pool.query(sql, params);
      return (Array.isArray(result) ? result.at(-1)?.rows ?? [] : result.rows) as T[];
    },
    close: () => pool.end(),
  };
  try {
    // Serialize schema initialization across replicas using one held connection.
    const client = await pool.connect();
    try {
      await client.query('SELECT pg_advisory_lock($1)', [764527091]);
      try {
        await migrate({
          query: async <T extends SqlRow>(sql: string, params?: unknown[]) => {
            const result = await client.query(sql, params);
            return (Array.isArray(result) ? result.at(-1)?.rows ?? [] : result.rows) as T[];
          },
          close: async () => {},
        });
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { await client.query('SELECT pg_advisory_unlock($1)', [764527091]); }
    } finally { client.release(); }
    return db;
  } catch (error) { await db.close(); throw error; }
}

const globalDb = globalThis as typeof globalThis & { studyDatabase?: Promise<Database> };
export function getDatabase(): Promise<Database> {
  if (!globalDb.studyDatabase) {
    globalDb.studyDatabase = connectDatabase().catch((error) => {
      globalDb.studyDatabase = undefined;
      throw error;
    });
  }
  return globalDb.studyDatabase;
}
