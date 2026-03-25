import type { QueryClient, QueryKey } from '@tanstack/react-query';

export interface OptimisticPatch {
  queryKey: QueryKey;
  updater: (current: unknown) => unknown;
}

export interface OptimisticSnapshot {
  queryKey: QueryKey;
  previous: unknown;
}

/**
 * Applies one or more optimistic cache patches and returns snapshots for rollback.
 */
export async function applyOptimisticPatches(
  queryClient: QueryClient,
  patches: OptimisticPatch[]
): Promise<OptimisticSnapshot[]> {
  const snapshots: OptimisticSnapshot[] = [];

  for (const patch of patches) {
    await queryClient.cancelQueries({ queryKey: patch.queryKey });
    const previous = queryClient.getQueryData(patch.queryKey);
    snapshots.push({ queryKey: patch.queryKey, previous });

    const next = patch.updater(previous);
    if (typeof next !== 'undefined') {
      queryClient.setQueryData(patch.queryKey, next);
    }
  }

  return snapshots;
}

/**
 * Restores snapshots created by applyOptimisticPatches.
 */
export function rollbackOptimisticPatches(
  queryClient: QueryClient,
  snapshots: OptimisticSnapshot[] | undefined
) {
  if (!snapshots) return;
  for (const snapshot of snapshots) {
    queryClient.setQueryData(snapshot.queryKey, snapshot.previous);
  }
}
