import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { connectSandboxInterfaces, createEmptySandboxWorkspace, createGuidedSandboxWorkspace, createReadyRoutedSandboxWorkspace } from '@/core/network/sandbox';
import { SandboxScreen } from '@/features/sandbox/components/sandbox-screen';
import { Palette } from '@/shared/theme';
import { useSandboxStore } from '@/store/use-sandbox-store';

jest.mock('expo-router', () => ({ router: { dismissTo: jest.fn() } }));
jest.mock('@/shared/haptics', () => ({ selectionHaptic: jest.fn(), successHaptic: jest.fn(), warningHaptic: jest.fn() }));
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() } }));
jest.mock('@/features/sandbox/components/sandbox-cli', () => ({ SandboxCli: () => null }));
jest.mock('@/features/sandbox/components/sandbox-canvas', () => {
  // Jest requires these imports inside the hoisted mock factory.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text: NativeText, View } = require('react-native');
  return {
    SandboxCanvas: ({ workspace, onSelectDevice }: { workspace: { devices: { id: string; name: string }[] }; onSelectDevice: (id: string) => void }) => React.createElement(View, { testID: 'sandbox-canvas' }, workspace.devices.map((device) => React.createElement(Pressable, { accessibilityLabel: `canvas ${device.name}`, key: device.id, onPress: () => onSelectDevice(device.id) }, React.createElement(NativeText, null, device.name)))),
  };
});

