import { makeEntry } from '@/domain/test-utils/makeEntry';
import { buildDayStrip } from '@/domain/timeline/dayStrip';

const H = 60 * 60 * 1000;
const DAY = { start: 0, end: 24 * H };

describe('buildDayStrip', () => {
  it('is empty when nothing was tracked', () => {
    expect(buildDayStrip([], DAY, 12 * H)).toEqual({ segments: [], trackedMs: 0, unknownMs: 0 });
  });

  it('shows tracked entries and the gaps between them', () => {
    const strip = buildDayStrip(
      [
        makeEntry({ id: 'a', categoryId: 'sleep', startedAt: 0, endedAt: 7 * H }),
        makeEntry({ id: 'b', categoryId: 'work', startedAt: 8 * H, endedAt: 10 * H }),
      ],
      DAY,
      10 * H,
    );
    expect(strip.segments.map((s) => [s.categoryId, s.interval.start / H, s.interval.end / H])).toEqual([
      ['sleep', 0, 7],
      [null, 7, 8],
      ['work', 8, 10],
    ]);
    expect(strip.trackedMs).toBe(9 * H);
    expect(strip.unknownMs).toBe(H);
  });

  it('does not count hours before the first entry as unknown', () => {
    const strip = buildDayStrip([makeEntry({ startedAt: 22 * H })], DAY, 23 * H);
    expect(strip.unknownMs).toBe(0);
    expect(strip.segments).toHaveLength(1);
  });

  it('draws a running entry up to now, never into the future', () => {
    const strip = buildDayStrip([makeEntry({ categoryId: 'work', startedAt: 9 * H })], DAY, 11 * H);
    expect(strip.segments).toEqual([{ interval: { start: 9 * H, end: 11 * H }, categoryId: 'work' }]);
  });

  it('marks the time after a stopped entry until now as unknown', () => {
    const strip = buildDayStrip([makeEntry({ startedAt: 9 * H, endedAt: 10 * H })], DAY, 12 * H);
    expect(strip.unknownMs).toBe(2 * H);
    expect(strip.segments.at(-1)).toEqual({ interval: { start: 10 * H, end: 12 * H }, categoryId: null });
  });

  it('clips an entry that started yesterday to the day start', () => {
    const strip = buildDayStrip([makeEntry({ startedAt: -2 * H, endedAt: 6 * H })], DAY, 8 * H);
    expect(strip.segments[0]?.interval).toEqual({ start: 0, end: 6 * H });
    expect(strip.trackedMs).toBe(6 * H);
  });

  it('ignores deleted entries', () => {
    const strip = buildDayStrip([makeEntry({ startedAt: H, endedAt: 2 * H, deletedAt: 3 * H })], DAY, 5 * H);
    expect(strip.trackedMs).toBe(0);
  });
});
