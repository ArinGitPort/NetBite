export const DarkPalette = {
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

export type ThemeColors = { [Key in keyof typeof DarkPalette]: string };

export const LightPalette: ThemeColors = {
  background: '#F6F3F5',
  grid: '#DED7DC',
  surface: '#FFFDFD',
  surfaceRaised: '#EAE4E8',
  border: '#C9C0C6',
  text: '#2A2428',
  textMuted: '#625A60',
  accent: '#B9323D',
  accentBright: '#A52732',
  accentSoft: '#F8DFE1',
  orange: '#9A541F',
  orangeSoft: '#F6E6D8',
  green: '#2F7164',
  greenSoft: '#DCECE7',
  danger: '#B42332',
  dangerSoft: '#F9DDE1',
  active: '#B9323D',
  white: '#211D20',
  navy: '#2A2428',
  blue: '#B9323D',
  blueDark: '#A52732',
  sky: '#F8DFE1',
  mint: '#DCECE7',
  cream: '#F6F3F5',
  inkMuted: '#625A60',
  line: '#C9C0C6',
};

/** Dark fallback retained while feature-local styles migrate to useThemeStyles. */
export const Palette: ThemeColors = DarkPalette;

export const Themes = { light: LightPalette, dark: DarkPalette } satisfies Record<'light' | 'dark', ThemeColors>;

export const CanvasThemes = {
  light: {
    ...LightPalette,
    background: '#FFFDFD',
    surface: '#F8F5F7',
    surfaceRaised: '#EEE9ED',
    border: '#AFA5AC',
    grid: '#D6CED3',
    text: '#241F23',
    textMuted: '#5F575D',
  },
  dark: {
    ...DarkPalette,
    background: '#111013',
    surface: '#171419',
    surfaceRaised: '#211D24',
    border: '#5B525D',
    grid: '#302832',
  },
} satisfies Record<'light' | 'dark', ThemeColors>;

// Educational diagrams occasionally need additional semantic hues to keep
// protocol fields and model layers distinguishable. Keeping them separate
// prevents those colors from becoming ordinary application chrome.
export const DiagramPalette = {
  neutral: { border: '#62666A', fill: '#303136', text: '#E0DEE0' },
  red: { border: '#A24B52', fill: '#4A292E', text: '#F1DADB' },
  orange: { border: '#B77449', fill: '#4A3326', text: '#F0DDCF' },
  sage: { border: '#71958B', fill: '#263C38', text: '#D7E6E2' },
  blue: { border: '#6689A3', fill: '#273A49', text: '#D9E7F0' },
  violet: { border: '#8E77A0', fill: '#392E41', text: '#E8DDED' },
  gold: { border: '#A28C54', fill: '#443B26', text: '#EDE4CC' },
} as const;

export type DiagramTone = keyof typeof DiagramPalette;
export type DiagramColors = Record<DiagramTone, { border: string; fill: string; text: string }>;

export const LightDiagramPalette: DiagramColors = {
  neutral: { border: '#8B858A', fill: '#F0ECEF', text: '#2A2428' },
  red: { border: '#B65A61', fill: '#F7E4E5', text: '#6F2028' },
  orange: { border: '#B56A34', fill: '#F6E6D8', text: '#713A14' },
  sage: { border: '#4E8176', fill: '#DCECE7', text: '#20564C' },
  blue: { border: '#4F7C9A', fill: '#DFEBF2', text: '#244E69' },
  violet: { border: '#7D648E', fill: '#ECE3F1', text: '#563B67' },
  gold: { border: '#8B763B', fill: '#F1EACF', text: '#5E4D1E' },
};

export const DiagramThemes = { light: LightDiagramPalette, dark: DiagramPalette } satisfies Record<'light' | 'dark', DiagramColors>;

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
