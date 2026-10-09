import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { useTrackingStore } from '@/store/trackingStore';
import { fontAssets } from '@/ui/theme/fonts';
import { useTheme } from '@/ui/theme/useTheme';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const init = useTrackingStore((s) => s.init);
  const { colors, isDark } = useTheme();

  useEffect(() => {
    init();
  }, [init]);

  // Without fonts the first frame would flash system typography; the splash stays meanwhile.
  // On a font error we continue with system fonts rather than block the app.
  if (!fontsLoaded && !fontError) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="picker" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}