describe('sandbox screen', () => {
  beforeEach(() => useSandboxStore.setState({ workspace: createEmptySandboxWorkspace(), guideSeen: false, past: [], future: [] }));

  test('loads and completes the skippable first switched-LAN build', async () => {
    const screen = await render(<SandboxScreen />);
    expect(screen.getByText('FIRST SANDBOX SESSION')).toBeTruthy();
    await fireEvent.press(screen.getByText(/build it myself/i));
    expect(useSandboxStore.getState().workspace.devices).toHaveLength(3);
    await fireEvent.press(screen.getByLabelText('canvas PC-1'));
    await fireEvent.press(screen.getByRole('button', { name: /^connect$/i }));
    await fireEvent.press(screen.getByLabelText('canvas SW-1'));
    await fireEvent.press(screen.getByLabelText('canvas PC-2'));
    await fireEvent.press(screen.getByRole('button', { name: /^connect$/i }));
    await fireEvent.press(screen.getByLabelText('canvas SW-1'));
    expect(screen.getByText(/2 OF 2 LINKS/)).toBeTruthy();
    await fireEvent.press(screen.getByText(/finish guide/i));
    expect(useSandboxStore.getState().guideSeen).toBe(true);
  });

  test('loads the routed preset and provides a working ping walkthrough', async () => {
    const screen = await render(<SandboxScreen />);
    await fireEvent.press(screen.getByText(/explore routed network/i));
    const workspace = useSandboxStore.getState().workspace;
    expect(workspace.devices).toHaveLength(5);
    expect(workspace.links).toHaveLength(4);
    expect(workspace.devices.find((device) => device.id === 'pc-1')?.interfaces[0]).toMatchObject({ ipv4: '192.168.10.10', prefix: 24 });
    expect(workspace.devices.find((device) => device.id === 'router-1')?.interfaces).toEqual(expect.arrayContaining([expect.objectContaining({ ipv4: '192.168.10.1' }), expect.objectContaining({ ipv4: '192.168.20.1' })]));
    expect(screen.getByText('READY ROUTED NETWORK / TINKERING GUIDE')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /inspect pc-1/i }));
    expect(screen.getByText(/CURRENT \/ 192\.168\.10\.10\/24/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /^test$/i }));
    await fireEvent.press(screen.getByRole('button', { name: /^ping$/i }));
    expect(screen.getByLabelText('Ping destination IPv4 address').props.value).toBe('192.168.20.20');
    await fireEvent.press(screen.getByRole('button', { name: /run ping/i }));
    expect(screen.getByText(/TRACE COMPLETE/)).toBeTruthy();
  });

  test('restores useful ping defaults when an autosaved routed preset is reopened', async () => {
    useSandboxStore.setState({ workspace: createReadyRoutedSandboxWorkspace(), guideSeen: true });
    const screen = await render(<SandboxScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /^test$/i }));
    await fireEvent.press(screen.getByRole('button', { name: /^ping$/i }));
    const destination = screen.getByLabelText('Ping destination IPv4 address');
    expect(destination.props.value).toBe('192.168.20.20');
    expect(destination.props.placeholder).toBe('EXAMPLE / 192.168.1.20');
    expect(destination.props.placeholderTextColor).toBe(Palette.textMuted);
    expect(StyleSheet.flatten(destination.props.style).color).toBe(Palette.white);
    expect(screen.getByRole('button', { name: 'PC-2 / 192.168.20.20' })).toBeTruthy();
  });

  test('blocks incomplete ping input and can explicitly prepare a beginner LAN', async () => {
    let workspace = createGuidedSandboxWorkspace();
    const first = connectSandboxInterfaces(workspace, 'pc-1', 'switch-1'); if (first.ok) workspace = first.state;
    const second = connectSandboxInterfaces(workspace, 'pc-2', 'switch-1'); if (second.ok) workspace = second.state;
    useSandboxStore.setState({ workspace, guideSeen: true });
    const screen = await render(<SandboxScreen />);

    await fireEvent.press(screen.getByRole('button', { name: /^test$/i }));
    await fireEvent.press(screen.getByRole('button', { name: /^ping$/i }));
    expect(screen.getByText('BEGINNER LAN AVAILABLE')).toBeTruthy();
    expect(screen.getByText(/PC-1 does not have a saved IPv4 address and prefix/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /run ping/i }).props.accessibilityState.disabled).toBe(true);
    expect(screen.queryByText(/TRACE STOPPED/)).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: /set up beginner lan/i }));
    expect(screen.getByText(/PC-1: NOT CONFIGURED.*192\.168\.10\.10\/24/s)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /apply setup/i }));
    expect(useSandboxStore.getState().workspace.devices.find((device) => device.id === 'pc-1')?.interfaces[0]).toMatchObject({ ipv4: '192.168.10.10', prefix: 24 });
    expect(screen.getByLabelText('Ping destination IPv4 address').props.value).toBe('192.168.10.20');
    expect(screen.getByRole('button', { name: /run ping/i }).props.accessibilityState.disabled).toBe(false);
    await fireEvent.press(screen.getByRole('button', { name: /run ping/i }));
    expect(screen.getByText(/TRACE COMPLETE/)).toBeTruthy();
  });

  test('treats malformed destinations as form validation rather than a stopped trace', async () => {
    useSandboxStore.setState({ workspace: createReadyRoutedSandboxWorkspace(), guideSeen: true });
    const screen = await render(<SandboxScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /^test$/i }));
    await fireEvent.press(screen.getByRole('button', { name: /^ping$/i }));
    await fireEvent.changeText(screen.getByLabelText('Ping destination IPv4 address'), '192.168.bad');
    expect(screen.getByText(/Enter a valid destination such as 192\.168\.10\.20/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /run ping/i }).props.accessibilityState.disabled).toBe(true);
    expect(screen.queryByText(/TRACE STOPPED/)).toBeNull();
  });

  test('shows the router interface selected for the destination route', async () => {
    useSandboxStore.setState({ workspace: createReadyRoutedSandboxWorkspace(), guideSeen: true });
    const screen = await render(<SandboxScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /^test$/i }));
    await fireEvent.press(screen.getByRole('button', { name: /^ping$/i }));
    await fireEvent.press(screen.getByRole('button', { name: /^R-1$/i }));
    expect(screen.getByText(/\[X\] SOURCE \/ R-1 G0\/1 \/ 192\.168\.20\.1\/24/i)).toBeTruthy();
  });

  test('clears an old trace when the workspace topology changes', async () => {
    useSandboxStore.setState({ workspace: createReadyRoutedSandboxWorkspace(), guideSeen: true });
    const screen = await render(<SandboxScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /^test$/i }));
    await fireEvent.press(screen.getByRole('button', { name: /^ping$/i }));
    await fireEvent.press(screen.getByRole('button', { name: /run ping/i }));
    expect(screen.getByText(/TRACE COMPLETE/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /^add$/i }));
    await fireEvent.press(screen.getByRole('button', { name: /^router$/i }));
    await fireEvent.press(screen.getByRole('button', { name: /^test$/i }));
    expect(screen.queryByText(/TRACE COMPLETE/)).toBeNull();
    expect(screen.queryByText(/TRACE STOPPED/)).toBeNull();
  });

  test('adds an autosaved device and exposes a readable inspector', async () => {
    useSandboxStore.setState({ guideSeen: true });
    const screen = await render(<SandboxScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /^add$/i }));
    await fireEvent.press(screen.getByRole('button', { name: /^router$/i }));
    expect(useSandboxStore.getState().workspace.devices[0]).toMatchObject({ type: 'router', interfaces: expect.arrayContaining([expect.objectContaining({ id: 'G0/0' })]) });
    expect(screen.queryByText('DEVICE INSPECTOR')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: /^configure$/i }));
    expect(screen.getByText('DEVICE INSPECTOR')).toBeTruthy();
    expect(screen.getByText('INTERFACE ADDRESSING')).toBeTruthy();
  });

  test('saves addressing and keeps it when another interface property changes', async () => {
    useSandboxStore.setState({ guideSeen: true });
    const screen = await render(<SandboxScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /^add$/i }));
    await fireEvent.press(screen.getByRole('button', { name: /^pc$/i }));
    await fireEvent.press(screen.getByRole('button', { name: /^configure$/i }));
    await fireEvent.changeText(screen.getByLabelText('IPV4 ADDRESS'), '192.168.10.20');
    await fireEvent.changeText(screen.getByLabelText('DEFAULT GATEWAY'), '192.168.10.1');
    await fireEvent.press(screen.getByRole('button', { name: /save addressing/i }));
    expect(useSandboxStore.getState().workspace.devices[0]).toMatchObject({ defaultGateway: '192.168.10.1', interfaces: [expect.objectContaining({ ipv4: '192.168.10.20', prefix: 24 })] });
    expect(screen.getByText(/E0 saved as 192\.168\.10\.20\/24/i)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /admin up/i }));
    expect(useSandboxStore.getState().workspace.devices[0].interfaces[0]).toMatchObject({ adminUp: false, ipv4: '192.168.10.20', prefix: 24 });
  });
});
