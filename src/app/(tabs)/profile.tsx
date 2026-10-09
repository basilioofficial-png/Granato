import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTrackingStore } from '@/store/trackingStore';
import { Icon } from '@/ui/components/Icon';
import { PlaceholderScreen } from '@/ui/components/PlaceholderScreen';
import { fonts, radii, sizes, type } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const resetLocalData = useTrackingStore((s) => s.resetLocalData);

  function confirmReset() {
    Alert.alert(
      'Сбросить локальные данные?',
      'Все записи времени будут удалены без возможности восстановления, категории вернутся к стартовому набору.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Сбросить', style: 'destructive', onPress: resetLocalData },
      ],
    );
  }

  return (
    <PlaceholderScreen
      title="Профиль"
      note="Аккаунт и синхронизация появятся на этапе 12.">
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/categories')}
        style={({ pressed }) => [
          styles.linkRow,
          { borderColor: colors.border, backgroundColor: colors.surface },
          pressed && styles.pressed,
        ]}>
        <View style={styles.linkText}>
          <Text style={[type.section, { color: colors.text }]}>Категории</Text>
          <Text style={[type.bodySmall, { color: colors.text2 }]}>
            Сферы жизни, активности и их уточнения
          </Text>
        </View>
        <Icon name="right" color={colors.text2} size={22} />
      </Pressable>
      {__DEV__ ? (
        <View style={[styles.devBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[type.section, { color: colors.text }]}>Режим разработки</Text>
          <Text style={[type.bodySmall, styles.devNote, { color: colors.text2 }]}>
            Этот раздел виден только при запуске через Expo Go и не попадёт в готовое приложение.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={confirmReset}
            style={({ pressed }) => [
              styles.resetButton,
              { borderColor: colors.accentText },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.resetText, { color: colors.accentText }]}>
              Сбросить локальные данные
            </Text>
          </Pressable>
        </View>
      ) : null}
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  linkRow: {
    marginTop: 24,
    minHeight: 64,
    borderWidth: 1,
    borderRadius: radii.button,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkText: { flex: 1 },
  devBox: { marginTop: 32, borderWidth: 1, borderRadius: radii.button, padding: 16 },
  devNote: { marginTop: 4 },
  resetButton: {
    marginTop: 16,
    height: sizes.button,
    borderWidth: 1,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: { fontFamily: fonts.semiBold, fontSize: 16 },
  pressed: { opacity: 0.6 },
});
