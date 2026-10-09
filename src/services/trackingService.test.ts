import { listCategories } from '@/db/repositories/categoriesRepo';
import { getTimeEntryById } from '@/db/repositories/timeEntriesRepo';
import { openTestDatabase } from '@/db/testing/nodeSqliteDatabase';
import type { SqlDatabase } from '@/db/types';
import { initializeStorage } from '@/services/storage';
import { createTrackingService } from '@/services/trackingService';

const MIN = 60 * 1000;
const T0 = Date.UTC(2026, 9, 9, 7, 0); // 10:00 Moscow

let db: SqlDatabase;
let clock: number;
let ids: number;
let work: string;
let food: string;

function service() {
  return createTrackingService({
    db,
    now: () => clock,
    newId: () => `entry-${++ids}`,
    timeZone: () => 'Europe/Moscow',
  });
}

function countEntries(): number {
  return db.get<{ n: number }>('SELECT COUNT(*) AS n FROM time_entries')?.n ?? 0;
}

beforeEach(() => {
  db = openTestDatabase();
  let categoryIds = 0;
  initializeStorage(db, { now: T0, newId: () => `category-${++categoryIds}` });
  const categories = listCategories(db);
  work = categories.find((c) => c.name === 'Работа')!.id;
  food = categories.find((c) => c.name === 'Быт')!.id;
  clock = T0;
  ids = 0;
});

describe('trackingService', () => {
  it('starts an activity and saves it as a live running entry', () => {
    const result = service().start(work);
    expect(result).toMatchObject({ ok: true, action: { at: T0, closed: null, openedId: 'entry-1' } });
    expect(service().getRunning()).toMatchObject({
      categoryId: work,
      startedAt: T0,
      endedAt: null,
      source: 'live',
      timezone: 'Europe/Moscow',
    });
  });

  it('survives an app restart: a new service instance finds the running entry', () => {
    service().start(work);
    clock = T0 + 180 * MIN; // app was closed for 3 hours
    const restored = service().getRunning();
    expect(restored?.categoryId).toBe(work);
    expect(clock - restored!.startedAt).toBe(180 * MIN);
  });

  it('switching ends the previous entry at the exact moment the new one starts', () => {
    const tracking = service();
    tracking.start(work);
    clock = T0 + 45 * MIN;
    const result = tracking.start(food);

    expect(result.ok && result.running?.categoryId).toBe(food);
    const previous = getTimeEntryById(db, 'entry-1');
    const current = getTimeEntryById(db, 'entry-2');
    expect(previous?.endedAt).toBe(T0 + 45 * MIN);
    expect(current?.startedAt).toBe(previous?.endedAt);
    expect(current?.endedAt).toBeNull();
  });

  it('a double tap on the running category creates nothing', () => {
    const tracking = service();
    tracking.start(food);
    clock += 300; // second tap 0.3 s later
    expect(tracking.start(food)).toMatchObject({ ok: true, action: null });
    expect(countEntries()).toBe(1);
  });

  it('stop ends the running entry; a second stop does nothing', () => {
    const tracking = service();
    tracking.start(work);
    clock = T0 + 30 * MIN;
    expect(tracking.stop()).toMatchObject({
      ok: true,
      running: null,
      action: { at: T0 + 30 * MIN, closed: { id: 'entry-1', endedAt: T0 + 30 * MIN }, openedId: null },
    });
    expect(getTimeEntryById(db, 'entry-1')?.endedAt).toBe(T0 + 30 * MIN);
    expect(tracking.stop()).toEqual({ ok: true, running: null, action: null });
  });

  it('when the clock went back, nothing is written', () => {
    const tracking = service();
    tracking.start(work);
    clock = T0 - 10 * MIN;
    expect(tracking.start(food)).toEqual({ ok: false, error: 'clock_behind' });
    expect(tracking.stop()).toEqual({ ok: false, error: 'clock_behind' });
    expect(countEntries()).toBe(1);
    expect(tracking.getRunning()?.categoryId).toBe(work);
  });

  it('refuses unknown or archived categories', () => {
    const tracking = service();
    expect(tracking.start('no-such-category')).toEqual({ ok: false, error: 'unknown_category' });
    db.run('UPDATE categories SET archived_at = ? WHERE id = ?', [T0, food]);
    expect(tracking.start(food)).toEqual({ ok: false, error: 'unknown_category' });
    expect(countEntries()).toBe(0);
  });

  it('a failed switch is rolled back completely', () => {
    const tracking = service();
    tracking.start(work);
    // Simulate a storage failure while opening the new entry: reuse an existing id.
    ids = 0;
    clock = T0 + 10 * MIN;
    expect(() => tracking.start(food)).toThrow();
    // The previous entry must still be running — not closed without a successor.
    expect(tracking.getRunning()?.id).toBe('entry-1');
    expect(countEntries()).toBe(1);
  });

  it('lists entries of the current local day, including one that started yesterday', () => {
    const tracking = service();
    clock = Date.UTC(2026, 9, 8, 20, 0); // 23:00 Moscow, Oct 8
    tracking.start(work);
    clock = Date.UTC(2026, 9, 8, 22, 0); // 01:00 Moscow, Oct 9
    tracking.start(food);
    clock = Date.UTC(2026, 9, 9, 9, 0);

    expect(tracking.listToday().map((e) => e.categoryId)).toEqual([work, food]);
  });

  it('lists recent entries newest first', () => {
    const tracking = service();
    tracking.start(work);
    clock += MIN;
    tracking.start(food);
    expect(tracking.listRecent(10).map((e) => e.categoryId)).toEqual([food, work]);
  });
});

describe('trackingService.undo', () => {
  function act(result: ReturnType<ReturnType<typeof service>['start']>) {
    if (!result.ok || !result.action) throw new Error('expected a change');
    return result.action;
  }

  it('undoing a switch restores the previous entry as running and removes the new one', () => {
    const tracking = service();
    tracking.start(work);
    clock = T0 + 40 * MIN;
    const action = act(tracking.start(food));
    clock = T0 + 41 * MIN;

    expect(tracking.undo(action)).toMatchObject({ ok: true, running: { id: 'entry-1', endedAt: null } });
    expect(getTimeEntryById(db, 'entry-2')?.deletedAt).toBe(T0 + 41 * MIN);
    // The restored entry keeps counting from its original start.
    expect(tracking.getRunning()?.startedAt).toBe(T0);
  });

  it('undoing a stop resumes the entry', () => {
    const tracking = service();
    tracking.start(work);
    clock = T0 + 10 * MIN;
    const action = act(tracking.stop());
    expect(tracking.undo(action)).toMatchObject({ ok: true, running: { id: 'entry-1' } });
  });

  it('undoing the first start leaves nothing running', () => {
    const tracking = service();
    const action = act(tracking.start(work));
    expect(tracking.undo(action)).toEqual({ ok: true, running: null, action: null });
    expect(getTimeEntryById(db, 'entry-1')?.deletedAt).not.toBeNull();
  });

  it('refuses to undo an action that is no longer the last one', () => {
    const tracking = service();
    tracking.start(work);
    clock += MIN;
    const first = act(tracking.start(food));
    clock += MIN;
    tracking.start(work);
    expect(tracking.undo(first)).toEqual({ ok: false, error: 'undo_unavailable' });
  });

  it('the same undo cannot be applied twice', () => {
    const tracking = service();
    tracking.start(work);
    clock += MIN;
    const action = act(tracking.start(food));
    expect(tracking.undo(action).ok).toBe(true);
    expect(tracking.undo(action)).toEqual({ ok: false, error: 'undo_unavailable' });
  });
});
