import { fireEvent, render } from '@testing-library/react-native';

import CourseLibraryScreen from '@/app/courses';
import { useGameStore } from '@/store/use-game-store';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) } }));
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() } }));
jest.mock('@/features/account/auth-context', () => ({ useAuth: () => ({ hasContentAccess: true, presentationActive: false, testProEnabled: true }) }));

describe('development test access', () => {
  beforeEach(() => {
    mockPush.mockClear();
    useGameStore.getState().resetLearningProgress();
  });

  test('opens Network Operations without Foundations readiness and exposes its capstone', async () => {
    const screen = await render(<CourseLibraryScreen />);
    expect(screen.getByText('COURSE 2 / TEST ACCESS')).toBeTruthy();
    expect(screen.getByText('Start operations capstone')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /network operations, course 2 \/ test access/i }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/learn', params: { courseId: 'network-operations' } });
  });
});
