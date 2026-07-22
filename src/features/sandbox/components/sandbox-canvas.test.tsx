import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { configureSandboxDevice, connectSandboxInterfaces, createGuidedSandboxWorkspace, createReadyRoutedSandboxWorkspace } from '@/core/network/sandbox';
import { SandboxCanvas } from '@/features/sandbox/components/sandbox-canvas';

jest.mock('react-native-gesture-handler', () => {
  type MockGestureChain = {
    enabled: () => MockGestureChain;
    runOnJS: () => MockGestureChain;
    onUpdate: () => MockGestureChain;
    onEnd: () => MockGestureChain;
    onFinalize: () => MockGestureChain;
  };
  const chain = {} as MockGestureChain;
  chain.enabled = jest.fn(() => chain);
  chain.runOnJS = jest.fn(() => chain);
  chain.onUpdate = jest.fn(() => chain);
  chain.onEnd = jest.fn(() => chain);
  chain.onFinalize = jest.fn(() => chain);
  return {
    Gesture: { Pan: () => chain },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock('@/features/devices/components/device-glyph', () => ({
  DeviceGlyph: () => {
    // Jest requires imports inside the hoisted mock factory.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View } = require('react-native');
    return React.createElement(View, { testID: 'device-glyph' });
  },
}));

const callbacks = {
  onSelectDevice: jest.fn(),
  onSelectLink: jest.fn(),
  onMoveDevice: jest.fn(),
};

describe('sandbox canvas device address plates', () => {
  test('shows complete configured, unconfigured, and down PC states across zoom levels', async () => {
    let workspace = createGuidedSandboxWorkspace();
    workspace = configureSandboxDevice(workspace, 'pc-1', {
      interfaceId: 'E0',
      interface: { ipv4: '192.168.10.10', prefix: 24 },
    }).state;
    const screen = await render(<SandboxCanvas workspace={workspace} zoom={0.75} {...callbacks} />);
    expect(screen.getByText('192.168.10.10/24')).toBeTruthy();
    expect(screen.getByText('IP NOT SET')).toBeTruthy();
    expect(screen.getByText('MGMT IP NOT MODELED')).toBeTruthy();
    expect(screen.getByLabelText(/PC-1, pc, IP address 192\.168\.10\.10\/24/i)).toBeTruthy();

    workspace = configureSandboxDevice(workspace, 'pc-1', { interfaceId: 'E0', interface: { adminUp: false } }).state;
    await screen.rerender(<SandboxCanvas workspace={workspace} zoom={1.2} {...callbacks} />);
    expect(screen.getByText('192.168.10.10/24 / DOWN')).toBeTruthy();
    expect(screen.getByLabelText(/IP address 192\.168\.10\.10\/24, down/i)).toBeTruthy();
  });

  test('shows each configured router interface while keeping Layer 2 switch addressing honest', async () => {
    const workspace = createReadyRoutedSandboxWorkspace();
    const screen = await render(<SandboxCanvas workspace={workspace} zoom={0.9} {...callbacks} />);
    expect(screen.getByText('G0/0')).toBeTruthy();
    expect(screen.getByText('192.168.10.1/24')).toBeTruthy();
    expect(screen.getByText('G0/1')).toBeTruthy();
    expect(screen.getByText('192.168.20.1/24')).toBeTruthy();
    expect(screen.getAllByText('MGMT IP NOT MODELED')).toHaveLength(2);
    expect(screen.getByLabelText(/R-1, router, G0\/0, IP address 192\.168\.10\.1\/24/i)).toBeTruthy();
  });

  test('uses native press targets for cables and expands the surface to measured label height', async () => {
    let workspace = createGuidedSandboxWorkspace();
    const connection = connectSandboxInterfaces(workspace, 'pc-1', 'switch-1');
    if (connection.ok) workspace = connection.state;
    const screen = await render(<SandboxCanvas workspace={workspace} zoom={0.75} {...callbacks} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Link E0 to F0/1' }));
    expect(callbacks.onSelectLink).toHaveBeenCalledWith(connection.ok ? connection.link.id : 'missing');

    await fireEvent(screen.getByLabelText(/PC-1, pc/i), 'layout', { nativeEvent: { layout: { width: 128, height: 360, x: 0, y: 0 } } });
    await waitFor(() => expect(StyleSheet.flatten(screen.getByTestId('sandbox-canvas-surface').props.style).height).toBeGreaterThanOrEqual(420));
  });
});
