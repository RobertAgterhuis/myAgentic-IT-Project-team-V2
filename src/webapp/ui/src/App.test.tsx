import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '@/App';
import { TestWrapper } from '@/test/test-wrapper';

describe('App', () => {
  it('renders the app shell with navigation', async () => {
    render(<App />, { wrapper: TestWrapper });
    await waitFor(() => {
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });
  });
});
