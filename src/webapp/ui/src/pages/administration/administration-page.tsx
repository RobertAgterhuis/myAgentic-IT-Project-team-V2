import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/layout/page-header';
import { ContextStrip, type ContextStripItem } from '@/components/layout/context-strip';
import {
  useAdministrationOverview,
  useAdminUsers,
  useAuthorization,
  useOrchestratorPackMetadata,
  usePolicyPacks,
} from '@/hooks';
import { Link } from 'react-router-dom';
import type { AdminUser, AdministrationIntegrationStatus } from '@/lib/api-types';
import { Activity, Grid3X3, KeyRound, Settings2, ShieldAlert, Users } from 'lucide-react';

const PACK_PREFERENCE_STORAGE_KEY = 'administration-preferred-runtime-pack-id';

const statusVariant = {
  healthy: 'success',
  degraded: 'warning',
  offline: 'error',
} as const;

export default function AdministrationPage() {
  const { user } = useAuthorization();
  const usersQuery = useAdminUsers();
  const overviewQuery = useAdministrationOverview();
  const { data: packMetadata } = useOrchestratorPackMetadata();
  const policyPacksQuery = usePolicyPacks();
  const [preferredPackId, setPreferredPackId] = useState<string>('');

  const isLoading = usersQuery.isLoading || overviewQuery.isLoading;
  const combinedError = (usersQuery.error ?? overviewQuery.error) as Error | null;

  const roleCounts = overviewQuery.data?.role_counts ?? { admin: 0, operator: 0, viewer: 0 };
  const integrations = overviewQuery.data?.integrations ?? [];
  const users = usersQuery.data?.users ?? [];
  const activePackId = packMetadata?.pack.id ?? '';

  const runtimePackOptions = useMemo(() => {
    const entries = policyPacksQuery.data?.packs ?? [];
    const byPackId = new Map<
      string,
      {
        id: string;
        label: string;
        version?: string;
        policyCount?: number;
      }
    >();

    for (const pack of entries) {
      byPackId.set(pack.pack_id, {
        id: pack.pack_id,
        label: pack.pack_name || pack.pack_id,
        version: pack.version,
        policyCount: pack.policy_count,
      });
    }

    if (activePackId && !byPackId.has(activePackId)) {
      byPackId.set(activePackId, {
        id: activePackId,
        label: packMetadata?.pack.name || activePackId,
        version: packMetadata?.pack.version,
      });
    }

    return Array.from(byPackId.values()).sort((left, right) =>
      left.label.localeCompare(right.label)
    );
  }, [
    activePackId,
    packMetadata?.pack.name,
    packMetadata?.pack.version,
    policyPacksQuery.data?.packs,
  ]);

  const selectedPackId = preferredPackId || activePackId;
  const selectedPack = runtimePackOptions.find((entry) => entry.id === selectedPackId) ?? null;
  const selectedDiffersFromActive =
    Boolean(selectedPackId) && Boolean(activePackId) && selectedPackId !== activePackId;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PACK_PREFERENCE_STORAGE_KEY)?.trim() ?? '';
      if (stored.length > 0) {
        setPreferredPackId(stored);
      }
    } catch {
      // localStorage may be unavailable in some environments
    }
  }, []);

  useEffect(() => {
    if (!selectedPackId && activePackId) {
      setPreferredPackId(activePackId);
    }
  }, [activePackId, selectedPackId]);

  function handlePackSelectionChange(nextPackId: string) {
    setPreferredPackId(nextPackId);
    try {
      window.localStorage.setItem(PACK_PREFERENCE_STORAGE_KEY, nextPackId);
    } catch {
      // localStorage may be unavailable in some environments
    }
  }

  const contextItems = useMemo<ContextStripItem[]>(
    () => [
      {
        id: 'admin-actors',
        label: 'Users',
        value: String(users.length),
        tone: users.length > 0 ? 'info' : 'neutral',
      },
      {
        id: 'admin-admins',
        label: 'Admins',
        value: String(roleCounts.admin),
        tone: roleCounts.admin > 0 ? 'success' : 'warning',
      },
      {
        id: 'admin-integrations',
        label: 'Integrations',
        value: String(integrations.length),
        tone: integrations.length > 0 ? 'info' : 'neutral',
      },
      {
        id: 'admin-role',
        label: 'Current role',
        value: user?.role ?? 'unknown',
        tone: user?.role === 'admin' ? 'success' : 'warning',
      },
      {
        id: 'admin-runtime-pack',
        label: 'Runtime pack',
        value: packMetadata?.pack.name ?? 'unknown',
        tone: activePackId ? 'info' : 'neutral',
      },
    ],
    [
      activePackId,
      integrations.length,
      packMetadata?.pack.name,
      roleCounts.admin,
      user?.role,
      users.length,
    ]
  );

  return (
    <PageShell
      isLoading={isLoading}
      loadingLabel="Loading administration data..."
      error={combinedError}
      onRetry={() => {
        void usersQuery.refetch();
        void overviewQuery.refetch();
      }}
      isEmpty={!isLoading && users.length === 0 && integrations.length === 0}
      emptyState={{
        icon: <Settings2 className="size-8" />,
        title: 'No administration data available',
        description: 'This view requires admin APIs and policy telemetry to be available.',
      }}
    >
      <div className="space-y-6 p-6" data-testid="administration-page">
        <PageHeader
          title="Administration"
          subtitle="Manage RBAC visibility and integration health for platform governance."
          chips={[
            {
              id: 'administration-chip-role',
              label: `Role: ${user?.role ?? 'unknown'}`,
              tone: user?.role === 'admin' ? 'success' : 'warning',
            },
            {
              id: 'administration-chip-users',
              label: `${users.length} users`,
              tone: 'info',
            },
          ]}
        />

        <div className="flex flex-wrap justify-end gap-2">
          <Link
            to="/admin/identity/consent"
            className="rounded-md border border-border/70 px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            Open Identity Consent Center
          </Link>
          <Link
            to="/admin/mcp/matrix"
            className="rounded-md border border-border/70 px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            <Grid3X3 className="mr-1.5 inline-block size-3.5 align-text-bottom" />
            Permission Matrix
          </Link>
          <Link
            to="/admin/mcp/overrides"
            className="rounded-md border border-border/70 px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            <ShieldAlert className="mr-1.5 inline-block size-3.5 align-text-bottom" />
            Override Console
          </Link>
          <Link
            to="/admin/mcp/diagnostics"
            className="rounded-md border border-border/70 px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            <Activity className="mr-1.5 inline-block size-3.5 align-text-bottom" />
            MCP Diagnostics
          </Link>
        </div>

        <ContextStrip items={contextItems} />

        <Card elevation="flat" className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Runtime pack settings</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose a preferred runtime pack target for administration workflows.
              </p>
            </div>
            <Badge variant={selectedDiffersFromActive ? 'warning' : 'success'}>
              {selectedDiffersFromActive
                ? 'Target differs from active pack'
                : 'Active pack selected'}
            </Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1 rounded-lg border border-border/70 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Active runtime pack
              </p>
              <p className="text-sm font-medium">{packMetadata?.pack.name ?? 'Unavailable'}</p>
              <p className="text-xs text-muted-foreground">
                ID: {activePackId || 'n/a'}
                {packMetadata?.pack.version ? ` • v${packMetadata.pack.version}` : ''}
              </p>
            </div>

            <div className="space-y-2 rounded-lg border border-border/70 p-3">
              <label
                htmlFor="runtime-pack-select"
                className="text-xs uppercase tracking-wide text-muted-foreground"
              >
                Preferred target pack
              </label>
              <select
                id="runtime-pack-select"
                value={selectedPackId}
                onChange={(event) => handlePackSelectionChange(event.target.value)}
                className="h-9 w-full rounded-md border border-input/80 bg-background px-3 text-sm"
                disabled={runtimePackOptions.length === 0}
              >
                {runtimePackOptions.length === 0 ? (
                  <option value="">No pack metadata available</option>
                ) : (
                  runtimePackOptions.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label} ({entry.id})
                    </option>
                  ))
                )}
              </select>
              <p className="text-xs text-muted-foreground">
                {selectedPack
                  ? `Selected: ${selectedPack.label}${selectedPack.version ? ` (v${selectedPack.version})` : ''}${typeof selectedPack.policyCount === 'number' ? ` • ${selectedPack.policyCount} policies` : ''}`
                  : 'No target pack selected yet.'}
              </p>
            </div>
          </div>

          {policyPacksQuery.isError ? (
            <p className="text-xs text-warning">
              Policy pack catalog is currently unavailable. Runtime metadata remains visible from
              the active pack.
            </p>
          ) : null}
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card elevation="flat" className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-info" />
              <h2 className="text-sm font-semibold">Role directory</h2>
            </div>

            {users.length === 0 ? (
              <EmptyState title="No users" description="No user directory entries were returned." />
            ) : (
              <div className="space-y-2">
                {users.map((entry: AdminUser) => (
                  <div key={entry.id} className="rounded-lg border border-border/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{entry.name || entry.email}</p>
                        <p className="text-xs text-muted-foreground">{entry.email}</p>
                      </div>
                      <Badge
                        variant={
                          entry.role === 'admin'
                            ? 'success'
                            : entry.role === 'operator'
                              ? 'info'
                              : 'outline'
                        }
                      >
                        {entry.role}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card elevation="flat" className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-info" />
              <h2 className="text-sm font-semibold">Integration health</h2>
            </div>

            {integrations.length === 0 ? (
              <EmptyState
                title="No integration signals"
                description="No integration status records were returned by administration APIs."
              />
            ) : (
              <div className="space-y-2">
                {integrations.map((integration: AdministrationIntegrationStatus) => (
                  <div key={integration.id} className="rounded-lg border border-border/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{integration.label}</p>
                      <Badge variant={statusVariant[integration.status]}>
                        {integration.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{integration.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
