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
    await fireEvent.press(screen.getByText('TCP'));
    await fireEvent.changeText(screen.getByLabelText('Client source port'), '70000');
    await fireEvent.changeText(screen.getByLabelText('Server destination port'), '443');
    await fireEvent.changeText(screen.getByLabelText('Server listening port'), '443');
    await fireEvent.press(screen.getByText('Save configuration'));
    expect(await screen.findByText(/port from 1 to 65535/i)).toBeTruthy();
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
    expect(await screen.findByText(/HTTPS in this exercise listens with TCP/i)).toBeTruthy();
    expect(useOperationsLabStore.getState().sessions[definition.id]).toMatchObject({ stageIndex: 0, configuration: { 'transport.protocol': 'udp' } });
    await fireEvent.press(screen.getByText('Undo latest change'));
    expect(useOperationsLabStore.getState().sessions[definition.id].lastResult).toBeUndefined();
  });

  test('retains progressive hints and advances from verified state', async () => {
    const screen = await render(<OperationsGuidedLab definition={definition} />);
    await fireEvent.press(screen.getByText('Show a hint'));
    expect(await screen.findByText('HINT HISTORY')).toBeTruthy();
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
});
