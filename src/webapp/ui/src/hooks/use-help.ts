import { useQuery } from '@tanstack/react-query';
import { ApiError, apiGet } from '@/lib/api-client';
import type { PageHelpResponse } from '@/lib/api-types';
import { queryKeys } from '@/lib/query-keys';

/**
 * Loads compact page-help content for a route slug.
 * Returns null for 404 so callers can hide help UI for unsupported routes.
 */
export function usePageHelp(routeSlug: string) {
  return useQuery({
    queryKey: queryKeys.help.page(routeSlug),
    queryFn: async () => {
      try {
        return await apiGet<PageHelpResponse>(`/v1/help/page/${encodeURIComponent(routeSlug)}`);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null;
        }
        throw error;
      }
    },
    staleTime: 5 * 60_000,
  });
}
