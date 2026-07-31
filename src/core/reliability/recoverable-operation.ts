export type RecoverableFailureKind = 'timeout' | 'offline' | 'cancellation' | 'validation' | 'service';

export type RecoverableOperationResult<T> =
  | { ok: true; value: T }
  | { ok: false; kind: RecoverableFailureKind; message: string };

export class OperationTimeoutError extends Error {
  constructor(message = 'The service took too long to respond.') {
    super(message);
    this.name = 'OperationTimeoutError';
  }
}

export async function withTimeout<T>(operation: Promise<T>, timeoutMs = 8_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new OperationTimeoutError()), timeoutMs); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function describeOperationError(error: unknown, fallback = 'The service is temporarily unavailable.'): { ok: false; kind: RecoverableFailureKind; message: string } {
  const message = error instanceof Error ? error.message : fallback;
  const normalized = message.toLowerCase();
  if (error instanceof OperationTimeoutError || normalized.includes('timeout') || normalized.includes('timed out')) return { ok: false, kind: 'timeout', message: 'The request timed out. Local learning is still available.' };
  if (normalized.includes('cancel')) return { ok: false, kind: 'cancellation', message: 'The request was canceled.' };
  if (normalized.includes('network') || normalized.includes('fetch') || normalized.includes('dns') || normalized.includes('offline')) return { ok: false, kind: 'offline', message: 'No cloud connection is available. Local learning is still available.' };
  if (normalized.includes('invalid') || normalized.includes('required') || normalized.includes('password')) return { ok: false, kind: 'validation', message };
  return { ok: false, kind: 'service', message: message || fallback };
}
