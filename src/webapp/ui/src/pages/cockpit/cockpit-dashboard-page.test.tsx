import { describe, expect, it } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterTestWrapper } from '@/test/router-test-wrapper';
import { Route, Routes } from 'react-router-dom';
import CockpitDashboardPage from './cockpit-dashboard-page';

async function renderPage() {
  let view: ReturnType<typeof render> | null = null;
  await act(async () => {
    view = render(
      <RouterTestWrapper initialEntries={['/cockpit']}>
        <Routes>
          <Route path="/cockpit" element={<CockpitDashboardPage />} />
        </Routes>
      </RouterTestWrapper>
    );
  });
  return view;
}

describe('CockpitDashboardPage', () => {
  it('renders the unified intervention console', async () => {
    await renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('cockpit-dashboard-page')).toBeInTheDocument();
    });

    expect(screen.getByTestId('intervention-console')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel run/i })).toBeInTheDocument();
  });

  it('supports arrow-key navigation between cockpit tabs', async () => {
    const user = userEvent.setup();
    await renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('cockpit-dashboard-page')).toBeInTheDocument();
    });

    const healthTab = screen.getByRole('tab', { name: /health/i });
    healthTab.focus();
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: /dependencies/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });
});
