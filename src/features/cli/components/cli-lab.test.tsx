import { fireEvent, render } from '@testing-library/react-native';

import { CliLab } from '@/features/cli/components/cli-lab';
import { cliLabDefinitions } from '@/features/cli/cli-lab-definitions';
import { useGameStore } from '@/store/use-game-store';

jest.mock('expo-router', () => ({ router: { dismissTo: jest.fn() } }));
jest.mock('@/shared/haptics', () => ({ selectionHaptic: jest.fn(), successHaptic: jest.fn(), warningHaptic: jest.fn() }));
jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined) },
}));

describe('CliLab', () => {
  beforeEach(() => useGameStore.setState({ completedLabIds: [], cliGuideSeen: true }));

  test('persists the first-run guide acknowledgement and keeps Help available', async () => {
    useGameStore.setState({ cliGuideSeen: false });
    const screen = await render(<CliLab definition={cliLabDefinitions['ping-diagnostic-desk']} />);
    expect(screen.getByText('NETBITE CLI / QUICK START')).toBeTruthy();
    await fireEvent.press(screen.getByText(/open the console/i));
    expect(useGameStore.getState().cliGuideSeen).toBe(true);
    await fireEvent.press(screen.getByLabelText('Open CLI help'));
    expect(screen.getByText('NETBITE CLI / QUICK START')).toBeTruthy();
  });

  test('requires command evidence, explains wrong conclusions, and completes all diagnostic stages', async () => {
    const screen = await render(<CliLab definition={cliLabDefinitions['ping-diagnostic-desk']} />);
    const input = () => screen.getByLabelText('Command for NB-R1');
    const submit = async (value: string) => {
      await fireEvent.changeText(input(), value);
      await fireEvent.press(screen.getByText(/run command/i));
    };

    expect(screen.queryByText('What is the first known failure?')).toBeNull();
    await submit('show ip interface brief');
    expect(screen.getByText('What is the first known failure?')).toBeTruthy();
    await fireEvent.press(screen.getByText('REMOTE ROUTE'));
    expect(screen.getByText(/cannot be evaluated before restoring/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /next scenario/i }).props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByText('LOCAL INTERFACE / LINK'));
    await fireEvent.press(screen.getByText(/next scenario/i));

    await submit('show running-config');
    await fireEvent.press(screen.getByText('INTERFACE IS ON THE WRONG /24'));
    await fireEvent.press(screen.getByText(/next scenario/i));

    await submit('show ip route');
    expect(screen.queryByText('What does the combined evidence establish?')).toBeNull();
    await submit('ping 192.168.30.10');
    await fireEvent.press(screen.getByText('NO USABLE REMOTE ROUTE IS KNOWN'));
    await fireEvent.press(screen.getByText(/next scenario/i));

    await submit('ping 192.168.30.10');
    expect(screen.getByText(/this round trip succeeded/i)).toBeTruthy();
    await fireEvent.press(screen.getByText('THIS IP ROUND TRIP SUCCEEDED'));
    await fireEvent.press(screen.getByText(/complete diagnostics/i));

    expect(useGameStore.getState().completedLabIds).toContain('ping-diagnostic-desk');
    expect(screen.getByText('CLI LAB COMPLETE')).toBeTruthy();
  });

  test('wrong-mode commands produce an error and do not enable Undo', async () => {
    const screen = await render(<CliLab definition={cliLabDefinitions['static-route-board']} />);
    await fireEvent.changeText(screen.getByLabelText('Command for NB-R1'), 'conf t');
    await fireEvent.press(screen.getByText(/run command/i));
    expect(screen.getAllByText(/available in privileged EXEC mode/i)).toHaveLength(2);
    expect(screen.getByRole('button', { name: /undo config/i }).props.accessibilityState.disabled).toBe(true);
  });

  test('provides outer page scrolling, nested transcript scrolling, and an unclipped hint flow', async () => {
    const screen = await render(<CliLab definition={cliLabDefinitions['ping-diagnostic-desk']} />);
    expect(screen.getByTestId('cli-page-scroll').props.keyboardDismissMode).toBe('on-drag');
    expect(screen.getByTestId('cli-transcript-scroll').props.nestedScrollEnabled).toBe(true);

    await fireEvent.changeText(screen.getByLabelText('Command for NB-R1'), 'show ip interface brief');
    await fireEvent.press(screen.getByText(/run command/i));
    await fireEvent.press(screen.getByText(/show a hint/i));
    expect(screen.getByText(/start with the local interface state/i)).toBeTruthy();
    expect(screen.getByText(/next scenario/i)).toBeTruthy();
  });

  test('keeps the status and terminal vertically composed while the web container resizes', async () => {
    const screen = await render(<CliLab definition={cliLabDefinitions['ping-diagnostic-desk']} />);
    await fireEvent(screen.getByTestId('cli-layout'), 'layout', { persist: jest.fn(), nativeEvent: { layout: { width: 700, height: 900, x: 0, y: 0 } } });
    expect(screen.getByTestId('cli-workspace').props.style.flexDirection).toBeUndefined();
    await fireEvent(screen.getByTestId('cli-layout'), 'layout', { persist: jest.fn(), nativeEvent: { layout: { width: 390, height: 760, x: 0, y: 0 } } });
    expect(screen.getByTestId('cli-workspace').props.style.flexDirection).toBeUndefined();
  });

  test('shows accepted route state, supports history, Undo, and Reset', async () => {
    const screen = await render(<CliLab definition={cliLabDefinitions['static-route-board']} />);
    await fireEvent.press(screen.getByRole('button', { name: /objective status/i }));
    const input = () => screen.getByLabelText('Command for NB-R1');
    const submit = async (value: string) => {
      await fireEvent.changeText(input(), value);
      await fireEvent.press(screen.getByText(/run command/i));
    };

    await submit('en');
    await submit('conf t');
    await submit('ip route 192.168.30.0 255.255.255.0 10.0.12.2');
    expect(screen.getByText('S 192.168.30.0/24 VIA 10.0.12.2')).toBeTruthy();
    expect(screen.getByText('[ ] ROUTES 1/4')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Previous command'));
    expect(input().props.value).toBe('ip route 192.168.30.0 255.255.255.0 10.0.12.2');
    await fireEvent.press(screen.getByText(/undo config/i));
    expect(screen.queryByText('S 192.168.30.0/24 VIA 10.0.12.2')).toBeNull();
    expect(screen.getByText('[ ] ROUTES 0/4')).toBeTruthy();

    await submit('ip route 192.168.30.0 255.255.255.0 10.0.12.2');
    await fireEvent.press(screen.getByLabelText('Reset CLI lab'));
    await fireEvent.press(screen.getByText(/^reset lab$/i));
    expect(screen.getByText('[ ] ROUTES 0/4')).toBeTruthy();
    expect(screen.getByLabelText('Command for NB-R1').props.value).toBe('');
  });

  test('renders wrapping device tabs and live switch port state', async () => {
    const screen = await render(<CliLab definition={cliLabDefinitions['vlan-port-desk']} />);
    expect(screen.getByRole('tab', { name: 'NB-SW-A' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'NB-SW-B' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /objective status/i }));
    expect(screen.getAllByText('F0/24 ACCESS')).toHaveLength(2);
    await fireEvent.press(screen.getByRole('tab', { name: 'NB-SW-B' }));
    expect(screen.getByLabelText('Command for NB-SW-B')).toBeTruthy();
  });
});
