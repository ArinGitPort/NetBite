import { useThemeStore } from '@/store/use-theme-store';

jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() } }));

describe('theme preference store', () => {
  beforeEach(() => {
    useThemeStore.setState({ preference: 'system' });
  });

  test('defaults to system and accepts explicit appearances', () => {
    expect(useThemeStore.getState().preference).toBe('system');
    useThemeStore.getState().setPreference('light');
    expect(useThemeStore.getState().preference).toBe('light');
    useThemeStore.getState().setPreference('dark');
    expect(useThemeStore.getState().preference).toBe('dark');
  });
});
