import {
  getCategoryById,
  insertCategory,
  listCategories,
  updateCategory,
} from '@/db/repositories/categoriesRepo';
import type { SqlDatabase } from '@/db/types';
import {
  branchColor,
  canHaveChildren,
  checkCategoryName,
  isActiveCategory,
  possibleParents,
  type CategoryNameError,
} from '@/domain/categories';
import type { Category, EpochMs } from '@/domain/types';

export interface CategoriesDeps {
  readonly db: SqlDatabase;
  readonly now: () => EpochMs;
  readonly newId: () => string;
}

export type CategoryError =
  | CategoryNameError
  | 'not_found'
  | 'invalid_parent'
  | 'too_deep'
  | 'invalid_color';

export type CategoryResult =
  | { readonly ok: true; readonly category: Category }
  | { readonly ok: false; readonly error: CategoryError };

export interface NewCategory {
  readonly name: string;
  readonly parentId: string | null;
  /** Required for top-level categories; children inherit the branch color. */
  readonly color?: string;
}

export interface CategoryEdit {
  readonly name?: string;
  readonly color?: string;
  readonly parentId?: string | null;
}

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
/** Children are drawn in the branch color; their own color is kept only for data completeness. */
const INHERITED_COLOR_PLACEHOLDER = '#8D8D96';

/** Every non-deleted category, archived ones included (history must still show their names). */
export function listAllCategories(db: SqlDatabase): Category[] {
  return listCategories(db, { includeArchived: true });
}

function nextSortOrder(categories: readonly Category[], parentId: string | null): number {
  const siblings = categories.filter((c) => c.parentId === parentId && c.deletedAt === null);
  return siblings.reduce((max, c) => Math.max(max, c.sortOrder + 1), 0);
}

export function createCategoriesService(deps: CategoriesDeps) {
  const { db } = deps;

  function fail(error: CategoryError): CategoryResult {
    return { ok: false, error };
  }

  return {
    create(input: NewCategory): CategoryResult {
      return db.transaction(() => {
        const all = listAllCategories(db);
        if (input.parentId !== null) {
          if (!isActiveCategory(all, input.parentId)) return fail('invalid_parent');
          if (!canHaveChildren(all, input.parentId)) return fail('too_deep');
        }
        const color = input.parentId === null ? input.color : INHERITED_COLOR_PLACEHOLDER;
        if (!color || !HEX_COLOR.test(color)) return fail('invalid_color');
        const name = checkCategoryName(all, input.name, input.parentId);
        if (!name.ok) return fail(name.error);

        const at = deps.now();
        const category: Category = {
          id: deps.newId(),
          userId: null,
          parentId: input.parentId,
          name: name.name,
          color,
          icon: null,
          sortOrder: nextSortOrder(all, input.parentId),
          favoriteRank: null,
          archivedAt: null,
          createdAt: at,
          updatedAt: at,
          deletedAt: null,
        };
        insertCategory(db, category);
        return { ok: true, category };
      });
    },

    update(id: string, edit: CategoryEdit): CategoryResult {
      return db.transaction(() => {
        const all = listAllCategories(db);
        const current = all.find((c) => c.id === id);
        if (!current) return fail('not_found');

        const parentId = edit.parentId === undefined ? current.parentId : edit.parentId;
        if (parentId !== current.parentId) {
          const allowed = possibleParents(all, id).some((p) => (p?.id ?? null) === parentId);
          if (!allowed) return fail('invalid_parent');
        }
        const name = checkCategoryName(all, edit.name ?? current.name, parentId, id);
        if (!name.ok) return fail(name.error);
        if (edit.color !== undefined && !HEX_COLOR.test(edit.color)) return fail('invalid_color');
        // A category moved to the top level needs its own color: keep the one of its old branch.
        const color =
          edit.color ??
          (parentId === null && current.parentId !== null
            ? (branchColor(all, id) ?? current.color)
            : undefined);

        updateCategory(
          db,
          id,
          {
            name: name.name,
            color,
            parentId,
            sortOrder: parentId !== current.parentId ? nextSortOrder(all, parentId) : undefined,
          },
          deps.now(),
        );
        const updated = getCategoryById(db, id);
        if (!updated) return fail('not_found');
        return { ok: true, category: updated };
      });
    },

    /** Hides the category and its branch from pickers; history keeps it. */
    archive(id: string): CategoryResult {
      return setArchived(id, deps.now());
    },

    restore(id: string): CategoryResult {
      return setArchived(id, null);
    },
  };

  function setArchived(id: string, archivedAt: EpochMs | null): CategoryResult {
    return db.transaction(() => {
      if (!updateCategory(db, id, { archivedAt }, deps.now())) return fail('not_found');
      const category = getCategoryById(db, id);
      return category ? { ok: true, category } : fail('not_found');
    });
  }
}

export type CategoriesService = ReturnType<typeof createCategoriesService>;
