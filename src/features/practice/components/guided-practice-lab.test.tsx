import { fireEvent, render } from '@testing-library/react-native';

import { GuidedPracticeLab } from '@/features/practice/components/guided-practice-lab';
import { practiceConfigs } from '@/features/practice/practice-configs';
import { useGameStore } from '@/store/use-game-store';

jest.mock('expo-router', () => ({ router: { dismissTo: jest.fn() } }));
jest.mock('@/shared/haptics', () => ({ selectionHaptic: jest.fn(), successHaptic: jest.fn(), warningHaptic: jest.fn() }));
jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined) },
}));

describe('GuidedPracticeLab', () => {
  beforeEach(() => useGameStore.setState({ completedLabIds: [] }));

  test('wrong answers do not advance and four correct decisions persist completion', async () => {
    const config = practiceConfigs['ipv4-configurator'];
    const screen = await render(<GuidedPracticeLab config={config} />);
    await fireEvent.press(screen.getByText('INVALID OCTET'));
    await fireEvent.press(screen.getByText(/check prediction/i));
    expect(screen.getByText(/check the rule/i)).toBeTruthy();
    expect(screen.getByText('STAGE 1 OF 4')).toBeTruthy();

    for (const [index, practiceStage] of config.stages.entries()) {
      const correct = practiceStage.choices.find(({ id }) => id === practiceStage.correctChoiceId)!;
      await fireEvent.press(screen.getByText(correct.label));
      await fireEvent.press(screen.getByText(/check prediction/i));
      expect(screen.getByText(/decision accepted/i)).toBeTruthy();
      await fireEvent.press(screen.getByText(index === 3 ? /complete practice/i : /continue/i));
    }
    expect(screen.getByText(/practice complete/i)).toBeTruthy();
    expect(useGameStore.getState().completedLabIds).toContain('ipv4-configurator');
  });

  test('reset returns to stage one', async () => {
    const screen = await render(<GuidedPracticeLab config={practiceConfigs['subnet-range-desk']} />);
    await fireEvent.press(screen.getByText('.0 NETWORK / .255 BROADCAST'));
    await fireEvent.press(screen.getByText(/check prediction/i));
    await fireEvent.press(screen.getByText(/continue/i));
    expect(screen.getByText('STAGE 2 OF 4')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Reset practice'));
    await fireEvent.press(screen.getByText(/reset practice/i));
    expect(screen.getByText('STAGE 1 OF 4')).toBeTruthy();
  });
});
