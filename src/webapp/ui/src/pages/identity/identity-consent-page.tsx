import { useMemo } from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/layout/page-header';
import { ContextStrip, type ContextStripItem } from '@/components/layout/context-strip';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  useGrantIdentityConsent,
  useIdentityConsentCenter,
  useRefreshIdentityConsent,
  useRevokeIdentityConsent,
  type ConsentCenterEntry,
} from '@/hooks/use-identity-consent';

function consentVariant(status: ConsentCenterEntry['consent_status']) {
  switch (status) {
    case 'consent_granted':
      return 'success' as const;
    case 'pending_consent':
    case 'auth_pending':
      return 'warning' as const;
    case 'consent_revoked':
    case 'blocked_by_policy':
      return 'error' as const;
    default:
      return 'outline' as const;
  }
}

export default function IdentityConsentPage() {
  const query = useIdentityConsentCenter();
  const grantConsent = useGrantIdentityConsent();
  const revokeConsent = useRevokeIdentityConsent();
  const refreshConsent = useRefreshIdentityConsent();

  const entries = useMemo(() => query.data?.entries ?? [], [query.data]);

  const contextItems = useMemo<ContextStripItem[]>(() => {
    const granted = entries.filter((entry) => entry.consent_status === 'consent_granted').length;
    const pending = entries.filter((entry) => entry.consent_status === 'pending_consent').length;
    const blocked = entries.filter(
      (entry) =>
        entry.consent_status === 'blocked_by_policy' || entry.consent_status === 'auth_pending'
    ).length;

    return [
      { id: 'identity-total', label: 'Roles', value: String(entries.length), tone: 'info' },
      { id: 'identity-granted', label: 'Granted', value: String(granted), tone: 'success' },
      { id: 'identity-pending', label: 'Pending', value: String(pending), tone: 'warning' },
      { id: 'identity-blocked', label: 'Blocked/Auth', value: String(blocked), tone: 'critical' },
    ];
  }, [entries]);

  return (
    <PageShell
      isLoading={query.isLoading}
      loadingLabel="Loading identity consent center..."
      error={(query.error as Error) ?? null}
      onRetry={() => {
        void query.refetch();
      }}
      isEmpty={!query.isLoading && entries.length === 0}
      emptyState={{
        icon: <ShieldCheck className="size-8" />,
        title: 'No agent identities found',
        description: 'Run identity bootstrap first to seed AgentWorkloadIdentity records.',
      }}
    >
      <div className="space-y-6 p-6" data-testid="identity-consent-page">
        <PageHeader
          title="Consent Center"
          subtitle="Manage per-agent-role consent status and distinguish admin consent from user delegated consent."
          chips={[{ id: 'identity-chip', label: 'M-INFRA-2c', tone: 'info' }]}
        />

        <ContextStrip items={contextItems} />

        <Card elevation="flat" className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Agent workload identity consent matrix</h2>
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
            <table className="w-full min-w-230 border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2">Agent Role</th>
                  <th className="px-2 py-2">Consent Status</th>
                  <th className="px-2 py-2">Consent Requirements</th>
                  <th className="px-2 py-2">Credential</th>
                  <th className="px-2 py-2">Effective</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.agent_role} className="border-b border-border/60 align-top">
                    <td className="px-2 py-3 font-medium">{entry.agent_role}</td>
                    <td className="px-2 py-3">
                      <Badge variant={consentVariant(entry.consent_status)}>
                        {entry.consent_status}
                      </Badge>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {entry.requires_admin_consent ? (
                          <Badge variant="warning">Admin consent required</Badge>
                        ) : (
                          <Badge variant="outline">No admin consent required</Badge>
                        )}
                        {entry.user_consents_required.length > 0 ? (
                          <Badge variant="info">
                            User consent: {entry.user_consents_required.length}
                          </Badge>
                        ) : (
                          <Badge variant="outline">No delegated user consent</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-muted-foreground">
                      <div>{entry.credential_type}</div>
                      <div className="text-xs">
                        {entry.credential_expires_at ? entry.credential_expires_at : 'No expiry'}
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <Badge variant={entry.effective_enabled ? 'success' : 'outline'}>
                        {entry.effective_enabled ? 'enabled' : 'blocked'}
                      </Badge>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          disabled={grantConsent.isPending}
                          onClick={async () => {
                            const result = await grantConsent.mutateAsync(entry.agent_role);
                            if (result.admin_consent_url) {
                              window.open(
                                result.admin_consent_url,
                                '_blank',
                                'noopener,noreferrer'
                              );
                            }
                          }}
                        >
                          Grant
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={revokeConsent.isPending}
                          onClick={() => {
                            void revokeConsent.mutateAsync(entry.agent_role);
                          }}
                        >
                          Revoke
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={refreshConsent.isPending}
                          onClick={() => {
                            void refreshConsent.mutateAsync(entry.agent_role);
                          }}
                        >
                          Refresh
                        </Button>
                      </div>
                    </td>
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
