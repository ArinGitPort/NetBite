import { fireEvent, render, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { createReadyRoutedSandboxWorkspace } from '@/core/network/sandbox';
import { SandboxCli } from '@/features/sandbox/components/sandbox-cli';

describe('SandboxCli responsive layout', () => {
  test('bounds the tablet console and recomposes command controls on compact screens', async () => {
    const screen = await render(
      <SandboxCli
        initialDeviceId="router-1"
        onClose={jest.fn()}
        onCommit={jest.fn()}
        visible
        workspace={createReadyRoutedSandboxWorkspace()}
      />,
    );

    const layout = screen.getByTestId('sandbox-cli-layout');
    expect(StyleSheet.flatten(layout.props.style)).toMatchObject({ width: '100%', maxWidth: 840, minWidth: 0 });

    await fireEvent(layout, 'layout', { persist: jest.fn(), nativeEvent: { layout: { width: 1400, height: 900, x: 0, y: 0 } } });
    expect(StyleSheet.flatten(screen.getByTestId('sandbox-cli-input-row').props.style).flexWrap).toBeUndefined();
    expect(StyleSheet.flatten(screen.getByTestId('sandbox-cli-actions').props.style)).toMatchObject({ width: '100%', flexWrap: 'wrap' });

    await fireEvent(layout, 'layout', { persist: jest.fn(), nativeEvent: { layout: { width: 390, height: 760, x: 0, y: 0 } } });
    expect(StyleSheet.flatten(screen.getByTestId('sandbox-cli-input-row').props.style).flexWrap).toBe('wrap');
    const actions = within(screen.getByTestId('sandbox-cli-actions'));
    expect(actions.getByRole('button', { name: /run command/i })).toBeTruthy();
    expect(actions.getByRole('button', { name: /^help$/i })).toBeTruthy();
  });
});
