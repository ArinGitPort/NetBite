import { fireEvent, render } from '@testing-library/react-native';

import { useGameStore } from '@/store/use-game-store';
import FlashcardsScreen from '@/app/flashcards/[chapterId]';

jest.mock('react-native-reanimated', () => {
  // Jest loads the native component lazily inside the hoisted mock factory.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    cancelAnimation: jest.fn(),
    Easing: { cubic: (value: number) => value, inOut: (easing: (value: number) => number) => easing },
    interpolate: (value: number, input: number[], output: number[]) => value <= input[0] ? output[0] : output[output.length - 1],
    useAnimatedStyle: (factory: () => object) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (initial: number) => ({ value: initial, set(next: number) { this.value = next; } }),
    withTiming: (value: number) => value,
  };
});

jest.mock('expo-router', () => ({
  router: { dismissTo: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ chapterId: '2' }),
}));

jest.mock('@/shared/haptics', () => ({
  selectionHaptic: jest.fn(),
  successHaptic: jest.fn(),
}));

jest.mock('@/features/account/auth-context', () => ({
  useAuth: () => ({ hasPro: false }),
}));

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}));

describe('FlashcardsScreen', () => {
  beforeEach(() => {
    useGameStore.setState({
      reviewedFlashcardChapterIds: [],
      flashcardPositions: {},
    });
  });

  test('requires retrieval before reveal and requeues a card rated for review', async () => {
    const screen = await render(<FlashcardsScreen />);

    expect(screen.getByText(/say the answer in your own words before revealing it/i)).toBeTruthy();
    const questionCard = screen.getByLabelText(/What part of delivery does Ethernet handle in this course/i);
    await fireEvent.press(questionCard);
    expect(screen.getByLabelText(/Communication across one local wired link at a time/i)).toBeTruthy();

    await fireEvent.press(screen.getByText(/review again/i));
    expect(useGameStore.getState().flashcardPositions['2']).toBe(1);
    expect(screen.getByText(/Why does Ethernet place data inside a frame/i)).toBeTruthy();
    expect(screen.getByText('0/9')).toBeTruthy();
  });

  test('counts a card as retrieved only after the learner reveals and rates it got it', async () => {
    const screen = await render(<FlashcardsScreen />);

    expect(screen.queryByText(/got it/i)).toBeNull();
    await fireEvent.press(screen.getByText(/reveal answer/i));
    await fireEvent.press(screen.getByText(/got it/i));

    expect(screen.getByText('1/9')).toBeTruthy();
    expect(useGameStore.getState().flashcardPositions['2']).toBe(1);
  });
});
