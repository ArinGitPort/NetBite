import { fireEvent, render } from '@testing-library/react-native';

import { TransportGuidedLab } from '@/features/transport/components/transport-guided-lab';
import { useGameStore } from '@/store/use-game-store';
import { useOperationsLabStore } from '@/store/use-operations-lab-store';
import { useProtocolLabStore } from '@/store/use-protocol-lab-store';

jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() } }));
jest.mock('expo-router', () => ({ router: { dismissTo: jest.fn(), push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) } }));

describe('Transport guided mini-simulator', () => {
  beforeEach(() => {
    useProtocolLabStore.setState({ sessions: {}, history: {}, recoveryCopies: {} });
    useOperationsLabStore.setState({ sessions: {}, history: {}, recoveryCopies: {} });
    useGameStore.setState({ completedLabIds: [] });
  });

  test('renders a connected inspectable topology and endpoint state', async () => {
    const screen = await render(<TransportGuidedLab />);
    expect(screen.getByText('FIXED INTERACTIVE TOPOLOGY')).toBeTruthy();
    expect(screen.getByLabelText(/PC1, 192.0.2.10:53000/)).toBeTruthy();
    expect(screen.getByLabelText(/WEB1, 192.0.2.20:443/)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(/R1, FORWARDS BY IP/));
    expect(await screen.findByText('SELECTED / NETWORK')).toBeTruthy();
    expect(screen.getByText('TRANSPORT PORTS / NOT USED FOR IP ROUTE SELECTION')).toBeTruthy();
  });

  test('rejects malformed ports without creating simulation state', async () => {
    const screen = await render(<TransportGuidedLab />);
    await fireEvent.changeText(screen.getByLabelText('Source port'), '70000');
    await fireEvent.press(screen.getByText('Save endpoint configuration'));
    expect(await screen.findByText(/ports must be whole numbers/i)).toBeTruthy();
    expect(useProtocolLabStore.getState().sessions['transport-service-desk']).toBeUndefined();
  });

  test('manually advances the TCP handshake and retains progressive hints', async () => {
    const screen = await render(<TransportGuidedLab />);
    await fireEvent.press(screen.getByText('Show a hint'));
    await fireEvent.press(await screen.findByText('Show next hint'));
    expect((useProtocolLabStore.getState().sessions['transport-service-desk'].state as { hints: string[] }).hints).toHaveLength(2);

    await fireEvent.press(screen.getByText('Save endpoint configuration'));
    await fireEvent.press(await screen.findByText('Verify endpoints and listener'));
    await fireEvent.press(await screen.findByText('Send SYN'));
    expect(await screen.findByText(/CLIENT TCP \/ SYN_SENT/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Send SYN-ACK'));
    await fireEvent.press(screen.getByText('Send final ACK'));
    expect(await screen.findByText(/CLIENT TCP \/ ESTABLISHED/)).toBeTruthy();
    expect(screen.getByText('OBJECTIVE 3 OF 4')).toBeTruthy();
  });
});
