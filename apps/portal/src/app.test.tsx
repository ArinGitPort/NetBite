import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ configured: false, supabase: undefined }));

import { App, getNavigationForAccess } from '@/app';
import { isPathAllowedForAccess, normalizeLegacyHash } from '@/app/navigation';

describe('admin application', () => {
  test('shows safe configuration guidance without credentials', () => {
    render(<App />);
    expect(screen.getByText('Admin services are not connected')).toBeInTheDocument();
    expect(screen.queryByText(/sb_publishable_/)).not.toBeInTheDocument();
  });

  test('keeps administrator and instructor workspaces separate', () => {
    const administratorViews = getNavigationForAccess('administrator').map(({ id }) => id);
    const instructorViews = getNavigationForAccess('instructor').map(({ id }) => id);

    expect(administratorViews).toContain('instructors');
    expect(administratorViews).toContain('curriculum');
    expect(administratorViews).not.toContain('workshops');
    expect(administratorViews).not.toContain('gradebook');

    expect(instructorViews).toEqual([
      'instructor-dashboard',
      'workshops',
      'workshop-assessments',
      'classes',
      'gradebook',
    ]);
    expect(instructorViews).not.toContain('instructors');
    expect(instructorViews).not.toContain('releases');
    expect(isPathAllowedForAccess('administrator', '/admin/curriculum')).toBe(true);
    expect(isPathAllowedForAccess('administrator', '/instructor/workshops')).toBe(false);
    expect(isPathAllowedForAccess('instructor', '/instructor/classes')).toBe(true);
    expect(isPathAllowedForAccess('instructor', '/instructor/overview')).toBe(true);
    expect(isPathAllowedForAccess('instructor', '/admin/overview')).toBe(false);
  });

  test('maps old hash links to their current routes', () => {
    expect(normalizeLegacyHash('#audit')).toBe('/admin/activity');
    expect(normalizeLegacyHash('#workshops')).toBe('/instructor/workshops');
    expect(normalizeLegacyHash('#/admin/media')).toBe('/admin/media');
  });
});
