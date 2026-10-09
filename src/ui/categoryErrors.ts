import type { CategoryError } from '@/services/categoriesService';

export const CATEGORY_ERROR_MESSAGES: Record<CategoryError, string> = {
  empty: 'Введите название.',
  too_long: 'Название должно быть не длиннее 40 символов.',
  duplicate: 'Такое название уже есть на этом уровне.',
  invalid_parent: 'Сюда переместить нельзя.',
  too_deep: 'Можно создать не больше трёх уровней: категория › активность › уточнение.',
  invalid_color: 'Выберите цвет.',
  not_found: 'Категория не найдена.',
};
