/**
 * Tests: Milestones hooks
 */
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useMilestones,
  useMilestone,
  useCreateMilestone,
  useUpdateMilestone,
  useArchiveMilestone,
  useMilestoneTemplates,
} from '@/hooks/use-milestones';
import { TestWrapper } from '@/test/test-wrapper';

describe('useMilestones', () => {
  it('fetches milestones list (select: data)', async () => {
    const { result } = renderHook(() => useMilestones(), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].name).toBe('M1: Foundation');
  });
});

describe('useMilestone', () => {
  it('fetches a single milestone', async () => {
    const { result } = renderHook(() => useMilestone('milestone-20260301-abc'), {
      wrapper: TestWrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe('M1: Foundation');
  });

  it('is disabled when id is undefined', () => {
    const { result } = renderHook(() => useMilestone(undefined), {
      wrapper: TestWrapper,
    });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateMilestone', () => {
  it('creates a milestone', async () => {
    const { result } = renderHook(() => useCreateMilestone(), { wrapper: TestWrapper });

    result.current.mutate({
      name: 'New MS',
      status: 'not started',
      progress: 0,
      completion: '2026-06-01',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.name).toBe('New MS');
  });
});

describe('useUpdateMilestone', () => {
  it('updates a milestone', async () => {
    const { result } = renderHook(() => useUpdateMilestone(), { wrapper: TestWrapper });

    result.current.mutate({
      id: 'milestone-20260301-abc',
      status: 'complete',
      progress: 100,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useArchiveMilestone', () => {
  it('archives a milestone', async () => {
    const { result } = renderHook(() => useArchiveMilestone(), { wrapper: TestWrapper });

    result.current.mutate('milestone-20260301-abc');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useMilestoneTemplates', () => {
  it('fetches templates', async () => {
    const { result } = renderHook(() => useMilestoneTemplates(), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
