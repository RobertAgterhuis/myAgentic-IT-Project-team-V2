import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { useAuditEvidenceAggregation } from '@/hooks/use-audit-evidence';
import { TestWrapper } from '@/test/test-wrapper';
import { server } from '@/test/msw-server';

describe('useAuditEvidenceAggregation', () => {
  it('builds a unified timeline and evidence packs from artifacts + approvals', async () => {
    server.use(
      http.get('/api/v1/artifacts', () =>
        HttpResponse.json({
          artifacts: [
            {
              id: 'artifact-001',
              session_id: 'session-1',
              stage: 'PHASE_2',
              artifact_type: 'analysis',
              path: 'BusinessDocs/Phase2-Tech/analysis.md',
              content_hash: 'abc123',
              status: 'VALID',
              created_at: '2026-03-29T10:00:00.000Z',
              updated_at: '2026-03-29T10:01:00.000Z',
              metadata: {},
            },
          ],
          count: 1,
        })
      ),
      http.get('/api/v1/approvals', () =>
        HttpResponse.json({
          approvals: [
            {
              id: 'approval-001',
              entity_id: 'gate.phase-2',
              gate_id: 'gate.critic-risk-2',
              stage: 'PHASE_2',
              requested_by: 'orchestrator',
              requested_at: '2026-03-29T10:02:00.000Z',
              required_role: 'operator',
              status: 'PENDING',
            },
          ],
          count: 1,
        })
      )
    );

    const { result } = renderHook(() => useAuditEvidenceAggregation(), { wrapper: TestWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const payload = result.current.data;
    expect(payload?.ok).toBe(true);
    expect(payload?.timeline.length).toBeGreaterThanOrEqual(2);
    expect(payload?.packs.length).toBeGreaterThanOrEqual(1);
    expect(payload?.summary.total_events).toBe(payload?.timeline.length);
  });

  it('falls back to sample aggregation payload when APIs are unavailable', async () => {
    server.use(
      http.get('/api/v1/artifacts', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/approvals', () => HttpResponse.json({}, { status: 500 }))
    );

    const { result } = renderHook(() => useAuditEvidenceAggregation(), { wrapper: TestWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.ok).toBe(true);
    expect(result.current.data?.timeline).toBeDefined();
    expect(result.current.data?.packs).toBeDefined();
  });
});
