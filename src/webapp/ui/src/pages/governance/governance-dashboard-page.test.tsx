import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const defaultProvenanceResponse = {
  ok: true,
  count: 0,
  total: 0,
  page: 1,
  page_size: 20,
  items: [],
};

function mockGovernanceData(overrides?: { provenance?: unknown }) {
  server.use(
    http.get('/api/v1/approvals', () => HttpResponse.json(approvalsResponse)),
    http.get('/api/v1/cockpit/provenance', () =>
      HttpResponse.json(overrides?.provenance ?? defaultProvenanceResponse)
    )
  );
}

describe('GovernanceDashboardPage', () => {
  it('renders shared page header and context strip guidance', async () => {
    mockGovernanceData();

    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('governance-dashboard-page')).toBeInTheDocument();
    });

    expect(screen.getByText(/active tab/i)).toBeInTheDocument();
    expect(screen.getAllByText(/provenance events/i).length).toBeGreaterThan(0);
  });

  it('renders the mission-control heading', async () => {
    mockGovernanceData();

    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('governance-dashboard-page')).toBeInTheDocument();
    });
  });

  it('renders the page container', async () => {
    mockGovernanceData();

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
    mockGovernanceData();

    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/approvals stay explicit/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText('Governed').length).toBeGreaterThanOrEqual(1);
  });

  it('renders dedicated decision provenance panel', async () => {
    mockGovernanceData({
      provenance: {
        ok: true,
        count: 1,
        total: 1,
        page: 1,
        page_size: 20,
        items: [
          {
            id: 'prov-123',
            decision_type: 'human_override',
            actor_type: 'human',
            actor: 'qa-user',
            action: 'pause',
            rationale: 'Manual review required',
            source: 'orchestrator-control',
            timestamp: '2026-03-20T10:00:00.000Z',
          },
        ],
      },
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('governance-dashboard-page')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('tab', { name: /decision provenance/i }));

    await waitFor(() => {
      expect(screen.getByText(/manual review required/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/showing 1 of 1 events/i)).toBeInTheDocument();
  });
});
