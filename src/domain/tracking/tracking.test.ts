import { findRunningEntry, planStart, planStop } from '@/domain/tracking/tracking';
import { makeEntry } from '@/domain/test-utils/makeEntry';

const MIN = 60 * 1000;
const T0 = Date.UTC(2026, 9, 9, 9, 0);
const TZ = 'Europe/Moscow';

const running = makeEntry({ id: 'work-entry', categoryId: 'work', startedAt: T0 });

describe('findRunningEntry', () => {
  it('finds the entry without an end', () => {
    const entries = [makeEntry({ id: 'done', startedAt: 0, endedAt: T0 }), running];
    expect(findRunningEntry(entries)?.id).toBe('work-entry');
  });

  it('ignores a deleted running entry', () => {
    expect(findRunningEntry([{ ...running, deletedAt: T0 }])).toBeNull();
  });

  it('returns null when nothing is running', () => {
    expect(findRunningEntry([makeEntry({ startedAt: 0, endedAt: T0 })])).toBeNull();
  });
});

describe('planStart', () => {
  it('opens a live entry when nothing is running', () => {
    expect(planStart(null, 'work', T0, TZ)).toEqual({
      kind: 'apply',
      close: null,
      open: { categoryId: 'work', startedAt: T0, timezone: TZ, source: 'live' },
    });
  });

  it('switches: closes the previous entry and opens the new one at the same moment', () => {
    const now = T0 + 45 * MIN;
    const plan = planStart(running, 'food', now, TZ);
    expect(plan).toEqual({
      kind: 'apply',
      close: { entryId: 'work-entry', endedAt: now },
      open: { categoryId: 'food', startedAt: now, timezone: TZ, source: 'live' },
    });
    // No gap and no overlap between the two entries
    if (plan.kind === 'apply') {
      expect(plan.close?.endedAt).toBe(plan.open?.startedAt);
    }
  });

  it('does nothing when the same category is already running (double tap)', () => {
    expect(planStart(running, 'work', T0 + MIN, TZ)).toEqual({
      kind: 'noop',
      reason: 'already_running',
    });
  });

  it('refuses to switch when the clock went back before the running entry started', () => {
    expect(planStart(running, 'food', T0 - MIN, TZ)).toEqual({
      kind: 'error',
      reason: 'clock_behind',
    });
  });

  it('records the time zone of the new entry', () => {
    const plan = planStart(null, 'travel', T0, 'Asia/Tokyo');
    expect(plan.kind === 'apply' && plan.open?.timezone).toBe('Asia/Tokyo');
  });
});

describe('planStop', () => {
  it('closes the running entry at now', () => {
    expect(planStop(running, T0 + 30 * MIN)).toEqual({
      kind: 'apply',
      close: { entryId: 'work-entry', endedAt: T0 + 30 * MIN },
      open: null,
    });
  });

  it('does nothing when nothing is running', () => {
    expect(planStop(null, T0)).toEqual({ kind: 'noop', reason: 'nothing_running' });
  });

  it('refuses to stop when the clock went back', () => {
    expect(planStop(running, T0 - MIN)).toEqual({ kind: 'error', reason: 'clock_behind' });
  });
});
