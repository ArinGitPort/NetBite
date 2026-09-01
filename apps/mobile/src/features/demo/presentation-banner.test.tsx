import { cleanup, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { PresentationBanner } from '@/features/demo/presentation-banner';
import { usePresentationStore } from '@/store/use-presentation-store';

jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() } }));

describe('PresentationBanner', () => {
  afterEach(() => {
    cleanup();
    usePresentationStore.setState({ active: false, snapshot: undefined });
  });

  test('keeps the restore action at the mobile touch-target minimum', async () => {
    usePresentationStore.setState({ active: true });
    const screen = await render(<PresentationBanner />);
    const restore = screen.getByRole('button', { name: 'RESTORE MY DATA' });
    expect(StyleSheet.flatten(restore.props.style).minHeight).toBeGreaterThanOrEqual(44);
  });
});
