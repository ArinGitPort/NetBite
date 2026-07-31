import { fireEvent, render } from '@testing-library/react-native';

import MainMenuScreen from '@/app/index';
import { createEmptySandboxWorkspace } from '@/core/network/sandbox';
import { useGameStore } from '@/store/use-game-store';
import { useSandboxStore } from '@/store/use-sandbox-store';

const mockPush = jest.fn();
const mockRedirect = jest.fn((_props: unknown) => null);
let mockAuthState = {
  status: 'authenticated',
  hasPro: true,
  hasContentAccess: true,
  presentationActive: false,
  syncStatus: 'synced',
  profile: { displayName: 'Test learner' },
  accountEntryResolved: true,
};
jest.mock('expo-router', () => ({
  Redirect: (props: unknown) => mockRedirect(props),
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() } }));
jest.mock('@/features/account/auth-context', () => ({
  useAuth: () => mockAuthState,
}));

describe('main menu', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRedirect.mockClear();
    mockAuthState = { status: 'authenticated', hasPro: true, hasContentAccess: true, presentationActive: false, syncStatus: 'synced', profile: { displayName: 'Test learner' }, accountEntryResolved: true };
    useGameStore.setState({ completedLessonIds: [], completedLabIds: [], quizScores: {}, quizContentVersions: {}, reviewedFlashcardChapterIds: [], flashcardContentVersions: {} });
    useSandboxStore.setState({ workspace: createEmptySandboxWorkspace(), guideSeen: true, past: [], future: [] });
  });

  test('exposes learning, sandbox, settings, and chapter browsing', async () => {
    const screen = await render(<MainMenuScreen />);
    expect(screen.getByTestId('main-menu-logo')).toBeTruthy();
    expect(screen.getByText('START LEARNING')).toBeTruthy();
    expect(screen.getByText('NETWORK SANDBOX')).toBeTruthy();
    expect(screen.getByText('SETTINGS')).toBeTruthy();
    await fireEvent.press(screen.getByText('BROWSE CHAPTERS'));
    expect(mockPush).toHaveBeenCalledWith('/learn');
    await fireEvent.press(screen.getByText('NETWORK SANDBOX'));
    expect(mockPush).toHaveBeenCalledWith('/sandbox');
  });

  test('redirects a fresh guest to account choices without rendering the menu', async () => {
    mockAuthState = { ...mockAuthState, status: 'guest', hasPro: false, hasContentAccess: false, accountEntryResolved: false };
    const screen = await render(<MainMenuScreen />);
    expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({ href: '/auth/welcome' }));
    expect(screen.queryByTestId('main-menu-logo')).toBeNull();
  });
});
