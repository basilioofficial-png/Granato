import {
  branchColor,
  canHaveChildren,
  categoryDepth,
  categoryPath,
  childCategories,
  descendantCount,
  isActiveCategory,
  possibleParents,
  subtreeIds,
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

describe('isActiveCategory', () => {
  it('is false for an archived category and everything below it', () => {
    const list = [
      makeCategory({ id: 'work' }),
      makeCategory({ id: 'meetings', parentId: 'work', archivedAt: 5 }),
      makeCategory({ id: 'standup', parentId: 'meetings' }),
    ];
    expect(isActiveCategory(list, 'work')).toBe(true);
    expect(isActiveCategory(list, 'meetings')).toBe(false);
    expect(isActiveCategory(list, 'standup')).toBe(false);
    expect(isActiveCategory(list, 'missing')).toBe(false);
  });
});

describe('depth rules', () => {
  it('allows three levels: category › activity › refinement', () => {
    expect(categoryDepth(all, 'standup')).toBe(2);
    expect(canHaveChildren(all, 'work')).toBe(true);
    expect(canHaveChildren(all, 'meetings')).toBe(true);
    expect(canHaveChildren(all, 'standup')).toBe(false);
  });
});

describe('possibleParents', () => {
  const ids = (list: ReturnType<typeof possibleParents>) => list.map((c) => c?.id ?? null);

  it('never offers the category itself or its descendants', () => {
    const result = ids(possibleParents(all, 'meetings'));
    expect(result).not.toContain('meetings');
    expect(result).not.toContain('standup');
    expect(result).toContain(null);
  });

  it('keeps the moved branch within three levels', () => {
    // "meetings" has a child, so it can only go to the top level or directly under a root.
    expect(ids(possibleParents(all, 'meetings')).sort()).toEqual([null, 'rest', 'work'].sort());
    // A leaf may go under any active category that is not yet at the last level.
    expect(ids(possibleParents(all, 'rest'))).toContain('meetings');
    expect(ids(possibleParents(all, 'rest'))).not.toContain('standup');
  });

  it('does not offer archived categories', () => {
    expect(ids(possibleParents(all, 'rest'))).not.toContain('old');
  });
});

describe('subtreeIds', () => {
  it('collects all levels below', () => {
    expect([...subtreeIds(all, 'work')].sort()).toEqual(['meetings', 'old', 'standup', 'tasks', 'work']);
  });
});
