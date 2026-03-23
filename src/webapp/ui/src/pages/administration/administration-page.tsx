import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/layout/page-header';
import { ContextStrip, type ContextStripItem } from '@/components/layout/context-strip';
import { useAdministrationOverview, useAdminUsers, useAuthorization } from '@/hooks';
import { Link } from 'react-router-dom';
import type { AdminUser, AdministrationIntegrationStatus } from '@/lib/api-types';
import { KeyRound, Settings2, Users } from 'lucide-react';

const statusVariant = {
  healthy: 'success',
  degraded: 'warning',
  offline: 'error',
} as const;

export default function AdministrationPage() {
  const { user } = useAuthorization();
  const usersQuery = useAdminUsers();
  const overviewQuery = useAdministrationOverview();

  const isLoading = usersQuery.isLoading || overviewQuery.isLoading;
  const combinedError = (usersQuery.error ?? overviewQuery.error) as Error | null;

  const roleCounts = overviewQuery.data?.role_counts ?? { admin: 0, operator: 0, viewer: 0 };
  const integrations = overviewQuery.data?.integrations ?? [];
  const users = usersQuery.data?.users ?? [];

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
    ],
    [integrations.length, roleCounts.admin, user?.role, users.length]
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

        <div className="flex justify-end">
          <Link
            to="/admin/identity/consent"
            className="rounded-md border border-border/70 px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            Open Identity Consent Center
          </Link>
        </div>

        <ContextStrip items={contextItems} />

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
