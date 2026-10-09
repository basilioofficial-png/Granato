import type { EpochMs, Interval, LocalDate, TimeZoneId } from '@/domain/types';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const formatters = new Map<TimeZoneId, Intl.DateTimeFormat>();

function formatterFor(timeZone: TimeZoneId): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      calendar: 'gregory',
      numberingSystem: 'latn',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatterFor(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** Calendar date that a clock in `timeZone` shows at `instant`. */
export function getLocalDate(instant: EpochMs, timeZone: TimeZoneId): LocalDate {
  let year = 0;
  let month = 0;
  let day = 0;
  for (const part of formatterFor(timeZone).formatToParts(instant)) {
    if (part.type === 'year') year = Number(part.value);
    else if (part.type === 'month') month = Number(part.value);
    else if (part.type === 'day') day = Number(part.value);
  }
  if (!year || !month || !day) {
    throw new Error(`Cannot resolve local date in time zone "${timeZone}"`);
  }
  return { year, month, day };
}

/** Sortable number for a date: 2026-10-09 → 20261009. */
export function localDateKey(date: LocalDate): number {
  return date.year * 10000 + date.month * 100 + date.day;
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

const dayStartCache = new Map<string, EpochMs>();

/**
 * First instant of `date` in `timeZone`. Usually local midnight, but where clocks
 * jump forward at midnight (no 00:00 that day) it is the first existing moment.
 *
 * Implemented as a binary search over the real time zone rules instead of offset
 * arithmetic: it stays correct for DST gaps without special cases. UTC offsets are
 * within [-12h, +14h], so the answer is always inside [wall - 16h, wall + 16h].
 */
export function startOfLocalDay(date: LocalDate, timeZone: TimeZoneId): EpochMs {
  const cacheKey = `${timeZone}|${localDateKey(date)}`;
  const cached = dayStartCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const target = localDateKey(date);
  const wall = Date.UTC(date.year, date.month - 1, date.day);
  // Invariant: lo is before the target day, hi is on or after it.
  let lo = wall - 16 * HOUR;
  let hi = wall + 16 * HOUR;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (localDateKey(getLocalDate(mid, timeZone)) >= target) hi = mid;
    else lo = mid;
  }
  dayStartCache.set(cacheKey, hi);
  return hi;
}

/** The whole local day as a half-open interval. Can be 23 or 25 hours long on DST days. */
export function localDayInterval(date: LocalDate, timeZone: TimeZoneId): Interval {
  return {
    start: startOfLocalDay(date, timeZone),
    end: startOfLocalDay(addDays(date, 1), timeZone),
  };
}

export interface DaySegment {
  readonly date: LocalDate;
  readonly interval: Interval;
}

/**
 * Splits an interval at local midnights. Used only for analytics:
 * stored entries are never cut at midnight.
 */
export function splitByLocalDays(interval: Interval, timeZone: TimeZoneId): DaySegment[] {
  const segments: DaySegment[] = [];
  let cursor = interval.start;
  // Guard against malformed time zone data producing an endless loop.
  const maxSegments = Math.ceil((interval.end - interval.start) / DAY) + 2;

  while (cursor < interval.end) {
    if (segments.length >= maxSegments) {
      throw new Error('splitByLocalDays: day boundaries did not advance');
    }
    const date = getLocalDate(cursor, timeZone);
    const nextDayStart = startOfLocalDay(addDays(date, 1), timeZone);
    const end = Math.min(nextDayStart, interval.end);
    segments.push({ date, interval: { start: cursor, end } });
    cursor = end;
  }
  return segments;
}
