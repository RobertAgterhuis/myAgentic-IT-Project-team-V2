/**
 * Dashboard page tests — Issue #244 (S9G-37)
 */
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from './dashboard-page';
import { RouterTestWrapper } from '@/test/router-test-wrapper';

function renderPage() {
  return render(
    <RouterTestWrapper initialEntries={['/']}>
      <DashboardPage />
    </RouterTestWrapper>
  );
}

describe('DashboardPage', () => {
  it('renders the page container', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });
  });

  it('renders page heading', async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /governed ai sdlc mission control/i })
      ).toBeInTheDocument();
    });
  });

  it('renders mission control motifs', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/guardrails stay visible/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/agent work is observable/i)).toBeInTheDocument();
    expect(screen.getByText(/humans intervene with intent/i)).toBeInTheDocument();
  });

  it('renders health indicator section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText(/health indicators/i)).toBeInTheDocument();
    });
  });

  it('renders health cards from mock data', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Code Quality')).toBeInTheDocument();
      expect(screen.getByText('Test Coverage')).toBeInTheDocument();
      expect(screen.getByText('Build Status')).toBeInTheDocument();
      expect(screen.getByText('Deployment')).toBeInTheDocument();
    });
  });

  it('renders health status badges', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('good').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders key metrics section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText(/key metrics/i)).toBeInTheDocument();
    });
  });

  it('renders metric cards with values', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('HTTP Requests')).toBeInTheDocument();
      expect(screen.getByText('Error Rate')).toBeInTheDocument();
      expect(screen.getByText('Response Time (ms)')).toBeInTheDocument();
    });
  });

  it('renders quick links section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText(/quick links/i)).toBeInTheDocument();
    });
  });

  it('renders quick link cards', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Command Center')).toBeInTheDocument();
      expect(screen.getByText('Pipeline')).toBeInTheDocument();
      expect(screen.getByText('Questionnaires')).toBeInTheDocument();
      expect(screen.getByText('Decisions')).toBeInTheDocument();
    });
  });

  it('renders recent activity section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText(/recent activity/i)).toBeInTheDocument();
    });
  });

  it('renders activity feed entries', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/push/i)).toBeInTheDocument();
    });
  });

  it('renders quick stats section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText(/quick stats/i)).toBeInTheDocument();
    });
  });
});
