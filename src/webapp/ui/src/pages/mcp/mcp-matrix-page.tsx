// Copyright (c) 2026 Robert Agterhuis. MIT License.
// M-INFRA-3c #846: Agent Permission Matrix page — /admin/mcp/matrix

import { useMemo, useState } from 'react';
import { Grid3X3, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/layout/page-header';
import { ContextStrip, type ContextStripItem } from '@/components/layout/context-strip';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  useMcpMatrix,
  PERMISSION_LEVEL_LABELS,
  type PermissionLevel,
  type MatrixEntry,
} from '@/hooks/use-mcp-experience';

function permissionVariant(
  level: PermissionLevel
): 'success' | 'warning' | 'error' | 'info' | 'outline' {
  switch (level) {
    case 'A':
    case 'X':
      return 'success';
    case 'W':
    case 'P':
      return 'warning';
    case 'N':
      return 'error';
    case 'R':
      return 'info';
    default:
      return 'outline';
  }
}

export default function McpMatrixPage() {
  const query = useMcpMatrix();
  const [filterAgent, setFilterAgent] = useState('');

  const agents = useMemo(() => query.data?.agents ?? [], [query.data]);
  const servers = useMemo(() => query.data?.servers ?? [], [query.data]);
  const matrix = useMemo(() => query.data?.matrix ?? [], [query.data]);

  const filteredAgents = useMemo(
    () =>
      filterAgent
        ? agents.filter((a) => a.id.toLowerCase().includes(filterAgent.toLowerCase()))
        : agents,
    [agents, filterAgent]
  );

  const matrixLookup = useMemo(() => {
    const map = new Map<string, MatrixEntry>();
    for (const entry of matrix) {
      map.set(`${entry.agentId}:${entry.serverId}`, entry);
    }
    return map;
  }, [matrix]);

  const contextItems = useMemo<ContextStripItem[]>(
    () => [
      { id: 'mat-agents', label: 'Agents', value: String(agents.length), tone: 'info' },
      { id: 'mat-servers', label: 'Servers', value: String(servers.length), tone: 'info' },
      {
        id: 'mat-cells',
        label: 'Policy cells',
        value: String(matrix.length),
        tone: matrix.length > 0 ? 'success' : 'warning',
      },
      {
        id: 'mat-blocked',
        label: 'Blocked (N)',
        value: String(matrix.filter((e) => e.permissionLevel === 'N').length),
        tone: 'critical',
      },
    ],
    [agents.length, matrix, servers.length]
  );

  return (
    <PageShell
      isLoading={query.isLoading}
      loadingLabel="Loading permission matrix..."
      error={(query.error as Error) ?? null}
      onRetry={() => {
        void query.refetch();
      }}
      isEmpty={!query.isLoading && agents.length === 0}
      emptyState={{
        icon: <Grid3X3 className="size-8" />,
        title: 'No permission matrix data',
        description: 'Run agent and server sync first: npm run plugin -- bootstrap --apply',
      }}
    >
      <div className="space-y-6 p-6" data-testid="mcp-matrix-page">
        <PageHeader
          title="Agent Permission Matrix"
          subtitle="View effective permission levels for each agent × MCP server combination."
          chips={[{ id: 'chip-milestone', label: 'M-INFRA-3c', tone: 'info' }]}
        />

        <ContextStrip items={contextItems} />

        <Card elevation="flat" className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Permission matrix</h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Filter agents..."
                value={filterAgent}
                onChange={(e) => setFilterAgent(e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void query.refetch();
                }}
              >
                <RefreshCw className="mr-1.5 size-3" /> Refresh
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="min-w-36 px-2 py-2 text-left">Agent</th>
                  {servers.map((server) => (
                    <th key={server.id} className="px-2 py-2 text-center">
                      <span className="block max-w-24 truncate" title={server.id}>
                        {server.id}
                      </span>
                      <Badge
                        variant={
                          server.healthStatus === 'healthy'
                            ? 'success'
                            : server.healthStatus === 'degraded'
                              ? 'warning'
                              : 'error'
                        }
                        className="mt-1 text-[10px]"
                      >
                        {server.healthStatus}
                      </Badge>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAgents.map((agent) => (
                  <tr key={agent.id} className="border-b border-border/60 hover:bg-muted/40">
                    <td className="px-2 py-2">
                      <Link
                        to={`/admin/mcp/agents/${encodeURIComponent(agent.id)}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {agent.id}
                      </Link>
                    </td>
                    {servers.map((server) => {
                      const entry = matrixLookup.get(`${agent.id}:${server.id}`);
                      const level = entry?.permissionLevel ?? 'N';
                      return (
                        <td key={server.id} className="px-2 py-2 text-center">
                          <Badge
                            variant={permissionVariant(level)}
                            title={PERMISSION_LEVEL_LABELS[level]}
                          >
                            {level}
                          </Badge>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
            <span className="text-xs text-muted-foreground">Legend:</span>
            {(Object.entries(PERMISSION_LEVEL_LABELS) as [PermissionLevel, string][]).map(
              ([level, label]) => (
                <Badge key={level} variant={permissionVariant(level)} className="text-xs">
                  {level} — {label}
                </Badge>
              )
            )}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
