/**
 * Tests: Agent hooks (M15)
 */
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAgents, useAgent } from '@/hooks/use-agents';
import { TestWrapper } from '@/test/test-wrapper';
import { mockAgentDetail } from '@/test/msw-handlers';

describe('useAgents', () => {
  it('returns agents list', async () => {
    const { result } = renderHook(() => useAgents(), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.count).toBe(1);
    expect(result.current.data?.agents).toHaveLength(1);
    expect(result.current.data?.agents[0].name).toBe('Business Analyst');
    expect(result.current.data?.agents[0].status).toBe('running');
  });
});

describe('useAgent', () => {
  it('returns agent detail', async () => {
    const { result } = renderHook(() => useAgent(mockAgentDetail.id), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.agent.id).toBe(mockAgentDetail.id);
    expect(result.current.data?.agent.task_description).toBe('Processing PHASE-1');
    expect(result.current.data?.agent.retry_count).toBe(0);
    expect(result.current.data?.agent.session_id).toBe('sess-test-001');
  });

  it('is disabled when id is empty', () => {
    const { result } = renderHook(() => useAgent(''), { wrapper: TestWrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });
});
