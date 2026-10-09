import type { Category } from '@/domain/types';

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
