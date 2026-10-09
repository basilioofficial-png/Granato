import type { TimeEntry } from '@/domain/types';

/**
 * Categories for the "switch in one tap" tiles: most recently used first,
 * without duplicates, deleted entries and the category running right now.
 */
export function recentCategoryIds(
  entries: readonly TimeEntry[],
  excludeCategoryId: string | null,
  limit: number,
): string[] {
  const result: string[] = [];
  const sorted = [...entries]
    .filter((e) => e.deletedAt === null)
    .sort((a, b) => b.startedAt - a.startedAt);
  for (const entry of sorted) {
    if (result.length >= limit) break;
    if (entry.categoryId === excludeCategoryId || result.includes(entry.categoryId)) continue;
    result.push(entry.categoryId);
  }
  return result;
}
