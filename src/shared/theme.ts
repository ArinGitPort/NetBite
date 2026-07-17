export const Palette = {
  background: '#151216',
  grid: '#272027',
  surface: '#1D191F',
  surfaceRaised: '#272329',
  border: '#3A3F3D',
  text: '#C9C5C7',
  textMuted: '#898387',
  accent: '#C04848',
  accentBright: '#DF5A56',
  accentSoft: '#35191E',
  orange: '#D18B5A',
  orangeSoft: '#342118',
  green: '#71958B',
  greenSoft: '#1C2926',
  danger: '#D94A50',
  dangerSoft: '#35171C',
  active: '#C04848',
  white: '#DDD8DA',

  // Readable aliases retained while Chapter 1 components migrate to semantic names.
  navy: '#C9C5C7',
  blue: '#C04848',
  blueDark: '#DF5A56',
  sky: '#35191E',
  mint: '#1C2926',
  cream: '#151216',
  inkMuted: '#898387',
  line: '#3A3F3D',
} as const;

export const Space = {
  xs: 8,
  sm: 8,
  md: 16,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 0,
  md: 0,
  lg: 0,
  pill: 0,
} as const;

export const Fonts = {
  regular: 'FiraCode_400Regular',
  medium: 'FiraCode_500Medium',
  semibold: 'FiraCode_600SemiBold',
  mono: 'FiraCode_400Regular',
} as const;
