import { describe, expect, test, vi } from 'vitest';

vi.mock('./lib/supabase', () => ({ supabase: undefined }));

import { mapAdminServiceError } from './lib/content-api';

describe('administrator service errors', () => {
  test('does not expose an unstructured service error', () => {
    const result = mapAdminServiceError(
      new Error('relation content_admins does not exist at postgresql://internal'),
      'The action could not be completed.',
    );
    expect(result.message).toBe('The action could not be completed.');
    expect(result.message).not.toMatch(/content_admins|postgresql/i);
  });

  test('maps approved error codes to fixed messages', () => {
    expect(mapAdminServiceError({ error: { code: 'AUTH_REQUIRED', message: 'raw service text' } })).toEqual({
      code: 'AUTH_REQUIRED',
      message: 'Sign in to continue.',
    });
  });

  test('does not trust an unknown structured message', () => {
    expect(mapAdminServiceError({ error: { code: 'UNKNOWN', message: 'internal table failed' } }).message).toBe(
      'The action could not be completed.',
    );
  });
});
