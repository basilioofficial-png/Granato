import { migration001Init } from '@/db/migrations/001_init';
import type { Migration } from '@/db/migrations/types';
import type { SqlDatabase } from '@/db/types';

export const MIGRATIONS: readonly Migration[] = [migration001Init];

export function getSchemaVersion(db: SqlDatabase): number {
  return db.get<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;
}

export interface MigrationResult {
  readonly fromVersion: number;
  readonly toVersion: number;
}

/**
 * Applies pending migrations in order, each in its own transaction together with
 * the version bump, so a crash can never leave a half-applied migration.
 */
export function migrate(db: SqlDatabase, migrations: readonly Migration[] = MIGRATIONS): MigrationResult {
  migrations.forEach((migration, index) => {
    if (migration.version !== index + 1) {
      throw new Error(`Migration versions must be sequential, got ${migration.version} at #${index + 1}`);
    }
  });

  const fromVersion = getSchemaVersion(db);
  const latest = migrations.length;
  if (fromVersion > latest) {
    throw new Error(
      `Database schema v${fromVersion} is newer than this app supports (v${latest}). Update the app.`,
    );
  }

  for (const migration of migrations.slice(fromVersion)) {
    db.transaction(() => {
      db.exec(migration.sql);
      db.exec(`PRAGMA user_version = ${migration.version}`);
    });
  }
  return { fromVersion, toVersion: getSchemaVersion(db) };
}
