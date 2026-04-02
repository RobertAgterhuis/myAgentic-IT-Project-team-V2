import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { sampleObservabilityTelemetryContract } from '@/lib/contract-samples';
import type {
  DriftResponse,
  ObservabilityAlertEntry,
  ObservabilityRagFreshnessResponse,
  ObservabilityTelemetryContractResponse,
  ObservabilityTelemetryStream,
  TimestampedResponse,
  AnalyticsTrendsData,
} from '@/lib/api-types';

interface ObservabilitySourceAvailability {
  drift: boolean;
  trends: boolean;
  ragFreshness: boolean;
}

function toAlertSeverity(severity: string): ObservabilityAlertEntry['severity'] {
  const normalized = severity.toUpperCase();
  if (normalized === 'CRITICAL') return 'critical';
  if (normalized === 'WARNING') return 'warning';
  return 'info';
}

function buildContracts(
  drift: DriftResponse | null,
  trends: TimestampedResponse<AnalyticsTrendsData> | null,
  ragFreshness: ObservabilityRagFreshnessResponse | null,
  availability: ObservabilitySourceAvailability,
  generatedAt: string
): ObservabilityTelemetryContractResponse {
  const driftAlerts: ObservabilityAlertEntry[] =
    drift?.drifts.map(
      (entry): ObservabilityAlertEntry => ({
        id: entry.id,
        source: 'drift-detection',
        severity: toAlertSeverity(entry.severity),
        status: 'open',
        message: `${entry.type}: expected ${entry.expected}, actual ${entry.actual}`,
        first_seen: generatedAt,
        last_seen: generatedAt,
        metadata: {
          sprint: entry.sprint,
          recommendation: entry.recommendation,
        },
      })
    ) ?? [];

  const alerts: ObservabilityAlertEntry[] = [
    ...buildSourceAvailabilityAlerts(availability, generatedAt),
    ...driftAlerts,
  ];

  if (ragFreshness && ragFreshness.summary.stale_collections > 0) {
    alerts.push({
      id: 'rag-stale-collections',
      source: 'rag-freshness',
      severity: 'warning',
      status: 'open',
      message: `${ragFreshness.summary.stale_collections} RAG collection(s) are stale`,
      first_seen: generatedAt,
      last_seen: generatedAt,
      metadata: {
        workspace: ragFreshness.workspace_id,
        threshold_seconds: ragFreshness.summary.stale_threshold_seconds,
      },
    });
  }

  if (ragFreshness && ragFreshness.summary.missing_collections > 0) {
    alerts.push({
      id: 'rag-missing-collections',
      source: 'rag-freshness',
      severity: 'critical',
      status: 'open',
      message: `${ragFreshness.summary.missing_collections} RAG collection(s) are missing`,
      first_seen: generatedAt,
      last_seen: generatedAt,
      metadata: {
        workspace: ragFreshness.workspace_id,
      },
    });
  }

  const streams: ObservabilityTelemetryStream[] = [];
  if (trends?.data?.dora?.lead_time?.length) {
    const points = trends.data.dora.lead_time.map((point) => ({
      timestamp: point.timestamp,
      value: point.value,
    }));
    streams.push({
      id: 'stream-lead-time',
      name: 'Lead time',
      kind: 'latency',
      unit: 'hours',
      latest: points[points.length - 1]?.value ?? 0,
      sample_count: points.length,
      points,
    });
  }

  if (trends?.data?.dora?.change_failure_rate?.length) {
    const points = trends.data.dora.change_failure_rate.map((point) => ({
      timestamp: point.timestamp,
      value: point.value,
    }));
    streams.push({
      id: 'stream-change-failure',
      name: 'Change failure rate',
      kind: 'errors',
      unit: '%',
      latest: points[points.length - 1]?.value ?? 0,
      sample_count: points.length,
      points,
    });
  }

  if (ragFreshness) {
    const total = Math.max(1, ragFreshness.summary.total_collections);
    const healthyRatio = Math.round((ragFreshness.summary.healthy_collections / total) * 100);
    streams.push({
      id: 'stream-rag-freshness',
      name: 'RAG index freshness',
      kind: 'throughput',
      unit: '%',
      latest: healthyRatio,
      sample_count: ragFreshness.collections.length,
      points: ragFreshness.collections.map((entry) => ({
        timestamp: ragFreshness.generated_at,
        value: entry.status === 'healthy' ? 100 : entry.status === 'unknown' ? 50 : 0,
      })),
    });
  }

  const criticalAlerts = alerts.filter((alert) => alert.severity === 'critical').length;
  return {
    ok: true,
    generated_at: generatedAt,
    alerts,
    streams,
    summary: {
      open_alerts: alerts.filter((alert) => alert.status === 'open').length,
      critical_alerts: criticalAlerts,
      stream_count: streams.length,
      stale_streams: streams.filter((stream) => stream.sample_count === 0).length,
    },
  };
}
function buildSourceAvailabilityAlerts(
  availability: ObservabilitySourceAvailability,
  generatedAt: string
): ObservabilityAlertEntry[] {
  const alerts: ObservabilityAlertEntry[] = [];

  if (!availability.drift) {
    alerts.push({
      id: 'observability-drift-source-unavailable',
      source: 'observability-contracts',
      severity: 'critical',
      status: 'open',
      message: 'Live drift telemetry is unavailable.',
      first_seen: generatedAt,
      last_seen: generatedAt,
      metadata: { endpoint: '/api/drift' },
    });
  }

  if (!availability.trends) {
    alerts.push({
      id: 'observability-trends-source-unavailable',
      source: 'observability-contracts',
      severity: 'warning',
      status: 'open',
      message: 'Analytics trend telemetry is unavailable.',
      first_seen: generatedAt,
      last_seen: generatedAt,
      metadata: { endpoint: '/api/v1/analytics/trends' },
    });
  }

  if (!availability.ragFreshness) {
    alerts.push({
      id: 'observability-rag-source-unavailable',
      source: 'observability-contracts',
      severity: 'warning',
      status: 'open',
      message: 'RAG freshness telemetry is unavailable.',
      first_seen: generatedAt,
      last_seen: generatedAt,
      metadata: { endpoint: '/api/v1/observability/rag-freshness' },
    });
  }

  return alerts;
}

