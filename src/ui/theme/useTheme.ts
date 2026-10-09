import { useColorScheme } from 'react-native';

import { darkPalette, lightPalette, type Palette } from '@/ui/theme/tokens';

/** Follows the iPhone light/dark setting. */
export function useTheme(): { colors: Palette; isDark: boolean } {
  const isDark = useColorScheme() === 'dark';
  return { colors: isDark ? darkPalette : lightPalette, isDark };
}
