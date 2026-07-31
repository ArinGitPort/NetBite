import { fireEvent, render } from '@testing-library/react-native';

import ProgressScreen from '@/app/progress';
import ReviewScreen from '@/app/review';
import SavedScreen from '@/app/saved';
import { useGameStore } from '@/store/use-game-store';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args), dismissTo: jest.fn(), canGoBack: () => false, replace: jest.fn() } }));
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() } }));
jest.mock('@/features/account/auth-context', () => ({ useAuth: () => ({ hasContentAccess: true }) }));

describe('adaptive learning screens', () => {
  beforeEach(() => {
    mockPush.mockClear();
    useGameStore.setState({
      completedLessonIds: [], completedLabIds: [], quizScores: {}, quizContentVersions: {}, reviewedFlashcardChapterIds: [], flashcardContentVersions: {},
      reviewSignals: {}, savedLearningItems: {}, activityHistory: [],
    });
  });

  test('keeps completion, mastery, and review due as separate dashboard facts', async () => {
    const screen = await render(<ProgressScreen />);
    expect(screen.getByText('PROGRESS & REVIEW')).toBeTruthy();
    expect(screen.getAllByText(/ACTIVITIES/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/MASTERY/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/REVIEW DUE/).length).toBeGreaterThan(0);
  });

  test('shows an empty mixed queue without assigning a score', async () => {
    const screen = await render(<ReviewScreen />);
    expect(screen.getByText('REVIEW QUEUE CLEAR')).toBeTruthy();
    expect(screen.getByText('NO WEAK TOPICS DUE')).toBeTruthy();
  });

  test('requires confirmation before removing a saved item with a note', async () => {
    useGameStore.getState().saveLearningItem({ targetType: 'lesson', targetId: 'network-definition', chapterId: '1', title: 'What is a network?', note: 'Personal note' });
    const screen = await render(<SavedScreen />);
    await fireEvent.press(screen.getByText('Remove saved item'));
    expect(screen.getByText('Remove this saved item?')).toBeTruthy();
    expect(screen.getByText(/personal note will be deleted/i)).toBeTruthy();
  });
});
