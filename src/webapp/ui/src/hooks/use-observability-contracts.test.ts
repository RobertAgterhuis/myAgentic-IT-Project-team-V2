/**
 * useObservabilityContracts — Query parity tests
 * UI-019 / Phase 4 — validates that the hook correctly composes drift +
 * analytics/trends data, falls back to sample data when both APIs are
 * unavailable, and exposes accurate summary counts.
 */
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { useObservabilityContracts } from '@/hooks/use-observability-contracts';
import { TestWrapper } from '@/test/test-wrapper';
import { server } from '@/test/msw-server';
import type { DriftResponse } from '@/lib/api-types';

const mockRagFreshnessResponse = {
  ok: true,
  generated_at: '2026-03-21T09:00:00.000Z',
  workspace_id: 'default',
  summary: {
    total_collections: 4,
    healthy_collections: 4,
    stale_collections: 0,
    missing_collections: 0,
    stale_threshold_seconds: 3600,
  },
  collections: [],
};

const mockDriftWithAlerts: DriftResponse = {
  generated_at: '2026-03-21T09:00:00.000Z',
  summary: { total_drifts: 2, critical: 1, warning: 1, info: 0 },
  in_sync: { sprints: [], stories: 0 },
  drifts: [
    {
      id: 'drift-001',
      type: 'config',
      severity: 'CRITICAL',
      sprint: 'sprint-12',
      expected: 'enabled',
      actual: 'disabled',
      recommendation: 'Re-enable feature flag X.',
    },
    {
      id: 'drift-002',
      type: 'metric',
      severity: 'WARNING',
      sprint: 'sprint-12',
      expected: '< 200ms',
      actual: '350ms',
      recommendation: 'Investigate latency regression in API gateway.',
    },
  ],
};

const mockTrendsResponse = {
  generated_at: '2026-03-21T09:00:00.000Z',
  data: {
    dora: {
      lead_time: [
        { timestamp: '2026-03-19T00:00:00.000Z', value: 24 },
        { timestamp: '2026-03-20T00:00:00.000Z', value: 20 },
        { timestamp: '2026-03-21T00:00:00.000Z', value: 18 },
      ],
      change_failure_rate: [
        { timestamp: '2026-03-19T00:00:00.000Z', value: 3.2 },
        { timestamp: '2026-03-20T00:00:00.000Z', value: 2.8 },
        { timestamp: '2026-03-21T00:00:00.000Z', value: 2.5 },
      ],
    },
  },
};

describe('useObservabilityContracts — fallback behaviour', () => {
  it('returns sample data when both drift and trends APIs are unavailable', async () => {
    // No server.use overrides — both endpoints return 500/network-error → fallback
    server.use(
      http.get('/api/v1/drift', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/analytics/trends', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/observability/rag-freshness', () => HttpResponse.json({}, { status: 500 }))
    );
    const { result } = renderHook(() => useObservabilityContracts(), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.ok).toBe(true);
    // Sample data has 1 open alert and 2 streams
    expect(result.current.data?.summary.open_alerts).toBe(1);
    expect(result.current.data?.summary.stream_count).toBe(2);
  });
});

