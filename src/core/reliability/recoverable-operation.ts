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
  if (normalized.includes('network') || normalized.includes('fetch') || normalized.includes('dns') || normalized.includes('offline')) return { ok: false, kind: 'offline', message: 'No internet connection is available. Learning on this device still works.' };
  if (normalized.includes('invalid login') || normalized.includes('invalid credentials')) return { ok: false, kind: 'validation', message: 'Email or password is incorrect.' };
  if (normalized.includes('email not confirmed')) return { ok: false, kind: 'validation', message: 'Verify your email before signing in.' };
  if (normalized.includes('already registered') || normalized.includes('already exists')) return { ok: false, kind: 'validation', message: 'An account already uses this email address.' };
  if (normalized.includes('password')) return { ok: false, kind: 'validation', message: 'The password does not meet the requirements shown.' };
  if (normalized.includes('invalid') || normalized.includes('required')) return { ok: false, kind: 'validation', message: 'Check the highlighted information and try again.' };
  return { ok: false, kind: 'service', message: fallback };
}
