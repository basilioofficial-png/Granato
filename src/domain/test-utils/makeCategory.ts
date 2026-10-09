import type { Category } from '@/domain/types';

/** Test-only factory: builds a Category with sensible defaults. */
export function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'category-work',
    userId: null,
    parentId: null,
    name: 'Работа',
    color: '#B3123A',
    icon: null,
    sortOrder: 0,
    favoriteRank: null,
    archivedAt: null,
    createdAt: 0,
    updatedAt: 0,
    deletedAt: null,
    ...overrides,
  };
}
