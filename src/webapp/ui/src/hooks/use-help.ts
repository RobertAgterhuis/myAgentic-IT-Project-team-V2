import { useQuery } from '@tanstack/react-query';
import { ApiError, apiGet } from '@/lib/api-client';
import type { HelpSearchResponse, HelpTopicResponse, PageHelpResponse } from '@/lib/api-types';
import { queryKeys } from '@/lib/query-keys';

/**
 * Converts a route pathname to the page-help route slug expected by the API.
 * Examples: /commands -> commands, /sessions/abc -> sessions, / -> "".
 */
export function resolveHelpRouteSlug(pathname: string): string {
  const [firstSegment] = pathname.split('/').filter(Boolean);
  return (firstSegment || '').toLowerCase();
}

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
    enabled: routeSlug.trim().length > 0,
  });
}

/**
 * Loads full topic content rendered by the backend markdown pipeline.
 */
export function useHelpTopic(topicId: string | null) {
  return useQuery({
    queryKey: queryKeys.help.topic(topicId ?? ''),
    queryFn: async () => {
      if (!topicId) {
        return null;
      }
      try {
        return await apiGet<HelpTopicResponse>(`/v1/help/topic/${encodeURIComponent(topicId)}`);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null;
        }
        throw error;
      }
    },
    staleTime: 5 * 60_000,
    enabled: Boolean(topicId),
  });
}

/**
 * Searches help pages/topics for the provided query.
 */
export function useHelpSearch(query: string) {
  const normalizedQuery = query.trim();

  return useQuery({
    queryKey: queryKeys.help.search(normalizedQuery),
    queryFn: () =>
      apiGet<HelpSearchResponse>('/v1/help/search', {
        q: normalizedQuery,
      }),
    staleTime: 60_000,
    enabled: normalizedQuery.length > 0,
  });
}
