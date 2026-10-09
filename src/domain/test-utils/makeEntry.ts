import type { TimeEntry } from '@/domain/types';

/** Test-only factory: builds a TimeEntry with sensible defaults. */
export function makeEntry(overrides: Partial<TimeEntry> & Pick<TimeEntry, 'startedAt'>): TimeEntry {
  return {
    id: 'entry-1',
    userId: null,
    categoryId: 'category-work',
    endedAt: null,
    timezone: 'Europe/Moscow',
    source: 'live',
    isEdited: false,
    note: null,
    createdAt: overrides.startedAt,
    updatedAt: overrides.startedAt,
    deletedAt: null,
    ...overrides,
  };
}
