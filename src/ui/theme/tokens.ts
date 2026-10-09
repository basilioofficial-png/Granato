import { StyleSheet } from 'react-native';

// Design tokens from docs/design/granato-mockup.html.

export interface Palette {
  readonly bg: string;
  readonly surface: string;
  readonly soft: string;
  readonly text: string;
  readonly text2: string;
  readonly muted: string;
  readonly border: string;
  readonly divider: string;
  readonly primary: string;
  readonly onPrimary: string;
  readonly accentText: string;
  readonly pillText: string;
  readonly tabIdle: string;
  readonly track: string;
  readonly chipBg: string;
  readonly toastBg: string;
  readonly toastText: string;
  readonly toastAction: string;
  readonly overlay: string;
  readonly warningBg: string;
  readonly warningText: string;
}

export const lightPalette: Palette = {
  bg: '#FFFDFC',
  surface: '#FCF7F6',
  soft: '#F8E7E5',
  text: '#1F1F1F',
  text2: '#4B4B52',
  muted: '#8D8D96',
  border: '#E8E2E1',
  divider: '#F1ECEB',
  primary: '#B71F2E',
  onPrimary: '#FFFFFF',
  accentText: '#B71F2E',
  pillText: '#8F1623',
  tabIdle: '#4B4B52',
  track: '#F1ECEB',
  chipBg: '#FFFFFF',
  toastBg: '#1F1F1F',
  toastText: '#FFFFFF',
  toastAction: '#F2A7AE',
  overlay: 'rgba(31,31,31,0.48)',
  warningBg: '#FDF1DC',
  warningText: '#7A4E0B',
};

export const darkPalette: Palette = {
  bg: '#141112',
  surface: '#1E1A1B',
  soft: '#2E2022',
  text: '#F5F0EF',
  text2: '#C4BDBF',
  muted: '#8F878A',
  border: '#352D2F',
  divider: '#2A2425',
  primary: '#B71F2E',
  onPrimary: '#FFFFFF',
  accentText: '#EF7A85',
  pillText: '#F2A7AE',
  tabIdle: '#C4BDBF',
  track: '#2A2425',
  chipBg: '#1E1A1B',
  toastBg: '#F5F0EF',
  toastText: '#1F1F1F',
  toastAction: '#B71F2E',
  overlay: 'rgba(0,0,0,0.6)',
  warningBg: '#3A2C16',
  warningText: '#F2C77B',
};

export const fonts = {
  soraSemiBold: 'Sora_600SemiBold',
  soraBold: 'Sora_700Bold',
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semiBold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
} as const;

export const radii = { chip: 12, field: 14, button: 16, card: 28 } as const;

/** Custom fonts carry their weight in the family name, so fontWeight is never set. */
export const type = StyleSheet.create({
  h1: { fontFamily: fonts.soraBold, fontSize: 40, lineHeight: 44 },
  h2: { fontFamily: fonts.soraSemiBold, fontSize: 28, lineHeight: 32 },
  h3: { fontFamily: fonts.soraSemiBold, fontSize: 22, lineHeight: 28 },
  timer: {
    fontFamily: fonts.soraSemiBold,
    fontSize: 56,
    lineHeight: 64,
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodySmall: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  button: { fontFamily: fonts.semiBold, fontSize: 16, lineHeight: 20 },
  section: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.semiBold, fontSize: 12, lineHeight: 16 },
});

/** Minimum touch target and main button height from the design. */
export const sizes = { touch: 44, button: 56 } as const;

/** Colors offered for top-level categories: the category palette from the design plus extras. */
export const CATEGORY_COLORS = [
  '#B71F2E',
  '#4361D8',
  '#E6A23C',
  '#8C6A52',
  '#1E8C7A',
  '#4A3F8C',
  '#8D8D96',
  '#D94A57',
  '#2E9E62',
  '#4D88FF',
] as const;
