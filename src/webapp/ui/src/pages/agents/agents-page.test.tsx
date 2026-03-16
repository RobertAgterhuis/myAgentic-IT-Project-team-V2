/**
 * Agents page tests — M15 / Issue #M15-030
 */
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AgentsPage from './agents-page';
import { RouterTestWrapper } from '@/test/router-test-wrapper';

function renderPage() {
  return render(
    <RouterTestWrapper initialEntries={['/agents']}>
      <AgentsPage />
    </RouterTestWrapper>
  );
}

describe('AgentsPage', () => {
  it('renders the page heading', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /agents/i })).toBeInTheDocument();
    });
  });

  it('renders page container', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('agents-page')).toBeInTheDocument();
    });
  });

  it('renders performance overview cards', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Total Invocations')).toBeInTheDocument();
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
    });
  });

  it('renders agent list section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText(/agent list/i)).toBeInTheDocument();
    });
  });

  it('shows agent names from mock data', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Business Analyst')).toBeInTheDocument();
    });
  });

  it('shows detail panel placeholder', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/select an agent/i)).toBeInTheDocument();
    });
  });
});
