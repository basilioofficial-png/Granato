import { clipInterval, entryInterval } from '@/domain/time/interval';
import type { EpochMs, Interval, TimeEntry } from '@/domain/types';

export type TimelineItem =
  | {
      readonly kind: 'entry';
      readonly entry: TimeEntry;
      /** Part of the entry inside the day (and before `now`). */
      readonly interval: Interval;
      /** The entry began on an earlier day / continues into a later one. */
      readonly startsBefore: boolean;
      readonly endsAfter: boolean;
    }
  | { readonly kind: 'gap'; readonly interval: Interval };

export interface DayTimeline {
  /** Chronological: oldest first. */
  readonly items: readonly TimelineItem[];
  readonly trackedMs: number;
  readonly unknownMs: number;
}

/**
 * Entries of one day plus the unknown gaps between them.
 *
 * Unknown time is counted only after `trackingSince` (the very first tracked moment
 * ever): before the user installed the app nothing is "missing". Without
 * `trackingSince` the first entry of the day is used instead. Time after `now`
 * is never shown.
 */
export function buildDayTimeline(
  entries: readonly TimeEntry[],
  day: Interval,
  now: EpochMs,
  trackingSince: EpochMs | null = null,
): DayTimeline {
  const visible = { start: day.start, end: Math.min(day.end, now) };
  const tracked = entries
    .map((entry) => {
      const full = entryInterval(entry, now);
      const interval = full ? clipInterval(full, visible) : null;
      return full && interval
        ? {
            kind: 'entry' as const,
            entry,
            interval,
            startsBefore: full.start < day.start,
            endsAfter: entry.endedAt === null ? false : full.end > day.end,
          }
        : null;
    })
    .filter((item): item is Extract<TimelineItem, { kind: 'entry' }> => item !== null)
    .sort((a, b) => a.interval.start - b.interval.start);

  const firstTracked = tracked[0]?.interval.start ?? null;
  const countFrom =
    trackingSince !== null ? Math.max(visible.start, trackingSince) : firstTracked;

  const items: TimelineItem[] = [];
  let trackedMs = 0;
  let unknownMs = 0;
  let cursor = countFrom;

  const addGap = (start: EpochMs, end: EpochMs) => {
    if (end <= start) return;
    items.push({ kind: 'gap', interval: { start, end } });
    unknownMs += end - start;
  };

  for (const item of tracked) {
    if (cursor !== null) addGap(cursor, item.interval.start);
    items.push(item);
    trackedMs += item.interval.end - item.interval.start;
    cursor = Math.max(cursor ?? item.interval.end, item.interval.end);
  }
  if (cursor !== null) addGap(cursor, visible.end);

  return { items, trackedMs, unknownMs };
}

/** Share of unknown time among all accounted time of the day, in whole percent. */
export function unknownPercent(timeline: DayTimeline): number {
  const total = timeline.trackedMs + timeline.unknownMs;
  return total === 0 ? 0 : Math.round((timeline.unknownMs / total) * 100);
}
