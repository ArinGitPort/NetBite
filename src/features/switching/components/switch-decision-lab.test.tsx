import { fireEvent, render } from '@testing-library/react-native';

import { SwitchDecisionLab } from '@/features/switching/components/switch-decision-lab';
import { useGameStore } from '@/store/use-game-store';

jest.mock('expo-router', () => ({
  router: { dismissTo: jest.fn() },
}));

jest.mock('@/shared/haptics', () => ({
  selectionHaptic: jest.fn(),
  successHaptic: jest.fn(),
  warningHaptic: jest.fn(),
}));

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}));

async function chooseAndCheck(screen: Awaited<ReturnType<typeof render>>, prediction: string) {
  await fireEvent.press(screen.getByText(prediction));
  await fireEvent.press(screen.getByText(/check switch decision/i));
}

describe('SwitchDecisionLab', () => {
  beforeEach(() => {
    useGameStore.setState({ completedLabIds: [] });
  });

  test('keeps the table unchanged after a wrong answer, then completes all four decisions', async () => {
    const screen = await render(<SwitchDecisionLab />);

    expect(screen.getByText('NO ADDRESSES LEARNED')).toBeTruthy();
    await chooseAndCheck(screen, 'FORWARD TO PORT 1');
    expect(screen.getByText('CHECK THE TABLE')).toBeTruthy();
    expect(screen.getByText('NO ADDRESSES LEARNED')).toBeTruthy();

    await chooseAndCheck(screen, 'FLOOD OTHER PORTS');
    expect(screen.getByText('DECISION CONFIRMED')).toBeTruthy();
    expect(screen.getByLabelText('MAC address table, 1 learned address, after decision')).toBeTruthy();
    expect(screen.getByLabelText(/PC B, MAC 02:00:00:00:00:0B, port 2, egress/)).toBeTruthy();
    await fireEvent.press(screen.getByText(/next frame/i));

    expect(screen.getByText('REPLY FRAME')).toBeTruthy();
    await chooseAndCheck(screen, 'FORWARD TO PORT 1');
    expect(screen.getByLabelText('MAC address table, 2 learned addresses, after decision')).toBeTruthy();
    await fireEvent.press(screen.getByText(/next frame/i));

    expect(screen.getByText('LOCAL BROADCAST')).toBeTruthy();
    await chooseAndCheck(screen, 'FLOOD OTHER PORTS');
    expect(screen.getByLabelText('MAC address table, 3 learned addresses, after decision')).toBeTruthy();
    await fireEvent.press(screen.getByText(/next frame/i));

    expect(screen.getByText('LEARNED DESTINATION')).toBeTruthy();
    await chooseAndCheck(screen, 'FORWARD TO PORT 2');
    await fireEvent.press(screen.getByText(/complete switch desk/i));

    expect(screen.getByText('OBJECTIVE COMPLETE')).toBeTruthy();
    expect(useGameStore.getState().completedLabIds).toContain('switch-decision-desk');
  });

  test('reset clears learned state and returns to the first frame', async () => {
    const screen = await render(<SwitchDecisionLab />);
    await chooseAndCheck(screen, 'FLOOD OTHER PORTS');
    await fireEvent.press(screen.getByText(/next frame/i));

    await fireEvent.press(screen.getByLabelText('Reset switch desk'));
    await fireEvent.press(screen.getByText(/reset desk/i));

    expect(screen.getByText('FIRST CONTACT')).toBeTruthy();
    expect(screen.getByText('NO ADDRESSES LEARNED')).toBeTruthy();
  });
});
