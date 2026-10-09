import { makeEntry } from '@/domain/test-utils/makeEntry';
import { recentCategoryIds } from '@/domain/tracking/recent';

const entries = [
  makeEntry({ id: '1', categoryId: 'work', startedAt: 1 }),
  makeEntry({ id: '2', categoryId: 'food', startedAt: 2 }),
  makeEntry({ id: '3', categoryId: 'work', startedAt: 3 }),
  makeEntry({ id: '4', categoryId: 'metro', startedAt: 4 }),
  makeEntry({ id: '5', categoryId: 'deleted', startedAt: 5, deletedAt: 6 }),
  makeEntry({ id: '6', categoryId: 'rest', startedAt: 6 }),
];

describe('recentCategoryIds', () => {
  it('returns the most recent distinct categories first', () => {
    expect(recentCategoryIds(entries, null, 10)).toEqual(['rest', 'metro', 'work', 'food']);
  });

  it('excludes the running category and respects the limit', () => {
    expect(recentCategoryIds(entries, 'rest', 2)).toEqual(['metro', 'work']);
  });
});
