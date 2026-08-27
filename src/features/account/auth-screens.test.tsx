import { fireEvent, render } from '@testing-library/react-native';

import SignInScreen from '@/app/auth';
import RegisterScreen from '@/app/auth/register';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSignInEmail = jest.fn();
const mockSignInGoogle = jest.fn();
const mockRegisterEmail = jest.fn();
let mockConfigured = true;
let mockSearchParams: { returnTo?: string; code?: string } = {};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockSearchParams,
  router: {
    back: (...args: unknown[]) => mockBack(...args),
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  },
}));

jest.mock('@/features/account/auth-context', () => ({
  useAuth: () => ({
    configured: mockConfigured,
    registerEmail: mockRegisterEmail,
    signInEmail: mockSignInEmail,
    signInGoogle: mockSignInGoogle,
  }),
}));

describe('account authentication screens', () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockPush.mockClear();
    mockReplace.mockClear();
    mockSignInEmail.mockReset();
    mockSignInGoogle.mockReset();
    mockRegisterEmail.mockReset();
    mockConfigured = true;
    mockSearchParams = {};
  });

  test('keeps the sign-in form visible and explains invalid credentials', async () => {
    mockSignInEmail.mockResolvedValue('Email or password is incorrect.');
    const screen = await render(<SignInScreen />);
    await fireEvent.changeText(screen.getByLabelText('EMAIL'), 'learner@example.com');
    await fireEvent.changeText(screen.getByLabelText('PASSWORD'), 'incorrect-password');
    await fireEvent.press(screen.getByText('Sign in'));

    expect(mockSignInEmail).toHaveBeenCalledWith('learner@example.com', 'incorrect-password');
    expect(await screen.findByText('Email or password is incorrect.')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('starts Google authentication from the branded Google action', async () => {
    mockSignInGoogle.mockResolvedValue(undefined);
    const screen = await render(<SignInScreen />);

    await fireEvent.press(screen.getByLabelText('Sign in with Google'));

    expect(mockSignInGoogle).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  test('returns to a class join link after email sign-in', async () => {
    mockSearchParams = { returnTo: '/workshops/join', code: 'ABC234XY' };
    mockSignInEmail.mockResolvedValue(undefined);
    const screen = await render(<SignInScreen />);
    await fireEvent.changeText(screen.getByLabelText('EMAIL'), 'learner@example.com');
    await fireEvent.changeText(screen.getByLabelText('PASSWORD'), 'networking123');
    await fireEvent.press(screen.getByText('Sign in'));

    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/workshops/join', params: { code: 'ABC234XY' } });
  });

  test('shows verification guidance and a return-to-sign-in action', async () => {
    mockRegisterEmail.mockResolvedValue({ verificationRequired: true });
    const screen = await render(<RegisterScreen />);
    await fireEvent.changeText(screen.getByLabelText('DISPLAY NAME'), 'Allen');
    await fireEvent.changeText(screen.getByLabelText('EMAIL'), 'allen@example.com');
    await fireEvent.changeText(screen.getByLabelText('PASSWORD'), 'networking123');
    await fireEvent.press(screen.getByText('Create account'));

    expect(mockRegisterEmail).toHaveBeenCalledWith('allen@example.com', 'networking123', 'Allen');
    expect(await screen.findByText(/Verification email sent/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Return to sign in'));
    expect(mockReplace).toHaveBeenCalledWith('/auth');
  });

  test('disables cloud actions while preserving a clear explanation', async () => {
    mockConfigured = false;
    const signIn = await render(<SignInScreen />);
    expect(signIn.getByText(/Cloud services are not configured yet/)).toBeTruthy();
    expect(signIn.getByText('Sign in').parent?.props.accessibilityState).toMatchObject({ disabled: true });
    await signIn.unmount();

    const register = await render(<RegisterScreen />);
    expect(register.getByText(/Cloud services are not configured/)).toBeTruthy();
    expect(register.getByText('Create account').parent?.props.accessibilityState).toMatchObject({ disabled: true });
  });
});
