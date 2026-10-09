import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { entryDuration } from '@/domain/time';
import type { Category, TimeEntry } from '@/domain/types';
import { APP_NAME } from '@/lib/appInfo';
import { deviceTimeZone } from '@/lib/timezone';
import { useTrackingStore } from '@/store/trackingStore';
import { formatClockTime, formatDuration } from '@/ui/format';
import { useNow } from '@/ui/useNow';

// Technical tracking screen (stage 4): verifies the mechanics, not the final design.

function durationText(entry: TimeEntry, now: number): string {
  const duration = entryDuration(entry, now);
  return duration.ok ? formatDuration(duration.ms) : '—';
}

export default function TrackingScreen() {
  const status = useTrackingStore((s) => s.status);
  const fatalError = useTrackingStore((s) => s.fatalError);
  const actionError = useTrackingStore((s) => s.actionError);
  const categories = useTrackingStore((s) => s.categories);
  const running = useTrackingStore((s) => s.running);
  const todayEntries = useTrackingStore((s) => s.todayEntries);
  const init = useTrackingStore((s) => s.init);
  const start = useTrackingStore((s) => s.start);
  const stop = useTrackingStore((s) => s.stop);

  useEffect(() => {
    init();
  }, [init]);

  const now = useNow(running?.id ?? null);
  const timeZone = deviceTimeZone();
  const categoriesById = useMemo(
    () => new Map<string, Category>(categories.map((c) => [c.id, c])),
    [categories],
  );

  if (status === 'failed') {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.errorTitle}>Не удалось открыть базу данных</Text>
        <Text style={styles.errorText}>{fatalError}</Text>
      </SafeAreaView>
    );
  }

  const runningCategory = running ? categoriesById.get(running.categoryId) : undefined;
  const runningDuration = running ? entryDuration(running, now) : null;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{APP_NAME}</Text>

        <View style={[styles.card, { borderColor: runningCategory?.color ?? '#E5D9DB' }]}>
          {running ? (
            <>
              <Text style={styles.cardLabel}>Сейчас</Text>
              <Text style={[styles.cardName, { color: runningCategory?.color }]}>
                {runningCategory?.name ?? 'Неизвестная категория'}
              </Text>
              {runningDuration?.ok ? (
                <Text style={styles.timer}>{formatDuration(runningDuration.ms)}</Text>
              ) : (
                <Text style={styles.warning}>
                  Часы телефона показывают время раньше начала записи. Проверьте дату и время в
                  настройках iPhone.
                </Text>
              )}
              <Text style={styles.cardHint}>с {formatClockTime(running.startedAt, timeZone)}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={stop}
                style={({ pressed }) => [styles.stopButton, pressed && styles.pressed]}>
                <Text style={styles.stopText}>Стоп</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.idle}>Ничего не отслеживается. Выберите активность ниже.</Text>
          )}
        </View>

        {actionError ? <Text style={styles.warning}>{actionError}</Text> : null}

        <View style={styles.grid}>
          {categories.map((category) => {
            const active = running?.categoryId === category.id;
            return (
              <Pressable
                key={category.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => start(category.id)}
                style={({ pressed }) => [
                  styles.categoryButton,
                  { backgroundColor: category.color, opacity: active ? 1 : 0.85 },
                  active && styles.categoryActive,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.categoryText}>{category.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Записи за сегодня (отладка)</Text>
        {todayEntries.length === 0 ? (
          <Text style={styles.cardHint}>Пока нет записей.</Text>
        ) : (
          todayEntries.map((entry) => {
            const category = categoriesById.get(entry.categoryId);
            const end =
              entry.endedAt === null ? 'идёт' : formatClockTime(entry.endedAt, timeZone);
            return (
              <View key={entry.id} style={styles.row}>
                <View style={[styles.dot, { backgroundColor: category?.color ?? '#999' }]} />
                <Text style={styles.rowName}>{category?.name ?? '?'}</Text>
                <Text style={styles.rowTime}>
                  {formatClockTime(entry.startedAt, timeZone)} – {end}
                </Text>
                <Text style={styles.rowDuration}>{durationText(entry, now)}</Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF8F6' },
  content: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: '700', color: '#B3123A', marginBottom: 16 },
  card: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  cardLabel: { fontSize: 13, color: '#8A7A7D', textTransform: 'uppercase' },
  cardName: { fontSize: 24, fontWeight: '700', marginTop: 4 },
  timer: {
    fontSize: 48,
    fontWeight: '300',
    marginVertical: 8,
    color: '#2B1D20',
    fontVariant: ['tabular-nums'],
  },
  cardHint: { fontSize: 13, color: '#8A7A7D' },
  idle: { fontSize: 16, color: '#5C4A4E', textAlign: 'center', paddingVertical: 24 },
  stopButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 12,
    backgroundColor: '#2B1D20',
  },
  stopText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  warning: { color: '#B3123A', fontSize: 14, marginTop: 12, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
  categoryButton: {
    width: '48%',
    flexGrow: 1,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  categoryActive: { borderWidth: 3, borderColor: '#2B1D20' },
  categoryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.6 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#2B1D20', marginTop: 28, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowName: { flex: 1, fontSize: 14, color: '#2B1D20' },
  rowTime: { fontSize: 13, color: '#5C4A4E', fontVariant: ['tabular-nums'] },
  rowDuration: {
    width: 72,
    textAlign: 'right',
    fontSize: 13,
    color: '#2B1D20',
    fontVariant: ['tabular-nums'],
  },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#B3123A', margin: 20 },
  errorText: { fontSize: 14, color: '#5C4A4E', marginHorizontal: 20 },
});
