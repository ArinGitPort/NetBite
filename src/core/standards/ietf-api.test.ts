import { fetchRfcMetadata, parseRfcMetadataResponse, RfcRequestError } from '@/core/standards/ietf-api';

const validResponse = {
  name: 'rfc826',
  pages: 10,
  title: 'An Ethernet Address Resolution Protocol',
  abstract: 'Maps protocol addresses to local network addresses.',
  state: 'Published',
  std_level: 'Internet Standard',
  authors: [{ name: 'D. Plummer', affiliation: 'MIT' }],
  rev_history: [{ name: 'rfc826', rev: 'rfc826', published: '1982-11-01T08:00:00+00:00', url: '/doc/rfc826/' }],
};

function response(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: jest.fn().mockResolvedValue(body) } as unknown as Response;
}

describe('IETF Datatracker API', () => {
  test('parses the official metadata fields used by the screen', () => {
    expect(parseRfcMetadataResponse(validResponse)).toMatchObject({
      name: 'rfc826',
      title: validResponse.title,
      state: 'Published',
      standardLevel: 'Internet Standard',
      pageCount: 10,
      authors: [{ name: 'D. Plummer', affiliation: 'MIT' }],
      officialUrl: 'https://datatracker.ietf.org/doc/rfc826/',
    });
  });

  test('performs a bounded GET and parses JSON', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(response(validResponse));
    await expect(fetchRfcMetadata('RFC826', { fetchImpl })).resolves.toMatchObject({ name: 'rfc826' });
    expect(fetchImpl).toHaveBeenCalledWith('https://datatracker.ietf.org/doc/rfc826/doc.json', expect.objectContaining({ method: 'GET', signal: expect.any(Object) }));
  });

  test.each([
    ['invalid selection', 'not-rfc', undefined, 'invalid-selection'],
    ['404', 'rfc826', response({}, 404), 'not-found'],
    ['server error', 'rfc826', response({}, 503), 'http'],
    ['malformed data', 'rfc826', response({ title: 'Incomplete' }), 'malformed'],
  ])('reports %s without returning invalid data', async (_label, documentName, result, kind) => {
    const fetchImpl = jest.fn().mockResolvedValue(result);
    await expect(fetchRfcMetadata(documentName, { fetchImpl })).rejects.toMatchObject({ kind });
  });

  test('distinguishes invalid JSON, network failure, and timeout', async () => {
    const invalidJson = jest.fn().mockResolvedValue({ ok: true, status: 200, json: jest.fn().mockRejectedValue(new SyntaxError()) });
    await expect(fetchRfcMetadata('rfc826', { fetchImpl: invalidJson as typeof fetch })).rejects.toMatchObject({ kind: 'malformed' });
    await expect(fetchRfcMetadata('rfc826', { fetchImpl: jest.fn().mockRejectedValue(new TypeError('network')) })).rejects.toMatchObject({ kind: 'offline' });

    jest.useFakeTimers();
    const pending = fetchRfcMetadata('rfc826', {
      timeoutMs: 20,
      fetchImpl: jest.fn((_url, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new RfcRequestError('timeout', 'aborted'))))) as typeof fetch,
    });
    jest.advanceTimersByTime(20);
    await expect(pending).rejects.toMatchObject({ kind: 'timeout' });
    jest.useRealTimers();
  });
});
