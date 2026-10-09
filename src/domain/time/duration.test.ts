import { entryDuration } from '@/domain/time/duration';
import { makeEntry } from '@/domain/test-utils/makeEntry';

const MIN = 60 * 1000;
const T0 = Date.UTC(2026, 9, 9, 9, 0);

describe('entryDuration', () => {
  it('computes a finished entry from its timestamps', () => {
    const entry = makeEntry({ startedAt: T0, endedAt: T0 + 90 * MIN });
    expect(entryDuration(entry, T0 + 1000 * MIN)).toEqual({ ok: true, ms: 90 * MIN });
  });

  it('computes a running entry up to now (e.g. after the app was closed for hours)', () => {
    const entry = makeEntry({ startedAt: T0 });
    expect(entryDuration(entry, T0 + 3 * 60 * MIN)).toEqual({ ok: true, ms: 3 * 60 * MIN });
  });

  it('gives zero for an entry that has just started', () => {
    expect(entryDuration(makeEntry({ startedAt: T0 }), T0)).toEqual({ ok: true, ms: 0 });
  });

  it('reports clock_behind instead of a negative duration', () => {
    const entry = makeEntry({ startedAt: T0 });
    expect(entryDuration(entry, T0 - MIN)).toEqual({ ok: false, error: 'clock_behind' });
  });

  it('reports invalid_interval for a finished entry that ends before it starts', () => {
    const entry = makeEntry({ startedAt: T0, endedAt: T0 - MIN });
    expect(entryDuration(entry, T0)).toEqual({ ok: false, error: 'invalid_interval' });
  });
});
