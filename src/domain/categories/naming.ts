import type { Category } from '@/domain/types';

export const MAX_CATEGORY_NAME_LENGTH = 40;

export type CategoryNameError = 'empty' | 'too_long' | 'duplicate';

export type CategoryNameCheck =
  | { readonly ok: true; readonly name: string }
  | { readonly ok: false; readonly error: CategoryNameError };

/**
 * Trims the name and checks it: not empty, not too long, and unique among
 * siblings (case-insensitive), so the picker never shows two identical rows.
 */
export function checkCategoryName(
  categories: readonly Category[],
  rawName: string,
  parentId: string | null,
  excludeId?: string,
): CategoryNameCheck {
  const name = rawName.trim().replace(/\s+/g, ' ');
  if (name.length === 0) return { ok: false, error: 'empty' };
  if (name.length > MAX_CATEGORY_NAME_LENGTH) return { ok: false, error: 'too_long' };
  const lower = name.toLocaleLowerCase('ru');
  const duplicate = categories.some(
    (c) =>
      c.id !== excludeId &&
      c.deletedAt === null &&
      c.parentId === parentId &&
      c.name.toLocaleLowerCase('ru') === lower,
  );
  return duplicate ? { ok: false, error: 'duplicate' } : { ok: true, name };
}
