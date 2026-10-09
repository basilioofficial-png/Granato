import {
  addDays,
  getLocalDate,
  isValidTimeZone,
  localDayInterval,
  splitByLocalDays,
  startOfLocalDay,
} from '@/domain/time/localDay';

const MIN = 60 * 1000;
const H = 60 * MIN;

describe('isValidTimeZone', () => {
  it('accepts IANA names and rejects garbage', () => {
    expect(isValidTimeZone('Europe/Moscow')).toBe(true);
    expect(isValidTimeZone('Not/AZone')).toBe(false);
  });
});

describe('getLocalDate', () => {
  it('depends on the time zone', () => {
    const instant = Date.UTC(2026, 9, 9, 22, 30); // 22:30 UTC
    expect(getLocalDate(instant, 'UTC')).toEqual({ year: 2026, month: 10, day: 9 });
    // Moscow is UTC+3 → already 01:30 on the next day
    expect(getLocalDate(instant, 'Europe/Moscow')).toEqual({ year: 2026, month: 10, day: 10 });
  });
});

describe('addDays', () => {
  it('rolls over months and years', () => {
    expect(addDays({ year: 2026, month: 12, day: 31 }, 1)).toEqual({ year: 2027, month: 1, day: 1 });
    expect(addDays({ year: 2028, month: 3, day: 1 }, -1)).toEqual({ year: 2028, month: 2, day: 29 });
  });
});

describe('startOfLocalDay', () => {
  it('is local midnight in a zone without DST', () => {
    // 00:00 Moscow (UTC+3) = 21:00 UTC of the previous day
    expect(startOfLocalDay({ year: 2026, month: 10, day: 9 }, 'Europe/Moscow')).toBe(
      Date.UTC(2026, 9, 8, 21, 0),
    );
  });

  it('works for zones west of UTC', () => {
    // 00:00 in New York in summer (UTC-4) = 04:00 UTC
    expect(startOfLocalDay({ year: 2026, month: 7, day: 1 }, 'America/New_York')).toBe(
      Date.UTC(2026, 6, 1, 4, 0),
    );
  });

  it('handles a day where midnight does not exist (DST gap at 00:00)', () => {
    // Brazil, 2018-11-04: clocks jumped from 00:00 to 01:00. The day starts at 01:00 (UTC-2) = 03:00 UTC.
    expect(startOfLocalDay({ year: 2018, month: 11, day: 4 }, 'America/Sao_Paulo')).toBe(
      Date.UTC(2018, 10, 4, 3, 0),
    );
  });
});

describe('localDayInterval', () => {
  it('a regular day lasts 24 hours', () => {
    const day = localDayInterval({ year: 2026, month: 10, day: 9 }, 'Europe/Moscow');
    expect(day.end - day.start).toBe(24 * H);
  });

  it('spring-forward day lasts 23 hours (Berlin, 2026-03-29)', () => {
    const day = localDayInterval({ year: 2026, month: 3, day: 29 }, 'Europe/Berlin');
    expect(day.end - day.start).toBe(23 * H);
  });

  it('fall-back day lasts 25 hours (Berlin, 2026-10-25)', () => {
    const day = localDayInterval({ year: 2026, month: 10, day: 25 }, 'Europe/Berlin');
    expect(day.end - day.start).toBe(25 * H);
  });

  it('day with a DST gap at midnight lasts 23 hours (Sao Paulo, 2018-11-04)', () => {
    const day = localDayInterval({ year: 2018, month: 11, day: 4 }, 'America/Sao_Paulo');
    expect(day.end - day.start).toBe(23 * H);
  });
});

describe('splitByLocalDays', () => {
  it('keeps an interval inside one day as a single segment', () => {
    const start = Date.UTC(2026, 9, 9, 7, 0); // 10:00 Moscow
    const segments = splitByLocalDays({ start, end: start + 2 * H }, 'Europe/Moscow');
    expect(segments).toEqual([
      { date: { year: 2026, month: 10, day: 9 }, interval: { start, end: start + 2 * H } },
    ]);
  });

  it('splits an entry crossing midnight: 23:00–01:00 → 1h + 1h', () => {
    const start = Date.UTC(2026, 9, 9, 20, 0); // 23:00 Moscow, Oct 9
    const midnight = Date.UTC(2026, 9, 9, 21, 0); // 00:00 Moscow, Oct 10
    const segments = splitByLocalDays({ start, end: start + 2 * H }, 'Europe/Moscow');
    expect(segments).toEqual([
      { date: { year: 2026, month: 10, day: 9 }, interval: { start, end: midnight } },
      { date: { year: 2026, month: 10, day: 10 }, interval: { start: midnight, end: start + 2 * H } },
    ]);
  });

  it('splits a multi-day interval and preserves the total length', () => {
    const start = Date.UTC(2026, 9, 9, 12, 0);
    const end = start + 3 * 24 * H + 30 * MIN;
    const segments = splitByLocalDays({ start, end }, 'Europe/Moscow');
    expect(segments).toHaveLength(4);
    const total = segments.reduce((sum, s) => sum + (s.interval.end - s.interval.start), 0);
    expect(total).toBe(end - start);
  });

  it('sleep across the spring-forward night is 1 hour shorter on the clock', () => {
    // Berlin 2026-03-28 23:00 CET (22:00 UTC) → 2026-03-29 07:00 CEST (05:00 UTC): 7 real hours
    const segments = splitByLocalDays(
      { start: Date.UTC(2026, 2, 28, 22, 0), end: Date.UTC(2026, 2, 29, 5, 0) },
      'Europe/Berlin',
    );
    const lengths = segments.map((s) => (s.interval.end - s.interval.start) / H);
    expect(lengths).toEqual([1, 6]);
  });

  it('returns nothing for an empty interval', () => {
    expect(splitByLocalDays({ start: 1000, end: 1000 }, 'UTC')).toEqual([]);
  });
});
