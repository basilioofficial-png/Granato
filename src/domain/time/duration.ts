import type { EpochMs, TimeEntry } from '@/domain/types';

export type DurationResult =
  | { readonly ok: true; readonly ms: number }
  | {
      readonly ok: false;
      /**
       * `clock_behind`: a running entry started "in the future" — the device clock
       * was moved back. `invalid_interval`: a finished entry ends before it starts.
       */
      readonly error: 'clock_behind' | 'invalid_interval';
    };

/**
 * Duration is always computed from stored timestamps, never from UI timer ticks.
 * A running entry lasts until `now`.
 */
export function entryDuration(entry: TimeEntry, now: EpochMs): DurationResult {
  if (entry.endedAt === null) {
    return now >= entry.startedAt
      ? { ok: true, ms: now - entry.startedAt }
      : { ok: false, error: 'clock_behind' };
  }
  return entry.endedAt >= entry.startedAt
    ? { ok: true, ms: entry.endedAt - entry.startedAt }
    : { ok: false, error: 'invalid_interval' };
}
