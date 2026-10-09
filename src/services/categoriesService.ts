import { listCategories } from '@/db/repositories/categoriesRepo';
import type { SqlDatabase } from '@/db/types';
import type { Category } from '@/domain/types';

/** Categories the user can start tracking: not deleted, not archived. */
export function listActiveCategories(db: SqlDatabase): Category[] {
  return listCategories(db);
}
