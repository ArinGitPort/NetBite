import { cleanup, fireEvent, render, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { simulatePing } from '@/core/network/cli-simulator';
import { CliLab } from '@/features/cli/components/cli-lab';
import { createCliVisualTrace } from '@/features/cli/components/cli-topology-view';
import { cliLabDefinitions, createRoutingState, requiredStaticRoutes } from '@/features/cli/cli-lab-definitions';
import { useGameStore } from '@/store/use-game-store';

jest.mock('expo-router', () => ({ router: { dismissTo: jest.fn() } }));
jest.mock('@/shared/haptics', () => ({ selectionHaptic: jest.fn(), successHaptic: jest.fn(), warningHaptic: jest.fn() }));
jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined) },
}));

const openCli = async (screen: Awaited<ReturnType<typeof render>>, deviceName: string) => {
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(`open cli on ${deviceName}`, 'i') }));
  return screen.getByTestId('cli-fullscreen-modal');
};

const submit = async (screen: Awaited<ReturnType<typeof render>>, command: string) => {
  await fireEvent.changeText(screen.getByLabelText('CLI command'), command);
  await fireEvent.press(screen.getByRole('button', { name: /run command/i }));
};

const layoutTopology = async (screen: Awaited<ReturnType<typeof render>>, width = 390) => {
  await fireEvent(screen.getByTestId('cli-topology-viewport'), 'layout', { nativeEvent: { layout: { width, height: 250, x: 0, y: 0 } } });
  const canvas = screen.getByTestId('cli-topology-canvas');
  const size = StyleSheet.flatten(canvas.props.style);
  await fireEvent(canvas, 'layout', { nativeEvent: { layout: { width: size.width, height: size.height, x: 0, y: 0 } } });
};

