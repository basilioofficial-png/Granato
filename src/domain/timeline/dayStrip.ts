import { buildDayTimeline } from '@/domain/timeline/dayTimeline';
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

/** "Seeds of the day": the day timeline reduced to colored segments (see buildDayTimeline). */
export function buildDayStrip(
  entries: readonly TimeEntry[],
  day: Interval,
  now: EpochMs,
  trackingSince: EpochMs | null = null,
): DayStrip {
  const timeline = buildDayTimeline(entries, day, now, trackingSince);
  return {
    segments: timeline.items.map((item) => ({
      interval: item.interval,
      categoryId: item.kind === 'entry' ? item.entry.categoryId : null,
    })),
    trackedMs: timeline.trackedMs,
    unknownMs: timeline.unknownMs,
  };
}
