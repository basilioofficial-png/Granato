import { StyleSheet, Text, View } from 'react-native';

import { getLocalDate, localDayInterval } from '@/domain/time';
import { APP_NAME, APP_TAGLINE } from '@/lib/appInfo';
import { startApp } from '@/services/appStartup';

// Temporary on-device checks (stages 2–3): proves that time zone logic works on
// the phone's JS engine (Hermes), not only in Jest. Replaced in stage 4.
function timeZoneDiagnostics(): string {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const today = getLocalDate(Date.now(), timeZone);
    const day = localDayInterval(today, timeZone);
    const hours = (day.end - day.start) / (60 * 60 * 1000);
    const date = `${today.day}.${String(today.month).padStart(2, '0')}.${today.year}`;
    return `Сегодня ${date} · ${timeZone} · в сутках ${hours} ч`;
  } catch (error) {
    return `Ошибка часового пояса: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// Shows that the database opens, migrates and keeps data between launches.
function storageDiagnostics(): string {
  try {
    const { status } = startApp();
    const firstLaunch = status.seededNow ? ' · первый запуск' : '';
    return `База: версия схемы ${status.schemaVersion} · категорий: ${status.categoriesCount}${firstLaunch}`;
  } catch (error) {
    return `Ошибка базы: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{APP_NAME}</Text>
      <Text style={styles.tagline}>{APP_TAGLINE}</Text>
      <Text style={styles.diagnostics}>{timeZoneDiagnostics()}</Text>
      <Text style={styles.diagnosticsLine}>{storageDiagnostics()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFF8F6',
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: '#B3123A',
  },
  tagline: {
    marginTop: 12,
    fontSize: 16,
    color: '#5C4A4E',
    textAlign: 'center',
  },
  diagnostics: {
    marginTop: 32,
    fontSize: 13,
    color: '#8A7A7D',
    textAlign: 'center',
  },
  diagnosticsLine: {
    marginTop: 6,
    fontSize: 13,
    color: '#8A7A7D',
    textAlign: 'center',
  },
});
