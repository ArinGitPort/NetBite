import { fireEvent, render } from '@testing-library/react-native';

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

describe('settings reliability controls', () => {
  beforeEach(() => {
    mockSyncNow.mockClear();
    mockAuthState = { ...mockAuthState, status: 'authenticated', syncStatus: 'action-needed', presentationActive: false };
  });

  test('shows failed-sync guidance and provides a manual retry', async () => {
    const screen = await render(<SettingsScreen />);
    expect(screen.getByText('ACTION NEEDED / LOCAL COPY IS SAFE')).toBeTruthy();
    expect(screen.getByText(/automatically retries when internet access returns/i)).toBeTruthy();
    await fireEvent.press(screen.getByText('Retry cloud sync'));
    expect(mockSyncNow).toHaveBeenCalledTimes(1);
  });

  test('requires confirmation before destructive local actions', async () => {
    const screen = await render(<SettingsScreen />);
    expect(screen.queryByText('Reset learning progress')).toBeNull();
    await fireEvent.press(screen.getByText('DESTRUCTIVE LOCAL DATA'));
    await fireEvent.press(screen.getByText('Reset learning progress'));
    expect(screen.getByText('Reset learning progress?')).toBeTruthy();
    await fireEvent.press(screen.getByText('Cancel'));
    await fireEvent.press(screen.getByText('Erase sandbox workspace'));
    expect(screen.getByText('Erase sandbox workspace?')).toBeTruthy();
  });

  test('enables clearly labeled development test access', async () => {
    const screen = await render(<SettingsScreen />);
    expect(screen.getByText('DEVELOPMENT TEST ACCESS')).toBeTruthy();
    expect(screen.getByText(/every Network Operations module/i)).toBeTruthy();
    expect(screen.getByText('DISABLED / DEVELOPMENT ONLY')).toBeTruthy();
    await fireEvent.press(screen.getByText('Enable test access'));
    expect(mockAuthState.setTestProEnabled).toHaveBeenCalledWith(true);
  });
});
