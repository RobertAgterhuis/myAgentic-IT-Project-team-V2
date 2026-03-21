import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { sampleObservabilityTelemetryContract } from '@/lib/contract-samples';
import type {
  DriftResponse,
  ObservabilityAlertEntry,
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
  trends: TimestampedResponse<AnalyticsTrendsData> | null
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
      const [driftRes, trendsRes] = await Promise.allSettled([
        apiGet<DriftResponse>('/v1/drift'),
        apiGet<TimestampedResponse<AnalyticsTrendsData>>('/v1/analytics/trends'),
      ]);

      const drift = driftRes.status === 'fulfilled' ? driftRes.value : null;
      const trends = trendsRes.status === 'fulfilled' ? trendsRes.value : null;
      if (!drift && !trends) {
        return sampleObservabilityTelemetryContract;
      }
      return buildContracts(drift, trends);
    },
    refetchInterval: 30_000,
  });
}
