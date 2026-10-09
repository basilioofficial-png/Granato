import { checkCategoryName } from '@/domain/categories/naming';
import { makeCategory } from '@/domain/test-utils/makeCategory';

const all = [
  makeCategory({ id: 'work', name: 'Работа' }),
  makeCategory({ id: 'tasks', name: 'Задачи', parentId: 'work' }),
  makeCategory({ id: 'gone', name: 'Удалено', parentId: 'work', deletedAt: 1 }),
];

describe('checkCategoryName', () => {
  it('trims and collapses spaces', () => {
    expect(checkCategoryName(all, '  Код   ревью ', 'work')).toEqual({ ok: true, name: 'Код ревью' });
  });

  it('rejects empty and too long names', () => {
    expect(checkCategoryName(all, '   ', null)).toEqual({ ok: false, error: 'empty' });
    expect(checkCategoryName(all, 'а'.repeat(41), null)).toEqual({ ok: false, error: 'too_long' });
  });

  it('rejects a duplicate among siblings, ignoring case', () => {
    expect(checkCategoryName(all, 'задачи', 'work')).toEqual({ ok: false, error: 'duplicate' });
  });

  it('allows the same name under another parent or for the category itself', () => {
    expect(checkCategoryName(all, 'Задачи', null).ok).toBe(true);
    expect(checkCategoryName(all, 'Задачи', 'work', 'tasks').ok).toBe(true);
  });

  it('ignores deleted categories', () => {
    expect(checkCategoryName(all, 'Удалено', 'work').ok).toBe(true);
  });
});
