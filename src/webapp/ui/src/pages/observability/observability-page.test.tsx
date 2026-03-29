/**
 * Observability page tests — M15 / Issue #M15-032 + UI-013 Phase 4 expansion
 */
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ObservabilityPage from './observability-page';
import { RouterTestWrapper } from '@/test/router-test-wrapper';

function renderPage() {
  return render(
    <RouterTestWrapper initialEntries={['/observability']}>
      <ObservabilityPage />
    </RouterTestWrapper>
  );
}

/** Wait for initial load to complete (PageShell isLoading spinner disappears). */
async function waitForPageLoad() {
  await waitFor(() => expect(screen.getByTestId('observability-page')).toBeInTheDocument());
}

describe('ObservabilityPage', () => {
  it('renders shared page header and context strip guidance', async () => {
    renderPage();
    await waitForPageLoad();
    expect(screen.getByRole('heading', { name: /observability/i })).toBeInTheDocument();
    expect(screen.getByText(/active view/i)).toBeInTheDocument();
    expect(screen.getByText(/^views$/i)).toBeInTheDocument();
  });

  it('renders the page heading', async () => {
    renderPage();
    await waitForPageLoad();
    expect(screen.getByRole('heading', { name: /observability/i })).toBeInTheDocument();
  });

  it('renders the container', async () => {
    renderPage();
    await waitForPageLoad();
    expect(screen.getByTestId('observability-page')).toBeInTheDocument();
  });

  it('renders tab bar with six tabs', async () => {
    renderPage();
    await waitForPageLoad();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(6);
  });

  it('renders Drift & KPIs tab', async () => {
    renderPage();
    await waitForPageLoad();
    expect(screen.getByRole('tab', { name: /drift/i })).toBeInTheDocument();
  });

  it('renders Analytics & Velocity tab', async () => {
    renderPage();
    await waitForPageLoad();
    expect(screen.getByRole('tab', { name: /analytics/i })).toBeInTheDocument();
  });

  it('renders Traceability tab', async () => {
    renderPage();
    await waitForPageLoad();
    expect(screen.getByRole('tab', { name: /traceability/i })).toBeInTheDocument();
  });

  it('renders Diff Review tab', async () => {
    renderPage();
    await waitForPageLoad();
    expect(screen.getByRole('tab', { name: /diff review/i })).toBeInTheDocument();
  });

  it('renders Alerts tab', async () => {
    renderPage();
    await waitForPageLoad();
    expect(screen.getByRole('tab', { name: /^alerts$/i })).toBeInTheDocument();
  });

  it('renders Telemetry Streams tab', async () => {
    renderPage();
    await waitForPageLoad();
    expect(screen.getByRole('tab', { name: /telemetry streams/i })).toBeInTheDocument();
  });

  it('first tab is selected by default', async () => {
    renderPage();
    await waitForPageLoad();
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('clicking a tab switches the active panel', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPageLoad();
    const analyticsTab = screen.getByRole('tab', { name: /analytics/i });
    await user.click(analyticsTab);
    expect(analyticsTab).toHaveAttribute('aria-selected', 'true');
  });

  it('supports arrow-key navigation between tabs', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPageLoad();

    const driftTab = screen.getByRole('tab', { name: /drift/i });
    driftTab.focus();
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: /analytics/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('clicking Alerts tab shows alert feed heading', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPageLoad();
    const alertsTab = screen.getByRole('tab', { name: /^alerts$/i });
    await user.click(alertsTab);
    await waitFor(() => {
      expect(screen.getByText(/all alerts/i)).toBeInTheDocument();
    });
  });

  it('clicking Telemetry Streams tab shows streams description', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPageLoad();
    const streamsTab = screen.getByRole('tab', { name: /telemetry streams/i });
    await user.click(streamsTab);
    await waitFor(() => {
      expect(
        screen.getByText(/live telemetry streams ingested from all connected agent runtimes/i)
      ).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /rag freshness/i })).toBeInTheDocument();
    expect(screen.getAllByText(/rag index freshness/i).length).toBeGreaterThan(0);
  });
});