function buildSampleFallbackContract(
  availability: ObservabilitySourceAvailability,
  generatedAt: string
): ObservabilityTelemetryContractResponse {
  const alerts = [
    {
      id: 'observability-sample-fallback-active',
      source: 'observability-contracts',
      severity: 'critical' as const,
      status: 'open' as const,
      message: 'Live observability sources are unavailable; showing sample fallback telemetry.',
      first_seen: generatedAt,
      last_seen: generatedAt,
      metadata: {
        fallback: 'sample-observability-telemetry-contract',
      },
    },
    ...buildSourceAvailabilityAlerts(availability, generatedAt),
    ...sampleObservabilityTelemetryContract.alerts,
  ];

  return {
    ...sampleObservabilityTelemetryContract,
    generated_at: generatedAt,
    alerts,
    summary: {
      open_alerts: alerts.filter((alert) => alert.status === 'open').length,
      critical_alerts: alerts.filter((alert) => alert.severity === 'critical').length,
      stream_count: sampleObservabilityTelemetryContract.streams.length,
      stale_streams: sampleObservabilityTelemetryContract.streams.filter(
        (stream) => stream.sample_count === 0
      ).length,
    },
  };
}

export function useObservabilityContracts() {
  return useQuery({
    queryKey: queryKeys.observability.contracts,
    queryFn: async () => {
      const [driftRes, trendsRes, ragFreshnessRes] = await Promise.allSettled([
        apiGet<DriftResponse>('/drift'),
        apiGet<TimestampedResponse<AnalyticsTrendsData>>('/v1/analytics/trends'),
        apiGet<ObservabilityRagFreshnessResponse>('/v1/observability/rag-freshness'),
      ]);

      const generatedAt = new Date().toISOString();
      const availability: ObservabilitySourceAvailability = {
        drift: driftRes.status === 'fulfilled',
        trends: trendsRes.status === 'fulfilled',
        ragFreshness: ragFreshnessRes.status === 'fulfilled',
      };

      const drift = driftRes.status === 'fulfilled' ? driftRes.value : null;
      const trends = trendsRes.status === 'fulfilled' ? trendsRes.value : null;
      const ragFreshness = ragFreshnessRes.status === 'fulfilled' ? ragFreshnessRes.value : null;

      if (!drift && !trends && !ragFreshness) {
        return buildSampleFallbackContract(availability, generatedAt);
      }

      return buildContracts(drift, trends, ragFreshness, availability, generatedAt);
    },
    refetchInterval: 30_000,
  });
}
