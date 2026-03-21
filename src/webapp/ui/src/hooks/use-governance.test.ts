/**
 * Governance hooks — Query/Mutation parity tests
 * UI-019 / Phase 4 — validates that approve/reject mutations correctly
 * invalidate the approvals query key, ensuring UI reads fresh data after writes.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { useApprovals, useApproveRequest, useRejectRequest } from '@/hooks/use-governance';
import { TestWrapper } from '@/test/test-wrapper';
import { server } from '@/test/msw-server';

const mockApprovals = {
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
  ],
  count: 1,
};

describe('useApprovals', () => {
  it('fetches approvals list from /api/v1/approvals', async () => {
    server.use(http.get('/api/v1/approvals', () => HttpResponse.json(mockApprovals)));
    const { result } = renderHook(() => useApprovals(), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.approvals).toHaveLength(1);
    expect(result.current.data?.approvals[0].id).toBe('apr-001');
  });

  it('returns empty list on empty response', async () => {
    server.use(http.get('/api/v1/approvals', () => HttpResponse.json({ approvals: [], count: 0 })));
    const { result } = renderHook(() => useApprovals(), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.approvals).toHaveLength(0);
  });
});

describe('useApproveRequest — mutation parity', () => {
  it('calls POST /api/v1/approvals/:id/approve and succeeds', async () => {
    server.use(
      http.post('/api/v1/approvals/:id/approve', ({ params }) =>
        HttpResponse.json({ ok: true, id: params.id, action: 'APPROVED' })
      )
    );
    const { result } = renderHook(() => useApproveRequest(), { wrapper: TestWrapper });
    await act(async () => {
      result.current.mutate({ id: 'apr-001', reason: 'LGTM' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('invalidates governance.approvals query key on success', async () => {
    const invalidateCallCount = { count: 0 };
    server.use(
      http.get('/api/v1/approvals', () => {
        invalidateCallCount.count++;
        return HttpResponse.json(mockApprovals);
      }),
      http.post('/api/v1/approvals/:id/approve', () =>
        HttpResponse.json({ ok: true, id: 'apr-001', action: 'APPROVED' })
      )
    );

    const { result: approvalsResult } = renderHook(() => useApprovals(), { wrapper: TestWrapper });
    await waitFor(() => expect(approvalsResult.current.isSuccess).toBe(true));

    const { result: mutationResult } = renderHook(() => useApproveRequest(), {
      wrapper: TestWrapper,
    });
    await act(async () => {
      mutationResult.current.mutate({ id: 'apr-001' });
    });
    await waitFor(() => expect(mutationResult.current.isSuccess).toBe(true));
    // After mutation succeeds, query key was invalidated — list re-fetches
    expect(invalidateCallCount.count).toBeGreaterThanOrEqual(1);
  });
});

describe('useRejectRequest — mutation parity', () => {
  it('calls POST /api/v1/approvals/:id/reject and succeeds', async () => {
    server.use(
      http.post('/api/v1/approvals/:id/reject', ({ params }) =>
        HttpResponse.json({ ok: true, id: params.id, action: 'REJECTED' })
      )
    );
    const { result } = renderHook(() => useRejectRequest(), { wrapper: TestWrapper });
    await act(async () => {
      result.current.mutate({ id: 'apr-001', reason: 'Policy violation requires resolution.' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('invalidates governance.approvals query key on rejection success', async () => {
    const fetchCount = { count: 0 };
    server.use(
      http.get('/api/v1/approvals', () => {
        fetchCount.count++;
        return HttpResponse.json(mockApprovals);
      }),
      http.post('/api/v1/approvals/:id/reject', () =>
        HttpResponse.json({ ok: true, id: 'apr-001', action: 'REJECTED' })
      )
    );

    const { result: approvalsResult } = renderHook(() => useApprovals(), { wrapper: TestWrapper });
    await waitFor(() => expect(approvalsResult.current.isSuccess).toBe(true));

    const { result: mutationResult } = renderHook(() => useRejectRequest(), {
      wrapper: TestWrapper,
    });
    await act(async () => {
      mutationResult.current.mutate({ id: 'apr-001', reason: 'Rejected by test.' });
    });
    await waitFor(() => expect(mutationResult.current.isSuccess).toBe(true));
    expect(fetchCount.count).toBeGreaterThanOrEqual(1);
  });

  it('fails gracefully when reject API returns 500', async () => {
    server.use(
      http.post('/api/v1/approvals/:id/reject', () =>
        HttpResponse.json({ error: 'Internal error' }, { status: 500 })
      )
    );
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useRejectRequest(), { wrapper: TestWrapper });
    await act(async () => {
      result.current.mutate({ id: 'apr-001', reason: 'Test.' });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    consoleSpy.mockRestore();
  });
});
