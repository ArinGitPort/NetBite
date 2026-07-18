export const Palette = {
  background: '#151216',
  grid: '#272027',
  surface: '#1D191F',
  surfaceRaised: '#272329',
  border: '#3A3F3D',
  text: '#C9C5C7',
  textMuted: '#989297',
  accent: '#C04848',
  accentBright: '#E66561',
  accentSoft: '#35191E',
  orange: '#D18B5A',
  orangeSoft: '#342118',
  green: '#71958B',
  greenSoft: '#1C2926',
  danger: '#EF656A',
  dangerSoft: '#35171C',
  active: '#C04848',
  white: '#DDD8DA',

  // Readable aliases retained while Chapter 1 components migrate to semantic names.
  navy: '#C9C5C7',
  blue: '#C04848',
  blueDark: '#E66561',
  sky: '#35191E',
  mint: '#1C2926',
  cream: '#151216',
  inkMuted: '#989297',
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

export const Typography = {
  screenTitle: { fontSize: 18, lineHeight: 26, letterSpacing: 1.2 },
  sectionHeading: { fontSize: 15, lineHeight: 22, letterSpacing: 1.2 },
  body: { fontSize: 14, lineHeight: 22 },
  bodySmall: { fontSize: 13, lineHeight: 20 },
  label: { fontSize: 12, lineHeight: 18, letterSpacing: 1.2 },
  technical: { fontSize: 11, lineHeight: 17, letterSpacing: 0.7 },
} as const;

export type TypographyRole = keyof typeof Typography;
