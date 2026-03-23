// Copyright (c) 2026 Robert Agterhuis. MIT License.
// M-INFRA-3c #849: MCP Diagnostics page — /admin/mcp/diagnostics

import { useMemo } from 'react';
import { Activity, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/layout/page-header';
import { ContextStrip, type ContextStripItem } from '@/components/layout/context-strip';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMcpDiagnostics, useMcpReconcileRuns } from '@/hooks/use-mcp-experience';

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function McpDiagnosticsPage() {
  const diagQuery = useMcpDiagnostics();
  const runsQuery = useMcpReconcileRuns();

  const isLoading = diagQuery.isLoading || runsQuery.isLoading;
  const combinedError = (diagQuery.error ?? runsQuery.error) as Error | null;

  const unhealthyServers = useMemo(() => diagQuery.data?.unhealthyServers ?? [], [diagQuery.data]);
  const runs = useMemo(() => runsQuery.data?.runs ?? [], [runsQuery.data]);

  const contextItems = useMemo<ContextStripItem[]>(
    () => [
      {
        id: 'diag-agents',
        label: 'Total agents',
        value: String(diagQuery.data?.totalAgents ?? 0),
        tone: 'info',
      },
      {
        id: 'diag-servers',
        label: 'Total servers',
        value: String(diagQuery.data?.totalServers ?? 0),
        tone: 'info',
      },
      {
        id: 'diag-unhealthy',
        label: 'Unhealthy',
        value: String(unhealthyServers.length),
        tone: unhealthyServers.length > 0 ? 'critical' : 'success',
      },
      {
        id: 'diag-authpending',
        label: 'Auth pending',
        value: String(diagQuery.data?.authPendingCount ?? 0),
        tone: (diagQuery.data?.authPendingCount ?? 0) > 0 ? 'warning' : 'success',
      },
    ],
    [diagQuery.data, unhealthyServers.length]
  );

  return (
    <PageShell
      isLoading={isLoading}
      loadingLabel="Loading MCP diagnostics..."
      error={combinedError}
      onRetry={() => {
        void diagQuery.refetch();
        void runsQuery.refetch();
      }}
      isEmpty={false}
    >
      <div className="space-y-6 p-6" data-testid="mcp-diagnostics-page">
        <PageHeader
          title="MCP Diagnostics"
          subtitle="Server health, auth-pending agents, and reconcile run history."
          chips={[{ id: 'chip-milestone', label: 'M-INFRA-3c', tone: 'info' }]}
        />

        <ContextStrip items={contextItems} />

        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void diagQuery.refetch();
              void runsQuery.refetch();
            }}
          >
            <RefreshCw className="mr-1.5 size-3" /> Refresh
          </Button>
        </div>

        {/* Unhealthy servers */}
        <Card elevation="flat" className="space-y-3 p-4">
          <h2 className="text-sm font-semibold">Unhealthy MCP servers</h2>
          {unhealthyServers.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-success" />
              All MCP servers are healthy or degraded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2">Server</th>
                    <th className="px-2 py-2">Endpoint</th>
                    <th className="px-2 py-2">Risk</th>
                    <th className="px-2 py-2">Auth type</th>
                    <th className="px-2 py-2">Consecutive failures</th>
                  </tr>
                </thead>
                <tbody>
                  {unhealthyServers.map((server) => (
                    <tr key={server.id} className="border-b border-border/60 align-top">
                      <td className="px-2 py-3 font-medium text-destructive">{server.id}</td>
                      <td className="px-2 py-3 text-muted-foreground">{server.endpoint}</td>
                      <td className="px-2 py-3">
                        <Badge
                          variant={
                            server.risk === 'high'
                              ? 'error'
                              : server.risk === 'medium'
                                ? 'warning'
                                : 'success'
                          }
                        >
                          {server.risk}
                        </Badge>
                      </td>
                      <td className="px-2 py-3">
                        <Badge variant="outline">{server.authType}</Badge>
                      </td>
                      <td className="px-2 py-3 text-destructive">{server.consecutiveFailures}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Auth pending summary */}
        {(diagQuery.data?.authPendingCount ?? 0) > 0 && (
          <Card elevation="flat" className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-warning" />
              <span className="text-sm font-semibold text-warning">
                {diagQuery.data?.authPendingCount} server
                {(diagQuery.data?.authPendingCount ?? 0) > 1 ? 's' : ''} awaiting authentication
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Run <code className="rounded bg-muted px-1 py-0.5">npm run plugin -- doctor</code> for
              specific remediation steps.
            </p>
          </Card>
        )}

        {/* Reconcile run history */}
        <Card elevation="flat" className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Reconcile run history</h2>
            <Badge variant="outline">{runs.length} record(s)</Badge>
          </div>

          {runs.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="size-4" />
              No reconcile runs yet. Run{' '}
              <code className="rounded bg-muted px-1 py-0.5">
                npm run plugin -- reconcile --apply
              </code>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2">Run at</th>
                    <th className="px-2 py-2">By</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Duration</th>
                    <th className="px-2 py-2">Added</th>
                    <th className="px-2 py-2">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr
                      key={run.id}
                      className="border-b border-border/60 align-top hover:bg-muted/40"
                    >
                      <td className="px-2 py-3 text-muted-foreground">{formatDate(run.ranAt)}</td>
                      <td className="px-2 py-3">{run.ranBy}</td>
                      <td className="px-2 py-3">
                        <Badge
                          variant={
                            run.status === 'success'
                              ? 'success'
                              : run.status === 'dry_run'
                                ? 'info'
                                : 'error'
                          }
                        >
                          {run.status}
                        </Badge>
                      </td>
                      <td className="px-2 py-3 text-muted-foreground">
                        {formatDuration(run.durationMs)}
                      </td>
                      <td className="px-2 py-3">{run.changesApplied.added}</td>
                      <td className="px-2 py-3">{run.changesApplied.updated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
