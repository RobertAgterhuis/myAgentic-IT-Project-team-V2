/**
 * Tests: Drift detection hook
 */
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDriftDetection } from '@/hooks/use-drift';
import { TestWrapper } from '@/test/test-wrapper';

describe('useDriftDetection', () => {
  it('returns drift data', async () => {
    const { result } = renderHook(() => useDriftDetection(), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.summary.total_drifts).toBe(0);
    expect(result.current.data?.in_sync.sprints).toContain('S9A');
  });
});
