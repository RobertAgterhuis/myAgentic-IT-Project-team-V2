import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AppLayout } from './app-layout';
import { RouterTestWrapper } from '@/test/router-test-wrapper';
import { ThemeProvider } from '@/components/ui/theme-provider';

function renderLayout(initialEntries: string[] = ['/']) {
  // We render AppLayout directly inside a MemoryRouter with a child route
  return render(
    <RouterTestWrapper initialEntries={initialEntries}>
      <ThemeProvider>
        <AppLayout />
      </ThemeProvider>
    </RouterTestWrapper>
  );
}

describe('AppLayout', () => {
  it('renders the top navigation banner', async () => {
    renderLayout();
    await waitFor(() => {
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });
  });

  it('renders the side navigation', async () => {
    renderLayout();
    await waitFor(() => {
      expect(screen.getByLabelText('Side navigation')).toBeInTheDocument();
    });
  });

  it('renders breadcrumbs for non-root routes', async () => {
    renderLayout(['/commands']);
    await waitFor(() => {
      expect(screen.getByLabelText('Breadcrumb')).toBeInTheDocument();
    });
  });

  it('shows project name in top navigation', async () => {
    renderLayout();
    await waitFor(() => {
      expect(screen.getByText('Agentic SDLC')).toBeInTheDocument();
    });
  });

  it('renders global help icon in top navigation', async () => {
    renderLayout(['/commands']);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Help for this page' })).toBeInTheDocument();
    });
  });
});
