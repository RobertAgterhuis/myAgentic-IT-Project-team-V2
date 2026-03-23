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

function toAlertSeverity(severity: string): ObservabilityAlertEntry['severity'] {
  const normalized = severity.toUpperCase();
  if (normalized === 'CRITICAL') return 'critical';
  if (normalized === 'WARNING') return 'warning';
  return 'info';
}

function buildContracts(
  drift: DriftResponse | null,
  trends: TimestampedResponse<AnalyticsTrendsData> | null,
  ragFreshness: ObservabilityRagFreshnessResponse | null
): ObservabilityTelemetryContractResponse {
  const alerts: ObservabilityAlertEntry[] =
    drift?.drifts.map((entry) => ({
      id: entry.id,
      source: 'drift-detection',
      severity: toAlertSeverity(entry.severity),
      status: 'open',
      message: `${entry.type}: expected ${entry.expected}, actual ${entry.actual}`,
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      metadata: {
        sprint: entry.sprint,
        recommendation: entry.recommendation,
      },
    })) ?? [];

  if (ragFreshness && ragFreshness.summary.stale_collections > 0) {
    alerts.push({
      id: 'rag-stale-collections',
      source: 'rag-freshness',
      severity: 'warning',
      status: 'open',
      message: `${ragFreshness.summary.stale_collections} RAG collection(s) are stale`,
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
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
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
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
    generated_at: new Date().toISOString(),
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

export function useObservabilityContracts() {
  return useQuery({
    queryKey: queryKeys.observability.contracts,
    queryFn: async () => {
      const [driftRes, trendsRes, ragFreshnessRes] = await Promise.allSettled([
        apiGet<DriftResponse>('/v1/drift'),
        apiGet<TimestampedResponse<AnalyticsTrendsData>>('/v1/analytics/trends'),
        apiGet<ObservabilityRagFreshnessResponse>('/v1/observability/rag-freshness'),
      ]);

      const drift = driftRes.status === 'fulfilled' ? driftRes.value : null;
      const trends = trendsRes.status === 'fulfilled' ? trendsRes.value : null;
      const ragFreshness = ragFreshnessRes.status === 'fulfilled' ? ragFreshnessRes.value : null;

      if (!drift && !trends && !ragFreshness) {
        return sampleObservabilityTelemetryContract;
      }

      return buildContracts(drift, trends, ragFreshness);
    },
    refetchInterval: 30_000,
  });
}
