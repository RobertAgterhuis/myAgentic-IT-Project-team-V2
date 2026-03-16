/**
 * Artifact hooks — TanStack Query wrappers for /api/v1/artifacts/*.
 * M10 / Issue #392-393
 */
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type {
  ArtifactListResponse,
  ArtifactDetailResponse,
  ArtifactLineageResponse,
  ArtifactStatsResponse,
} from '@/lib/api-types';

/** List all artifacts with optional filters. */
export function useArtifacts(filters?: { stage?: string; type?: string; status?: string }) {
  const params: Record<string, string> = {};
  if (filters?.stage) params.stage = filters.stage;
  if (filters?.type) params.type = filters.type;
  if (filters?.status) params.status = filters.status;

  return useQuery({
    queryKey: [...queryKeys.artifacts.all, params],
    queryFn: () => apiGet<ArtifactListResponse>('/v1/artifacts', params),
    refetchInterval: 30_000,
  });
}

/** Get a single artifact by ID. */
export function useArtifact(id: string) {
  return useQuery({
    queryKey: queryKeys.artifacts.detail(id),
    queryFn: () => apiGet<ArtifactDetailResponse>(`/v1/artifacts/${encodeURIComponent(id)}`),
    enabled: !!id,
  });
}

/** Get lineage graph for an artifact. */
export function useArtifactLineage(id: string) {
  return useQuery({
    queryKey: queryKeys.artifacts.lineage(id),
    queryFn: () =>
      apiGet<ArtifactLineageResponse>(`/v1/artifacts/${encodeURIComponent(id)}/lineage`),
    enabled: !!id,
  });
}

/** Aggregate artifact stats. */
export function useArtifactStats() {
  return useQuery({
    queryKey: queryKeys.artifacts.stats,
    queryFn: () => apiGet<ArtifactStatsResponse>('/v1/artifacts/stats'),
    refetchInterval: 60_000,
  });
}
