/**
 * Approval Center page tests — UI-011 / UI-021 Phase 4
 */
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import ApprovalCenterPage from './approval-center-page';
import { RouterTestWrapper } from '@/test/router-test-wrapper';
import { server } from '@/test/msw-server';

const mockApprovalsResponse = {
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
    {
      id: 'apr-003',
      entity_id: 'gate-003',
      gate_id: 'gate.phase-3',
      stage: 'PHASE_3',
      requested_by: 'orchestrator',
      requested_at: '2026-03-18T08:00:00Z',
      required_role: 'QA Lead',
      status: 'REJECTED',
    },
  ],
  count: 3,
};

const mockApprovalDetailResponse = {
  approval: {
    id: 'apr-001',
    entity_id: 'gate-001',
    gate_id: 'gate.phase-1',
    stage: 'PHASE_1',
    requested_by: 'orchestrator',
    requested_at: '2026-03-18T10:00:00Z',
    required_role: 'Product Owner',
    status: 'PENDING',
    context: 'Phase 1 produced blocking violations that need review.',
    risk_assessment: 'Two blocking rules were violated.',
    recommended_action: 'Review the violations and add rationale before approving.',
    deliverable_quality: {
      score: 78,
      approvalSignal: 'review',
      summary: 'Manual review should focus on checklist completion.',
      source_artifact: 'BusinessDocs/decisions/adr-001.md',
      metrics: [
        {
          id: 'contract',
          label: 'Contract compliance',
          score: 100,
          detail: 'Contract validation passed.',
        },
      ],
    },
    related_artifacts: ['BusinessDocs/decisions/adr-001.md'],
  },
};

function mockApprovalData() {
  server.use(
    http.get('/api/v1/approvals', () => HttpResponse.json(mockApprovalsResponse)),
    http.get('/api/v1/approvals/:id/detail', () => HttpResponse.json(mockApprovalDetailResponse)),
    http.post('/api/v1/approvals/:id/approve', () =>
      HttpResponse.json({ ok: true, id: 'apr-001', action: 'APPROVED' })
    ),
    http.post('/api/v1/approvals/:id/reject', () =>
      HttpResponse.json({ ok: true, id: 'apr-001', action: 'REJECTED' })
    )
  );
}

function renderPage() {
  return render(
    <RouterTestWrapper initialEntries={['/approvals']}>
      <ApprovalCenterPage />
    </RouterTestWrapper>
  );
}

describe('ApprovalCenterPage', () => {
  it('renders the page container', async () => {
    mockApprovalData();
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('approval-center-page')).toBeInTheDocument();
    });
  });

  it('renders the Approval Center heading', async () => {
    mockApprovalData();
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /approval center/i })).toBeInTheDocument();
    });
  });

  it('renders the page help strip', async () => {
    mockApprovalData();
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('page-help-strip-approvals')).toBeInTheDocument();
    });
  });

  it('renders context strip with queue metrics', async () => {
    mockApprovalData();
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('approval-center-page')).toBeInTheDocument();
    });
    expect(screen.getAllByText(/pending/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders approval rows after data loads', async () => {
    mockApprovalData();
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('approval-row-apr-001')).toBeInTheDocument();
    });
  });

  it('renders all three approval rows', async () => {
    mockApprovalData();
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('approval-row-apr-001')).toBeInTheDocument();
      expect(screen.getByTestId('approval-row-apr-002')).toBeInTheDocument();
      expect(screen.getByTestId('approval-row-apr-003')).toBeInTheDocument();
    });
  });

  it('clicking an approval row opens the decision panel', async () => {
    const user = userEvent.setup();
    mockApprovalData();
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('approval-row-apr-001')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('approval-row-apr-001'));
    await waitFor(() => {
      expect(screen.getByTestId('approval-decision-panel')).toBeInTheDocument();
    });
    expect(screen.getByText(/deliverable quality/i)).toBeInTheDocument();
  });

  it('filters by status — shows only PENDING when filter is set', async () => {
    const user = userEvent.setup();
    mockApprovalData();
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('approval-row-apr-001')).toBeInTheDocument();
    });
    // Click the PENDING filter button
    const pendingButton = screen.getByRole('button', { name: /^pending$/i });
    await user.click(pendingButton);
    await waitFor(() => {
      expect(screen.getByTestId('approval-row-apr-001')).toBeInTheDocument();
      expect(screen.queryByTestId('approval-row-apr-002')).not.toBeInTheDocument();
    });
  });

  it('renders filter group with status buttons', async () => {
    mockApprovalData();
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('approval-center-page')).toBeInTheDocument();
    });
    const filterGroup = screen.getByRole('group', { name: /filter approvals by status/i });
    expect(filterGroup).toBeInTheDocument();
  });

  it('shows empty state when no approvals match filter', async () => {
    const user = userEvent.setup();
    server.use(http.get('/api/v1/approvals', () => HttpResponse.json({ approvals: [], count: 0 })));
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('approval-center-page')).toBeInTheDocument();
    });
    // Click the PENDING filter button — empty list shows empty state
    const pendingButton = screen.getByRole('button', { name: /^pending$/i });
    await user.click(pendingButton);
    expect(screen.getByText(/no approvals/i)).toBeInTheDocument();
  });
});
