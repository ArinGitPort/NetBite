import { fireEvent, render } from '@testing-library/react-native';

import AppGuideScreen from '@/app/guide';
import MainMenuScreen from '@/app/index';

const mockDismissTo = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  Redirect: () => null,
  router: {
    back: jest.fn(),
    canGoBack: () => false,
    dismissTo: (...args: unknown[]) => mockDismissTo(...args),
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  },
}));
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() } }));
jest.mock('@/features/account/auth-context', () => ({
  useAuth: () => ({ status: 'guest', hasPro: false, hasContentAccess: true, presentationActive: false, syncStatus: 'local', profile: undefined, accountEntryResolved: true }),
}));

describe('manual app guidance', () => {
  test('does not place an automatic guide on the main menu', async () => {
    const screen = await render(<MainMenuScreen />);
    expect(screen.queryByText(/FIRST SESSION/)).toBeNull();
    expect(screen.queryByText(/Next tip/i)).toBeNull();
  });

  test('provides all guidance topics on demand', async () => {
    const screen = await render(<AppGuideScreen />);
    expect(screen.getByText('MAIN MENU AND COURSES')).toBeTruthy();
    expect(screen.getByText('LESSONS AND REVIEW')).toBeTruthy();
    expect(screen.getByText('GUIDED LABS')).toBeTruthy();
    expect(screen.getByText('NETWORK SANDBOX')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Back to Settings' }));
    expect(mockReplace).toHaveBeenCalledWith('/settings');
  });
});
