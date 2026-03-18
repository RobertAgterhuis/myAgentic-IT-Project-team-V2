/**
 * Overview page tests — M15-039
 */
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import OverviewPage from './overview-page';
import { RouterTestWrapper } from '@/test/router-test-wrapper';

function renderPage() {
  return render(
    <RouterTestWrapper initialEntries={['/']}>
      <OverviewPage />
    </RouterTestWrapper>
  );
}

describe('OverviewPage', () => {
  it('renders the page container', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('overview-page')).toBeInTheDocument();
    });
  });

  it('renders page heading', async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: /see governed delivery, live agent motion, and human checkpoints in one view/i,
        })
      ).toBeInTheDocument();
    });
  });

  it('renders standardized control signal language', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Governed').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getAllByText('Needs human input').length).toBeGreaterThanOrEqual(1);
  });

  it('renders active session section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText(/active session/i)).toBeInTheDocument();
    });
  });

  it('renders session status with active session hero', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText(/session status/i)).toBeInTheDocument();
    });
  });

  it('renders phase timeline when session exists', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByLabelText(/phase timeline/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders agent activity when agents exist', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByLabelText(/agent activity/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders open decisions section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText(/open decisions/i)).toBeInTheDocument();
    });
  });

  it('renders latest artifacts section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText(/latest artifacts/i)).toBeInTheDocument();
    });
  });

  it('renders system health when data exists', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText(/system health/i)).toBeInTheDocument();
    });
  });

  it('renders health cards', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Code Quality')).toBeInTheDocument();
      expect(screen.getByText('Test Coverage')).toBeInTheDocument();
    });
  });

  it('renders open decision entries from mock data', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('HIGH')).toBeInTheDocument();
    });
  });

  it('shows session project name in status', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText(/TestProject/).length).toBeGreaterThanOrEqual(1);
    });
  });
});
