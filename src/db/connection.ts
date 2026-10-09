import type { SqlDatabase } from '@/db/types';

/** Per-connection settings; must run before migrations. */
export function configureConnection(db: SqlDatabase): void {
  // WAL keeps the database consistent if the app is killed mid-write.
  db.exec('PRAGMA journal_mode = WAL;');
  // SQLite does not enforce REFERENCES unless asked to.
  db.exec('PRAGMA foreign_keys = ON;');
}
