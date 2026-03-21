/**
 * Dashboard page tests — Issue #244 (S9G-37)
 */
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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
  it('renders shared page header and context strip guidance', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    });

    expect(screen.getAllByText(/active sessions/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/attention items/i).length).toBeGreaterThan(0);
  });

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
      const quickLinks = screen.getByLabelText(/quick links/i);
      expect(within(quickLinks).getByText('Commands')).toBeInTheDocument();
      expect(within(quickLinks).getByText('Pipeline')).toBeInTheDocument();
      expect(within(quickLinks).getByText('Questionnaires')).toBeInTheDocument();
      expect(within(quickLinks).getByText('Decisions')).toBeInTheDocument();
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
