/**
 * One-time backfill script: Set lastUsedAt = createdAt for sessions with null lastUsedAt.
 *
 * This fixes legacy sessions created before the lastUsedAt tracking was added,
 * which display "Active Never" in the UI.
 *
 * Usage:
 *   npx tsx prisma/backfill-session-timestamps.ts
 *
 * Prerequisites:
 *   - DATABASE_URL environment variable must be set
 *   - Database must be accessible
 */

import { Pool } from 'pg';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is not set.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: false,
  });

  try {
    console.log('Backfilling session timestamps...');
    console.log('Setting lastUsedAt = createdAt for sessions where lastUsedAt IS NULL...\n');

    const result = await pool.query(
      `UPDATE "sessions" SET "last_used_at" = "created_at" WHERE "last_used_at" IS NULL`
    );

    const rowCount = result.rowCount ?? 0;
    console.log(`Done. Updated ${rowCount} session${rowCount === 1 ? '' : 's'}.`);

    if (rowCount === 0) {
      console.log('No sessions had null lastUsedAt — nothing to backfill.');
    }
  } catch (error) {
    console.error('Error during backfill:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
