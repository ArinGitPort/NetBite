import { act, render } from '@testing-library/react-native';
import { StyleSheet, Text, View } from 'react-native';

import { DarkPalette, LightPalette } from '@/shared/theme';
import { FixedThemeProvider, ThemeProvider, useCanvasColors, useTheme } from '@/shared/theme-context';
import { useThemeStore } from '@/store/use-theme-store';

jest.mock('expo-system-ui', () => ({ setBackgroundColorAsync: jest.fn(async () => undefined) }));
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() } }));

function ThemeProbe() {
  const { colors, resolvedTheme } = useTheme();
  const canvas = useCanvasColors();
  return (
    <View testID="theme-surface" style={{ backgroundColor: colors.background }}>
      <Text>{resolvedTheme.toUpperCase()}</Text>
      <Text testID="theme-copy" style={{ color: colors.text }}>COPY</Text>
      <View testID="canvas-surface" style={{ backgroundColor: canvas.background }} />
    </View>
  );
}

function FixedThemeProbe() {
  const { colors, resolvedTheme } = useTheme();
  return <Text testID="fixed-theme-copy" style={{ color: colors.text }}>{resolvedTheme.toUpperCase()}</Text>;
}

describe('mounted theme updates', () => {
  test('updates application and canvas colors without remounting', async () => {
    useThemeStore.setState({ preference: 'dark' });
    const screen = await render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    const application = screen.getByTestId('theme-surface');

    expect(StyleSheet.flatten(application.props.style).backgroundColor).toBe(DarkPalette.background);
    expect(StyleSheet.flatten(screen.getByTestId('theme-copy').props.style).color).toBe(DarkPalette.text);

    await act(async () => useThemeStore.getState().setPreference('light'));

    expect(screen.getByText('LIGHT')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('theme-surface').props.style).backgroundColor).toBe(LightPalette.background);
    expect(StyleSheet.flatten(screen.getByTestId('theme-copy').props.style).color).toBe(LightPalette.text);
    expect(StyleSheet.flatten(screen.getByTestId('canvas-surface').props.style).backgroundColor).not.toBe(DarkPalette.background);
  });

  test('keeps a scoped dark workspace dark while the application uses light mode', async () => {
    useThemeStore.setState({ preference: 'light' });
    const screen = await render(<ThemeProvider><FixedThemeProvider theme="dark"><FixedThemeProbe /></FixedThemeProvider></ThemeProvider>);

    expect(screen.getByText('DARK')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('fixed-theme-copy').props.style).color).toBe(DarkPalette.text);
    expect(useThemeStore.getState().preference).toBe('light');
  });
});
