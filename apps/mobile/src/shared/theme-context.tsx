import * as SystemUI from 'expo-system-ui';
import { createContext, useContext, useEffect, useMemo, type PropsWithChildren } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { CanvasThemes, DiagramThemes, Themes, type ThemeColors } from '@/shared/theme';
import { useThemeStore, type ThemePreference } from '@/store/use-theme-store';

type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  colors: ThemeColors;
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: Themes.dark,
  preference: 'system',
  resolvedTheme: 'dark',
  setPreference: () => undefined,
});

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);
  const resolvedTheme: ResolvedTheme = preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
  const colors = Themes[resolvedTheme];

  useEffect(() => {
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [preference]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  const value = useMemo(() => ({ colors, preference, resolvedTheme, setPreference }), [colors, preference, resolvedTheme, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useThemeStyles<T>(factory: (colors: ThemeColors) => T) {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}

export function useCanvasColors() {
  const { resolvedTheme } = useTheme();
  return CanvasThemes[resolvedTheme];
}

export function useCanvasThemeStyles<T>(factory: (colors: ThemeColors) => T) {
  const colors = useCanvasColors();
  return useMemo(() => factory(colors), [colors, factory]);
}

export function useDiagramColors() {
  const { resolvedTheme } = useTheme();
  return DiagramThemes[resolvedTheme];
}
