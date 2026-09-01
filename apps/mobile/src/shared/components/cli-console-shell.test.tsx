import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { CliConsoleShell } from '@/shared/components/cli-console-shell';
import { DarkPalette } from '@/shared/theme';
import { ThemeProvider } from '@/shared/theme-context';
import { useThemeStore } from '@/store/use-theme-store';

jest.mock('expo-system-ui', () => ({ setBackgroundColorAsync: jest.fn(async () => undefined) }));
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() } }));

describe('CliConsoleShell', () => {
  test('keeps all console chrome dark while the application theme is light', async () => {
    useThemeStore.setState({ preference: 'light' });
    const screen = await render(
      <ThemeProvider>
        <CliConsoleShell
          accessibilityLabel="Router CLI"
          boundary="SUPPORTED NETBITE COMMANDS"
          devices={[{ id: 'r1', label: 'R1' }, { id: 'r2', label: 'R2' }]}
          eyebrow="CLI MINI LAB"
          input="show ip route"
          lines={[]}
          onClose={jest.fn()}
          onInputChange={jest.fn()}
          onSelectDevice={jest.fn()}
          onSubmit={jest.fn()}
          prompt="R1>"
          selectedDeviceId="r1"
          suggestions={['help']}
          title="R1 DEVICE CONSOLE"
          visible
        />
      </ThemeProvider>,
    );

    expect(StyleSheet.flatten(screen.getByTestId('cli-console-shell').props.style).backgroundColor).toBe(DarkPalette.background);
    expect(StyleSheet.flatten(screen.getByTestId('page-header').props.style).backgroundColor).toBe(DarkPalette.background);
    expect(screen.getByRole('radio', { name: 'R1' })).toHaveStyle({ backgroundColor: DarkPalette.greenSoft });
    expect(screen.getByRole('radio', { name: 'R2' })).toHaveStyle({ backgroundColor: DarkPalette.surface });
    expect(screen.getByRole('button', { name: 'Run command' })).toHaveStyle({ backgroundColor: DarkPalette.surfaceRaised });
  });
});
