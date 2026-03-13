/**
 * Metrics page tests — Issue #245 (S9G-38)
 */
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MetricsPage from './metrics-page';
import { RouterTestWrapper } from '@/test/router-test-wrapper';

function renderPage() {
  return render(
    <RouterTestWrapper initialEntries={['/metrics']}>
      <MetricsPage />
    </RouterTestWrapper>,
  );
}

describe('MetricsPage', () => {
  it('renders the page container', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('metrics-page')).toBeInTheDocument();
    });
  });

  it('renders page heading', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /metrics.*drift/i })).toBeInTheDocument();
    });
  });

  it('renders drift summary section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText(/drift summary/i)).toBeInTheDocument();
    });
  });

  it('renders drift summary cards', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Total Drifts')).toBeInTheDocument();
      expect(screen.getByText('Critical')).toBeInTheDocument();
      expect(screen.getByText('Warnings')).toBeInTheDocument();
      expect(screen.getByText('In Sync')).toBeInTheDocument();
    });
  });

  it('renders KPI overview section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText(/kpi overview/i)).toBeInTheDocument();
    });
  });

  it('renders pipeline progress card', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Pipeline Progress')).toBeInTheDocument();
    });
  });

  it('renders sprint overview card', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Sprint Overview')).toBeInTheDocument();
    });
  });

  it('renders time range selector', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('radiogroup', { name: /time range/i })).toBeInTheDocument();
    });
  });

  it('time range buttons work', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('radio', { name: '7d' })).toBeInTheDocument();
    });

    const btn30d = screen.getByRole('radio', { name: '30d' });
    await user.click(btn30d);
    expect(btn30d).toHaveAttribute('aria-checked', 'true');
  });

  it('shows empty state when no drifts detected', async () => {
    renderPage();
    // Mock data has 0 drifts => should show "No drift detected"
    await waitFor(() => {
      expect(screen.getByText(/no drift detected/i)).toBeInTheDocument();
    });
  });

  it('renders export buttons', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /json/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /csv/i })).toBeInTheDocument();
    });
  });

  it('export buttons are disabled when no drift data', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /json/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /csv/i })).toBeDisabled();
    });
  });

  it('renders drift details section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText(/drift details/i)).toBeInTheDocument();
    });
  });

  it('renders progress bars for phases', async () => {
    renderPage();
    await waitFor(() => {
      const bars = screen.getAllByRole('progressbar');
      expect(bars.length).toBeGreaterThanOrEqual(1);
    });
  });
});
