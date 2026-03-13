import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Outlet, useLocation } from 'react-router-dom';
import { AppLayout } from './app-layout';
import { RouterTestWrapper } from '@/test/router-test-wrapper';

// Minimal wrapper that renders AppLayout with an Outlet child showing location
function LocationDisplay() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname}</div>;
}

function renderLayout(initialEntries: string[] = ['/']) {
  // We render AppLayout directly inside a MemoryRouter with a child route
  return render(
    <RouterTestWrapper initialEntries={initialEntries}>
      <AppLayout />
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
    renderLayout(['/command-center']);
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
});
