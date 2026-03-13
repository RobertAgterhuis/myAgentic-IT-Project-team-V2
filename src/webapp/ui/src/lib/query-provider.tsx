/**
 * QueryClient provider — centralized TanStack Query configuration.
 * Retry: 3 attempts with exponential backoff.
 * Error: pipes all query/mutation errors through the toast system.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { showToast } from '@/components/ui/toast-system';
import { ApiError } from '@/lib/api-client';

function formatError(error: unknown): string {
  if (error instanceof ApiError) {
    return `API error (${error.status}): ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

function handleGlobalError(error: unknown): void {
  showToast.error(formatError(error));
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 3,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: 1,
        onError: handleGlobalError,
      },
    },
  });
}

/* Singleton for the app — tests create their own via createQueryClient(). */
const appQueryClient = createQueryClient();

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={appQueryClient}>
      {children}
    </QueryClientProvider>
  );
}

export { appQueryClient };
