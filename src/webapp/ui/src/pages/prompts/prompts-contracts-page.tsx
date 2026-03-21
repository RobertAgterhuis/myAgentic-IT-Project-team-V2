import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/layout/page-header';
import { ContextStrip, type ContextStripItem } from '@/components/layout/context-strip';
import { usePromptContractAssets } from '@/hooks';
import type { PromptContractAsset } from '@/lib/api-types';
import { ClipboardList, FileCode2, Scale } from 'lucide-react';

const typeIcon = {
  questionnaire: <ClipboardList className="size-4 text-info" />,
  decision: <Scale className="size-4 text-warning" />,
  policy: <FileCode2 className="size-4 text-success" />,
};

const governanceVariant = {
  compliant: 'success',
  review: 'warning',
  attention: 'error',
} as const;

export default function PromptsContractsPage() {
  const { data, isLoading, error, refetch } = usePromptContractAssets();

  const grouped = useMemo(() => {
    const assets: PromptContractAsset[] = data?.assets ?? [];
    return {
      questionnaires: assets.filter((asset: PromptContractAsset) => asset.type === 'questionnaire'),
      decisions: assets.filter((asset: PromptContractAsset) => asset.type === 'decision'),
      policies: assets.filter((asset: PromptContractAsset) => asset.type === 'policy'),
    };
  }, [data?.assets]);

  const contextItems = useMemo<ContextStripItem[]>(
    () => [
      {
        id: 'prompts-total',
        label: 'Total assets',
        value: String(data?.summary.total_assets ?? 0),
        tone: (data?.summary.total_assets ?? 0) > 0 ? 'info' : 'neutral',
      },
      {
        id: 'prompts-compliant',
        label: 'Compliant',
        value: String(data?.summary.compliant_assets ?? 0),
        tone: 'success',
      },
      {
        id: 'prompts-review',
        label: 'Review',
        value: String(data?.summary.review_assets ?? 0),
        tone: (data?.summary.review_assets ?? 0) > 0 ? 'warning' : 'neutral',
      },
      {
        id: 'prompts-attention',
        label: 'Attention',
        value: String(data?.summary.attention_assets ?? 0),
        tone: (data?.summary.attention_assets ?? 0) > 0 ? 'critical' : 'success',
      },
    ],
    [
      data?.summary.attention_assets,
      data?.summary.compliant_assets,
      data?.summary.review_assets,
      data?.summary.total_assets,
    ]
  );

  return (
    <PageShell
      isLoading={isLoading}
      loadingLabel="Loading prompt and contract assets..."
      error={error as Error | null}
      onRetry={() => refetch()}
      isEmpty={(data?.assets.length ?? 0) === 0}
      emptyState={{
        icon: <FileCode2 className="size-8" />,
        title: 'No prompt or contract assets found',
        description:
          'Assets appear once questionnaires, decisions, or governance policies are available.',
      }}
    >
      <div className="space-y-6 p-6" data-testid="prompts-contracts-page">
        <PageHeader
          title="Prompts & Contracts"
          subtitle="Review prompt assets and governance contracts with explicit compliance status across domains."
          chips={[
            {
              id: 'prompts-chip-updated',
              label: data?.generated_at
                ? new Date(data.generated_at).toLocaleString()
                : 'No timestamp',
              tone: 'info',
            },
            {
              id: 'prompts-chip-count',
              label: `${data?.summary.total_assets ?? 0} assets`,
              tone: 'default',
            },
          ]}
        />

        <ContextStrip items={contextItems} />

        <div className="grid gap-4 xl:grid-cols-3">
          <Card elevation="flat" className="space-y-3 p-4">
            <h2 className="text-sm font-semibold">Questionnaire assets</h2>
            {grouped.questionnaires.length === 0 ? (
              <EmptyState
                title="No questionnaires"
                description="No questionnaire contracts were discovered."
              />
            ) : (
              grouped.questionnaires.map((asset: PromptContractAsset) => (
                <div key={asset.id} className="rounded-lg border border-border/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {typeIcon[asset.type]}
                      <p className="text-sm font-medium">{asset.title}</p>
                    </div>
                    <Badge variant={governanceVariant[asset.governance_status]}>
                      {asset.governance_status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Scope: {asset.scope}</p>
                </div>
              ))
            )}
          </Card>

          <Card elevation="flat" className="space-y-3 p-4">
            <h2 className="text-sm font-semibold">Decision contracts</h2>
            {grouped.decisions.length === 0 ? (
              <EmptyState
                title="No open decisions"
                description="No decision contracts require active review."
              />
            ) : (
              grouped.decisions.map((asset: PromptContractAsset) => (
                <div key={asset.id} className="rounded-lg border border-border/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {typeIcon[asset.type]}
                      <p className="text-sm font-medium">{asset.title}</p>
                    </div>
                    <Badge variant={governanceVariant[asset.governance_status]}>
                      {asset.governance_status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Scope: {asset.scope}</p>
                </div>
              ))
            )}
          </Card>

          <Card elevation="flat" className="space-y-3 p-4">
            <h2 className="text-sm font-semibold">Policy contracts</h2>
            {grouped.policies.length === 0 ? (
              <EmptyState
                title="No policies"
                description="No policy contracts were returned by governance endpoints."
              />
            ) : (
              grouped.policies.map((asset: PromptContractAsset) => (
                <div key={asset.id} className="rounded-lg border border-border/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {typeIcon[asset.type]}
                      <p className="text-sm font-medium">{asset.title}</p>
                    </div>
                    <Badge variant={governanceVariant[asset.governance_status]}>
                      {asset.governance_status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Scope: {asset.scope}</p>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
