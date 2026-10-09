import type { EpochMs, TimeZoneId } from '@/domain/types';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** 3 723 000 ms → "01:02:03". Hours keep growing past 24 ("27:00:00"). */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

const clockFormatters = new Map<TimeZoneId, Intl.DateTimeFormat>();

/** Wall-clock time with seconds in the given zone, 24-hour: "14:03:12". */
export function formatClockTime(instant: EpochMs, timeZone: TimeZoneId): string {
  let formatter = clockFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    clockFormatters.set(timeZone, formatter);
  }
  return formatter.format(instant);
}
