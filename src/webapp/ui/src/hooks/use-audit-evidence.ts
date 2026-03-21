import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { sampleAuditEvidenceAggregation } from '@/lib/contract-samples';
import type {
  ApprovalsListResponse,
  ArtifactListResponse,
  AuditEvidenceAggregationResponse,
  AuditEvidencePack,
  AuditTimelineEntry,
} from '@/lib/api-types';

function toPackStatus(coverageScore: number): AuditEvidencePack['status'] {
  if (coverageScore >= 80) return 'complete';
  if (coverageScore >= 40) return 'partial';
  return 'missing';
}

function buildAuditAggregation(
  artifacts: ArtifactListResponse['artifacts'],
  approvals: ApprovalsListResponse['approvals']
): AuditEvidenceAggregationResponse {
  const timelineFromArtifacts: AuditTimelineEntry[] = artifacts.slice(0, 80).map((artifact) => ({
    id: `artifact-${artifact.id}`,
    timestamp: artifact.updated_at || artifact.created_at,
    domain: 'artifacts',
    event_type: 'artifact_registered',
    title: `${artifact.artifact_type} artifact registered`,
    description: `${artifact.id} is tracked in ${artifact.stage} with status ${artifact.status}.`,
    severity: artifact.status === 'INVALID' ? 'critical' : 'info',
    entity_id: artifact.id,
    metadata: {
      stage: artifact.stage,
      status: artifact.status,
      hash: artifact.content_hash,
    },
  }));

  const timelineFromApprovals: AuditTimelineEntry[] = approvals.slice(0, 80).map((approval) => ({
    id: `approval-${approval.id}`,
    timestamp: approval.requested_at,
    domain: 'approvals',
    event_type: 'approval_event',
    title: `${approval.stage} approval ${approval.status.toLowerCase()}`,
    description: `Approval ${approval.id} requires ${approval.required_role}.`,
    severity:
      approval.status === 'REJECTED'
        ? 'critical'
        : approval.status === 'PENDING'
          ? 'warning'
          : 'info',
    entity_id: approval.id,
    metadata: {
      entity_id: approval.entity_id,
      requested_by: approval.requested_by,
    },
  }));

  const timeline = [...timelineFromArtifacts, ...timelineFromApprovals].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const packMap = new Map<
    string,
    {
      title: string;
      phase: string;
      artifact_ids: string[];
      approval_ids: string[];
      last_updated: string;
    }
  >();

  for (const artifact of artifacts) {
    const key = artifact.stage || 'UNKNOWN';
    const existing = packMap.get(key);
    const nextLastUpdated = existing
      ? new Date(
          Math.max(
            new Date(existing.last_updated).getTime(),
            new Date(artifact.updated_at).getTime()
          )
        ).toISOString()
      : artifact.updated_at;
    packMap.set(key, {
      title: `${key} Evidence Pack`,
      phase: key,
      artifact_ids: [...(existing?.artifact_ids ?? []), artifact.id],
      approval_ids: existing?.approval_ids ?? [],
      last_updated: nextLastUpdated,
    });
  }

  for (const approval of approvals) {
    const key = approval.stage || 'UNKNOWN';
    const existing = packMap.get(key) ?? {
      title: `${key} Evidence Pack`,
      phase: key,
      artifact_ids: [],
      approval_ids: [],
      last_updated: approval.requested_at,
    };
    packMap.set(key, {
      ...existing,
      approval_ids: [...existing.approval_ids, approval.id],
      last_updated: new Date(
        Math.max(
          new Date(existing.last_updated).getTime(),
          new Date(approval.requested_at).getTime()
        )
      ).toISOString(),
    });
  }

  const packs: AuditEvidencePack[] = [...packMap.entries()].map(([id, pack]) => {
    const artifactWeight = Math.min(70, pack.artifact_ids.length * 10);
    const approvalWeight = Math.min(30, pack.approval_ids.length * 10);
    const coverageScore = Math.min(100, artifactWeight + approvalWeight);
    return {
      id: `pack-${id.toLowerCase()}`,
      title: pack.title,
      status: toPackStatus(coverageScore),
      phase: pack.phase,
      artifact_ids: pack.artifact_ids,
      trace_entity_ids: [],
      approval_ids: pack.approval_ids,
      coverage_score: coverageScore,
      last_updated: pack.last_updated,
    };
  });

  const criticalEvents = timeline.filter((entry) => entry.severity === 'critical').length;

  return {
    ok: true,
    generated_at: new Date().toISOString(),
    timeline,
    packs,
    summary: {
      total_events: timeline.length,
      critical_events: criticalEvents,
      open_packs: packs.filter((pack) => pack.status !== 'complete').length,
    },
  };
}

export function useAuditEvidenceAggregation() {
  return useQuery({
    queryKey: queryKeys.audit.evidence,
    queryFn: async () => {
      try {
        const [artifactRes, approvalRes] = await Promise.all([
          apiGet<ArtifactListResponse>('/v1/artifacts'),
          apiGet<ApprovalsListResponse>('/v1/approvals'),
        ]);
        return buildAuditAggregation(artifactRes.artifacts, approvalRes.approvals);
      } catch {
        return sampleAuditEvidenceAggregation;
      }
    },
    refetchInterval: 60_000,
  });
}
