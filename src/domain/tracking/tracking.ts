import type { EpochMs, TimeEntry, TimeZoneId } from '@/domain/types';

/** Data for a new live entry. The service layer adds id and bookkeeping fields. */
export interface NewLiveEntry {
  readonly categoryId: string;
  readonly startedAt: EpochMs;
  readonly timezone: TimeZoneId;
  readonly source: 'live';
}

export interface CloseEntry {
  readonly entryId: string;
  readonly endedAt: EpochMs;
}

/**
 * What the service must write to the database, in a single transaction.
 * Domain code only decides; it never touches storage.
 */
export type TrackingPlan =
  | { readonly kind: 'apply'; readonly close: CloseEntry | null; readonly open: NewLiveEntry | null }
  | { readonly kind: 'noop'; readonly reason: 'already_running' | 'nothing_running' }
  | {
      readonly kind: 'error';
      /** The running entry started after `now`: the device clock was moved back. */
      readonly reason: 'clock_behind';
    };

/** The single running entry among non-deleted entries, if any. */
export function findRunningEntry(entries: readonly TimeEntry[]): TimeEntry | null {
  return entries.find((e) => e.endedAt === null && e.deletedAt === null) ?? null;
}

/**
 * Start tracking `categoryId`. If another entry is running this is a switch:
 * the old entry ends and the new one starts at the very same moment `now`,
 * so there is neither a gap nor an overlap between them.
 * Tapping the category that is already running does nothing (double-tap guard).
 */
export function planStart(
  running: TimeEntry | null,
  categoryId: string,
  now: EpochMs,
  timezone: TimeZoneId,
): TrackingPlan {
  const open: NewLiveEntry = { categoryId, startedAt: now, timezone, source: 'live' };
  if (running === null) {
    return { kind: 'apply', close: null, open };
  }
  if (running.categoryId === categoryId) {
    return { kind: 'noop', reason: 'already_running' };
  }
  if (now < running.startedAt) {
    return { kind: 'error', reason: 'clock_behind' };
  }
  return { kind: 'apply', close: { entryId: running.id, endedAt: now }, open };
}

export function planStop(running: TimeEntry | null, now: EpochMs): TrackingPlan {
  if (running === null) {
    return { kind: 'noop', reason: 'nothing_running' };
  }
  if (now < running.startedAt) {
    return { kind: 'error', reason: 'clock_behind' };
  }
  return { kind: 'apply', close: { entryId: running.id, endedAt: now }, open: null };
}
