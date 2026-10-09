import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import {
  branchColor,
  canHaveChildren,
  categoryDepth,
  childCategories,
  descendantCount,
} from '@/domain/categories';
import type { Category } from '@/domain/types';
import { useTrackingStore } from '@/store/trackingStore';
import { categoryCrumb } from '@/ui/categoryLabels';
import { CATEGORY_ERROR_MESSAGES } from '@/ui/categoryErrors';
import { Icon } from '@/ui/components/Icon';
import { pluralRu } from '@/ui/format';
import { fonts, radii, sizes, type } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

function openForm(params: { id?: string; parentId?: string }) {
  router.push({ pathname: '/category-form', params });
}

function MoreIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Circle cx={5} cy={12} r={1.8} fill={color} />
      <Circle cx={12} cy={12} r={1.8} fill={color} />
      <Circle cx={19} cy={12} r={1.8} fill={color} />
    </Svg>
  );
}

export default function CategoriesScreen() {
  const { colors } = useTheme();
  const categories = useTrackingStore((s) => s.categories);
  const archiveCategory = useTrackingStore((s) => s.archiveCategory);
  const restoreCategory = useTrackingStore((s) => s.restoreCategory);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  const archived = categories.filter((c) => c.archivedAt !== null);

  function toggle(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  }

  function report(result: { ok: boolean; error?: keyof typeof CATEGORY_ERROR_MESSAGES }) {
    if (!result.ok && result.error) Alert.alert('Не получилось', CATEGORY_ERROR_MESSAGES[result.error]);
  }

  function showActions(category: Category) {
    const canAdd = canHaveChildren(categories, category.id);
    const actions: { label: string; run: () => void; destructive?: boolean }[] = [
      { label: 'Изменить', run: () => openForm({ id: category.id }) },
      ...(canAdd
        ? [{ label: 'Добавить вложенную активность', run: () => openForm({ parentId: category.id }) }]
        : []),
      {
        label: 'В архив',
        destructive: true,
        run: () => report(archiveCategory(category.id)),
      },
    ];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: category.name,
          message: 'Архив скрывает категорию из выбора; записи и история сохраняются.',
          options: [...actions.map((a) => a.label), 'Отмена'],
          cancelButtonIndex: actions.length,
          destructiveButtonIndex: actions.findIndex((a) => a.destructive),
        },
        (index) => actions[index]?.run(),
      );
    } else {
      Alert.alert(category.name, undefined, [
        ...actions.map((a) => ({
          text: a.label,
          style: a.destructive ? ('destructive' as const) : ('default' as const),
          onPress: a.run,
        })),
        { text: 'Отмена', style: 'cancel' as const },
      ]);
    }
  }

  function subtitle(category: Category, depth: number): string {
    const children = childCategories(categories, category.id);
    if (depth === 0) {
      const count = descendantCount(categories, category.id);
      return count === 0
        ? 'Без вложенных активностей'
        : `${count} ${pluralRu(count, ['активность', 'активности', 'активностей'])}`;
    }
    if (children.length > 0) return children.map((c) => c.name).join(', ');
    return depth === 2 ? 'Уточнение' : 'Конечная активность';
  }

  function renderNode(category: Category, depth: number) {
    const children = childCategories(categories, category.id);
    const isOpen = expanded.has(category.id);
    const color = branchColor(categories, category.id) ?? colors.muted;
    const expandable = depth === 0 || children.length > 0;
    return (
      <View key={category.id}>
        <View
          style={[
            styles.row,
            depth === 0
              ? [styles.rootRow, { borderTopColor: colors.divider }]
              : [styles.childRow, { marginLeft: 10 + (depth - 1) * 28, borderLeftColor: colors.border }],
          ]}>
          {depth === 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Цвет категории ${category.name}`}
              onPress={() => openForm({ id: category.id })}
              style={styles.colorButton}>
              <View style={[styles.colorCircle, { backgroundColor: category.color }]} />
            </Pressable>
          ) : (
            <View style={[styles.childDot, { backgroundColor: color }]} />
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: isOpen }}
            onPress={() => (expandable ? toggle(category.id) : openForm({ id: category.id }))}
            style={styles.rowMain}>
            <View style={styles.rowText}>
              <Text
                style={[
                  depth === 0 ? styles.rootName : depth === 1 ? styles.childName : styles.leafName,
                  { color: colors.text },
                ]}>
                {category.name}
              </Text>
              <Text style={[styles.rowSub, { color: colors.text2 }]} numberOfLines={2}>
                {subtitle(category, depth)}
              </Text>
            </View>
            {expandable ? (
              <View style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}>
                <Icon name="right" color={colors.text2} size={22} />
              </View>
            ) : null}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Действия: ${category.name}`}
            onPress={() => showActions(category)}
            style={styles.moreButton}>
            <MoreIcon color={colors.text2} />
          </Pressable>
        </View>

        {isOpen ? (
          <View>
            {children.map((child) => renderNode(child, depth + 1))}
            {depth === 0 && children.length === 0 ? (
              <View style={[styles.emptyNote, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[type.bodySmall, { color: colors.text2 }]}>
                  Вложенных активностей нет — время записывается просто как «{category.name}». Это
                  нормально для укрупнённого учёта.
                </Text>
              </View>
            ) : null}
            {canHaveChildren(categories, category.id) ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => openForm({ parentId: category.id })}
                style={[styles.addChild, { paddingLeft: (depth + 1) * 28 + 10 }]}>
                <Icon name="plus" color={colors.accentText} size={18} />
                <Text style={[styles.addChildText, { color: colors.accentText }]}>
                  Активность в «{category.name}»
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backLink}>
          <Icon name="left" color={colors.accentText} />
          <Text style={[styles.backText, { color: colors.accentText }]}>Профиль</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[type.h2, { color: colors.text }]}>Категории</Text>
        <Text style={[type.bodySmall, styles.lead, { color: colors.text2 }]}>
          Время можно записывать на любом уровне: категория, активность или её уточнение.
        </Text>

        <View style={styles.tree}>{childCategories(categories, null).map((c) => renderNode(c, 0))}</View>

        <Pressable
          accessibilityRole="button"
          onPress={() => openForm({})}
          style={({ pressed }) => [styles.newButton, { borderColor: colors.border }, pressed && styles.pressed]}>
          <Icon name="plus" color={colors.text} size={18} />
          <Text style={[type.button, { color: colors.text }]}>Новая категория</Text>
        </Pressable>

        {archived.length > 0 ? (
          <View style={styles.archive}>
            <Text style={[type.section, { color: colors.text }]}>Архив</Text>
            <Text style={[type.bodySmall, { color: colors.text2 }]}>
              Скрыто из выбора активности. История и аналитика их сохраняют.
            </Text>
            {archived.map((category) => (
              <View key={category.id} style={[styles.archiveRow, { borderBottomColor: colors.divider }]}>
                <View style={[styles.childDot, { backgroundColor: branchColor(categories, category.id) ?? colors.muted }]} />
                <View style={styles.rowText}>
                  <Text style={[styles.childName, { color: colors.text }]}>{category.name}</Text>
                  <Text style={[styles.rowSub, { color: colors.text2 }]}>
                    {categoryCrumb(categories, category.id) ||
                      (categoryDepth(categories, category.id) === 0 ? 'Категория' : '')}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => report(restoreCategory(category.id))}
                  style={styles.restoreButton}>
                  <Text style={[styles.restoreText, { color: colors.accentText }]}>Вернуть</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { height: 44, paddingHorizontal: 12, justifyContent: 'center' },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 44, alignSelf: 'flex-start' },
  backText: { fontFamily: fonts.semiBold, fontSize: 16 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  lead: { marginTop: 6 },
  tree: { marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rootRow: { minHeight: 60, borderTopWidth: StyleSheet.hairlineWidth },
  childRow: { minHeight: 52, paddingLeft: 18, borderLeftWidth: 1.5 },
  colorButton: { width: 44, height: 44, marginLeft: -8, alignItems: 'center', justifyContent: 'center' },
  colorCircle: { width: 26, height: 26, borderRadius: 13 },
  childDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  rowMain: { flex: 1, minHeight: sizes.touch, flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowText: { flex: 1 },
  rootName: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
  childName: { fontFamily: fonts.semiBold, fontSize: 15, lineHeight: 22 },
  leafName: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  rowSub: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  moreButton: { width: 44, height: 44, marginRight: -10, alignItems: 'center', justifyContent: 'center' },
  emptyNote: {
    marginTop: 2,
    marginBottom: 8,
    padding: 14,
    borderRadius: radii.field,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addChild: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  addChildText: { fontFamily: fonts.bold, fontSize: 14 },
  newButton: {
    marginTop: 16,
    height: sizes.button,
    borderRadius: radii.button,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pressed: { opacity: 0.6 },
  archive: { marginTop: 32, gap: 4 },
  archiveRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  restoreButton: { height: 44, paddingHorizontal: 8, justifyContent: 'center' },
  restoreText: { fontFamily: fonts.bold, fontSize: 14 },
});
