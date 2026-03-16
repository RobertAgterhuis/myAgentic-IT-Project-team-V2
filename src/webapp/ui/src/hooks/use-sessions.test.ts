/**
 * Tests: Session hooks (M15)
 */
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSessions, useSession, useSessionTimeline } from '@/hooks/use-sessions';
import { TestWrapper } from '@/test/test-wrapper';
import { mockSession, mockTimelineEvents, mockAgentDetail } from '@/test/msw-handlers';

describe('useSessions', () => {
  it('returns sessions list', async () => {
    const { result } = renderHook(() => useSessions(), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.count).toBe(1);
    expect(result.current.data?.sessions).toHaveLength(1);
    expect(result.current.data?.sessions[0].id).toBe(mockSession.id);
    expect(result.current.data?.sessions[0].status).toBe('active');
  });
});

describe('useSession', () => {
  it('returns session detail with agents and timeline', async () => {
    const { result } = renderHook(() => useSession(mockSession.id), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.session.id).toBe(mockSession.id);
    expect(result.current.data?.session.project).toBe('TestProject');
    expect(result.current.data?.agents).toHaveLength(1);
    expect(result.current.data?.agents[0].id).toBe(mockAgentDetail.id);
    expect(result.current.data?.timeline).toHaveLength(3);
  });

  it('is disabled when id is empty', () => {
    const { result } = renderHook(() => useSession(''), { wrapper: TestWrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useSessionTimeline', () => {
  it('returns timeline events', async () => {
    const { result } = renderHook(() => useSessionTimeline(mockSession.id), {
      wrapper: TestWrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.session_id).toBe(mockSession.id);
    expect(result.current.data?.timeline).toHaveLength(mockTimelineEvents.length);
    expect(result.current.data?.timeline[0].type).toBe('session_start');
    expect(result.current.data?.timeline[2].type).toBe('agent_start');
  });

  it('is disabled when id is empty', () => {
    const { result } = renderHook(() => useSessionTimeline(''), { wrapper: TestWrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });
});
