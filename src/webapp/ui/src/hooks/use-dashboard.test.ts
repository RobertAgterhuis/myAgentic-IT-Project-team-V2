/**
 * Tests: Dashboard hooks
 */
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useDashboardHealth,
  useDashboardMetrics,
  useDashboardActivity,
  useDashboardStats,
} from '@/hooks/use-dashboard';
import { TestWrapper } from '@/test/test-wrapper';

describe('useDashboardHealth', () => {
  it('returns health indicators', async () => {
    const { result } = renderHook(() => useDashboardHealth(), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.quality.value).toBe(95);
    expect(result.current.data?.coverage.value).toBe(72);
  });
});

describe('useDashboardMetrics', () => {
  it('returns metrics', async () => {
    const { result } = renderHook(() => useDashboardMetrics(), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.http_requests.value).toBe(1250);
  });
});

describe('useDashboardActivity', () => {
  it('returns activity entries', async () => {
    const { result } = renderHook(() => useDashboardActivity(), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});

describe('useDashboardStats', () => {
  it('returns stat cards', async () => {
    const { result } = renderHook(() => useDashboardStats(), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.active_files.value).toBe(142);
  });
});
