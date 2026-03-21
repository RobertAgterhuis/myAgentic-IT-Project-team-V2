import type {
  AuditEvidenceAggregationResponse,
  ObservabilityTelemetryContractResponse,
} from '@/lib/api-types';

export const sampleAuditEvidenceAggregation: AuditEvidenceAggregationResponse = {
  ok: true,
  generated_at: '2026-03-21T08:30:00.000Z',
  timeline: [
    {
      id: 'audit-evt-1',
      timestamp: '2026-03-21T08:00:00.000Z',
      domain: 'artifacts',
      event_type: 'artifact_registered',
      title: 'Architecture decision package registered',
      description: 'A governed architecture artifact was added to the registry.',
      severity: 'info',
      entity_id: 'ART-ARCH-001',
    },
    {
      id: 'audit-evt-2',
      timestamp: '2026-03-21T08:12:00.000Z',
      domain: 'approvals',
      event_type: 'approval_pending',
      title: 'Approval pending for release gate',
      description: 'Release gate approval is waiting on a human reviewer.',
      severity: 'warning',
      entity_id: 'APR-RELEASE-001',
    },
  ],
  packs: [
    {
      id: 'pack-phase-3',
      title: 'Phase 3 Evidence Pack',
      status: 'partial',
      phase: 'PHASE-3',
      artifact_ids: ['ART-ARCH-001', 'ART-TEST-113'],
      trace_entity_ids: ['REQ-200', 'CODE-388', 'TEST-113'],
      approval_ids: ['APR-RELEASE-001'],
      coverage_score: 72,
      last_updated: '2026-03-21T08:15:00.000Z',
    },
  ],
  summary: {
    total_events: 2,
    critical_events: 0,
    open_packs: 1,
  },
};

export const sampleObservabilityTelemetryContract: ObservabilityTelemetryContractResponse = {
  ok: true,
  generated_at: '2026-03-21T08:30:00.000Z',
  alerts: [
    {
      id: 'alert-1',
      source: 'drift-detection',
      severity: 'warning',
      status: 'open',
      message: 'Configuration drift detected in sprint checkpoint.',
      first_seen: '2026-03-21T07:55:00.000Z',
      last_seen: '2026-03-21T08:27:00.000Z',
      related_session_id: 'session-204',
    },
  ],
  streams: [
    {
      id: 'stream-latency',
      name: 'Gateway latency p95',
      kind: 'latency',
      unit: 'ms',
      latest: 238,
      sample_count: 4,
      points: [
        { timestamp: '2026-03-21T08:00:00.000Z', value: 190 },
        { timestamp: '2026-03-21T08:10:00.000Z', value: 205 },
        { timestamp: '2026-03-21T08:20:00.000Z', value: 221 },
        { timestamp: '2026-03-21T08:30:00.000Z', value: 238 },
      ],
    },
    {
      id: 'stream-error-rate',
      name: 'Error rate',
      kind: 'errors',
      unit: '%',
      latest: 1.2,
      sample_count: 4,
      points: [
        { timestamp: '2026-03-21T08:00:00.000Z', value: 0.5 },
        { timestamp: '2026-03-21T08:10:00.000Z', value: 0.7 },
        { timestamp: '2026-03-21T08:20:00.000Z', value: 0.9 },
        { timestamp: '2026-03-21T08:30:00.000Z', value: 1.2 },
      ],
    },
  ],
  summary: {
    open_alerts: 1,
    critical_alerts: 0,
    stream_count: 2,
    stale_streams: 0,
  },
};
