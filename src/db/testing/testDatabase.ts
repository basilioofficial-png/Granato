import { configureConnection } from '@/db/connection';
import { migrate } from '@/db/migrations';
import { openTestDatabase } from '@/db/testing/nodeSqliteDatabase';
import type { SqlDatabase } from '@/db/types';

/** Test-only: in-memory database with the full current schema. */
export function createMigratedTestDatabase(): SqlDatabase {
  const db = openTestDatabase();
  configureConnection(db);
  migrate(db);
  return db;
}
