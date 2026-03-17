/**
 * PageShell — reusable wrapper for consistent loading, error, and empty states.
 * M21-005: Every page with data fetching must show skeleton on load, error banner on failure.
 */
import * as React from 'react';
import { Spinner } from '@/components/ui/spinner';
import { AlertBanner } from '@/components/ui/alert-banner';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface PageShellProps {
  /** Whether data is currently loading. */
  isLoading?: boolean;
  /** Loading label for the spinner. */
  loadingLabel?: string;
  /** Error object from a query (truthy = show error). */
  error?: Error | null;
  /** Retry callback — shown on error banner. */
  onRetry?: () => void;
  /** Whether the data set is empty (after loading). */
  isEmpty?: boolean;
  /** Empty state configuration. */
  emptyState?: {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: { label: string; onClick: () => void };
  };
  children: React.ReactNode;
}

export function PageShell({
  isLoading,
  loadingLabel = 'Loading…',
  error,
  onRetry,
  isEmpty,
  emptyState,
  children,
}: PageShellProps) {
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner label={loadingLabel} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <AlertBanner variant="error">
          <div className="flex items-center justify-between gap-4 w-full">
            <span>Failed to load data: {error.message || 'Unknown error'}</span>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw className="size-3 mr-1.5" />
                Retry
              </Button>
            )}
          </div>
        </AlertBanner>
      </div>
    );
  }

  if (isEmpty && emptyState) {
    return (
      <div className="p-6">
        <EmptyState
          icon={emptyState.icon}
          title={emptyState.title}
          description={emptyState.description}
          action={emptyState.action}
        />
      </div>
    );
  }

  return <>{children}</>;
}
