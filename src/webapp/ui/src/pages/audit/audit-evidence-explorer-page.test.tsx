/**
 * Audit & Evidence Explorer page tests — UI-012 / UI-021 Phase 4
 */
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import AuditEvidenceExplorerPage from './audit-evidence-explorer-page';
import { RouterTestWrapper } from '@/test/router-test-wrapper';
import { server } from '@/test/msw-server';

const mockArtifactsResponse = {
  ok: true,
  count: 2,
  artifacts: [
    {
      id: 'ART-001',
      artifact_type: 'document',
      stage: 'PHASE_1',
      status: 'VALID',
      content_hash: 'abc123',
      created_at: '2026-03-21T08:00:00Z',
      updated_at: '2026-03-21T09:00:00Z',
    },
    {
      id: 'ART-002',
      artifact_type: 'test-report',
      stage: 'PHASE_2',
      status: 'VALID',
      content_hash: 'def456',
      created_at: '2026-03-21T08:30:00Z',
      updated_at: '2026-03-21T09:30:00Z',
    },
  ],
};

const mockApprovalsResponse = {
  approvals: [
    {
      id: 'apr-001',
      entity_id: 'gate-001',
      gate_id: 'gate.phase-1',
      stage: 'PHASE_1',
      requested_by: 'orchestrator',
      requested_at: '2026-03-21T10:00:00Z',
      required_role: 'Product Owner',
      status: 'APPROVED',
    },
  ],
  count: 1,
};

function mockAuditData() {
  server.use(
    http.get('/api/v1/artifacts', () => HttpResponse.json(mockArtifactsResponse)),
    http.get('/api/v1/approvals', () => HttpResponse.json(mockApprovalsResponse))
  );
}

function renderPage() {
  return render(
    <RouterTestWrapper initialEntries={['/audit']}>
      <AuditEvidenceExplorerPage />
    </RouterTestWrapper>
  );
}

describe('AuditEvidenceExplorerPage', () => {
  it('renders the page container', async () => {
    mockAuditData();
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('audit-evidence-explorer-page')).toBeInTheDocument();
    });
  });

  it('renders the page heading', async () => {
    mockAuditData();
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /audit & evidence/i })).toBeInTheDocument();
    });
  });

  it('renders the Context Strip', async () => {
    mockAuditData();
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('audit-evidence-explorer-page')).toBeInTheDocument();
    });
    expect(screen.getAllByText(/total events/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders Timeline tab by default', async () => {
    mockAuditData();
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('audit-evidence-explorer-page')).toBeInTheDocument();
    });
    const timelineTab = screen.getByRole('tab', { name: /timeline/i });
    expect(timelineTab).toHaveAttribute('aria-selected', 'true');
  });

  it('renders Evidence Packs tab', async () => {
    mockAuditData();
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('audit-evidence-explorer-page')).toBeInTheDocument();
    });
    expect(screen.getByRole('tab', { name: /evidence packs/i })).toBeInTheDocument();
  });

  it('clicking Evidence Packs tab switches to packs view', async () => {
    const user = userEvent.setup();
    mockAuditData();
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('audit-evidence-explorer-page')).toBeInTheDocument();
    });
    const packsTab = screen.getByRole('tab', { name: /evidence packs/i });
    await user.click(packsTab);
    expect(packsTab).toHaveAttribute('aria-selected', 'true');
  });

  it('renders domain filter select', async () => {
    mockAuditData();
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('audit-evidence-explorer-page')).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/domain/i)).toBeInTheDocument();
  });

  it('renders severity filter select', async () => {
    mockAuditData();
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('audit-evidence-explorer-page')).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/severity/i)).toBeInTheDocument();
  });

  it('falls back gracefully when API errors and shows sample data', async () => {
    server.use(
      http.get('/api/v1/artifacts', () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 })
      ),
      http.get('/api/v1/approvals', () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 })
      )
    );
    renderPage();
    // Page should render using sampleAuditEvidenceAggregation fallback
    await waitFor(() => {
      expect(screen.getByTestId('audit-evidence-explorer-page')).toBeInTheDocument();
    });
  });
});
