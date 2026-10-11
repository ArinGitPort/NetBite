import { describe, expect, it } from 'vitest';

import { redactErrorEvent } from '@/lib/error-reporting';

describe('error reporting privacy', () => {
  it('removes student answers, credentials, routes, and user identifiers before reporting', () => {
    const event = redactErrorEvent({
      user: { email: 'student@example.com' },
      request: { url: '/submit?token=secret', data: { answer: 'A' } },
      breadcrumbs: [{ message: 'student selected A' }],
      contexts: { form: { password: 'secret' } },
      extra: { answer: 'A' },
      tags: { studentId: 'private' },
      fingerprint: ['student@example.com'],
      message: 'password=secret',
      exception: { values: [{ value: 'Bad answer A', stacktrace: { frames: [{ filename: 'assessment.ts', lineno: 10 }] } }] },
    });
    expect(JSON.stringify(event)).not.toMatch(/student@example.com|secret|answer A|student selected A|private/i);
    expect(event.exception?.values?.[0].value).toBe('Application error');
    expect(event.exception?.values?.[0].stacktrace.frames).toHaveLength(1);
  });
});
