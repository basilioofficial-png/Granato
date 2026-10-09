import type { EpochMs, Interval, TimeEntry } from '@/domain/types';

export function isValidInterval(interval: Interval): boolean {
  return (
    Number.isFinite(interval.start) &&
    Number.isFinite(interval.end) &&
    interval.end >= interval.start
  );
}

export function intervalLength(interval: Interval): number {
  return interval.end - interval.start;
}

/** Touching intervals (a.end === b.start) do not overlap. Empty intervals never overlap. */
export function overlaps(a: Interval, b: Interval): boolean {
  if (a.end <= a.start || b.end <= b.start) return false;
  return a.start < b.end && b.start < a.end;
}

/** Part of `interval` that lies inside `period`, or `null` if there is none. */
export function clipInterval(interval: Interval, period: Interval): Interval | null {
  const start = Math.max(interval.start, period.start);
  const end = Math.min(interval.end, period.end);
  return end > start ? { start, end } : null;
}

/**
 * Interval actually covered by an entry at moment `now`.
 * A running entry covers time up to `now`. Returns `null` for deleted entries
 * and for broken data (end before start, or a running entry that starts after `now`).
 */
export function entryInterval(entry: TimeEntry, now: EpochMs): Interval | null {
  if (entry.deletedAt !== null) return null;
  const interval = { start: entry.startedAt, end: entry.endedAt ?? now };
  return isValidInterval(interval) ? interval : null;
}

/**
 * Entries whose time overlaps `candidate`. Used before saving an edited or
 * manually added entry: the result must be empty to keep the "no overlaps" invariant.
 */
export function findOverlappingEntries(
  candidate: Interval,
  entries: readonly TimeEntry[],
  now: EpochMs,
  excludeEntryId?: string,
): TimeEntry[] {
  return entries.filter((entry) => {
    if (entry.id === excludeEntryId) return false;
    const interval = entryInterval(entry, now);
    return interval !== null && overlaps(candidate, interval);
  });
}
