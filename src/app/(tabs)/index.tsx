import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { branchColor, categoryPath, childCategories, isActiveCategory } from '@/domain/categories';
import { entryDuration, getLocalDate, localDayInterval } from '@/domain/time';
import { buildDayStrip } from '@/domain/timeline';
import { recentCategoryIds } from '@/domain/tracking';
import type { Category } from '@/domain/types';
import { deviceTimeZone } from '@/lib/timezone';
import { useTrackingStore } from '@/store/trackingStore';
import { categoryCrumb, categorySubtitle } from '@/ui/categoryLabels';
import { DayStripBar } from '@/ui/components/DayStripBar';
import { Icon } from '@/ui/components/Icon';
import { UndoToastBar } from '@/ui/components/UndoToastBar';
import { formatDayTitle, formatDuration, formatHourMinute, formatHoursMinutes } from '@/ui/format';
import { fonts, radii, sizes, type } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';
import { useNow } from '@/ui/useNow';

const LOGO = require('../../../assets/images/logo.png');
const RECENT_TILES = 4;

export default function TrackerScreen() {
  const { colors } = useTheme();
  const status = useTrackingStore((s) => s.status);
  const fatalError = useTrackingStore((s) => s.fatalError);
  const actionError = useTrackingStore((s) => s.actionError);
  const categories = useTrackingStore((s) => s.categories);
  const running = useTrackingStore((s) => s.running);
  const todayEntries = useTrackingStore((s) => s.todayEntries);
  const recentEntries = useTrackingStore((s) => s.recentEntries);
  const start = useTrackingStore((s) => s.start);
  const stop = useTrackingStore((s) => s.stop);
  const refresh = useTrackingStore((s) => s.refresh);

  // Day may have changed while the app was in the background.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  // Seconds tick while recording; otherwise refresh twice a minute for the strip.
  const now = useNow(running?.id ?? 'idle', running ? 1000 : 30000);
  const timeZone = deviceTimeZone();
  const today = getLocalDate(now, timeZone);
  const day = localDayInterval(today, timeZone);
  const strip = buildDayStrip(todayEntries, day, now);

  const byId = new Map<string, Category>(categories.map((c) => [c.id, c]));
  const colorOf = (id: string) => branchColor(categories, id) ?? colors.muted;
  // Archived activities are not offered for new tracking.
  const activeRecent = recentEntries.filter((e) => isActiveCategory(categories, e.categoryId));
  const recentIds = recentCategoryIds(activeRecent, running?.categoryId ?? null, RECENT_TILES);
  const roots = childCategories(categories, null);
  const openPicker = () => router.push('/picker');

  if (status === 'failed') {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
        <Text style={[type.h3, styles.pad, { color: colors.accentText }]}>
          Не удалось открыть базу данных
        </Text>
        <Text style={[type.bodySmall, styles.pad, { color: colors.text2 }]}>{fatalError}</Text>
      </SafeAreaView>
    );
  }

  const runningCategory = running ? byId.get(running.categoryId) : undefined;
  const duration = running ? entryDuration(running, now) : null;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Image source={LOGO} style={styles.logoSmall} resizeMode="contain" />
          <Text style={[styles.headerDate, { color: colors.text }]}>{formatDayTitle(today)}</Text>
        </View>

        {running ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardTop}>
              <View style={styles.crumbRow}>
                <View style={[styles.dot, { backgroundColor: colorOf(running.categoryId) }]} />
                <Text style={[type.bodySmall, { color: colors.text2 }]} numberOfLines={1}>
                  {categoryCrumb(categories, running.categoryId)}
                </Text>
              </View>
              <View style={styles.liveRow}>
                <View style={[styles.liveDot, { backgroundColor: colors.accentText }]} />
                <Text style={[styles.liveText, { color: colors.accentText }]}>Идёт запись</Text>
              </View>
            </View>
            <Text style={[type.h2, styles.cardName, { color: colors.text }]} numberOfLines={2}>
              {runningCategory?.name ?? 'Неизвестная категория'}
            </Text>
            {duration?.ok ? (
              <Text style={[type.timer, { color: colors.text }]}>{formatDuration(duration.ms)}</Text>
            ) : (
              <Text style={[type.bodySmall, styles.warning, { color: colors.accentText }]}>
                Часы телефона показывают время раньше начала записи. Проверьте дату и время в
                настройках iPhone.
              </Text>
            )}
            <Text style={[type.bodySmall, { color: colors.text2 }]}>
              Начато в {formatHourMinute(running.startedAt, timeZone)}
            </Text>
            <View style={styles.cardActions}>
              <Pressable
                accessibilityRole="button"
                onPress={openPicker}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: colors.primary },
                  pressed && styles.pressed,
                ]}>
                <Icon name="swap" color={colors.onPrimary} size={22} />
                <Text style={[type.button, { color: colors.onPrimary }]}>Сменить активность</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Остановить запись"
                onPress={stop}
                style={({ pressed }) => [
                  styles.stopButton,
                  { borderColor: colors.border, backgroundColor: colors.chipBg },
                  pressed && styles.pressed,
                ]}>
                <Icon name="stop" color={colors.text} size={22} />
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.empty}>
            <Image source={LOGO} style={styles.logoLarge} resizeMode="contain" />
            <Text style={[type.h2, styles.emptyTitle, { color: colors.text }]}>
              Что вы делаете сейчас?
            </Text>
            <Text style={[type.body, styles.emptyText, { color: colors.text2 }]}>
              Выберите занятие — таймер запустится сразу. Следующий выбор сам завершит предыдущую
              запись.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={openPicker}
              style={({ pressed }) => [
                styles.primaryButton,
                styles.emptyButton,
                { backgroundColor: colors.primary },
                pressed && styles.pressed,
              ]}>
              <Icon name="play" color={colors.onPrimary} size={20} />
              <Text style={[type.button, { color: colors.onPrimary }]}>Начать отслеживание</Text>
            </Pressable>
          </View>
        )}

        {actionError ? (
          <Text style={[type.bodySmall, styles.warning, { color: colors.accentText }]}>
            {actionError}
          </Text>
        ) : null}

        {strip.segments.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={[type.section, { color: colors.text }]}>Зёрна дня</Text>
              <Text style={[styles.sectionNote, { color: colors.text2 }]}>
                Отслежено {formatHoursMinutes(strip.trackedMs)}
              </Text>
            </View>
            <View style={styles.stripWrap}>
              <DayStripBar strip={strip} day={day} colorOf={colorOf} />
            </View>
          </View>
        ) : null}

        {running && recentIds.length > 0 ? (
          <View style={styles.section}>
            <Text style={[type.section, { color: colors.text }]}>Переключить в одно касание</Text>
            <View style={styles.grid}>
              {recentIds.map((id) => (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  onPress={() => start(id)}
                  style={({ pressed }) => [
                    styles.tile,
                    styles.tileTwo,
                    { borderColor: colors.border, backgroundColor: colors.chipBg },
                    pressed && styles.pressed,
                  ]}>
                  <View style={[styles.dot, { backgroundColor: colorOf(id) }]} />
                  <View style={styles.tileText}>
                    <Text style={[styles.tileName, { color: colors.text }]} numberOfLines={1}>
                      {byId.get(id)?.name}
                    </Text>
                    <Text style={[styles.tileSub, { color: colors.text2 }]} numberOfLines={1}>
                      {categorySubtitle(categories, id)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {!running ? (
          <View style={styles.section}>
            <Text style={[type.section, { color: colors.text }]}>Быстрый старт</Text>
            <View style={styles.grid}>
              {roots.map((category) => (
                <Pressable
                  key={category.id}
                  accessibilityRole="button"
                  onPress={() => start(category.id)}
                  style={({ pressed }) => [
                    styles.tile,
                    styles.tileThree,
                    { borderColor: colors.border, backgroundColor: colors.chipBg },
                    pressed && styles.pressed,
                  ]}>
                  <View style={[styles.dot, { backgroundColor: category.color }]} />
                  <Text style={[styles.tileName, { color: colors.text }]} numberOfLines={1}>
                    {category.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
      <UndoToastBar describeCategory={(id) => categoryPath(categories, id).at(-1)?.name ?? '—'} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  pad: { margin: 20 },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 120 },
  header: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoSmall: { width: 30, height: 36 },
  headerDate: { fontFamily: fonts.semiBold, fontSize: 15, lineHeight: 20 },
  card: {
    marginTop: 20,
    borderWidth: 1,
    borderRadius: radii.card,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 20,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  crumbRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontFamily: fonts.bold, fontSize: 13 },
  cardName: { marginTop: 6 },
  cardActions: { marginTop: 20, flexDirection: 'row', gap: 12 },
  primaryButton: {
    flex: 1,
    height: sizes.button,
    borderRadius: radii.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  stopButton: {
    width: sizes.button,
    height: sizes.button,
    borderRadius: radii.button,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  warning: { marginTop: 8 },
  empty: { marginTop: 28, alignItems: 'center' },
  logoLarge: { width: 64, height: 76 },
  emptyTitle: { marginTop: 16, textAlign: 'center' },
  emptyText: { marginTop: 8, textAlign: 'center' },
  emptyButton: { flex: 0, alignSelf: 'stretch', marginTop: 20 },
  section: { marginTop: 24 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionNote: { fontFamily: fonts.regular, fontSize: 13 },
  stripWrap: { marginTop: 10 },
  grid: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    borderWidth: 1,
    borderRadius: radii.button,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  tileTwo: { height: 64, flexBasis: '47%', flexGrow: 1 },
  tileThree: { height: 56, flexBasis: '30%', flexGrow: 1, gap: 8, paddingHorizontal: 12 },
  tileText: { flexShrink: 1 },
  tileName: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  tileSub: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
