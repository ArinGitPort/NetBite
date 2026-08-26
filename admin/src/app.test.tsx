import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

vi.mock('./lib/supabase', () => ({ configured: false, supabase: undefined }));

import { App } from './app';

describe('admin application', () => {
  test('shows safe configuration guidance without credentials', () => {
    render(<App />);
    expect(screen.getByText('Admin services are not connected')).toBeInTheDocument();
    expect(screen.queryByText(/sb_publishable_/)).not.toBeInTheDocument();
  });
});
