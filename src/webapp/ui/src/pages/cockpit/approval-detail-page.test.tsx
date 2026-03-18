import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import ApprovalDetailPage from './approval-detail-page';
import { RouterTestWrapper } from '@/test/router-test-wrapper';
import { server } from '@/test/msw-server';

function renderPage(id = 'apr-001') {
  return render(
    <RouterTestWrapper initialEntries={[`/cockpit/approvals/${id}`]}>
      <Routes>
        <Route path="/cockpit/approvals/:id" element={<ApprovalDetailPage />} />
      </Routes>
    </RouterTestWrapper>
  );
}

const approvalDetailResponse = {
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
    related_artifacts: ['BusinessDocs/decisions/adr-m29-auth-architecture.md'],
  },
};

describe('ApprovalDetailPage', () => {
  it('renders the page container', async () => {
    server.use(
      http.get('/api/v1/approvals/:id/detail', () => HttpResponse.json(approvalDetailResponse))
    );

    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('approval-detail-page')).toBeInTheDocument();
    });
  });

  it('renders the approval review heading', async () => {
    server.use(
      http.get('/api/v1/approvals/:id/detail', () => HttpResponse.json(approvalDetailResponse))
    );

    renderPage();
    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: /resolve a governed checkpoint with full approval context/i,
        })
      ).toBeInTheDocument();
    });
  });

  it('renders approval context and standardized signals', async () => {
    server.use(
      http.get('/api/v1/approvals/:id/detail', () => HttpResponse.json(approvalDetailResponse))
    );

    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/approval request/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText('Governed').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Needs human input').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/review the gate, risk context, artifacts, and recommendation/i)
    ).toBeInTheDocument();
  });
});
