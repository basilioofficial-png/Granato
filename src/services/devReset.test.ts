import { listCategories } from '@/db/repositories/categoriesRepo';
import { openTestDatabase } from '@/db/testing/nodeSqliteDatabase';
import { DEFAULT_CATEGORIES } from '@/services/defaultCategories';
import { resetLocalData } from '@/services/devReset';
import { initializeStorage } from '@/services/storage';
import { createTrackingService } from '@/services/trackingService';

describe('resetLocalData', () => {
  it('removes all entries and recreates the starter categories', () => {
    const db = openTestDatabase();
    let n = 0;
    const newId = () => `id-${++n}`;
    initializeStorage(db, { now: 1, newId });
    db.run("UPDATE categories SET name = 'Переименовано'");
    const tracking = createTrackingService({ db, now: () => 2, newId, timeZone: () => 'UTC' });
    const first = listCategories(db)[0];
    if (!first) throw new Error('no categories');
    tracking.start(first.id);

    resetLocalData(db, { now: 3, newId });

    expect(db.get<{ n: number }>('SELECT COUNT(*) AS n FROM time_entries')?.n).toBe(0);
    expect(listCategories(db).map((c) => c.name)).toEqual(DEFAULT_CATEGORIES.map((c) => c.name));
    expect(tracking.getRunning()).toBeNull();
  });
});
