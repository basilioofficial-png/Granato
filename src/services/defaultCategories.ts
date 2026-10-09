import { getMeta, setMeta } from '@/db/repositories/appMetaRepo';
import { countCategories, insertCategory } from '@/db/repositories/categoriesRepo';
import type { SqlDatabase } from '@/db/types';
import type { EpochMs } from '@/domain/types';

/** Starter set shown on first launch (see docs/design); the user can rename, recolor or archive them. */
export const DEFAULT_CATEGORIES: readonly { name: string; color: string }[] = [
  { name: 'Работа', color: '#B71F2E' },
  { name: 'Учёба', color: '#4361D8' },
  { name: 'Отдых', color: '#E6A23C' },
  { name: 'Быт', color: '#8C6A52' },
  { name: 'Спорт', color: '#1E8C7A' },
  { name: 'Сон', color: '#4A3F8C' },
  { name: 'Дорога', color: '#8D8D96' },
];

const SEEDED_FLAG = 'default_categories_seeded';

export interface SeedDeps {
  readonly now: EpochMs;
  readonly newId: () => string;
}

/**
 * Creates the starter categories exactly once per database. The flag in app_meta
 * makes it idempotent: if the user later removes every category, they are not
 * recreated behind their back. Returns true if categories were created now.
 */
export function ensureDefaultCategories(db: SqlDatabase, deps: SeedDeps): boolean {
  return db.transaction(() => {
    if (getMeta(db, SEEDED_FLAG) !== null) return false;

    const shouldSeed = countCategories(db) === 0;
    if (shouldSeed) {
      DEFAULT_CATEGORIES.forEach((category, index) => {
        insertCategory(db, {
          id: deps.newId(),
          userId: null,
          parentId: null,
          name: category.name,
          color: category.color,
          icon: null,
          sortOrder: index,
          favoriteRank: index,
          archivedAt: null,
          createdAt: deps.now,
          updatedAt: deps.now,
          deletedAt: null,
        });
      });
    }
    setMeta(db, SEEDED_FLAG, String(deps.now));
    return shouldSeed;
  });
}
