import { describe, it, expect } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { applyOptimisticPatches, rollbackOptimisticPatches } from './optimistic-updates';

describe('optimistic update framework', () => {
  it('applies cache patches and restores snapshots on rollback', async () => {
    const queryClient = new QueryClient();
    const key = ['workspaces'];

    queryClient.setQueryData(key, { count: 1, workspaces: [{ id: 'ws-1' }] });

    const snapshots = await applyOptimisticPatches(queryClient, [
      {
        queryKey: key,
        updater: (current: unknown) => {
          const previous = current as { count: number; workspaces: Array<{ id: string }> };
          return {
            count: previous.count + 1,
            workspaces: [...previous.workspaces, { id: 'ws-2' }],
          };
        },
      },
    ]);

    expect(queryClient.getQueryData(key)).toEqual({
      count: 2,
      workspaces: [{ id: 'ws-1' }, { id: 'ws-2' }],
    });

    rollbackOptimisticPatches(queryClient, snapshots);

    expect(queryClient.getQueryData(key)).toEqual({
      count: 1,
      workspaces: [{ id: 'ws-1' }],
    });
  });

  it('captures snapshots even when a cache key has no existing data', async () => {
    const queryClient = new QueryClient();
    const key = ['missing'];

    const snapshots = await applyOptimisticPatches(queryClient, [
      {
        queryKey: key,
        updater: () => undefined,
      },
    ]);

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toEqual({ queryKey: key, previous: undefined });
    expect(queryClient.getQueryData(key)).toBeUndefined();
  });
});
