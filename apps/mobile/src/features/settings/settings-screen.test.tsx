import { fireEvent, render, within } from '@testing-library/react-native';

import SettingsScreen from '@/app/settings';

const mockSyncNow = jest.fn(async () => undefined);
let mockAuthState = {
  status: 'authenticated',
  configured: true,
  syncStatus: 'action-needed',
  error: 'Changes are safe on this device and will retry later.',
  presentationActive: false,
  testProAvailable: true,
  testProEnabled: false,
  setTestProEnabled: jest.fn(),
  syncNow: mockSyncNow,
};

jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: () => false, replace: jest.fn(), dismissTo: jest.fn() } }));
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() } }));
jest.mock('@/features/account/auth-context', () => ({ useAuth: () => mockAuthState }));
jest.mock('@/features/content-delivery/content-context', () => ({ useContentDelivery: () => ({ status: 'current', message: 'Bundled learning materials are current.', manifest: undefined, checkNow: jest.fn(), restorePrevious: jest.fn() }) }));

describe('settings reliability controls', () => {
  beforeEach(() => {
    mockSyncNow.mockClear();
    mockAuthState = { ...mockAuthState, status: 'authenticated', syncStatus: 'action-needed', presentationActive: false };
  });

  test('shows failed-sync guidance and provides a manual retry', async () => {
    const screen = await render(<SettingsScreen />);
    expect(screen.getByText('WAITING FOR INTERNET')).toBeTruthy();
    expect(screen.getByText(/automatically tries again when internet access returns/i)).toBeTruthy();
    await fireEvent.press(screen.getByText('Try backup again'));
    expect(mockSyncNow).toHaveBeenCalledTimes(1);
  });

  test('requires confirmation before destructive local actions', async () => {
    const screen = await render(<SettingsScreen />);
    expect(screen.queryByText('Reset learning progress')).toBeNull();
    await fireEvent.press(screen.getByText('Reset or erase data'));
    await fireEvent.press(screen.getByText('Reset learning progress'));
    expect(screen.getByText('Reset learning progress?')).toBeTruthy();
    await fireEvent.press(screen.getByText('Cancel'));
    await fireEvent.press(screen.getByText('Erase sandbox workspace'));
    expect(screen.getByText('Erase sandbox workspace?')).toBeTruthy();
  });

  test('enables clearly labeled development test access', async () => {
    const screen = await render(<SettingsScreen />);
    expect(screen.getByText('Development test access')).toBeTruthy();
    expect(screen.queryByText(/every Network Operations module/i)).toBeNull();
    await fireEvent.press(screen.getByText('Development test access'));
    expect(screen.getByText(/every Network Operations module/i)).toBeTruthy();
    expect(screen.getByText('DISABLED')).toBeTruthy();
    await fireEvent.press(screen.getByText('Enable test access'));
    expect(mockAuthState.setTestProEnabled).toHaveBeenCalledWith(true);
  });

  test('opens guidance manually without resetting guide state', async () => {
    const screen = await render(<SettingsScreen />);
    expect(screen.getByText('App guide')).toBeTruthy();
    expect(screen.queryByText('Replay contextual guides')).toBeNull();
  });

  test('offers system, light, and dark appearance choices', async () => {
    const screen = await render(<SettingsScreen />);
    expect(screen.getByText('Appearance')).toBeTruthy();
    expect(screen.queryByLabelText('Appearance preference')).toBeNull();
    await fireEvent.press(screen.getByText('Appearance'));
    const appearance = within(screen.getByLabelText('Appearance preference'));
    expect(appearance.getByRole('radio', { name: 'SYSTEM' })).toBeTruthy();
    expect(appearance.getByRole('radio', { name: 'LIGHT' })).toBeTruthy();
    expect(appearance.getByRole('radio', { name: 'DARK' })).toBeTruthy();
  });
});
