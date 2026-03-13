/**
 * Tests: Decisions hooks
 */
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useDecisions,
  useDecision,
  useCreateDecision,
  useUpdateDecision,
  useDeleteDecision,
} from '@/hooks/use-decisions';
import { TestWrapper } from '@/test/test-wrapper';

describe('useDecisions', () => {
  it('fetches all decisions', async () => {
    const { result } = renderHook(() => useDecisions(), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.open).toHaveLength(1);
    expect(result.current.data?.decided).toHaveLength(1);
  });
});

describe('useDecision', () => {
  it('returns a single open decision', async () => {
    const { result } = renderHook(() => useDecision('DEC-001'), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeTruthy();
    expect((result.current.data as { id: string }).id).toBe('DEC-001');
  });

  it('returns a single decided decision', async () => {
    const { result } = renderHook(() => useDecision('DEC-002'), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect((result.current.data as { id: string }).id).toBe('DEC-002');
  });

  it('returns null for non-existent', async () => {
    const { result } = renderHook(() => useDecision('DEC-999'), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});

describe('useCreateDecision', () => {
  it('creates a decision', async () => {
    const { result } = renderHook(() => useCreateDecision(), { wrapper: TestWrapper });

    result.current.mutate({
      action: 'create',
      type: 'OPEN_QUESTION',
      priority: 'HIGH',
      scope: 'TECH',
      text: 'New question?',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('DEC-003');
  });
});

describe('useUpdateDecision', () => {
  it('updates a decision', async () => {
    const { result } = renderHook(() => useUpdateDecision(), { wrapper: TestWrapper });

    result.current.mutate({
      action: 'answer',
      id: 'DEC-001',
      answer: 'Azure',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.action).toBe('create'); // mock returns 'create'
  });
});

describe('useDeleteDecision', () => {
  it('expires a decision', async () => {
    const { result } = renderHook(() => useDeleteDecision(), { wrapper: TestWrapper });

    result.current.mutate('DEC-001');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
