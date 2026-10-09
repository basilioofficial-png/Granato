import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTrackingStore } from '@/store/trackingStore';
import { formatHoursMinutes } from '@/ui/format';
import { fonts } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

const VISIBLE_MS = 4000;

interface UndoToastBarProps {
  readonly describeCategory: (categoryId: string) => string;
}

/** "Записано: «Работа» · 42 мин  [Отменить]" — shown for 4 s after a switch or stop. */
export function UndoToastBar({ describeCategory }: UndoToastBarProps) {
  const { colors } = useTheme();
  const toast = useTrackingStore((s) => s.toast);
  const undo = useTrackingStore((s) => s.undo);
  const dismiss = useTrackingStore((s) => s.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [toast, dismiss]);

  const closed = toast?.action.closed;
  if (!toast || !closed || closed.endedAt === null) return null;
  const ms = closed.endedAt - closed.startedAt;
  const length = ms < 60_000 ? 'меньше минуты' : formatHoursMinutes(ms);

  return (
    <View
      accessibilityRole="alert"
      style={[styles.toast, { backgroundColor: colors.toastBg }]}>
      <Text style={[styles.text, { color: colors.toastText }]} numberOfLines={2}>
        Записано: «{describeCategory(closed.categoryId)}» · {length}
      </Text>
      <Pressable accessibilityRole="button" onPress={undo} style={styles.action}>
        <Text style={[styles.actionText, { color: colors.toastAction }]}>Отменить</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    minHeight: 52,
    borderRadius: 14,
    paddingLeft: 16,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    shadowColor: '#1F1F1F',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  text: { flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  action: { height: 44, paddingHorizontal: 12, justifyContent: 'center' },
  actionText: { fontFamily: fonts.bold, fontSize: 14 },
});
