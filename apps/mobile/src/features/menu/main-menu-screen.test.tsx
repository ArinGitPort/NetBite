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

  test('exposes learning, sandbox, header settings, and chapter browsing', async () => {
    const screen = await render(<MainMenuScreen />);
    expect(screen.getByTestId('main-menu-logo')).toBeTruthy();
    expect(screen.getByText('START LEARNING')).toBeTruthy();
    expect(screen.getByText('NETWORK SANDBOX')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy();
    await fireEvent.press(screen.getByText('Browse courses'));
    expect(mockPush).toHaveBeenCalledWith('/courses');
  });

  test('keeps account utilities in the header before learning destinations', async () => {
    const screen = await render(<MainMenuScreen />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0].props.accessibilityLabel).toContain('Test learner');
    expect(buttons[1].props.accessibilityLabel).toBe('Settings');
    expect(buttons.findIndex((button) => button.props.accessibilityLabel?.includes('START LEARNING'))).toBeGreaterThan(1);
    expect(screen.queryByText('ACCOUNT & APP')).toBeNull();
  });

  test('gives guests clearly labeled local access to the sandbox', async () => {
    mockAuthState = { ...mockAuthState, status: 'guest', hasPro: false, hasContentAccess: true, profile: { displayName: 'Test learner' } };
    const screen = await render(<MainMenuScreen />);
    expect(screen.getByText('GUEST ACCESS / OFFLINE READY')).toBeTruthy();
    expect(screen.queryByText('VIEW PRO ACCESS')).toBeNull();
    await fireEvent.press(screen.getByText('NETWORK SANDBOX'));
    expect(mockPush).toHaveBeenCalledWith('/sandbox');
  });

  test('announces active cloud synchronization on the account utility', async () => {
    mockAuthState = { ...mockAuthState, syncStatus: 'syncing' };
    const screen = await render(<MainMenuScreen />);
    expect(screen.getByRole('button', { name: /test learner, backing up/i }).props.accessibilityState.busy).toBe(true);
  });

  test('opens account and settings from the utility header', async () => {
    const screen = await render(<MainMenuScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /test learner, backed up/i }));
    expect(mockPush).toHaveBeenCalledWith('/account');
    await fireEvent.press(screen.getByRole('button', { name: 'Settings' }));
    expect(mockPush).toHaveBeenCalledWith('/settings');
  });

  test('labels temporary presentation access without claiming a purchase', async () => {
    mockAuthState = { ...mockAuthState, hasPro: false, hasContentAccess: true, presentationActive: true };
    const screen = await render(<MainMenuScreen />);
    expect(screen.getByText('DEMO ACCESS / NOT PURCHASED')).toBeTruthy();
    expect(screen.getByText('NETWORK SANDBOX')).toBeTruthy();
  });

  test('redirects a fresh guest to account choices without rendering the menu', async () => {
    mockAuthState = { ...mockAuthState, status: 'guest', hasPro: false, hasContentAccess: false, accountEntryResolved: false };
    const screen = await render(<MainMenuScreen />);
    expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({ href: '/auth/welcome' }));
    expect(screen.queryByTestId('main-menu-logo')).toBeNull();
  });
});
