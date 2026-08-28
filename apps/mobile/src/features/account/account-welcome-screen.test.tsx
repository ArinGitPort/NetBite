import { fireEvent, render } from '@testing-library/react-native';

import AccountWelcomeScreen from '@/app/auth/welcome';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockCompleteGuestEntry = jest.fn();
const mockRedirect = jest.fn((_props: unknown) => null);
let mockAuthState = {
  status: 'guest',
  configured: true,
  completeGuestEntry: mockCompleteGuestEntry,
};

jest.mock('expo-router', () => ({
  Redirect: (props: unknown) => mockRedirect(props),
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  },
}));

jest.mock('@/features/account/auth-context', () => ({
  useAuth: () => mockAuthState,
}));

describe('account welcome screen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockCompleteGuestEntry.mockClear();
    mockRedirect.mockClear();
    mockAuthState = { status: 'guest', configured: true, completeGuestEntry: mockCompleteGuestEntry };
  });

  test('offers separate sign-in, registration, and guest paths', async () => {
    const screen = await render(<AccountWelcomeScreen />);
    expect(screen.getByTestId('account-welcome-logo')).toBeTruthy();

    await fireEvent.press(screen.getByText('Sign in'));
    expect(mockPush).toHaveBeenCalledWith('/auth');

    await fireEvent.press(screen.getByText('Create account'));
    expect(mockPush).toHaveBeenCalledWith('/auth/register');

    await fireEvent.press(screen.getByText('Continue as guest'));
    expect(mockCompleteGuestEntry).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  test('keeps guest learning available when cloud configuration is absent', async () => {
    mockAuthState = { ...mockAuthState, configured: false };
    const screen = await render(<AccountWelcomeScreen />);
    expect(screen.getByText('CLOUD SERVICES OFFLINE')).toBeTruthy();

    await fireEvent.press(screen.getByText('Sign in'));
    await fireEvent.press(screen.getByText('Create account'));
    expect(mockPush).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText('Continue as guest'));
    expect(mockCompleteGuestEntry).toHaveBeenCalledTimes(1);
  });

  test('bypasses account choices for an authenticated session', async () => {
    mockAuthState = { ...mockAuthState, status: 'authenticated' };
    await render(<AccountWelcomeScreen />);
    expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({ href: '/' }));
  });
});
