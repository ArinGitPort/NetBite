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

  test('flips the card, changes the preferred first side, and saves navigation progress', async () => {
    const screen = await render(<FlashcardsScreen />);

    const termCard = screen.getByLabelText(/Ethernet\. Tap to reveal the definition/i);
    await fireEvent.press(termCard);
    expect(screen.getByLabelText(/family of technologies used for wired local network communication/i)).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Show the definition first'));
    expect(screen.getByLabelText(/family of technologies used for wired local network communication/i)).toBeTruthy();

    await fireEvent.press(screen.getByText(/next card/i));
    expect(useGameStore.getState().flashcardPositions['2']).toBe(1);
  });
});
