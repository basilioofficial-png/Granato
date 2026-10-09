import { insertCategory } from '@/db/repositories/categoriesRepo';
import {
  closeTimeEntry,
  getRunningTimeEntry,
  getTimeEntryById,
  insertTimeEntry,
  listTimeEntriesOverlapping,
} from '@/db/repositories/timeEntriesRepo';
import { createMigratedTestDatabase } from '@/db/testing/testDatabase';
import type { SqlDatabase } from '@/db/types';
import { makeCategory } from '@/domain/test-utils/makeCategory';
import { makeEntry } from '@/domain/test-utils/makeEntry';

const H = 60 * 60 * 1000;
const T0 = Date.UTC(2026, 9, 9, 6, 0);

let db: SqlDatabase;

beforeEach(() => {
  db = createMigratedTestDatabase();
  insertCategory(db, makeCategory({ id: 'category-work' }));
  insertCategory(db, makeCategory({ id: 'category-food', name: 'Еда' }));
});

describe('timeEntriesRepo', () => {
  it('stores and reads back an entry without losing data', () => {
    const entry = makeEntry({
      id: 'e1',
      startedAt: T0,
      endedAt: T0 + H,
      source: 'manual',
      isEdited: true,
      note: 'Заметка',
    });
    insertTimeEntry(db, entry);
    expect(getTimeEntryById(db, 'e1')).toEqual(entry);
  });

  it('finds the running entry', () => {
    insertTimeEntry(db, makeEntry({ id: 'done', startedAt: T0, endedAt: T0 + H }));
    insertTimeEntry(db, makeEntry({ id: 'running', startedAt: T0 + H }));
    expect(getRunningTimeEntry(db)?.id).toBe('running');
  });

  it('the database rejects a second running entry', () => {
    insertTimeEntry(db, makeEntry({ id: 'r1', startedAt: T0 }));
    expect(() => insertTimeEntry(db, makeEntry({ id: 'r2', startedAt: T0 + H }))).toThrow(
      /UNIQUE/,
    );
  });

  it('allows a new running entry once the old one is closed', () => {
    insertTimeEntry(db, makeEntry({ id: 'r1', startedAt: T0 }));
    expect(closeTimeEntry(db, 'r1', T0 + H, T0 + H)).toBe(true);
    insertTimeEntry(db, makeEntry({ id: 'r2', startedAt: T0 + H }));
    expect(getRunningTimeEntry(db)?.id).toBe('r2');
  });

  it('closeTimeEntry updates end and updatedAt, and does not close twice', () => {
    insertTimeEntry(db, makeEntry({ id: 'r1', startedAt: T0 }));
    expect(closeTimeEntry(db, 'r1', T0 + H, T0 + 2 * H)).toBe(true);
    expect(getTimeEntryById(db, 'r1')).toMatchObject({ endedAt: T0 + H, updatedAt: T0 + 2 * H });
    expect(closeTimeEntry(db, 'r1', T0 + 3 * H, T0 + 3 * H)).toBe(false);
    expect(getTimeEntryById(db, 'r1')?.endedAt).toBe(T0 + H);
  });

  it('the database rejects an entry that ends before it starts', () => {
    expect(() =>
      insertTimeEntry(db, makeEntry({ id: 'bad', startedAt: T0, endedAt: T0 - 1 })),
    ).toThrow(/CHECK/);
  });

  it('the database rejects an entry for an unknown category', () => {
    expect(() =>
      insertTimeEntry(db, makeEntry({ id: 'x', startedAt: T0, categoryId: 'missing' })),
    ).toThrow(/FOREIGN KEY/);
  });

  it('lists entries overlapping a range, including running, excluding deleted', () => {
    insertTimeEntry(db, makeEntry({ id: 'before', startedAt: T0 - 3 * H, endedAt: T0 - 2 * H }));
    insertTimeEntry(db, makeEntry({ id: 'touching', startedAt: T0 - H, endedAt: T0 }));
    insertTimeEntry(db, makeEntry({ id: 'crossing', startedAt: T0 - H / 2, endedAt: T0 + H }));
    insertTimeEntry(
      db,
      makeEntry({ id: 'deleted', startedAt: T0 + H, endedAt: T0 + 2 * H, deletedAt: T0 + 3 * H }),
    );
    insertTimeEntry(db, makeEntry({ id: 'running', startedAt: T0 + 2 * H }));

    const ids = listTimeEntriesOverlapping(db, { start: T0, end: T0 + 24 * H }).map((e) => e.id);
    expect(ids).toEqual(['crossing', 'running']);
  });
});
