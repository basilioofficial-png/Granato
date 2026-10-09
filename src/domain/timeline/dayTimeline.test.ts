import { makeEntry } from '@/domain/test-utils/makeEntry';
import { buildDayTimeline, unknownPercent } from '@/domain/timeline/dayTimeline';

const H = 60 * 60 * 1000;
const DAY = { start: 24 * H, end: 48 * H }; // "day 2"
const at = (h: number) => DAY.start + h * H;

function shape(timeline: ReturnType<typeof buildDayTimeline>) {
  return timeline.items.map((i) =>
    i.kind === 'gap'
      ? ['gap', (i.interval.start - DAY.start) / H, (i.interval.end - DAY.start) / H]
      : [i.entry.id, (i.interval.start - DAY.start) / H, (i.interval.end - DAY.start) / H],
  );
}

describe('buildDayTimeline', () => {
  it('counts the morning before the first entry as unknown once tracking has begun earlier', () => {
    const timeline = buildDayTimeline(
      [makeEntry({ id: 'work', startedAt: at(9), endedAt: at(12) })],
      DAY,
      at(13),
      0, // tracking started yesterday
    );
    expect(shape(timeline)).toEqual([
      ['gap', 0, 9],
      ['work', 9, 12],
      ['gap', 12, 13],
    ]);
    expect(timeline.trackedMs).toBe(3 * H);
    expect(timeline.unknownMs).toBe(10 * H);
  });

  it('on the first day of use counts nothing before the first entry', () => {
    const timeline = buildDayTimeline(
      [makeEntry({ id: 'work', startedAt: at(20), endedAt: at(21) })],
      DAY,
      at(22),
      at(20),
    );
    expect(shape(timeline)).toEqual([
      ['work', 20, 21],
      ['gap', 21, 22],
    ]);
  });

  it('a whole past day without entries is unknown', () => {
    const timeline = buildDayTimeline([], DAY, at(100), 0);
    expect(timeline.unknownMs).toBe(24 * H);
    expect(unknownPercent(timeline)).toBe(100);
  });

  it('a day before the first use is empty', () => {
    const timeline = buildDayTimeline([], DAY, at(100), at(50));
    expect(timeline.items).toEqual([]);
    expect(unknownPercent(timeline)).toBe(0);
  });

  it('clips an entry crossing midnight and marks where it continues', () => {
    const night = makeEntry({ id: 'sleep', startedAt: at(-1), endedAt: at(7) });
    const late = makeEntry({ id: 'late', startedAt: at(23), endedAt: at(25) });
    const timeline = buildDayTimeline([night, late], DAY, at(30), 0);
    const first = timeline.items[0];
    const last = timeline.items.at(-1);
    expect(first).toMatchObject({ kind: 'entry', startsBefore: true, endsAfter: false });
    expect(first?.interval).toEqual({ start: DAY.start, end: at(7) });
    expect(last).toMatchObject({ kind: 'entry', startsBefore: false, endsAfter: true });
    expect(last?.interval).toEqual({ start: at(23), end: DAY.end });
    expect(timeline.trackedMs).toBe(8 * H);
  });

  it('shows a running entry up to now and nothing after', () => {
    const timeline = buildDayTimeline([makeEntry({ id: 'run', startedAt: at(10) })], DAY, at(11), 0);
    expect(shape(timeline)).toEqual([
      ['gap', 0, 10],
      ['run', 10, 11],
    ]);
  });

  it('touching entries leave no gap', () => {
    const timeline = buildDayTimeline(
      [
        makeEntry({ id: 'a', startedAt: at(1), endedAt: at(2) }),
        makeEntry({ id: 'b', startedAt: at(2), endedAt: at(3) }),
      ],
      DAY,
      at(3),
      at(1),
    );
    expect(timeline.items.filter((i) => i.kind === 'gap')).toEqual([]);
  });
});

describe('unknownPercent', () => {
  it('rounds to whole percent', () => {
    const timeline = buildDayTimeline(
      [makeEntry({ startedAt: at(0), endedAt: at(14) })],
      DAY,
      at(15),
      0,
    );
    expect(unknownPercent(timeline)).toBe(7); // 1 of 15 hours
  });
});
