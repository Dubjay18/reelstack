import { Platform } from 'react-native';

export const Colors = {
  background:           '#17120e',
  surface:              '#17120e',
  surfaceDim:           '#17120e',
  surfaceContainerLow:  '#1e1712',
  surfaceContainer:     '#1e1712',
  surfaceContainerHigh: '#31261a',
  surfaceVariant:       '#241c15',
  outlineVariant:       'rgba(255,214,170,0.14)',
  outline:              '#6b5847',

  primary:        '#eb9c3e',
  primaryFixed:   '#f0b168',
  secondary:      '#d9552b',
  watched:        '#eb9c3e',

  onBackground:       '#f7ecdf',
  onSurface:          '#f7ecdf',
  onSurfaceVariant:   '#b9a58e',
  onPrimary:          '#1c1207',
  onSecondary:        '#1c1207',

  error:          '#f87171',
  errorContainer: '#7f1d1d',
} as const;

export const Spacing = {
  xs:  8,
  sm:  12,
  md:  16,
  lg:  24,
  xl:  32,
  gutter: 16,
} as const;

export const Radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  full: 9999,
} as const;

export const Typography = {
  displayMd:  { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 28, fontWeight: '600' as const, letterSpacing: -0.02 * 28 },
  heading:    { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 20, fontWeight: '600' as const, letterSpacing: -0.01 * 20 },
  bodyLg:     { fontFamily: 'HankenGrotesk_400Regular', fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodySm:     { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, fontWeight: '400' as const, lineHeight: 21 },
  caption:    { fontFamily: 'HankenGrotesk_500Medium', fontSize: 12, fontWeight: '500' as const, letterSpacing: 0.02 * 12 },
  mono:       { fontFamily: 'JetBrainsMono_400Regular', fontSize: 13, fontWeight: '400' as const },
} as const;

export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 3,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.7,
    shadowRadius: 40,
    elevation: 24,
  },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
