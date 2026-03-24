import { describe, expect, it } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
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
});
