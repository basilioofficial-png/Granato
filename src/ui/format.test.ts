import {
  formatClockTime,
  formatDayTitle,
  formatDuration,
  formatHourMinute,
  formatHoursMinutes,
  pluralRu,
} from '@/ui/format';

describe('formatDuration', () => {
  it('formats hours, minutes and seconds with leading zeros', () => {
    expect(formatDuration(0)).toBe('00:00:00');
    expect(formatDuration(3_723_000)).toBe('01:02:03');
  });

  it('drops milliseconds instead of rounding up', () => {
    expect(formatDuration(59_999)).toBe('00:00:59');
  });

  it('keeps counting hours past a day', () => {
    expect(formatDuration(27 * 3600 * 1000)).toBe('27:00:00');
  });

  it('never shows a negative duration', () => {
    expect(formatDuration(-5000)).toBe('00:00:00');
  });
});

describe('formatClockTime', () => {
  it('shows local 24-hour time with seconds', () => {
    const instant = Date.UTC(2026, 9, 9, 11, 3, 12); // 14:03:12 Moscow
    expect(formatClockTime(instant, 'Europe/Moscow')).toBe('14:03:12');
  });

  it('shows midnight as 00, not 24', () => {
    expect(formatClockTime(Date.UTC(2026, 9, 9, 21, 0, 5), 'Europe/Moscow')).toBe('00:00:05');
  });
});

describe('formatHoursMinutes', () => {
  it('formats totals like the design', () => {
    expect(formatHoursMinutes((14 * 60 + 22) * 60000)).toBe('14 ч 22 мин');
    expect(formatHoursMinutes((1 * 60 + 5) * 60000)).toBe('1 ч 05 мин');
    expect(formatHoursMinutes(45 * 60000)).toBe('45 мин');
    expect(formatHoursMinutes(3 * 3600000)).toBe('3 ч');
    expect(formatHoursMinutes(59_000)).toBe('0 мин');
  });
});

describe('formatHourMinute', () => {
  it('drops seconds', () => {
    expect(formatHourMinute(Date.UTC(2026, 9, 9, 11, 45, 59), 'Europe/Moscow')).toBe('14:45');
  });
});

describe('formatDayTitle', () => {
  it('formats weekday and date in Russian', () => {
    expect(formatDayTitle({ year: 2026, month: 10, day: 9 })).toBe('Пятница, 9 октября');
    expect(formatDayTitle({ year: 2026, month: 3, day: 1 })).toBe('Воскресенье, 1 марта');
  });
});

describe('pluralRu', () => {
  const forms = ['активность', 'активности', 'активностей'] as const;
  it.each([
    [1, 'активность'],
    [3, 'активности'],
    [5, 'активностей'],
    [11, 'активностей'],
    [12, 'активностей'],
    [21, 'активность'],
    [22, 'активности'],
  ])('%i → %s', (n, expected) => {
    expect(pluralRu(n, forms)).toBe(expected);
  });
});
