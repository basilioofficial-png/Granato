import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  branchColor,
  canHaveChildren,
  categoryPath,
  childCategories,
  isActiveCategory,
} from '@/domain/categories';
import { recentCategoryIds } from '@/domain/tracking';
import type { Category } from '@/domain/types';
import { useTrackingStore } from '@/store/trackingStore';
import { categorySubtitle } from '@/ui/categoryLabels';
import { Icon } from '@/ui/components/Icon';
import { fonts, radii, type } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

const RECENT_CHIPS = 4;

interface Row {
  readonly category: Category;
  readonly subtitle: string;
  readonly hasChildren: boolean;
}

// Native iOS sheet (presentation: 'modal'): swipe down or ✕ closes it.
export default function PickerScreen() {
  const { colors } = useTheme();
  const categories = useTrackingStore((s) => s.categories);
  const running = useTrackingStore((s) => s.running);
  const recentEntries = useTrackingStore((s) => s.recentEntries);
  const start = useTrackingStore((s) => s.start);

  const [path, setPath] = useState<readonly string[]>([]);
  const [query, setQuery] = useState('');
  const parentId = path.at(-1) ?? null;
  const parent = parentId ? categories.find((c) => c.id === parentId) : undefined;
  const search = query.trim().toLowerCase();
  const colorOf = (id: string) => branchColor(categories, id) ?? colors.muted;

  const rows = useMemo<Row[]>(() => {
    const toRow = (category: Category): Row => ({
      category,
      subtitle: search
        ? categoryPath(categories, category.id)
            .slice(0, -1)
            .map((c) => c.name)
            .join(' › ') || 'Категория'
        : categorySubtitle(categories, category.id),
      hasChildren: childCategories(categories, category.id).length > 0,
    });
    if (search && parentId === null) {
      return categories
        .filter((c) => isActiveCategory(categories, c.id) && c.name.toLowerCase().includes(search))
        .map(toRow);
    }
    return childCategories(categories, parentId).map(toRow);
  }, [categories, parentId, search]);

  const recentIds = [
    ...(running ? [running.categoryId] : []),
    ...recentCategoryIds(
      recentEntries.filter((e) => isActiveCategory(categories, e.categoryId)),
      running?.categoryId ?? null,
      RECENT_CHIPS - (running ? 1 : 0),
    ),
  ].filter((id) => id === running?.categoryId || isActiveCategory(categories, id));

  function choose(categoryId: string) {
    start(categoryId);
    router.back();
  }

  const header = (
    <View>
      {parent === undefined ? (
        <>
          <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Icon name="search" color={colors.text2} size={20} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Найти активность"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Поиск активности"
              returnKeyType="search"
              style={[styles.searchInput, { color: colors.text }]}
            />
          </View>
          {!search && recentIds.length > 0 ? (
            <View style={styles.block}>
              <Text style={[styles.blockTitle, { color: colors.text2 }]}>Недавние</Text>
              <View style={styles.chips}>
                {recentIds.map((id) => {
                  const current = id === running?.categoryId;
                  const name = categories.find((c) => c.id === id)?.name ?? '';
                  return (
                    <Pressable
                      key={id}
                      accessibilityRole="button"
                      onPress={() => choose(id)}
                      style={({ pressed }) => [
                        styles.chip,
                        current
                          ? { backgroundColor: colors.soft }
                          : { borderColor: colors.border, borderWidth: 1 },
                        pressed && styles.pressed,
                      ]}>
                      <View style={[styles.chipDot, { backgroundColor: colorOf(id) }]} />
                      <Text
                        style={[
                          styles.chipText,
                          current
                            ? { color: colors.pillText, fontFamily: fonts.bold }
                            : { color: colors.text },
                        ]}>
                        {current ? `${name} · сейчас` : name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
          <Text style={[styles.blockTitle, styles.listTitle, { color: colors.text2 }]}>
            {search ? (rows.length ? 'Найдено' : 'Ничего не найдено') : 'Категории'}
          </Text>
        </>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => choose(parent.id)}
          style={({ pressed }) => [
            styles.onlyRow,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && styles.pressed,
          ]}>
          <View style={[styles.onlyIcon, { backgroundColor: colorOf(parent.id) }]}>
            <Icon name="play" color="#FFFFFF" size={18} />
          </View>
          <View>
            <Text style={[styles.rowName, { color: colors.text, fontFamily: fonts.bold }]}>
              Только «{parent.name}»
            </Text>
            <Text style={[styles.rowSub, { color: colors.text2 }]}>Без уточнения — укрупнённый учёт</Text>
          </View>
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={[styles.sheet, { backgroundColor: colors.bg }]}>
      <View style={[styles.grabber, { backgroundColor: colors.border }]} />
      <View style={styles.titleRow}>
        {parent ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Назад"
            onPress={() => setPath(path.slice(0, -1))}
            style={styles.iconButton}>
            <Icon name="left" color={colors.text} />
          </Pressable>
        ) : null}
        <View style={styles.titleText}>
          {path.length > 1 ? (
            <Text style={[styles.rowSub, { color: colors.text2 }]} numberOfLines={1}>
              {categoryPath(categories, parentId ?? '')
                .slice(0, -1)
                .map((c) => c.name)
                .join(' › ')}
            </Text>
          ) : null}
          <Text style={[type.h3, { color: colors.text }]} numberOfLines={1}>
            {parent?.name ?? 'Выбор активности'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Закрыть"
          onPress={() => router.back()}
          style={styles.iconButton}>
          <Icon name="close" color={colors.text2} size={22} />
        </Pressable>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(row) => row.category.id}
        ListHeaderComponent={header}
        ListFooterComponent={
          parent === undefined || canHaveChildren(categories, parent.id) ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (parent) {
                  router.push({ pathname: '/category-form', params: { parentId: parent.id } });
                } else {
                  router.back();
                  router.push('/categories');
                }
              }}
              style={styles.footerLink}>
              <Icon name="plus" color={colors.accentText} size={18} />
              <Text style={[styles.footerText, { color: colors.accentText }]}>
                {parent ? `Добавить активность в «${parent.name}»` : 'Управлять категориями'}
              </Text>
            </Pressable>
          ) : null
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const current = item.category.id === running?.categoryId;
          return (
            <View style={[styles.row, { borderBottomColor: colors.divider }]}>
              <Pressable
                accessibilityRole="button"
                onPress={() => choose(item.category.id)}
                style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}>
                <View style={[styles.rowDot, { backgroundColor: colorOf(item.category.id) }]} />
                <View style={styles.rowText}>
                  <Text style={[styles.rowName, { color: colors.text }]}>{item.category.name}</Text>
                  <Text style={[styles.rowSub, { color: colors.text2 }]} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>
                {current ? (
                  <View style={[styles.badge, { backgroundColor: colors.soft }]}>
                    <Text style={[styles.badgeText, { color: colors.pillText }]}>Идёт</Text>
                  </View>
                ) : null}
              </Pressable>
              {item.hasChildren && !search ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Подкатегории: ${item.category.name}`}
                  onPress={() => setPath([...path, item.category.id])}
                  style={styles.iconButton}>
                  <Icon name="right" color={colors.text2} size={22} />
                </Pressable>
              ) : null}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, paddingTop: 8 },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3 },
  titleRow: {
    marginTop: 10,
    minHeight: 48,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  titleText: { flex: 1, paddingHorizontal: 10 },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  search: {
    marginTop: 12,
    height: 48,
    borderRadius: radii.field,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: { flex: 1, height: 48, fontFamily: fonts.regular, fontSize: 16 },
  block: { marginTop: 16 },
  blockTitle: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18 },
  listTitle: { marginTop: 20, marginBottom: 4 },
  chips: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontFamily: fonts.semiBold, fontSize: 14 },
  onlyRow: {
    marginTop: 8,
    marginBottom: 4,
    minHeight: 60,
    borderRadius: radii.button,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  onlyIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowMain: { flex: 1, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowDot: { width: 12, height: 12, borderRadius: 6 },
  rowText: { flexShrink: 1 },
  rowName: { fontFamily: fonts.semiBold, fontSize: 16, lineHeight: 22 },
  rowSub: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  badge: { marginLeft: 'auto', height: 24, paddingHorizontal: 10, borderRadius: 12, justifyContent: 'center' },
  badgeText: { fontFamily: fonts.bold, fontSize: 12 },
  pressed: { opacity: 0.6 },
  footerLink: {
    marginTop: 8,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerText: { fontFamily: fonts.bold, fontSize: 15 },
});