describe('useObservabilityContracts — drift data', () => {
  it('maps drift entries to alerts with correct severity', async () => {
    server.use(
      http.get('/api/v1/drift', () => HttpResponse.json(mockDriftWithAlerts)),
      http.get('/api/v1/analytics/trends', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/observability/rag-freshness', () =>
        HttpResponse.json(mockRagFreshnessResponse)
      )
    );
    const { result } = renderHook(() => useObservabilityContracts(), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const alerts = result.current.data?.alerts ?? [];
    expect(alerts).toHaveLength(2);
    expect(alerts.find((a) => a.id === 'drift-001')?.severity).toBe('critical');
    expect(alerts.find((a) => a.id === 'drift-002')?.severity).toBe('warning');
  });

  it('sets all drift-mapped alerts as open', async () => {
    server.use(
      http.get('/api/v1/drift', () => HttpResponse.json(mockDriftWithAlerts)),
      http.get('/api/v1/analytics/trends', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/observability/rag-freshness', () =>
        HttpResponse.json(mockRagFreshnessResponse)
      )
    );
    const { result } = renderHook(() => useObservabilityContracts(), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const allOpen = result.current.data?.alerts.every((a) => a.status === 'open');
    expect(allOpen).toBe(true);
  });

  it('summary.open_alerts matches drift alerts count when both open', async () => {
    server.use(
      http.get('/api/v1/drift', () => HttpResponse.json(mockDriftWithAlerts)),
      http.get('/api/v1/analytics/trends', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/observability/rag-freshness', () =>
        HttpResponse.json(mockRagFreshnessResponse)
      )
    );
    const { result } = renderHook(() => useObservabilityContracts(), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.summary.open_alerts).toBe(2);
    expect(result.current.data?.summary.critical_alerts).toBe(1);
  });

  it('returns empty alerts array when drift has no drifts', async () => {
    server.use(
      http.get('/api/v1/drift', () =>
        HttpResponse.json({
          summary: { total_drifts: 0, critical: 0, warning: 0, info: 0 },
          drifts: [],
        })
      ),
      http.get('/api/v1/analytics/trends', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/observability/rag-freshness', () =>
        HttpResponse.json(mockRagFreshnessResponse)
      )
    );
    const { result } = renderHook(() => useObservabilityContracts(), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.alerts).toHaveLength(0);
    expect(result.current.data?.summary.open_alerts).toBe(0);
  });
});

describe('useObservabilityContracts — trends data', () => {
  it('maps lead_time trend to a latency stream', async () => {
    server.use(
      http.get('/api/v1/drift', () =>
        HttpResponse.json({
          summary: { total_drifts: 0, critical: 0, warning: 0, info: 0 },
          drifts: [],
        })
      ),
      http.get('/api/v1/analytics/trends', () => HttpResponse.json(mockTrendsResponse)),
      http.get('/api/v1/observability/rag-freshness', () =>
        HttpResponse.json(mockRagFreshnessResponse)
      )
    );
    const { result } = renderHook(() => useObservabilityContracts(), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const streams = result.current.data?.streams ?? [];
    const leadTime = streams.find((s) => s.id === 'stream-lead-time');
    expect(leadTime).toBeDefined();
    expect(leadTime?.kind).toBe('latency');
    expect(leadTime?.unit).toBe('hours');
    expect(leadTime?.sample_count).toBe(3);
    expect(leadTime?.latest).toBe(18);
  });

  it('maps change_failure_rate trend to an errors stream', async () => {
    server.use(
      http.get('/api/v1/drift', () =>
        HttpResponse.json({
          summary: { total_drifts: 0, critical: 0, warning: 0, info: 0 },
          drifts: [],
        })
      ),
      http.get('/api/v1/analytics/trends', () => HttpResponse.json(mockTrendsResponse)),
      http.get('/api/v1/observability/rag-freshness', () =>
        HttpResponse.json(mockRagFreshnessResponse)
      )
    );
    const { result } = renderHook(() => useObservabilityContracts(), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const streams = result.current.data?.streams ?? [];
    const cfr = streams.find((s) => s.id === 'stream-change-failure');
    expect(cfr).toBeDefined();
    expect(cfr?.kind).toBe('errors');
    expect(cfr?.unit).toBe('%');
    expect(cfr?.latest).toBe(2.5);
  });

  it('summary.stream_count reflects the number of built streams', async () => {
    server.use(
      http.get('/api/v1/drift', () =>
        HttpResponse.json({
          summary: { total_drifts: 0, critical: 0, warning: 0, info: 0 },
          drifts: [],
        })
      ),
      http.get('/api/v1/analytics/trends', () => HttpResponse.json(mockTrendsResponse)),
      http.get('/api/v1/observability/rag-freshness', () =>
        HttpResponse.json(mockRagFreshnessResponse)
      )
    );
    const { result } = renderHook(() => useObservabilityContracts(), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.summary.stream_count).toBe(3);
    expect(result.current.data?.summary.stale_streams).toBe(1);
  });
});

describe('useObservabilityContracts — combined data', () => {
  it('aggregates both drift alerts and trends streams in a single response', async () => {
    server.use(
      http.get('/api/v1/drift', () => HttpResponse.json(mockDriftWithAlerts)),
      http.get('/api/v1/analytics/trends', () => HttpResponse.json(mockTrendsResponse)),
      http.get('/api/v1/observability/rag-freshness', () =>
        HttpResponse.json(mockRagFreshnessResponse)
      )
    );
    const { result } = renderHook(() => useObservabilityContracts(), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.alerts).toHaveLength(2);
    expect(result.current.data?.streams).toHaveLength(3);
    expect(result.current.data?.ok).toBe(true);
  });
});
