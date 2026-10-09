import { configureConnection } from '@/db/connection';
import { listCategories } from '@/db/repositories/categoriesRepo';
import { openTestDatabase } from '@/db/testing/nodeSqliteDatabase';
import { DEFAULT_CATEGORIES, ensureDefaultCategories } from '@/services/defaultCategories';
import { initializeStorage } from '@/services/storage';

const NOW = Date.UTC(2026, 9, 9, 12, 0);

function idGenerator() {
  let n = 0;
  return () => `id-${++n}`;
}

describe('initializeStorage', () => {
  it('on first launch migrates and creates the starter categories', () => {
    const db = openTestDatabase();
    const status = initializeStorage(db, { now: NOW, newId: idGenerator() });

    expect(status).toEqual({
      schemaVersion: 1,
      migratedFrom: 0,
      categoriesCount: DEFAULT_CATEGORIES.length,
      seededNow: true,
    });
    const categories = listCategories(db);
    expect(categories.map((c) => c.name)).toEqual([
      'Работа',
      'Учёба',
      'Отдых',
      'Быт',
      'Спорт',
      'Сон',
      'Дорога',
    ]);
    expect(categories.every((c) => c.parentId === null && c.favoriteRank !== null)).toBe(true);
  });

  it('on the next launch does not duplicate categories', () => {
    const db = openTestDatabase();
    initializeStorage(db, { now: NOW, newId: idGenerator() });
    const second = initializeStorage(db, { now: NOW + 1000, newId: idGenerator() });

    expect(second).toEqual({
      schemaVersion: 1,
      migratedFrom: 1,
      categoriesCount: DEFAULT_CATEGORIES.length,
      seededNow: false,
    });
  });
});

describe('ensureDefaultCategories', () => {
  it('does not recreate categories after the user removed them all', () => {
    const db = openTestDatabase();
    initializeStorage(db, { now: NOW, newId: idGenerator() });
    db.run('UPDATE categories SET deleted_at = ?', [NOW + 1]);

    expect(ensureDefaultCategories(db, { now: NOW + 2, newId: idGenerator() })).toBe(false);
    expect(listCategories(db)).toEqual([]);
  });

  it('does not add starter categories to a database that already has some', () => {
    const db = openTestDatabase();
    configureConnection(db);
    initializeStorage(db, { now: NOW, newId: idGenerator() });
    db.run('DELETE FROM app_meta');
    expect(ensureDefaultCategories(db, { now: NOW, newId: idGenerator() })).toBe(false);
    expect(listCategories(db)).toHaveLength(DEFAULT_CATEGORIES.length);
  });
});
