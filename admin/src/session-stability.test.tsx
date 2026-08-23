import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const authHarness = vi.hoisted(() => ({
  callback: undefined as undefined | ((event: string, session: unknown) => void),
  session: {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: 'instructor-1',
      email: 'instructor@netbite.local',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2026-08-24T00:00:00.000Z',
    },
  },
}));

const apiHarness = vi.hoisted(() => ({
  getRoles: vi.fn(async () => ['editor', 'publisher']),
  getAuditLog: vi.fn(async () => []),
}));

vi.mock('./lib/supabase', () => ({
  configured: true,
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: authHarness.session } })),
      onAuthStateChange: vi.fn((callback) => {
        authHarness.callback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      signOut: vi.fn(),
    },
  },
}));

vi.mock('./lib/content-api', () => ({
  getRoles: apiHarness.getRoles,
  getAuditLog: apiHarness.getAuditLog,
}));

import { App } from './app';

describe('admin session stability', () => {
  beforeEach(() => {
    window.location.hash = '#audit';
    apiHarness.getRoles.mockClear();
    apiHarness.getAuditLog.mockClear();
  });

  test('keeps the selected section mounted after a same-user token refresh', async () => {
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Audit history' }),
    ).toBeInTheDocument();

    await act(async () => {
      authHarness.callback?.('TOKEN_REFRESHED', {
        ...authHarness.session,
        access_token: 'refreshed-access-token',
        user: { ...authHarness.session.user },
      });
    });

    await waitFor(() => expect(apiHarness.getRoles).toHaveBeenCalledTimes(1));
    expect(
      screen.getByRole('heading', { name: 'Audit history' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Loading instructor workspace'),
    ).not.toBeInTheDocument();
  });
});
