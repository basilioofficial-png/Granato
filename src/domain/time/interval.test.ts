import {
  clipInterval,
  entryInterval,
  findOverlappingEntries,
  isValidInterval,
  overlaps,
} from '@/domain/time/interval';
import { makeEntry } from '@/domain/test-utils/makeEntry';

const H = 60 * 60 * 1000;

describe('isValidInterval', () => {
  it('accepts normal and zero-length intervals', () => {
    expect(isValidInterval({ start: 0, end: H })).toBe(true);
    expect(isValidInterval({ start: H, end: H })).toBe(true);
  });

  it('rejects an interval that ends before it starts', () => {
    expect(isValidInterval({ start: 2 * H, end: H })).toBe(false);
  });

  it('rejects non-finite values', () => {
    expect(isValidInterval({ start: 0, end: Number.NaN })).toBe(false);
  });
});

describe('overlaps', () => {
  it('detects partial overlap', () => {
    expect(overlaps({ start: 0, end: 2 * H }, { start: H, end: 3 * H })).toBe(true);
  });

  it('detects full containment', () => {
    expect(overlaps({ start: 0, end: 10 * H }, { start: H, end: 2 * H })).toBe(true);
  });

  it('treats touching intervals as not overlapping (switch boundary)', () => {
    expect(overlaps({ start: 0, end: H }, { start: H, end: 2 * H })).toBe(false);
  });

  it('treats separate intervals as not overlapping', () => {
    expect(overlaps({ start: 0, end: H }, { start: 2 * H, end: 3 * H })).toBe(false);
  });

  it('never reports overlap for an empty interval', () => {
    expect(overlaps({ start: H, end: H }, { start: 0, end: 2 * H })).toBe(false);
  });
});

describe('clipInterval', () => {
  const day = { start: 24 * H, end: 48 * H };

  it('keeps the part inside the period', () => {
    expect(clipInterval({ start: 20 * H, end: 26 * H }, day)).toEqual({ start: 24 * H, end: 26 * H });
  });

  it('returns null when outside the period', () => {
    expect(clipInterval({ start: 0, end: 10 * H }, day)).toBeNull();
  });

  it('returns null when only touching the period', () => {
    expect(clipInterval({ start: 20 * H, end: 24 * H }, day)).toBeNull();
  });
});

describe('entryInterval', () => {
  it('uses now as the end of a running entry', () => {
    const entry = makeEntry({ startedAt: H });
    expect(entryInterval(entry, 3 * H)).toEqual({ start: H, end: 3 * H });
  });

  it('ignores deleted entries', () => {
    const entry = makeEntry({ startedAt: H, endedAt: 2 * H, deletedAt: 5 * H });
    expect(entryInterval(entry, 10 * H)).toBeNull();
  });

  it('returns null for a running entry that starts after now (clock moved back)', () => {
    const entry = makeEntry({ startedAt: 5 * H });
    expect(entryInterval(entry, 3 * H)).toBeNull();
  });
});

describe('findOverlappingEntries', () => {
  const now = 10 * H;
  const entries = [
    makeEntry({ id: 'a', startedAt: 0, endedAt: 2 * H }),
    makeEntry({ id: 'b', startedAt: 2 * H, endedAt: 4 * H }),
    makeEntry({ id: 'deleted', startedAt: 4 * H, endedAt: 6 * H, deletedAt: 7 * H }),
    makeEntry({ id: 'running', startedAt: 8 * H }),
  ];

  it('finds entries that overlap the candidate', () => {
    const found = findOverlappingEntries({ start: H, end: 3 * H }, entries, now);
    expect(found.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('allows filling an exact gap', () => {
    expect(findOverlappingEntries({ start: 4 * H, end: 8 * H }, entries, now)).toEqual([]);
  });

  it('includes a running entry up to now', () => {
    const found = findOverlappingEntries({ start: 9 * H, end: 11 * H }, entries, now);
    expect(found.map((e) => e.id)).toEqual(['running']);
  });

  it('excludes the entry being edited', () => {
    const found = findOverlappingEntries({ start: 0, end: 2 * H + 1 }, entries, now, 'a');
    expect(found.map((e) => e.id)).toEqual(['b']);
  });
});
