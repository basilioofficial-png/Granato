import { clipInterval, entryInterval } from '@/domain/time/interval';
import type { EpochMs, Interval, TimeEntry } from '@/domain/types';

export interface StripSegment {
  readonly interval: Interval;
  /** `null` = unknown time: a gap between tracked entries. */
  readonly categoryId: string | null;
}

export interface DayStrip {
  readonly segments: readonly StripSegment[];
  readonly trackedMs: number;
  readonly unknownMs: number;
}

/**
 * "Seeds of the day": tracked entries clipped to the day and to `now`, plus the
 * gaps between them. Unknown time starts at the first tracked moment of the day:
 * hours before the user began tracking are not counted as gaps, and the future
 * is never shown.
 */
export function buildDayStrip(entries: readonly TimeEntry[], day: Interval, now: EpochMs): DayStrip {
  const visible = { start: day.start, end: Math.min(day.end, now) };
  const tracked = entries
    .map((entry) => {
      const interval = entryInterval(entry, now);
      const clipped = interval ? clipInterval(interval, visible) : null;
      return clipped ? { interval: clipped, categoryId: entry.categoryId } : null;
    })
    .filter((segment): segment is { interval: Interval; categoryId: string } => segment !== null)
    .sort((a, b) => a.interval.start - b.interval.start);

  const segments: StripSegment[] = [];
  let trackedMs = 0;
  let unknownMs = 0;
  let cursor: EpochMs | null = null;

  for (const segment of tracked) {
    if (cursor !== null && segment.interval.start > cursor) {
      segments.push({ interval: { start: cursor, end: segment.interval.start }, categoryId: null });
      unknownMs += segment.interval.start - cursor;
    }
    segments.push(segment);
    trackedMs += segment.interval.end - segment.interval.start;
    cursor = Math.max(cursor ?? segment.interval.end, segment.interval.end);
  }
  if (cursor !== null && cursor < visible.end) {
    segments.push({ interval: { start: cursor, end: visible.end }, categoryId: null });
    unknownMs += visible.end - cursor;
  }
  return { segments, trackedMs, unknownMs };
}
