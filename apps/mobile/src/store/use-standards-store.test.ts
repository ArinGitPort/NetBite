import { parseRfcMetadataResponse } from '@/core/standards/ietf-api';
import { useStandardsStore, validateRfcCache } from '@/store/use-standards-store';

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined) },
}));

const raw = {
  name: 'rfc826', pages: 10, title: 'ARP', abstract: 'Address resolution.', state: 'Published',
  authors: [{ name: 'D. Plummer' }], rev_history: [{ name: 'rfc826', published: '1982-11-01T08:00:00+00:00' }],
};

describe('standards cache store', () => {
  beforeEach(() => useStandardsStore.setState({ cache: {} }));

  test('stores and retrieves a separately persisted valid record', () => {
    const metadata = parseRfcMetadataResponse(raw);
    const entry = useStandardsStore.getState().cacheMetadata(metadata, '2026-08-12T00:00:00.000Z');
    expect(entry.metadata.name).toBe('rfc826');
    expect(useStandardsStore.getState().getCachedMetadata('RFC826')).toEqual(entry);
  });

  test('drops malformed cache records instead of replacing a valid model', () => {
    const valid = { metadata: parseRfcMetadataResponse(raw), retrievedAt: '2026-08-12T00:00:00.000Z' };
    expect(validateRfcCache({ rfc826: valid, broken: { metadata: {}, retrievedAt: 'never' } })).toEqual({ rfc826: valid });
  });
});
