import pg from "pg";

const { Pool } = pg;

/**
 * Next.js dev mode hot-reloads this module on every edit, which would
 * normally create a new pg Pool (and a new batch of DB connections) each
 * time. Stashing the pool on `globalThis` survives the reload so we don't
 * exhaust Supabase's free-tier connection limit while iterating locally.
 * In production (a fresh serverless invocation) this is just a plain
 * module-level singleton.
 */
const globalForDb = globalThis as unknown as { railsightPool?: pg.Pool };

function createPool(): pg.Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Missing DATABASE_URL. Copy .env.example to apps/web/.env.local and fill it in " +
        "(see README.md — Vercel needs this set in Project Settings -> Environment Variables too).",
    );
  }

  // No explicit `ssl` option here on purpose: this mirrors
  // packages/ingestion/src/db.ts, which connects successfully to Supabase's
  // Supavisor transaction pooler using nothing but the connection string
  // (pg parses `sslmode=require` out of the URL itself). Keep both in sync
  // if that ever needs to change.
  return new Pool({ connectionString, max: 5 });
}

export const pool = globalForDb.railsightPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.railsightPool = pool;
}
