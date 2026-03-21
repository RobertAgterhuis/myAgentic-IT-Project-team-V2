/**
 * Observability page tests — M15 / Issue #M15-032
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('ObservabilityPage', () => {
  it('renders shared page header and context strip guidance', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /observability/i })).toBeInTheDocument();
    expect(screen.getByText(/active view/i)).toBeInTheDocument();
    expect(screen.getByText(/^views$/i)).toBeInTheDocument();
  });

  it('renders the page heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /observability/i })).toBeInTheDocument();
  });

  it('renders the container', () => {
    renderPage();
    expect(screen.getByTestId('observability-page')).toBeInTheDocument();
  });

  it('renders tab bar with three tabs', () => {
    renderPage();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
  });

  it('renders Drift & KPIs tab', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /drift/i })).toBeInTheDocument();
  });

  it('renders Analytics & Velocity tab', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /analytics/i })).toBeInTheDocument();
  });

  it('renders Traceability tab', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /traceability/i })).toBeInTheDocument();
  });

  it('first tab is selected by default', () => {
    renderPage();
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('clicking a tab switches the active panel', async () => {
    const user = userEvent.setup();
    renderPage();
    const analyticsTab = screen.getByRole('tab', { name: /analytics/i });
    await user.click(analyticsTab);
    expect(analyticsTab).toHaveAttribute('aria-selected', 'true');
  });
});
