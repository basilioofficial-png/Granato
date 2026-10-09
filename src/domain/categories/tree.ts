import type { Category } from '@/domain/types';

/** Levels in the tree: category › activity › refinement (as in the design). */
export const MAX_CATEGORY_DEPTH = 3;

/**
 * A category can be tracked and is shown in pickers only if neither it nor any
 * ancestor is archived or deleted: archiving a category hides its whole branch.
 */
export function isActiveCategory(categories: readonly Category[], categoryId: string): boolean {
  const path = categoryPath(categories, categoryId);
  return (
    path.length > 0 &&
    path.at(-1)?.id === categoryId &&
    path.every((c) => c.deletedAt === null && c.archivedAt === null)
  );
}

function isVisible(category: Category): boolean {
  return category.deletedAt === null && category.archivedAt === null;
}

/** Path from the root to `categoryId`, e.g. [Работа, Совещания, Планёрка]. Empty if not found. */
export function categoryPath(categories: readonly Category[], categoryId: string): Category[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const path: Category[] = [];
  let current = byId.get(categoryId);
  // The length guard protects against a broken parent cycle in stored data.
  while (current && path.length <= categories.length) {
    path.unshift(current);
    current = current.parentId === null ? undefined : byId.get(current.parentId);
  }
  return path;
}

/** Visible direct children of `parentId` (`null` = roots) in display order. */
export function childCategories(
  categories: readonly Category[],
  parentId: string | null,
): Category[] {
  return categories
    .filter((c) => c.parentId === parentId && isVisible(c))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

/** Number of visible categories anywhere below `categoryId`. */
export function descendantCount(categories: readonly Category[], categoryId: string): number {
  return childCategories(categories, categoryId).reduce(
    (sum, child) => sum + 1 + descendantCount(categories, child.id),
    0,
  );
}

/** Color of the root category: the whole branch shares it, as in the design. */
export function branchColor(categories: readonly Category[], categoryId: string): string | null {
  return categoryPath(categories, categoryId)[0]?.color ?? null;
}

/** 0 for a root, 1 for its child, … */
export function categoryDepth(categories: readonly Category[], categoryId: string): number {
  return Math.max(categoryPath(categories, categoryId).length - 1, 0);
}

/** Whether a new child may be created under `categoryId` without exceeding the depth limit. */
export function canHaveChildren(categories: readonly Category[], categoryId: string): boolean {
  return categoryDepth(categories, categoryId) < MAX_CATEGORY_DEPTH - 1;
}

/** `categoryId` and everything below it, regardless of archive state. */
export function subtreeIds(categories: readonly Category[], categoryId: string): Set<string> {
  const ids = new Set<string>([categoryId]);
  let added = true;
  while (added) {
    added = false;
    for (const c of categories) {
      if (c.parentId !== null && ids.has(c.parentId) && !ids.has(c.id)) {
        ids.add(c.id);
        added = true;
      }
    }
  }
  return ids;
}

/** Number of levels in the subtree of `categoryId`, counting itself (a leaf has height 1). */
function subtreeHeight(categories: readonly Category[], categoryId: string): number {
  const children = categories.filter((c) => c.parentId === categoryId && c.deletedAt === null);
  return 1 + Math.max(0, ...children.map((c) => subtreeHeight(categories, c.id)));
}

/**
 * Where `categoryId` may be moved: `null` (top level) or an active category that is
 * not inside its own subtree and keeps the whole branch within the depth limit.
 */
export function possibleParents(
  categories: readonly Category[],
  categoryId: string,
): (Category | null)[] {
  const own = subtreeIds(categories, categoryId);
  const height = subtreeHeight(categories, categoryId);
  const parents = categories.filter(
    (c) =>
      !own.has(c.id) &&
      isActiveCategory(categories, c.id) &&
      categoryDepth(categories, c.id) + 1 + height <= MAX_CATEGORY_DEPTH,
  );
  return [null, ...parents];
}
