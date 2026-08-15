import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { createReadyRoutedSandboxWorkspace } from '@/core/network/sandbox';
import { SandboxCli } from '@/features/sandbox/components/sandbox-cli';

describe('SandboxCli shared full-screen console', () => {
  test('uses the shared safe-area shell and keeps commands usable at compact widths', async () => {
    const onClose = jest.fn();
    const screen = await render(
      <SandboxCli
        initialDeviceId="router-1"
        onClose={onClose}
        onCommit={jest.fn()}
        visible
        workspace={createReadyRoutedSandboxWorkspace()}
      />,
    );

    const layout = screen.getByTestId('sandbox-cli-layout');
    expect(StyleSheet.flatten(layout.props.style)).toMatchObject({ flex: 1 });
    expect(screen.getByText('R-1 DEVICE CONSOLE')).toBeTruthy();
    expect(screen.getByLabelText('CLI transcript')).toBeTruthy();
    expect(screen.getByRole('button', { name: /run command/i })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^help$/i }).length).toBeGreaterThan(0);

    await fireEvent.changeText(screen.getByLabelText('CLI command'), 'enable');
    await fireEvent.press(screen.getByRole('button', { name: /run command/i }));
    expect(screen.getByText('PRIVILEGED EXEC MODE')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Close CLI'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
