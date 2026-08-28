export interface PersistedStoreHydrationTask {
  id: string;
  hydrate: () => Promise<void> | void;
  hasHydrated?: () => boolean;
}

export interface StorageHydrationResult {
  status: 'ready' | 'failed';
  attempts: number;
  failedStoreIds: string[];
}

interface StorageHydrationOptions {
  attempts?: number;
  timeoutMs?: number;
  retryDelayMs?: number;
}

class HydrationTimeoutError extends Error {
  constructor(storeId: string) {
    super(`Hydration timed out for ${storeId}.`);
    this.name = 'HydrationTimeoutError';
  }
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function withTimeout(task: PersistedStoreHydrationTask, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.resolve(task.hydrate()),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new HydrationTimeoutError(task.id)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

/**
 * Hydrates stores one at a time because every native store shares Expo SQLite's
 * key-value database. A short retry absorbs transient database-open races while
 * keeping genuinely unavailable storage bounded and recoverable.
 */
export async function hydratePersistedStores(
  tasks: PersistedStoreHydrationTask[],
  options: StorageHydrationOptions = {},
): Promise<StorageHydrationResult> {
  const maximumAttempts = Math.max(1, options.attempts ?? 2);
  const timeoutMs = Math.max(1, options.timeoutMs ?? 6_000);
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? 300);
  let pending = tasks;

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    const failed: PersistedStoreHydrationTask[] = [];

    for (const task of pending) {
      if (task.hasHydrated?.()) continue;
      try {
        await withTimeout(task, timeoutMs);
      } catch {
        failed.push(task);
      }
    }

    if (failed.length === 0) {
      return { status: 'ready', attempts: attempt, failedStoreIds: [] };
    }

    if (attempt === maximumAttempts) {
      return { status: 'failed', attempts: attempt, failedStoreIds: failed.map(({ id }) => id) };
    }

    pending = failed;
    if (retryDelayMs > 0) await wait(retryDelayMs);
  }

  return { status: 'failed', attempts: maximumAttempts, failedStoreIds: pending.map(({ id }) => id) };
}