describe('CliLab', () => {
  beforeEach(() => useGameStore.setState({ completedLabIds: [], cliGuideSeen: true }));
  afterEach(cleanup);

  test('provides complete authored topology coordinates for every CLI lab and diagnostic scenario', () => {
    Object.values(cliLabDefinitions).forEach((definition) => {
      const states = [definition.createState(), ...(definition.diagnosticScenarios?.map((scenario) => scenario.createState()) ?? [])];
      (['compact', 'regular', 'wide'] as const).forEach((mode) => {
        states.forEach((state) => state.devices.forEach((device) => {
          expect(definition.topology[mode][device.id]).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
        }));
        expect(definition.topology.width[mode]).toBeGreaterThanOrEqual(640);
        expect(definition.topology.height[mode]).toBeGreaterThanOrEqual(250);
      });
    });
  });

  test.each(['ping-diagnostic-desk', 'static-route-board', 'vlan-port-desk', 'inter-vlan-routing-desk'])('opens with the fixed topology and no miniature terminal for %s', async (labId) => {
    const definition = cliLabDefinitions[labId];
    const screen = await render(<CliLab definition={definition} />);
    expect(screen.getByTestId('cli-topology-canvas')).toBeTruthy();
    expect(screen.queryByTestId('cli-fullscreen-modal')).toBeNull();
    expect(screen.queryByLabelText('CLI command')).toBeNull();

    await layoutTopology(screen);
    const state = definition.createState();
    state.devices.forEach((device) => {
      const node = within(screen.getByTestId(`cli-topology-node-${device.id}`));
      expect(node.getByText(device.name)).toBeTruthy();
      device.interfaces.filter((item) => item.ipv4).forEach((item) => expect(node.queryByText(item.ipv4!)).toBeNull());
    });
    state.links.forEach((link) => {
      const id = `${link.aDeviceId}-${link.aInterface}-${link.bDeviceId}-${link.bInterface}`;
      expect(screen.getByTestId(`topology-link-label-${id}-from`)).toBeTruthy();
      expect(screen.getByTestId(`topology-link-label-${id}-to`)).toBeTruthy();
    });
  });

  test('shows live subnet captions on routed links', async () => {
    const routing = await render(<CliLab definition={cliLabDefinitions['static-route-board']} />);
    await layoutTopology(routing);
    for (const label of ['192.168.10.0/24', '10.0.12.0/30', '10.0.23.0/30', '192.168.30.0/24']) {
      expect(routing.getByText(label)).toBeTruthy();
    }
  });

  test('keeps VLAN-only links free of visible IP captions', async () => {
    const vlan = await render(<CliLab definition={cliLabDefinitions['vlan-port-desk']} />);
    await layoutTopology(vlan);
    const state = cliLabDefinitions['vlan-port-desk'].createState();
    state.links.forEach((link) => {
      const id = `${link.aDeviceId}-${link.aInterface}-${link.bDeviceId}-${link.bInterface}`;
      expect(vlan.queryByTestId(`topology-link-label-${id}-context`)).toBeNull();
    });
  });

  test('keeps Help manual and explains the deliberate full-screen console flow', async () => {
    useGameStore.setState({ cliGuideSeen: false });
    const screen = await render(<CliLab definition={cliLabDefinitions['ping-diagnostic-desk']} />);
    expect(screen.queryByText('NETBITE CLI / QUICK START')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Open CLI help'));
    expect(screen.getByText('NETBITE CLI / QUICK START')).toBeTruthy();
    expect(screen.getByText(/close the full-screen console/i)).toBeTruthy();
  });

  test('opens and closes the shared full-screen console without losing transcript or selection', async () => {
    const screen = await render(<CliLab definition={cliLabDefinitions['static-route-board']} />);
    await openCli(screen, 'NB-R1');
    expect(screen.getByLabelText('NB-R1 full-screen CLI')).toBeTruthy();
    await submit(screen, 'enable');
    expect(screen.getByText('PRIVILEGED EXEC MODE')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Close CLI'));
    expect(screen.queryByTestId('cli-fullscreen-modal')).toBeNull();

    await openCli(screen, 'NB-R1');
    expect(screen.getByText('PRIVILEGED EXEC MODE')).toBeTruthy();
    expect(screen.getByLabelText('CLI command').props.value).toBe('');
  });

  test('selecting a topology device changes the inspector and opens its console', async () => {
    const screen = await render(<CliLab definition={cliLabDefinitions['static-route-board']} />);
    await fireEvent.press(screen.getByTestId('cli-topology-node-r2'));
    expect(screen.getByText('NB-R2 / ROUTER')).toBeTruthy();
    expect(screen.getAllByText(/10\.0\.12\.2\/30/i).length).toBeGreaterThan(0);
    await openCli(screen, 'NB-R2');
    expect(screen.getByLabelText('NB-R2 full-screen CLI')).toBeTruthy();
  });

  test('non-console endpoints remain inspectable without widening the CLI command scope', async () => {
    const screen = await render(<CliLab definition={cliLabDefinitions['vlan-port-desk']} />);
    await fireEvent.press(screen.getByTestId('cli-topology-node-pc-a'));
    expect(screen.getByText('PC-A / PC')).toBeTruthy();
    expect(screen.getByText(/inspection only/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /open cli on pc-a/i })).toBeNull();
  });

  test('wrong-mode commands do not mutate state or enable Undo', async () => {
    const screen = await render(<CliLab definition={cliLabDefinitions['static-route-board']} />);
    await openCli(screen, 'NB-R1');
    await submit(screen, 'conf t');
    expect(screen.getByText(/available in privileged EXEC mode/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /undo config/i }).props.accessibilityState.disabled).toBe(true);
  });

  test('configuration, history, Undo, and topology inspection use the same state', async () => {
    const screen = await render(<CliLab definition={cliLabDefinitions['static-route-board']} />);
    await openCli(screen, 'NB-R1');
    await submit(screen, 'en');
    await submit(screen, 'conf t');
    await submit(screen, 'ip route 192.168.30.0 255.255.255.0 10.0.12.2');
    expect(screen.getByText('ADDED 192.168.30.0/24 VIA 10.0.12.2')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Previous command'));
    expect(screen.getByLabelText('CLI command').props.value).toBe('ip route 192.168.30.0 255.255.255.0 10.0.12.2');
    await fireEvent.press(screen.getByRole('button', { name: /undo config/i }));
    await fireEvent.press(screen.getByLabelText('Close CLI'));
    expect(screen.queryByText('S 192.168.30.0/24 VIA 10.0.12.2')).toBeNull();
  });

  test('setup disclosure remains inside the lab and does not reset console state', async () => {
    const screen = await render(<CliLab definition={cliLabDefinitions['static-route-board']} />);
    expect(screen.getAllByRole('button')[0].props.accessibilityLabel).toBe('Back to Chapter 9');
    await openCli(screen, 'NB-R1');
    await submit(screen, 'enable');
    await fireEvent.press(screen.getByLabelText('Close CLI'));
    await fireEvent.press(screen.getByRole('button', { name: /learn the setup/i }));
    expect(screen.getByText('STARTING FACTS')).toBeTruthy();
    await openCli(screen, 'NB-R1');
    expect(screen.getByText('PRIVILEGED EXEC MODE')).toBeTruthy();
  });

  test('keeps authored node sizes and horizontally pans long compact topologies', async () => {
    const screen = await render(<CliLab definition={cliLabDefinitions['static-route-board']} />);
    await fireEvent(screen.getByTestId('cli-layout'), 'layout', { persist: jest.fn(), nativeEvent: { layout: { width: 390, height: 760, x: 0, y: 0 } } });
    await fireEvent(screen.getByTestId('cli-topology-viewport'), 'layout', { nativeEvent: { layout: { width: 390, height: 250, x: 0, y: 0 } } });
    expect(StyleSheet.flatten(screen.getByTestId('cli-topology-canvas').props.style)).toMatchObject({ height: 250, width: 980 });
    expect(screen.getByTestId('cli-topology-scroll').props.scrollEnabled).toBe(true);
    expect(screen.getByText('SCROLL TO FOLLOW THE NETWORK PATH')).toBeTruthy();
  });

  test('retains accumulated hints in the overview', async () => {
    const screen = await render(<CliLab definition={cliLabDefinitions['inter-vlan-routing-desk']} />);
    await fireEvent.press(screen.getByText(/show a hint/i));
    await fireEvent.press(screen.getByText(/show next hint/i));
    expect(screen.getByText(/PC-A uses SW-1 F0\/1 in VLAN 10/i)).toBeTruthy();
    expect(screen.getByText(/switchport trunk allowed vlan 10,20/i)).toBeTruthy();
    expect(screen.getByText(/revealed hints \/ 2 of 4/i)).toBeTruthy();
  });

  test('expands a successful routed ping into complete forward and return visual paths', () => {
    const network = createRoutingState();
    requiredStaticRoutes.forEach((required) => network.devices.find((device) => device.id === required.deviceId)!.routes.push({ prefix: required.prefix, prefixLength: required.prefixLength, nextHop: required.nextHop, exitInterface: '', source: 'static' }));
    const trace = createCliVisualTrace(network, simulatePing(network, 'pc-a', '192.168.30.10'), '192.168.30.10');
    expect(trace.success).toBe(true);
    expect(trace.forwardDeviceIds).toEqual(['pc-a', 'r1', 'r2', 'r3', 'pc-c']);
    expect(trace.reverseDeviceIds).toEqual(['pc-c', 'r3', 'r2', 'r1', 'pc-a']);
  });
});
