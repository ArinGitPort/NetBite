import { fireEvent, render } from '@testing-library/react-native';

import { useGameStore } from '@/store/use-game-store';
import { useExperienceStore } from '@/store/use-experience-store';
import FlashcardsScreen, { getFlashcardSwipeDirection } from '@/app/flashcards/[chapterId]';
import { getChapter } from '@/content/chapters';

jest.mock('react-native-gesture-handler', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  const pan = {
    activeOffsetX: () => pan,
    failOffsetY: () => pan,
    runOnJS: () => pan,
    onEnd: () => pan,
  };
  return {
    Gesture: { Pan: () => pan },
    GestureDetector: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

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
      flashcardContentVersions: {},
      flashcardPositions: {},
      flashcardStudySessions: {},
      savedLearningItems: {},
    });
    useExperienceStore.setState({ flashcardOrientation: 'question' });
  });

  test('flips in both directions and counts the card after its opposite side is viewed', async () => {
    const screen = await render(<FlashcardsScreen />);

    expect(screen.getByText(/tap the card to flip it/i)).toBeTruthy();
    const questionCard = screen.getByLabelText(/What part of delivery does Ethernet handle in this course/i);
    await fireEvent.press(questionCard);
    expect(screen.getByLabelText(/Communication across one local wired link at a time/i)).toBeTruthy();
    expect(screen.getByText('1/9')).toBeTruthy();
    expect(useGameStore.getState().flashcardStudySessions['2'].studiedCardIds).toEqual(['ethernet']);
    await fireEvent.press(screen.getByLabelText(/Communication across one local wired link at a time/i));
    expect(screen.getByLabelText(/What part of delivery does Ethernet handle in this course/i)).toBeTruthy();
    expect(screen.getByText('1/9')).toBeTruthy();
    expect(screen.queryByText(/still learning/i)).toBeNull();
    expect(screen.queryByText(/^know$/i)).toBeNull();
  });

  test('browsing without flipping does not count the card as studied', async () => {
    const screen = await render(<FlashcardsScreen />);

    await fireEvent.press(screen.getByText(/^next$/i));
    expect(screen.getByText('0/9')).toBeTruthy();
    expect(useGameStore.getState().flashcardPositions['2']).toBe(1);
    expect(useGameStore.getState().flashcardStudySessions['2']).toBeUndefined();
  });

  test('persists answer-first orientation with accurate side labels', async () => {
    const screen = await render(<FlashcardsScreen />);

    await fireEvent.press(screen.getByLabelText('Flashcard options'));
    await fireEvent.press(screen.getByText(/answer first/i));
    expect(useExperienceStore.getState().flashcardOrientation).toBe('answer');
    expect(screen.getByText('ANSWER')).toBeTruthy();
    expect(screen.getByLabelText(/Answer: Communication across one local wired link at a time/i)).toBeTruthy();
  });

  test('restores an interrupted study session and completes without closing the deck', async () => {
    const chapter = getChapter('2')!;
    useGameStore.setState({
      flashcardPositions: { 2: 1 },
      flashcardStudySessions: {
        2: { contentVersion: chapter.flashcardVersion, studiedCardIds: chapter.flashcards.slice(0, -1).map(({ id }) => id) },
      },
    });
    const screen = await render(<FlashcardsScreen />);

    expect(screen.getByText('8/9')).toBeTruthy();
    for (let index = 1; index < chapter.flashcards.length; index += 1) {
      if (index > 1) await fireEvent.press(screen.getByText(/^next$/i));
    }
    await fireEvent.press(screen.getByLabelText(`Question: ${chapter.flashcards.at(-1)!.prompt}`));

    expect(screen.getByText('DECK REVIEWED')).toBeTruthy();
    expect(screen.getByText('9/9')).toBeTruthy();
    expect(useGameStore.getState().reviewedFlashcardChapterIds).toContain('2');
    expect(useGameStore.getState().flashcardStudySessions['2']).toBeUndefined();
    expect(screen.getByText(/^previous$/i)).toBeTruthy();
  });

  test('saves and unsaves whichever card is currently displayed', async () => {
    const screen = await render(<FlashcardsScreen />);

    expect(screen.getByText('CARD')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Save flashcard'));
    const firstCardId = 'ethernet';
    expect(useGameStore.getState().savedLearningItems[`flashcard:${firstCardId}`]?.deletedAt).toBeUndefined();

    await fireEvent.press(screen.getByText(/^next$/i));
    expect(screen.getByLabelText('Save flashcard')).toBeTruthy();
    await fireEvent.press(screen.getByText(/^previous$/i));
    await fireEvent.press(screen.getByLabelText('Unsave flashcard'));
    expect(useGameStore.getState().savedLearningItems[`flashcard:${firstCardId}`]?.deletedAt).toBeDefined();
  });

  test('recognizes deliberate horizontal swipes without stealing vertical scrolls', () => {
    expect(getFlashcardSwipeDirection(-90, 8)).toBe('next');
    expect(getFlashcardSwipeDirection(90, 8)).toBe('previous');
    expect(getFlashcardSwipeDirection(30, 2)).toBeUndefined();
    expect(getFlashcardSwipeDirection(90, 80)).toBeUndefined();
  });
});
