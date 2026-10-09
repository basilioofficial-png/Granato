import { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { branchColor } from '@/domain/categories';
import { addDays, getLocalDate, localDateKey, localDayInterval } from '@/domain/time';
import { buildDayStrip, buildDayTimeline, unknownPercent, type TimelineItem } from '@/domain/timeline';
import type { LocalDate } from '@/domain/types';
import { deviceTimeZone } from '@/lib/timezone';
import { useTrackingStore } from '@/store/trackingStore';
import { categoryCrumb } from '@/ui/categoryLabels';
import { DayStripBar } from '@/ui/components/DayStripBar';
import { Hatch } from '@/ui/components/Hatch';
import { Icon } from '@/ui/components/Icon';
import { formatHistoryDayLabel, formatHourMinute, formatHoursMinutes } from '@/ui/format';
import { fonts, radii, type } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';
import { useNow } from '@/ui/useNow';

export default function HistoryScreen() {
  const { colors } = useTheme();
  const categories = useTrackingStore((s) => s.categories);
  const running = useTrackingStore((s) => s.running);
  const trackingSince = useTrackingStore((s) => s.trackingSince);
  const historyDay = useTrackingStore((s) => s.historyDay);
  const entries = useTrackingStore((s) => s.historyEntries);
  const showHistoryDay = useTrackingStore((s) => s.showHistoryDay);

  const now = useNow(running?.id ?? 'idle', running ? 1000 : 30000);
  const timeZone = deviceTimeZone();
  const today = getLocalDate(now, timeZone);
  const date: LocalDate = historyDay ?? today;

  // Open today on the first visit.
  useEffect(() => {
    if (historyDay === null) showHistoryDay(getLocalDate(Date.now(), deviceTimeZone()));
  }, [historyDay, showHistoryDay]);

  const day = localDayInterval(date, timeZone);
  const timeline = buildDayTimeline(entries, day, now, trackingSince);
  const strip = buildDayStrip(entries, day, now, trackingSince);
  const items = [...timeline.items].reverse(); // newest first, as in the design
  const isToday = localDateKey(date) === localDateKey(today);
  const firstDay = trackingSince !== null ? getLocalDate(trackingSince, timeZone) : today;
  const canGoBack = localDateKey(date) > localDateKey(firstDay);
  const beforeTracking = trackingSince === null || day.end <= trackingSince;
  const colorOf = (id: string) => branchColor(categories, id) ?? colors.muted;

  function renderItem({ item }: { item: TimelineItem }) {
    const isGap = item.kind === 'gap';
    const isRunning = item.kind === 'entry' && item.entry.endedAt === null;
    const category = item.kind === 'entry' ? categories.find((c) => c.id === item.entry.categoryId) : undefined;
    const notes: string[] = [];
    if (item.kind === 'entry') {
      const crumb = categoryCrumb(categories, item.entry.categoryId);
      if (crumb) notes.push(crumb);
      if (item.startsBefore) notes.push(`начато накануне в ${formatHourMinute(item.entry.startedAt, timeZone)}`);
      if (item.endsAfter && item.entry.endedAt !== null) {
        notes.push(`продолжилось до ${formatHourMinute(item.entry.endedAt, timeZone)} следующего дня`);
      }
    }
    return (
      <View style={styles.item}>
        <View style={styles.timeCol}>
          <Text style={[styles.timeStart, { color: colors.text }]}>
            {formatHourMinute(item.interval.start, timeZone)}
          </Text>
          <Text style={[styles.timeEnd, { color: colors.text2 }]}>
            {isRunning ? 'сейчас' : formatHourMinute(item.interval.end, timeZone)}
          </Text>
        </View>
        <View style={styles.barCol}>
          <View
            style={[
              styles.bar,
              isRunning && { borderColor: colors.soft, borderWidth: 3, left: 1, width: 10 },
              !isGap && { backgroundColor: item.kind === 'entry' ? colorOf(item.entry.categoryId) : undefined },
            ]}>
            {isGap ? <Hatch color={colors.muted} /> : null}
          </View>
        </View>
        <View style={[styles.body, { borderBottomColor: colors.divider }]}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.name, { color: isGap ? colors.text2 : colors.text }]}
              numberOfLines={2}>
              {isGap ? 'Неизвестно' : (category?.name ?? 'Удалённая категория')}
            </Text>
            <Text style={[styles.duration, { color: colors.text2 }]}>
              {formatHoursMinutes(item.interval.end - item.interval.start)}
            </Text>
          </View>
          {notes.length > 0 ? (
            <Text style={[styles.crumb, { color: colors.text2 }]}>{notes.join(' · ')}</Text>
          ) : null}
          {isRunning ? (
            <View style={[styles.badge, { backgroundColor: colors.soft }]}>
              <Text style={[styles.badgeText, { color: colors.pillText }]}>Идёт запись</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  const header = (
    <View style={styles.headerBlock}>
      <View style={[styles.switcher, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Предыдущий день"
          disabled={!canGoBack}
          onPress={() => showHistoryDay(addDays(date, -1))}
          style={styles.arrow}>
          <Icon name="left" color={canGoBack ? colors.text : colors.border} />
        </Pressable>
        <Text style={[styles.dayLabel, { color: colors.text }]}>{formatHistoryDayLabel(date, today)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Следующий день"
          disabled={isToday}
          onPress={() => showHistoryDay(addDays(date, 1))}
          style={styles.arrow}>
          <Icon name="right" color={isToday ? colors.border : colors.text} />
        </Pressable>
      </View>

      {timeline.items.length > 0 ? (
        <>
          <View style={styles.strip}>
            <DayStripBar strip={strip} day={day} colorOf={colorOf} showLabels={false} />
          </View>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={[styles.statLabel, { color: colors.text2 }]}>Отслежено</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatHoursMinutes(timeline.trackedMs)}
              </Text>
            </View>
            <View style={styles.stat}>
              <View style={styles.statLabelRow}>
                <View style={styles.hatchSwatch}>
                  <Hatch color={colors.muted} />
                </View>
                <Text style={[styles.statLabel, { color: colors.text2 }]}>Неизвестно</Text>
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatHoursMinutes(timeline.unknownMs)}
                <Text style={[styles.statPercent, { color: colors.text2 }]}>
                  {' '}
                  · {unknownPercent(timeline)}%
                </Text>
              </Text>
            </View>
          </View>
        </>
      ) : (
        <Text style={[type.body, styles.empty, { color: colors.text2 }]}>
          {beforeTracking
            ? 'В этот день учёт ещё не вёлся.'
            : 'Записей за этот день нет.'}
        </Text>
      )}
      <View style={[styles.divider, { backgroundColor: colors.divider }]} />
    </View>
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.titleBar}>
        <Text style={[type.h2, { color: colors.text }]}>История</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) =>
          item.kind === 'entry' ? item.entry.id : `gap-${item.interval.start}`
        }
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  titleBar: { height: 44, paddingHorizontal: 20, justifyContent: 'center', marginTop: 10 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  headerBlock: { paddingTop: 8 },
  switcher: {
    height: 44,
    borderRadius: radii.field,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrow: { width: 44, height: 42, alignItems: 'center', justifyContent: 'center' },
  dayLabel: { fontFamily: fonts.bold, fontSize: 15 },
  strip: { marginTop: 16 },
  stats: { marginTop: 12, flexDirection: 'row', gap: 10 },
  stat: { flex: 1 },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hatchSwatch: { width: 10, height: 10, borderRadius: 3, overflow: 'hidden' },
  statLabel: { fontFamily: fonts.regular, fontSize: 13 },
  statValue: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24 },
  statPercent: { fontFamily: fonts.semiBold, fontSize: 14 },
  empty: { marginTop: 24 },
  divider: { height: StyleSheet.hairlineWidth, marginTop: 16, marginHorizontal: -20 },
  item: { flexDirection: 'row', gap: 10 },
  timeCol: { width: 44, paddingTop: 12 },
  timeStart: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, fontVariant: ['tabular-nums'] },
  timeEnd: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, fontVariant: ['tabular-nums'] },
  barCol: { width: 12 },
  bar: {
    position: 'absolute',
    left: 4,
    width: 4,
    top: 14,
    bottom: 2,
    borderRadius: 2,
    overflow: 'hidden',
  },
  body: { flex: 1, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
  duration: { fontFamily: fonts.semiBold, fontSize: 14 },
  crumb: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  badge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 12,
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 12 },
});
