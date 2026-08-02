import { hydratePersistedStores } from './storage-hydration';

describe('hydratePersistedStores', () => {
  test('hydrates shared-storage tasks sequentially', async () => {
    const order: string[] = [];
    let active = 0;
    const task = (id: string) => ({
      id,
      hydrate: async () => {
        active += 1;
        expect(active).toBe(1);
        order.push(`${id}:start`);
        await Promise.resolve();
        order.push(`${id}:finish`);
        active -= 1;
      },
    });

    const result = await hydratePersistedStores([task('learning'), task('sandbox')], { retryDelayMs: 0 });

    expect(result).toEqual({ status: 'ready', attempts: 1, failedStoreIds: [] });
    expect(order).toEqual(['learning:start', 'learning:finish', 'sandbox:start', 'sandbox:finish']);
  });

  test('retries only a transiently failed store', async () => {
    const learning = jest.fn().mockRejectedValueOnce(new Error('database opening')).mockResolvedValue(undefined);
    const sandbox = jest.fn().mockResolvedValue(undefined);

    const result = await hydratePersistedStores([
      { id: 'learning', hydrate: learning },
      { id: 'sandbox', hydrate: sandbox },
    ], { retryDelayMs: 0 });

    expect(result).toEqual({ status: 'ready', attempts: 2, failedStoreIds: [] });
    expect(learning).toHaveBeenCalledTimes(2);
    expect(sandbox).toHaveBeenCalledTimes(1);
  });

  test('reports the store that remains unavailable', async () => {
    const result = await hydratePersistedStores([
      { id: 'learning', hydrate: () => Promise.reject(new Error('unavailable')) },
    ], { attempts: 2, retryDelayMs: 0 });

    expect(result).toEqual({ status: 'failed', attempts: 2, failedStoreIds: ['learning'] });
  });

  test('does not rehydrate a store that already finished', async () => {
    const hydrate = jest.fn();
    const result = await hydratePersistedStores([
      { id: 'learning', hydrate, hasHydrated: () => true },
    ]);

    expect(result.status).toBe('ready');
    expect(hydrate).not.toHaveBeenCalled();
  });
});
