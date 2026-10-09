import type { SqlDatabase } from '@/db/types';
import type { Category } from '@/domain/types';

interface CategoryRow {
  id: string;
  user_id: string | null;
  parent_id: string | null;
  name: string;
  color: string;
  icon: string | null;
  sort_order: number;
  favorite_rank: number | null;
  archived_at: number | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    userId: row.user_id,
    parentId: row.parent_id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    sortOrder: row.sort_order,
    favoriteRank: row.favorite_rank,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function insertCategory(db: SqlDatabase, category: Category): void {
  db.run(
    `INSERT INTO categories (id, user_id, parent_id, name, color, icon, sort_order,
       favorite_rank, archived_at, created_at, updated_at, deleted_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      category.id,
      category.userId,
      category.parentId,
      category.name,
      category.color,
      category.icon,
      category.sortOrder,
      category.favoriteRank,
      category.archivedAt,
      category.createdAt,
      category.updatedAt,
      category.deletedAt,
    ],
  );
}

export function getCategoryById(db: SqlDatabase, id: string): Category | null {
  const row = db.get<CategoryRow>('SELECT * FROM categories WHERE id = ?', [id]);
  return row ? toCategory(row) : null;
}

/** Non-deleted categories (archived ones included unless excluded), in display order. */
export function listCategories(
  db: SqlDatabase,
  options: { includeArchived?: boolean } = {},
): Category[] {
  const archivedFilter = options.includeArchived ? '' : 'AND archived_at IS NULL';
  return db
    .all<CategoryRow>(
      `SELECT * FROM categories
       WHERE deleted_at IS NULL ${archivedFilter}
       ORDER BY sort_order, name`,
    )
    .map(toCategory);
}

export function countCategories(db: SqlDatabase): number {
  return (
    db.get<{ n: number }>('SELECT COUNT(*) AS n FROM categories WHERE deleted_at IS NULL')?.n ?? 0
  );
}
