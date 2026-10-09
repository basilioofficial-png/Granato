import { listCategories } from '@/db/repositories/categoriesRepo';
import { openTestDatabase } from '@/db/testing/nodeSqliteDatabase';
import type { SqlDatabase } from '@/db/types';
import { createCategoriesService } from '@/services/categoriesService';
import { initializeStorage } from '@/services/storage';
import { createTrackingService } from '@/services/trackingService';

let db: SqlDatabase;
let clock: number;
let n: number;
const newId = () => `id-${++n}`;

function services() {
  return {
    categories: createCategoriesService({ db, now: () => clock, newId }),
    tracking: createTrackingService({ db, now: () => clock, newId, timeZone: () => 'UTC' }),
  };
}

function idOf(name: string): string {
  const category = listCategories(db, { includeArchived: true }).find((c) => c.name === name);
  if (!category) throw new Error(`no category ${name}`);
  return category.id;
}

function ok<T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> {
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result)}`);
  return result as Extract<T, { ok: true }>;
}

beforeEach(() => {
  db = openTestDatabase();
  n = 0;
  clock = 1000;
  initializeStorage(db, { now: clock, newId });
});

describe('categoriesService.create', () => {
  it('builds three levels: Работа › Совещания › Планёрка', () => {
    const { categories } = services();
    const meetings = ok(categories.create({ name: 'Совещания', parentId: idOf('Работа') })).category;
    const standup = ok(categories.create({ name: ' Планёрка ', parentId: meetings.id })).category;
    expect(standup).toMatchObject({ name: 'Планёрка', parentId: meetings.id });
  });

  it('refuses a fourth level', () => {
    const { categories } = services();
    const a = ok(categories.create({ name: 'A', parentId: idOf('Работа') })).category;
    const b = ok(categories.create({ name: 'B', parentId: a.id })).category;
    expect(categories.create({ name: 'C', parentId: b.id })).toEqual({ ok: false, error: 'too_deep' });
  });

  it('requires a valid color for a top-level category', () => {
    const { categories } = services();
    expect(categories.create({ name: 'Хобби', parentId: null })).toEqual({
      ok: false,
      error: 'invalid_color',
    });
    expect(ok(categories.create({ name: 'Хобби', parentId: null, color: '#4D88FF' })).category.color).toBe(
      '#4D88FF',
    );
  });

  it('rejects duplicates and empty names', () => {
    const { categories } = services();
    expect(categories.create({ name: 'работа', parentId: null, color: '#B71F2E' })).toEqual({
      ok: false,
      error: 'duplicate',
    });
    expect(categories.create({ name: '  ', parentId: idOf('Работа') })).toEqual({
      ok: false,
      error: 'empty',
    });
  });

  it('places a new category after its siblings', () => {
    const { categories } = services();
    const created = ok(categories.create({ name: 'Хобби', parentId: null, color: '#4D88FF' })).category;
    const roots = listCategories(db).filter((c) => c.parentId === null);
    expect(roots.at(-1)?.id).toBe(created.id);
  });
});

describe('categoriesService.update', () => {
  it('renames and recolors', () => {
    const { categories } = services();
    const updated = ok(categories.update(idOf('Работа'), { name: 'Работа и проекты', color: '#4361D8' }));
    expect(updated.category).toMatchObject({ name: 'Работа и проекты', color: '#4361D8', updatedAt: 1000 });
  });

  it('moves an activity to another branch, keeping its entries attached', () => {
    const { categories, tracking } = services();
    const meal = ok(categories.create({ name: 'Еда', parentId: idOf('Работа') })).category;
    tracking.start(meal.id);
    const moved = ok(categories.update(meal.id, { parentId: idOf('Быт') }));
    expect(moved.category.parentId).toBe(idOf('Быт'));
    expect(tracking.getRunning()?.categoryId).toBe(meal.id);
  });

  it('refuses to move a category into its own branch', () => {
    const { categories } = services();
    const meetings = ok(categories.create({ name: 'Совещания', parentId: idOf('Работа') })).category;
    expect(categories.update(idOf('Работа'), { parentId: meetings.id })).toEqual({
      ok: false,
      error: 'invalid_parent',
    });
  });

  it('gives a category moved to the top level the color of its former branch', () => {
    const { categories } = services();
    const english = ok(categories.create({ name: 'Английский', parentId: idOf('Учёба') })).category;
    expect(ok(categories.update(english.id, { parentId: null })).category.color).toBe('#4361D8');
  });
});

describe('archive', () => {
  it('hides the whole branch from tracking, and restore brings it back', () => {
    const { categories, tracking } = services();
    const meetings = ok(categories.create({ name: 'Совещания', parentId: idOf('Работа') })).category;
    ok(categories.archive(idOf('Работа')));

    expect(tracking.start(meetings.id)).toEqual({ ok: false, error: 'unknown_category' });
    ok(categories.restore(idOf('Работа')));
    expect(tracking.start(meetings.id).ok).toBe(true);
  });

  it('keeps an already running entry when its category is archived', () => {
    const { categories, tracking } = services();
    tracking.start(idOf('Сон'));
    ok(categories.archive(idOf('Сон')));
    expect(tracking.getRunning()?.categoryId).toBe(idOf('Сон'));
  });
});
