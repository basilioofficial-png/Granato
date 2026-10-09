import { getMeta, setMeta } from '@/db/repositories/appMetaRepo';
import { countCategories, insertCategory } from '@/db/repositories/categoriesRepo';
import type { SqlDatabase } from '@/db/types';
import type { EpochMs } from '@/domain/types';

/** Starter set shown on first launch; the user can rename, recolor or archive them. */
export const DEFAULT_CATEGORIES: readonly { name: string; color: string }[] = [
  { name: 'Работа', color: '#B3123A' },
  { name: 'Отдых', color: '#2E9E6B' },
  { name: 'Сон', color: '#4B5BB5' },
  { name: 'Еда', color: '#E08A1E' },
  { name: 'Дорога', color: '#6B7280' },
  { name: 'Спорт', color: '#0E9BB5' },
  { name: 'Быт', color: '#9B5DE5' },
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
