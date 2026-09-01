import { fireEvent, render } from '@testing-library/react-native';

import { OperationsGuidedLab } from '@/features/operations/components/operations-guided-lab';
import { operationsLabDefinitions } from '@/features/operations/operations-lab-definitions';
import { useGameStore } from '@/store/use-game-store';
import { useOperationsLabStore } from '@/store/use-operations-lab-store';

jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() } }));
jest.mock('expo-router', () => ({ router: { dismissTo: jest.fn(), push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) } }));

describe('Operations guided simulator', () => {
  const definition = operationsLabDefinitions['transport-service-desk'];
  beforeEach(() => {
    useOperationsLabStore.setState({ sessions: {}, history: {}, recoveryCopies: {} });
    useGameStore.setState({ completedLabIds: [] });
  });

  test('rejects malformed fields without mutating the session', async () => {
    const screen = await render(<OperationsGuidedLab definition={definition} />);
    expect(screen.getByTestId('screen-footer')).toBeTruthy();
    await fireEvent.press(screen.getByText('TCP'));
    await fireEvent.changeText(screen.getByLabelText('Client source port'), '70000');
    await fireEvent.changeText(screen.getByLabelText('Server destination port'), '443');
    await fireEvent.changeText(screen.getByLabelText('Server listening port'), '443');
    await fireEvent.press(screen.getByText('Save configuration'));
    expect((await screen.findAllByText(/port from 1 to 65535/i)).length).toBeGreaterThanOrEqual(2);
    expect(useOperationsLabStore.getState().sessions[definition.id]).toBeUndefined();
  });

  test('keeps valid incorrect configuration editable and undoable', async () => {
    const screen = await render(<OperationsGuidedLab definition={definition} />);
    await fireEvent.press(screen.getByText('UDP'));
    await fireEvent.changeText(screen.getByLabelText('Client source port'), '49152');
    await fireEvent.changeText(screen.getByLabelText('Server destination port'), '443');
    await fireEvent.changeText(screen.getByLabelText('Server listening port'), '443');
    await fireEvent.press(screen.getByText('Save configuration'));
    await fireEvent.press(await screen.findByText('Save endpoint configuration'));
    expect((await screen.findAllByText(/HTTPS in this exercise listens with TCP/i)).length).toBeGreaterThan(0);
    expect(useOperationsLabStore.getState().sessions[definition.id]).toMatchObject({ stageIndex: 0, configuration: { 'transport.protocol': 'udp' } });
    await fireEvent.press(screen.getByText('Undo latest change'));
    expect(useOperationsLabStore.getState().sessions[definition.id].lastResult).toBeUndefined();
  });

  test('retains progressive hints and advances from verified state', async () => {
    const screen = await render(<OperationsGuidedLab definition={definition} />);
    await fireEvent.press(screen.getByText('Show a hint'));
    expect(await screen.findByText('1 HINT REVEALED')).toBeTruthy();
    await fireEvent.press(screen.getByText('Show next hint'));
    expect(useOperationsLabStore.getState().sessions[definition.id].hints).toHaveLength(2);
    await fireEvent.press(screen.getByText('TCP'));
    await fireEvent.changeText(screen.getByLabelText('Client source port'), '49152');
    await fireEvent.changeText(screen.getByLabelText('Server destination port'), '443');
    await fireEvent.changeText(screen.getByLabelText('Server listening port'), '443');
    await fireEvent.press(screen.getByText('Save configuration'));
    await fireEvent.press(await screen.findByText('Save endpoint configuration'));
    expect(useOperationsLabStore.getState().sessions[definition.id].stageIndex).toBe(1);
    expect(useOperationsLabStore.getState().sessions[definition.id].completedObjectiveIds).toContain('endpoint');
  });

  test('teaches the DHCP setup and renders inspectable devices with cables', async () => {
    const dhcp = operationsLabDefinitions['dhcp-lease-desk'];
    const screen = await render(<OperationsGuidedLab definition={dhcp} />);
    expect(screen.getByText('LEARN THE SETUP')).toBeTruthy();
    expect(screen.getByText('HOW TO READ THE POOL SETTINGS')).toBeTruthy();
    expect(screen.getByTestId('operations-topology-canvas')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(/DHCP1, SERVER/i));
    expect(await screen.findByText('SELECTED / DHCP1')).toBeTruthy();
    expect(screen.getByText('POOL / POOL NOT CONFIGURED')).toBeTruthy();
    expect(screen.getByText(/The first remaining address the server may offer is 192.168.20.101/)).toBeTruthy();
    expect(screen.getByText('SUPPLIED SCENARIO FACTS')).toBeTruthy();
    expect(screen.getByText(/The \/24 means the prefix length is 24/)).toBeTruthy();
    expect(screen.getByText(/pool must match the client subnet, not the DHCP server subnet/i)).toBeTruthy();
  });

  test('accepts a slash-prefixed DHCP prefix after explaining the required inputs', async () => {
    const dhcp = operationsLabDefinitions['dhcp-lease-desk'];
    const screen = await render(<OperationsGuidedLab definition={dhcp} />);
    await fireEvent.changeText(screen.getByLabelText('Pool network'), '192.168.20.0');
    await fireEvent.changeText(screen.getByLabelText('Prefix length'), '/24');
    await fireEvent.changeText(screen.getByLabelText('First pool address'), '192.168.20.100');
    await fireEvent.changeText(screen.getByLabelText('Last pool address'), '192.168.20.102');
    await fireEvent.changeText(screen.getByLabelText('Reserved address to exclude'), '192.168.20.100');
    await fireEvent.changeText(screen.getByLabelText('Default gateway option'), '192.168.20.1');
    await fireEvent.changeText(screen.getByLabelText('Practice lease duration'), '4');
    await fireEvent.press(screen.getByText('Save configuration'));
    expect(useOperationsLabStore.getState().sessions[dhcp.id].configuration).toMatchObject({ 'dhcp.prefix': 24 });
  });

  test('keeps the current Operations objective available inside its full-screen CLI', async () => {
    const acl = operationsLabDefinitions['acl-policy-desk'];
    const screen = await render(<OperationsGuidedLab definition={acl} />);
    await fireEvent.press(screen.getByText('Open full-screen CLI'));
    const task = screen.getByRole('button', { name: /current task/i });
    expect(task.props.accessibilityState.expanded).toBe(false);
    await fireEvent.press(task);
    expect(screen.getByText('EVIDENCE')).toBeTruthy();
    expect(screen.getByText('SUPPLIED FACT 1')).toBeTruthy();
    expect(screen.getByText(/Configure the current objective using the supplied facts/i)).toBeTruthy();
  });
});
