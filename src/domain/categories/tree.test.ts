import {
  branchColor,
  categoryPath,
  childCategories,
  descendantCount,
} from '@/domain/categories/tree';
import { makeCategory } from '@/domain/test-utils/makeCategory';

const work = makeCategory({ id: 'work', name: 'Работа', color: '#B71F2E', sortOrder: 0 });
const meetings = makeCategory({ id: 'meetings', name: 'Совещания', parentId: 'work', sortOrder: 1 });
const tasks = makeCategory({ id: 'tasks', name: 'Задачи', parentId: 'work', sortOrder: 0 });
const standup = makeCategory({ id: 'standup', name: 'Планёрка', parentId: 'meetings' });
const rest = makeCategory({ id: 'rest', name: 'Отдых', color: '#E6A23C', sortOrder: 1 });
const archived = makeCategory({ id: 'old', name: 'Старое', parentId: 'work', archivedAt: 1 });
const all = [standup, rest, meetings, work, tasks, archived];

describe('categoryPath', () => {
  it('returns the chain from the root', () => {
    expect(categoryPath(all, 'standup').map((c) => c.name)).toEqual([
      'Работа',
      'Совещания',
      'Планёрка',
    ]);
  });

  it('returns a single item for a root', () => {
    expect(categoryPath(all, 'rest').map((c) => c.id)).toEqual(['rest']);
  });

  it('returns an empty path for an unknown id', () => {
    expect(categoryPath(all, 'missing')).toEqual([]);
  });

  it('stops on a broken parent cycle instead of looping forever', () => {
    const a = makeCategory({ id: 'a', parentId: 'b' });
    const b = makeCategory({ id: 'b', parentId: 'a' });
    expect(categoryPath([a, b], 'a').length).toBeLessThanOrEqual(3);
  });
});

describe('childCategories', () => {
  it('lists visible roots in display order', () => {
    expect(childCategories(all, null).map((c) => c.id)).toEqual(['work', 'rest']);
  });

  it('lists visible children sorted by sortOrder, without archived ones', () => {
    expect(childCategories(all, 'work').map((c) => c.id)).toEqual(['tasks', 'meetings']);
  });
});

describe('descendantCount', () => {
  it('counts all visible levels below a category', () => {
    expect(descendantCount(all, 'work')).toBe(3);
    expect(descendantCount(all, 'rest')).toBe(0);
  });
});

describe('branchColor', () => {
  it('uses the root color for nested activities', () => {
    expect(branchColor(all, 'standup')).toBe('#B71F2E');
  });
});
