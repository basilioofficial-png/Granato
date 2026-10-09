import { categoryPath, descendantCount } from '@/domain/categories';
import type { Category } from '@/domain/types';
import { pluralRu } from '@/ui/format';

/** Parents of a category as "Работа › Совещания"; empty for a root. */
export function categoryCrumb(categories: readonly Category[], categoryId: string): string {
  return categoryPath(categories, categoryId)
    .slice(0, -1)
    .map((c) => c.name)
    .join(' › ');
}

/** Second line under a category: its parents, or how detailed it is. */
export function categorySubtitle(categories: readonly Category[], categoryId: string): string {
  const crumb = categoryCrumb(categories, categoryId);
  if (crumb) return crumb;
  const count = descendantCount(categories, categoryId);
  return count === 0
    ? 'Без подкатегорий'
    : `${count} ${pluralRu(count, ['активность', 'активности', 'активностей'])}`;
}
