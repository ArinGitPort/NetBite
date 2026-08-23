import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

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
  signOut: vi.fn(async () => ({ error: null })),
}));

const apiHarness = vi.hoisted(() => ({
  getRoles: vi.fn(async () => ['editor', 'publisher']),
  getAuditLog: vi.fn(async () => []),
  getCurriculum: vi.fn(async () => ({
    courses: [],
    chapters: [
      { id: '1', definition: { numberLabel: '01', title: 'Introduction to Networks' } },
    ],
    lessons: [
      {
        id: 'connecting-devices',
        chapter_id: '1',
        requirement: 'core',
        archived: false,
        draft: { title: 'What is a computer network?' },
      },
    ],
    quiz: [
      {
        id: 'q1',
        chapter_id: '1',
        lesson_id: 'connecting-devices',
        position: 1,
        draft: {
          prompt: 'Which situation describes a computer network?',
          answers: ['Connected devices', 'Disconnected devices', 'One application'],
          correctAnswerIndex: 0,
          explanation: 'Connected devices need a communication path.',
        },
      },
      {
        id: 'q2',
        chapter_id: '1',
        lesson_id: 'connecting-devices',
        position: 2,
        draft: {
          prompt: 'Why might a classroom build a network?',
          answers: ['Share resources', 'Remove cables', 'Disable communication'],
          correctAnswerIndex: 0,
          explanation: 'Networks let devices share resources.',
        },
      },
    ],
    flashcards: [],
  })),
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
      signOut: authHarness.signOut,
    },
  },
}));

vi.mock('./lib/content-api', () => ({
  getRoles: apiHarness.getRoles,
  getAuditLog: apiHarness.getAuditLog,
  getCurriculum: apiHarness.getCurriculum,
}));

import { App } from './app';

describe('admin session stability', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    window.location.hash = '#audit';
    apiHarness.getRoles.mockClear();
    apiHarness.getAuditLog.mockClear();
    apiHarness.getCurriculum.mockClear();
    authHarness.signOut.mockClear();
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

  test('signs out through the account footer', async () => {
    render(<App />);

    const signOut = await screen.findByRole('button', { name: 'Sign out' });
    fireEvent.click(signOut);

    await waitFor(() => expect(authHarness.signOut).toHaveBeenCalledTimes(1));
    expect(signOut).toBeDisabled();
    expect(signOut).toHaveTextContent('Signing out...');
  });

  test('uses a focused assessment navigator with an alternate all-items view', async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Assessments' }));
    expect(await screen.findByRole('button', { name: 'FOCUSED' })).toHaveClass('active');
    expect(screen.getAllByLabelText('Scenario question')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'SAVE CHANGES' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete quiz question' })).toHaveTextContent(
      'DELETE QUESTION',
    );

    fireEvent.click(screen.getByRole('button', { name: /Q02.*Why might a classroom/i }));
    expect(screen.getByLabelText('Scenario question')).toHaveValue(
      'Why might a classroom build a network?',
    );

    fireEvent.click(screen.getByRole('button', { name: 'ALL ITEMS' }));
    expect(screen.getAllByLabelText('Scenario question')).toHaveLength(2);
  });
});
