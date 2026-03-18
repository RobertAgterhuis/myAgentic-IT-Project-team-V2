import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import GovernanceDashboardPage from './governance-dashboard-page';
import { RouterTestWrapper } from '@/test/router-test-wrapper';
import { server } from '@/test/msw-server';

function renderPage() {
  return render(
    <RouterTestWrapper initialEntries={['/governance']}>
      <GovernanceDashboardPage />
    </RouterTestWrapper>
  );
}

const approvalsResponse = {
  approvals: [
    {
      id: 'apr-001',
      entity_id: 'gate-001',
      gate_id: 'gate.phase-1',
      stage: 'PHASE_1',
      requested_by: 'orchestrator',
      requested_at: '2026-03-18T10:00:00Z',
      required_role: 'Product Owner',
      status: 'PENDING',
    },
    {
      id: 'apr-002',
      entity_id: 'gate-002',
      gate_id: 'gate.phase-2',
      stage: 'PHASE_2',
      requested_by: 'orchestrator',
      requested_at: '2026-03-18T09:00:00Z',
      required_role: 'Architect',
      status: 'APPROVED',
    },
  ],
  count: 2,
};

describe('GovernanceDashboardPage', () => {
  it('renders the mission-control heading', async () => {
    server.use(http.get('/api/v1/approvals', () => HttpResponse.json(approvalsResponse)));

    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('governance-dashboard-page')).toBeInTheDocument();
    });
  });

  it('renders the page container', async () => {
    server.use(http.get('/api/v1/approvals', () => HttpResponse.json(approvalsResponse)));

    renderPage();
    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: /keep approvals, policy, and release discipline in one governed surface/i,
        })
      ).toBeInTheDocument();
    });
  });

  it('renders governance motifs and standardized signals', async () => {
    server.use(http.get('/api/v1/approvals', () => HttpResponse.json(approvalsResponse)));

    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/approvals stay explicit/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText('Governed').length).toBeGreaterThanOrEqual(1);
  });
});
