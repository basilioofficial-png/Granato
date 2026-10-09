import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

interface PlaceholderScreenProps {
  readonly title: string;
  readonly note: string;
  readonly children?: ReactNode;
}

/** Tab that is not built yet: says honestly when it will appear. */
export function PlaceholderScreen({ title, note, children }: PlaceholderScreenProps) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.content}>
        <Text style={[type.h1, { color: colors.text }]}>{title}</Text>
        <Text style={[type.body, styles.note, { color: colors.text2 }]}>{note}</Text>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24 },
  note: { marginTop: 12 },
});
