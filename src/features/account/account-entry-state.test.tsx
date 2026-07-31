import { fireEvent, render } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { AuthProvider, useAuth } from '@/features/account/auth-context';

jest.mock('@/services/supabase', () => ({
  createSessionFromUrl: jest.fn(),
  isCloudConfigured: false,
  supabase: undefined,
}));

function AccountEntryProbe() {
  const { accountEntryResolved, completeGuestEntry, resetAccountEntry } = useAuth();
  return <>
    <Text>{accountEntryResolved ? 'RESOLVED' : 'REQUIRED'}</Text>
    <Pressable accessibilityRole="button" onPress={completeGuestEntry}><Text>COMPLETE</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={resetAccountEntry}><Text>RESET</Text></Pressable>
  </>;
}

describe('account entry preference', () => {
  beforeEach(() => localStorage.removeItem('netbite-account-entry-v1'));

  test('persists a guest choice and restores it in a new provider', async () => {
    const first = await render(<AuthProvider><AccountEntryProbe /></AuthProvider>);
    expect(first.getByText('REQUIRED')).toBeTruthy();
    await fireEvent.press(first.getByText('COMPLETE'));
    expect(first.getByText('RESOLVED')).toBeTruthy();
    await first.unmount();

    const restored = await render(<AuthProvider><AccountEntryProbe /></AuthProvider>);
    expect(restored.getByText('RESOLVED')).toBeTruthy();
  });

  test('reset returns the next launch to account choices', async () => {
    localStorage.setItem('netbite-account-entry-v1', 'complete');
    const screen = await render(<AuthProvider><AccountEntryProbe /></AuthProvider>);
    expect(screen.getByText('RESOLVED')).toBeTruthy();
    await fireEvent.press(screen.getByText('RESET'));
    expect(screen.getByText('REQUIRED')).toBeTruthy();
    expect(localStorage.getItem('netbite-account-entry-v1')).toBeNull();
  });
});
