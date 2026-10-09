import { makeCategory } from '@/domain/test-utils/makeCategory';
import { categoryCrumb, categorySubtitle } from '@/ui/categoryLabels';

const all = [
  makeCategory({ id: 'work', name: 'Работа' }),
  makeCategory({ id: 'meetings', name: 'Совещания', parentId: 'work' }),
  makeCategory({ id: 'standup', name: 'Планёрка', parentId: 'meetings' }),
  makeCategory({ id: 'rest', name: 'Отдых' }),
];

describe('category labels', () => {
  it('builds the crumb from the parents', () => {
    expect(categoryCrumb(all, 'standup')).toBe('Работа › Совещания');
    expect(categoryCrumb(all, 'work')).toBe('');
  });

  it('describes roots by their detail level', () => {
    expect(categorySubtitle(all, 'standup')).toBe('Работа › Совещания');
    expect(categorySubtitle(all, 'work')).toBe('2 активности');
    expect(categorySubtitle(all, 'rest')).toBe('Без подкатегорий');
  });
});
