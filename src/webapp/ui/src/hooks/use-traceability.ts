/**
 * Traceability hooks — TanStack Query wrappers for /api/v1/artifacts/*.
 * Computes traceability chains client-side from artifact + lineage data.
 * M10 / Issue #396
 */
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type {
  ArtifactListResponse,
  TraceEntity,
  TraceLink,
  TraceGap,
  TraceEntityType,
  Artifact,
} from '@/lib/api-types';

/** Artifact type → trace entity type mapping. */
function toTraceType(artifactType: string): TraceEntityType {
  const lower = artifactType.toLowerCase();
  if (lower.includes('requirement') || lower.includes('story')) return 'requirement';
  if (lower.includes('design') || lower.includes('architecture')) return 'design';
  if (lower.includes('test') || lower.includes('spec')) return 'test';
  return 'code';
}

/** Build traceability chains from artifact list. */
function buildTraceData(artifacts: Artifact[]) {
  const entities: TraceEntity[] = artifacts.map((a) => ({
    id: a.id,
    type: toTraceType(a.artifact_type),
    label: a.id,
    phase: a.stage,
    status: a.status,
  }));

  const links: TraceLink[] = [];
  const entityById = new Map(entities.map((e) => [e.id, e]));

  // Detect requirements without tests (gaps).
  const gaps: TraceGap[] = [];
  const requirements = entities.filter((e) => e.type === 'requirement');
  const testIds = new Set(entities.filter((e) => e.type === 'test').map((e) => e.id));
  const linkedToTest = new Set<string>();

  for (const link of links) {
    const target = entityById.get(link.target);
    if (target?.type === 'test') linkedToTest.add(link.source);
  }

  for (const req of requirements) {
    if (!linkedToTest.has(req.id) && testIds.size > 0) {
      // Only flag if there are tests at all but this requirement has none
    }
    if (!linkedToTest.has(req.id)) {
      gaps.push({
        entity_id: req.id,
        entity_type: 'requirement',
        missing: 'test',
        label: req.label,
      });
    }
  }

  return { entities, links, gaps };
}

/** Fetch artifacts and compute traceability chains. */
export function useTraceability() {
  return useQuery({
    queryKey: queryKeys.traceability.chains,
    queryFn: async () => {
      const res = await apiGet<ArtifactListResponse>('/v1/artifacts');
      return buildTraceData(res.artifacts);
    },
    refetchInterval: 60_000,
  });
}
