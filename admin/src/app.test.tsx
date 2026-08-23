import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

vi.mock('./lib/supabase', () => ({ configured: false, supabase: undefined }));

import { App } from './app';

describe('admin application', () => {
  test('shows safe configuration guidance without credentials', () => {
    render(<App />);
    expect(screen.getByText('Connect the admin portal')).toBeInTheDocument();
    expect(screen.getByText(/VITE_SUPABASE_PUBLISHABLE_KEY/)).toBeInTheDocument();
  });
});
