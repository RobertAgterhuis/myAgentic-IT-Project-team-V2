/**
 * Sessions page — list all orchestrator sessions with status and progress.
 * M15 / Issue #M15-028
 */
import { useNavigate } from 'react-router-dom';
import { Heading, Text } from '@/components/ui/typography';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { AlertBanner } from '@/components/ui/alert-banner';
import { ProgressBar } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useSessions } from '@/hooks';
import type { SessionStatus } from '@/lib/api-types';
import { Activity, Clock, CheckCircle, XCircle, Pause, RefreshCw } from 'lucide-react';

const statusConfig: Record<
  SessionStatus,
  { variant: 'success' | 'warning' | 'error' | 'info' | 'secondary'; icon: React.ReactNode }
> = {
  active: { variant: 'info', icon: <Activity className="size-3" /> },
  completed: { variant: 'success', icon: <CheckCircle className="size-3" /> },
  failed: { variant: 'error', icon: <XCircle className="size-3" /> },
  paused: { variant: 'warning', icon: <Pause className="size-3" /> },
};

export default function SessionsPage() {
  const { data, isLoading, error, refetch } = useSessions();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner label="Loading sessions…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <AlertBanner variant="error">
          <div className="flex items-center justify-between gap-4 w-full">
            <span>Failed to load sessions: {(error as Error).message}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-3 mr-1.5" /> Retry
            </Button>
          </div>
        </AlertBanner>
      </div>
    );
  }

  const sessions = data?.sessions ?? [];

  return (
    <div className="p-6 space-y-6" data-testid="sessions-page">
      {/* Header */}
      <div>
        <Heading level={1}>
          <Activity className="size-5 inline mr-2" />
          Sessions
        </Heading>
        <Text muted>All orchestrator sessions — click a session to view details</Text>
      </div>

      {/* Session list */}
      {sessions.length === 0 ? (
        <EmptyState
          icon={<Activity className="size-8" />}
          title="No sessions"
          description="Sessions will appear once you start a CREATE, AUDIT, or FEATURE command."
        />
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const config = statusConfig[session.status];
            return (
              <Card
                key={session.id}
                clickable
                onClick={() => navigate(`/sessions/${encodeURIComponent(session.id)}`)}
                elevation="outlined"
                className="transition-colors hover:border-primary/50"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant={config.variant} className="gap-1 shrink-0">
                      {config.icon}
                      {session.status}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{session.project}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.flow} &middot; {session.phase}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="w-32 hidden sm:block">
                      <ProgressBar value={session.progress} showPercentage />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      <time dateTime={session.started_at}>
                        {new Date(session.started_at).toLocaleDateString()}
                      </time>
                    </div>
                  </div>
                </div>
                {session.current_agent && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Current agent: <span className="font-medium">{session.current_agent}</span>
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
