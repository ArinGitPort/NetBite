import { fireEvent, render } from '@testing-library/react-native';

import { createChapterOneTopology } from '@/core/network/models';
import { EthernetCableLab } from '@/features/ethernet/components/ethernet-cable-lab';
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

describe('EthernetCableLab', () => {
  beforeEach(() => {
    useGameStore.setState({
      topology: createChapterOneTopology(),
      completedLabIds: [],
    });
  });

  test('completes the lab after the learner selects the three manual cable rules', async () => {
    const screen = await render(<EthernetCableLab />);
    const straightThroughChoices = screen.getAllByText('STRAIGHT-THROUGH');
    const crossoverChoices = screen.getAllByText('CROSSOVER');

    await fireEvent.press(straightThroughChoices[0]);
    await fireEvent.press(straightThroughChoices[1]);
    await fireEvent.press(crossoverChoices[2]);
    await fireEvent.press(screen.getByText(/check my cables/i));

    expect(screen.getByText('OBJECTIVE COMPLETE')).toBeTruthy();
    expect(useGameStore.getState().completedLabIds).toContain('ethernet-cables');
  });
});
