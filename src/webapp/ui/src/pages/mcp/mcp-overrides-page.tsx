// Copyright (c) 2026 Robert Agterhuis. MIT License.
// M-INFRA-3c #848: MCP Override Console page — /admin/mcp/overrides

import { useMemo, useState } from 'react';
import { ShieldAlert, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/layout/page-header';
import { ContextStrip, type ContextStripItem } from '@/components/layout/context-strip';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  useMcpOverrides,
  useCreateMcpOverride,
  useExpireMcpOverride,
  PERMISSION_LEVEL_LABELS,
  type PermissionLevel,
  type McpOverride,
} from '@/hooks/use-mcp-experience';

const PERMISSION_LEVELS: PermissionLevel[] = ['N', 'D', 'R', 'P', 'W', 'A', 'X'];

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

function isExpired(override: McpOverride): boolean {
  return !!override.expiredAt || new Date(override.expiry) < new Date();
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function McpOverridesPage() {
  const query = useMcpOverrides();
  const createOverride = useCreateMcpOverride();
  const expireOverride = useExpireMcpOverride();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    agent_id: '',
    server_id: '',
    tool_id: '',
    permission_level: 'R' as PermissionLevel,
    override_reason: '',
    justification: '',
    expiry: '',
  });

  const overrides = useMemo(() => query.data?.overrides ?? [], [query.data]);
  const activeOverrides = useMemo(() => overrides.filter((o) => !isExpired(o)), [overrides]);

  const contextItems = useMemo<ContextStripItem[]>(
    () => [
      {
        id: 'ovr-total',
        label: 'Active overrides',
        value: String(activeOverrides.length),
        tone: activeOverrides.length > 0 ? 'warning' : 'success',
      },
      {
        id: 'ovr-expiring',
        label: 'Expiring soon',
        value: String(
          activeOverrides.filter((o) => {
            const exp = new Date(o.expiry);
            const diff = exp.getTime() - Date.now();
            return diff > 0 && diff < 24 * 60 * 60 * 1000;
          }).length
        ),
        tone: 'warning',
      },
    ],
    [activeOverrides]
  );

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.agent_id || !form.server_id || !form.override_reason || !form.expiry) return;
    createOverride.mutate(
      {
        agent_id: form.agent_id,
        server_id: form.server_id,
        tool_id: form.tool_id || undefined,
        permission_level: form.permission_level,
        override_reason: form.override_reason,
        justification: form.justification,
        expiry: form.expiry,
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setForm({
            agent_id: '',
            server_id: '',
            tool_id: '',
            permission_level: 'R',
            override_reason: '',
            justification: '',
            expiry: '',
          });
        },
      }
    );
  }

  return (
    <PageShell
      isLoading={query.isLoading}
      loadingLabel="Loading override console..."
      error={(query.error as Error) ?? null}
      onRetry={() => {
        void query.refetch();
      }}
      isEmpty={false}
    >
      <div className="space-y-6 p-6" data-testid="mcp-overrides-page">
        <PageHeader
          title="Override Console"
          subtitle="Manage time-bound permission overrides for agents and MCP servers."
          chips={[{ id: 'chip-milestone', label: 'M-INFRA-3c', tone: 'info' }]}
        />

        <ContextStrip items={contextItems} />

        {showForm && (
          <Card elevation="flat" className="p-4">
            <h2 className="mb-3 text-sm font-semibold">Create override</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Agent ID *</label>
                <input
                  name="agent_id"
                  value={form.agent_id}
                  onChange={handleFormChange}
                  required
                  placeholder="e.g. developer"
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Server ID *</label>
                <input
                  name="server_id"
                  value={form.server_id}
                  onChange={handleFormChange}
                  required
                  placeholder="e.g. github-mcp"
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Tool ID (optional)
                </label>
                <input
                  name="tool_id"
                  value={form.tool_id}
                  onChange={handleFormChange}
                  placeholder="Leave empty for server-level"
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Permission level *
                </label>
                <select
                  name="permission_level"
                  value={form.permission_level}
                  onChange={handleFormChange}
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {PERMISSION_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl} — {PERMISSION_LEVEL_LABELS[lvl]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Override reason *
                </label>
                <input
                  name="override_reason"
                  value={form.override_reason}
                  onChange={handleFormChange}
                  required
                  placeholder="e.g. hotfix-incident-2026"
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Expires at (ISO-8601) *
                </label>
                <input
                  name="expiry"
                  type="datetime-local"
                  value={form.expiry}
                  onChange={handleFormChange}
                  required
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Justification</label>
                <textarea
                  name="justification"
                  value={form.justification}
                  onChange={handleFormChange}
                  rows={2}
                  placeholder="Reason for this override (audit trail)"
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="col-span-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={createOverride.isPending}>
                  {createOverride.isPending ? 'Creating...' : 'Create override'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        <Card elevation="flat" className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Active overrides</h2>
            <div className="flex items-center gap-2">
              {!showForm && (
                <Button size="sm" onClick={() => setShowForm(true)}>
                  <Plus className="mr-1.5 size-3" /> New override
                </Button>
              )}
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

          {activeOverrides.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <ShieldAlert className="size-6" />
              <p className="text-sm">No active overrides</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-200 border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2">Agent</th>
                    <th className="px-2 py-2">Server</th>
                    <th className="px-2 py-2">Tool</th>
                    <th className="px-2 py-2">Level</th>
                    <th className="px-2 py-2">Reason</th>
                    <th className="px-2 py-2">Author</th>
                    <th className="px-2 py-2">Expires</th>
                    <th className="px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOverrides.map((override) => (
                    <tr
                      key={override.id}
                      className="border-b border-border/60 align-top hover:bg-muted/40"
                    >
                      <td className="px-2 py-3 font-medium">{override.agentId}</td>
                      <td className="px-2 py-3">{override.serverId}</td>
                      <td className="px-2 py-3 text-muted-foreground">{override.toolId ?? '—'}</td>
                      <td className="px-2 py-3">
                        <Badge
                          variant={permissionVariant(override.permissionLevel)}
                          title={PERMISSION_LEVEL_LABELS[override.permissionLevel]}
                        >
                          {override.permissionLevel}
                        </Badge>
                      </td>
                      <td className="px-2 py-3 max-w-40 truncate" title={override.overrideReason}>
                        {override.overrideReason}
                      </td>
                      <td className="px-2 py-3">{override.author}</td>
                      <td className="px-2 py-3 text-muted-foreground">
                        {formatDate(override.expiry)}
                      </td>
                      <td className="px-2 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => expireOverride.mutate(override.id)}
                          disabled={expireOverride.isPending}
                          title="Expire override"
                          aria-label={`Expire override ${override.toolId ?? `${override.agentId} on ${override.serverId}`}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </td>
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
