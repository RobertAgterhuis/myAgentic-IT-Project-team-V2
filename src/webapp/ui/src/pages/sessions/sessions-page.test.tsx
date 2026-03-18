/**
 * Sessions page tests — M15 / Issue #M15-028
 */
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import SessionsPage from './sessions-page';
import { RouterTestWrapper } from '@/test/router-test-wrapper';

function renderPage() {
  return render(
    <RouterTestWrapper initialEntries={['/sessions']}>
      <SessionsPage />
    </RouterTestWrapper>
  );
}

describe('SessionsPage', () => {
  it('renders the page heading', async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: /sessions turn orchestration into reviewable evidence/i,
        })
      ).toBeInTheDocument();
    });
  });

  it('renders session motifs for traceability, agent ownership, and intervention', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/sessions preserve traceability/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/execution remains attributable/i)).toBeInTheDocument();
    expect(screen.getByText(/escalated work stays recoverable/i)).toBeInTheDocument();
  });

  it('renders page container', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('sessions-page')).toBeInTheDocument();
    });
  });

  it('renders guidance explaining how to use sessions', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/how to use sessions/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/recommended next step/i)).toBeInTheDocument();
  });

  it('shows session cards from mock data', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('TestProject')).toBeInTheDocument();
    });
  });

  it('shows session status badge', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('active')).toBeInTheDocument();
    });
  });

  it('shows session flow and phase', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/CREATE/)).toBeInTheDocument();
    });
  });
});
