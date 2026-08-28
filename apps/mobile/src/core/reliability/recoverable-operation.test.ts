import { describeOperationError, OperationTimeoutError, withTimeout } from '@/core/reliability/recoverable-operation';

describe('recoverable operations', () => {
  test('bounds a stalled external request', async () => {
    jest.useFakeTimers();
    const operation = withTimeout(new Promise<string>(() => undefined), 100);
    jest.advanceTimersByTime(100);
    await expect(operation).rejects.toBeInstanceOf(OperationTimeoutError);
    jest.useRealTimers();
  });

  test.each([
    ['request timed out', 'timeout'],
    ['Network request failed', 'offline'],
    ['User canceled', 'cancellation'],
    ['Invalid password', 'validation'],
    ['Server unavailable', 'service'],
  ])('classifies %s as %s', (message, kind) => {
    expect(describeOperationError(new Error(message)).kind).toBe(kind);
  });

  test('does not expose unknown service messages', () => {
    expect(describeOperationError(new Error('database policy cms_internal failed'), 'Please try again later.').message).toBe('Please try again later.');
  });
});
