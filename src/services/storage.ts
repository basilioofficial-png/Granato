import { configureConnection } from '@/db/connection';
import { migrate } from '@/db/migrations';
import { countCategories } from '@/db/repositories/categoriesRepo';
import type { SqlDatabase } from '@/db/types';
import { ensureDefaultCategories, type SeedDeps } from '@/services/defaultCategories';

export interface StorageStatus {
  readonly schemaVersion: number;
  readonly migratedFrom: number;
  readonly categoriesCount: number;
  readonly seededNow: boolean;
}

/** Prepares a freshly opened database: settings, migrations, starter data. */
export function initializeStorage(db: SqlDatabase, deps: SeedDeps): StorageStatus {
  configureConnection(db);
  const { fromVersion, toVersion } = migrate(db);
  const seededNow = ensureDefaultCategories(db, deps);
  return {
    schemaVersion: toVersion,
    migratedFrom: fromVersion,
    categoriesCount: countCategories(db),
    seededNow,
  };
}
