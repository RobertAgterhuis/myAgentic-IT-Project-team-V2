/**
 * Tests: Progress hook
 */
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProgress } from '@/hooks/use-progress';
import { TestWrapper } from '@/test/test-wrapper';

describe('useProgress', () => {
  it('returns progress data', async () => {
    const { result } = renderHook(() => useProgress(), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.active).toBe(false);
    expect(result.current.data?.phases).toHaveLength(1);
    expect(result.current.data?.phases[0].key).toBe('ONBOARDING');
  });
});
