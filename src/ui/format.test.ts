import { formatClockTime, formatDuration } from '@/ui/format';

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
