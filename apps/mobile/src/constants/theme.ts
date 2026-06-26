import { Platform } from 'react-native';

export const Colors = {
  background:           '#131315',
  surface:              '#131315',
  surfaceDim:           '#131315',
  surfaceContainerLow:  '#1c1b1d',
  surfaceContainer:     '#201f22',
  surfaceContainerHigh: '#2a2a2c',
  surfaceVariant:       '#353437',
  outlineVariant:       '#3c4947',
  outline:              '#859490',

  primary:        '#4fdbc8',
  primaryFixed:   '#71f8e4',
  secondary:      '#4ae176',
  watched:        '#22c55e',

  onBackground:       '#e5e1e4',
  onSurface:          '#e5e1e4',
  onSurfaceVariant:   '#bbcac6',
  onPrimary:          '#003731',
  onSecondary:        '#003915',

  error:          '#ffb4ab',
  errorContainer: '#93000a',
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
