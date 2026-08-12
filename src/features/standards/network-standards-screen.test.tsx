import { fireEvent, render, waitFor } from '@testing-library/react-native';

import NetworkStandardsScreen from '@/app/standards';
import { parseRfcMetadataResponse } from '@/core/standards/ietf-api';
import { useStandardsStore } from '@/store/use-standards-store';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined) },
}));

const raw = {
  name: 'rfc826', pages: 10, title: 'An Ethernet Address Resolution Protocol',
  abstract: 'Maps protocol addresses to local network addresses.', state: 'Published', std_level: 'Internet Standard',
  authors: [{ name: 'D. Plummer', affiliation: 'MIT' }],
  rev_history: [{ name: 'rfc826', rev: 'rfc826', published: '1982-11-01T08:00:00+00:00', url: '/doc/rfc826/' }],
};

describe('network standards screen', () => {
  beforeEach(() => {
    useStandardsStore.setState({ cache: {} });
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: jest.fn().mockResolvedValue(raw) }) as jest.Mock;
  });

  test('shows parsed RFC metadata and the inspectable JSON response', async () => {
    const screen = await render(<NetworkStandardsScreen />);
    await waitFor(() => expect(screen.getByText('LIVE / VALIDATED')).toBeTruthy());
    expect(screen.getByText(raw.title)).toBeTruthy();
    expect(screen.getByText('Internet Standard')).toBeTruthy();
    await fireEvent.press(screen.getByText('JSON RESPONSE'));
    await waitFor(() => expect(screen.getByText(/"name": "rfc826"/)).toBeTruthy());
  });

  test('retains valid cached content when refresh is offline', async () => {
    useStandardsStore.getState().cacheMetadata(parseRfcMetadataResponse(raw), '2026-08-12T00:00:00.000Z');
    globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('network')) as jest.Mock;
    const screen = await render(<NetworkStandardsScreen />);
    expect(screen.getByText(raw.title)).toBeTruthy();
    await waitFor(() => expect(screen.getByText('OFFLINE FALLBACK')).toBeTruthy());
    expect(screen.getAllByText('CACHED').length).toBeGreaterThan(0);
    expect(screen.getByText(/Showing the last valid cached record/i)).toBeTruthy();
  });
});
