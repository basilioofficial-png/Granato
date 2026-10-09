import type { SqlDatabase } from '@/db/types';
import { ensureDefaultCategories, type SeedDeps } from '@/services/defaultCategories';

/**
 * Development-only: permanently erases all local data and recreates the starter
 * categories. The UI shows it only in development builds and asks for confirmation.
 *
 * Two transactions (SQLite has no nested ones). If the app dies between them,
 * the seeded flag is already gone, so the next launch recreates the categories.
 */
export function resetLocalData(db: SqlDatabase, deps: SeedDeps): void {
  db.transaction(() => {
    db.exec(`
      DELETE FROM time_entries;
      DELETE FROM experiments;
      DELETE FROM categories;
      DELETE FROM app_meta;
    `);
  });
  ensureDefaultCategories(db, deps);
}
