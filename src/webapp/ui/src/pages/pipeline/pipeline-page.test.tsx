/**
 * Pipeline page tests — Issue #240 (S9F-33)
 */
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PipelinePage from './pipeline-page';
import { RouterTestWrapper } from '@/test/router-test-wrapper';

function renderPage() {
  return render(
    <RouterTestWrapper initialEntries={['/pipeline']}>
      <PipelinePage />
    </RouterTestWrapper>,
  );
}

describe('PipelinePage', () => {
  it('renders the page heading', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /pipeline/i })).toBeInTheDocument();
    });
  });

  it('renders orchestrator status badge', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('IDLE')).toBeInTheDocument();
    });
  });

  it('renders phase cards from progress data', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Onboarding')).toBeInTheDocument();
    });
  });

  it('shows progress bar in phase card', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  it('expands phase card on click to show agents', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Onboarding')).toBeInTheDocument();
    });

    // Click on the Onboarding card
    const card = screen.getByText('Onboarding').closest('[role="button"]');
    if (card) await user.click(card);

    await waitFor(() => {
      expect(screen.getByText('Onboarding Agent')).toBeInTheDocument();
    });
  });
});
