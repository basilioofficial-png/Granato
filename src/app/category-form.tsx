import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  branchColor,
  categoryPath,
  childCategories,
  MAX_CATEGORY_NAME_LENGTH,
  possibleParents,
} from '@/domain/categories';
import { useTrackingStore } from '@/store/trackingStore';
import { CATEGORY_ERROR_MESSAGES } from '@/ui/categoryErrors';
import { Icon } from '@/ui/components/Icon';
import { CATEGORY_COLORS, fonts, radii, sizes, type } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

/** Modal form: create (optionally under `parentId`) or edit (`id`) a category. */
export default function CategoryFormScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id?: string; parentId?: string }>();
  const categories = useTrackingStore((s) => s.categories);
  const createCategory = useTrackingStore((s) => s.createCategory);
  const updateCategory = useTrackingStore((s) => s.updateCategory);

  const editing = params.id ? categories.find((c) => c.id === params.id) : undefined;
  const initialParent = editing ? editing.parentId : (params.parentId ?? null);
  const parentForTitle = initialParent ? categories.find((c) => c.id === initialParent) : undefined;

  const [name, setName] = useState(editing?.name ?? '');
  // A new category gets a color no other top-level category uses yet.
  const freeColor =
    CATEGORY_COLORS.find((c) => !childCategories(categories, null).some((root) => root.color === c)) ??
    CATEGORY_COLORS[0];
  const [color, setColor] = useState<string | null>(
    editing ? (editing.parentId === null ? editing.color : null) : initialParent === null ? freeColor : null,
  );
  const [parentId, setParentId] = useState<string | null>(initialParent);
  const [error, setError] = useState<string | null>(null);

  const isTopLevel = parentId === null;
  const title = editing
    ? 'Изменить'
    : parentForTitle
      ? `Активность в «${parentForTitle.name}»`
      : 'Новая категория';
  const parents = editing ? possibleParents(categories, editing.id) : [];

  function save() {
    const chosenColor = isTopLevel ? (color ?? undefined) : undefined;
    const result = editing
      ? updateCategory(editing.id, { name, parentId, color: chosenColor })
      : createCategory({ name, parentId, color: chosenColor });
    if (result.ok) router.back();
    else setError(CATEGORY_ERROR_MESSAGES[result.error]);
  }

  return (
    <View style={[styles.sheet, { backgroundColor: colors.bg }]}>
      <View style={[styles.grabber, { backgroundColor: colors.border }]} />
      <View style={styles.titleRow}>
        <Text style={[type.h3, styles.title, { color: colors.text }]} numberOfLines={2}>
          {title}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Закрыть"
          onPress={() => router.back()}
          style={styles.iconButton}>
          <Icon name="close" color={colors.text2} size={22} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: colors.text2 }]}>Название</Text>
        <TextInput
          value={name}
          onChangeText={(text) => {
            setName(text);
            setError(null);
          }}
          autoFocus={!editing}
          maxLength={MAX_CATEGORY_NAME_LENGTH}
          placeholder={isTopLevel ? 'Например, Хобби' : 'Например, Планёрка'}
          placeholderTextColor={colors.muted}
          returnKeyType="done"
          onSubmitEditing={save}
          style={[
            styles.input,
            { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        />

        {isTopLevel ? (
          <>
            <Text style={[styles.label, styles.spaced, { color: colors.text2 }]}>Цвет</Text>
            <Text style={[type.bodySmall, { color: colors.text2 }]}>
              Вложенные активности рисуются цветом своей категории.
            </Text>
            <View style={styles.swatches}>
              {CATEGORY_COLORS.map((swatch) => {
                const selected = swatch === color;
                return (
                  <Pressable
                    key={swatch}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Цвет ${swatch}`}
                    onPress={() => {
                      setColor(swatch);
                      setError(null);
                    }}
                    style={[
                      styles.swatchRing,
                      { borderColor: selected ? colors.text : 'transparent' },
                    ]}>
                    <View style={[styles.swatch, { backgroundColor: swatch }]} />
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        {editing ? (
          <>
            <Text style={[styles.label, styles.spaced, { color: colors.text2 }]}>Расположение</Text>
            {parents.map((parent) => {
              const id = parent?.id ?? null;
              const selected = id === parentId;
              const label = parent
                ? categoryPath(categories, parent.id)
                    .map((c) => c.name)
                    .join(' › ')
                : 'Верхний уровень (отдельная категория)';
              return (
                <Pressable
                  key={id ?? 'top'}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setParentId(id);
                    // Moving to the top level keeps the color of the former branch.
                    if (id === null && color === null && editing) {
                      setColor(branchColor(categories, editing.id) ?? freeColor);
                    }
                    setError(null);
                  }}
                  style={[styles.option, { borderBottomColor: colors.divider }]}>
                  <View
                    style={[
                      styles.radio,
                      { borderColor: selected ? colors.primary : colors.border },
                    ]}>
                    {selected ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}
                  </View>
                  <Text style={[type.bodySmall, styles.optionText, { color: colors.text }]}>{label}</Text>
                </Pressable>
              );
            })}
          </>
        ) : null}

        {error ? <Text style={[type.bodySmall, styles.error, { color: colors.accentText }]}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          onPress={save}
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: colors.primary },
            pressed && styles.pressed,
          ]}>
          <Text style={[type.button, { color: colors.onPrimary }]}>
            {editing ? 'Сохранить' : 'Создать'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, paddingTop: 8 },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3 },
  titleRow: { marginTop: 10, paddingLeft: 20, paddingRight: 10, flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1 },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  label: { marginTop: 12, marginBottom: 8, fontFamily: fonts.bold, fontSize: 13, lineHeight: 18 },
  spaced: { marginTop: 24, marginBottom: 2 },
  input: {
    height: 48,
    borderRadius: radii.field,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  swatches: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatchRing: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 36, height: 36, borderRadius: 18 },
  option: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optionText: { flex: 1 },
  error: { marginTop: 16 },
  saveButton: {
    marginTop: 24,
    height: sizes.button,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
