// Copyright (c) 2026 Robert Agterhuis. MIT License.
// M-INFRA-3c #847: MCP Agent View page — /admin/mcp/agents/:agentId

import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Bot, ArrowLeft, RefreshCw } from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/layout/page-header';
import { ContextStrip, type ContextStripItem } from '@/components/layout/context-strip';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  useMcpAgentPermissions,
  PERMISSION_LEVEL_LABELS,
  type PermissionLevel,
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

function healthVariant(status: string): 'success' | 'warning' | 'error' {
  if (status === 'healthy') return 'success';
  if (status === 'degraded') return 'warning';
  return 'error';
}

export default function McpAgentViewPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const query = useMcpAgentPermissions(agentId);

  const agent = query.data?.agent;
  const permissions = useMemo(() => query.data?.permissions ?? [], [query.data]);

  const contextItems = useMemo<ContextStripItem[]>(
    () => [
      {
        id: 'av-posture',
        label: 'Control posture',
        value: agent?.controlPosture ?? '—',
        tone:
          agent?.controlPosture === 'strict'
            ? 'critical'
            : agent?.controlPosture === 'balanced'
              ? 'warning'
              : 'info',
      },
      {
        id: 'av-identity',
        label: 'Workload identity',
        value: agent?.requiresWorkloadIdentity ? 'Required' : 'Optional',
        tone: agent?.requiresWorkloadIdentity ? 'warning' : 'success',
      },
      {
        id: 'av-servers',
        label: 'Servers',
        value: String(permissions.length),
        tone: 'info',
      },
      {
        id: 'av-blocked',
        label: 'Blocked',
        value: String(permissions.filter((p) => p.blocked).length),
        tone: 'critical',
      },
    ],
    [agent, permissions]
  );

  return (
    <PageShell
      isLoading={query.isLoading}
      loadingLabel={`Loading permissions for ${agentId ?? 'agent'}...`}
      error={(query.error as Error) ?? null}
      onRetry={() => {
        void query.refetch();
      }}
      isEmpty={!query.isLoading && !agent}
      emptyState={{
        icon: <Bot className="size-8" />,
        title: 'Agent not found',
        description: `No agent with id "${agentId}" was found in the registry.`,
      }}
    >
      <div className="space-y-6 p-6" data-testid="mcp-agent-view-page">
        <div className="flex items-center gap-2">
          <Link
            to="/admin/mcp/matrix"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Permission Matrix
          </Link>
        </div>

        <PageHeader
          title={agentId ?? 'Agent'}
          subtitle={`Effective permissions for ${agent?.category ?? 'agent'} — ${agent?.templateCategory ?? ''}`}
          chips={[
            { id: 'chip-category', label: agent?.category ?? '', tone: 'info' },
            { id: 'chip-milestone', label: 'M-INFRA-3c', tone: 'info' },
          ]}
        />

        {agent && <ContextStrip items={contextItems} />}

        <Card elevation="flat" className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Server permissions</h2>
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

          <div className="overflow-x-auto">
            <table className="w-full min-w-170 border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2">Server</th>
                  <th className="px-2 py-2">Health</th>
                  <th className="px-2 py-2">Risk</th>
                  <th className="px-2 py-2">Permission</th>
                  <th className="px-2 py-2">Approval</th>
                  <th className="px-2 py-2">Blocked</th>
                  <th className="px-2 py-2">Env scope</th>
                </tr>
              </thead>
              <tbody>
                {permissions.map((perm) => (
                  <tr
                    key={perm.server.id}
                    className="border-b border-border/60 align-top hover:bg-muted/40"
                  >
                    <td className="px-2 py-3 font-medium">{perm.server.id}</td>
                    <td className="px-2 py-3">
                      <Badge variant={healthVariant(perm.server.healthStatus)}>
                        {perm.server.healthStatus}
                      </Badge>
                    </td>
                    <td className="px-2 py-3">
                      <Badge
                        variant={
                          perm.server.risk === 'high'
                            ? 'error'
                            : perm.server.risk === 'medium'
                              ? 'warning'
                              : 'success'
                        }
                      >
                        {perm.server.risk}
                      </Badge>
                    </td>
                    <td className="px-2 py-3">
                      <Badge
                        variant={permissionVariant(perm.permissionLevel)}
                        title={PERMISSION_LEVEL_LABELS[perm.permissionLevel]}
                      >
                        {perm.permissionLevel} — {PERMISSION_LEVEL_LABELS[perm.permissionLevel]}
                      </Badge>
                    </td>
                    <td className="px-2 py-3">
                      {perm.approvalRequired ? (
                        <Badge variant="warning">Required</Badge>
                      ) : (
                        <Badge variant="outline">Not required</Badge>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      {perm.blocked ? (
                        <Badge variant="error">Blocked</Badge>
                      ) : (
                        <Badge variant="success">Allowed</Badge>
                      )}
                    </td>
                    <td className="px-2 py-3 text-muted-foreground">{perm.envScope ?? 'All'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
