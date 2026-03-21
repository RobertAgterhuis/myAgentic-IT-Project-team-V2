import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/layout/page-header';
import { ContextStrip, type ContextStripItem } from '@/components/layout/context-strip';
import { usePromptContractAssets, useHeroFold } from '@/hooks';
import type { PromptContractAsset } from '@/lib/api-types';
import { ChevronDown, ClipboardList, FileCode2, Scale } from 'lucide-react';

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

  const [questionnaireFolded, toggleQuestionnaire] = useHeroFold('prompts-questionnaire');
  const [decisionFolded, toggleDecision] = useHeroFold('prompts-decision');
  const [policyFolded, togglePolicy] = useHeroFold('prompts-policy');

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
          {/* Questionnaire assets */}
          <Card elevation="flat" className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Questionnaire assets</h2>
              <button
                onClick={toggleQuestionnaire}
                className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={
                  questionnaireFolded
                    ? 'Expand questionnaire assets'
                    : 'Collapse questionnaire assets'
                }
              >
                <ChevronDown
                  className={`size-4 transition-transform duration-300 ${questionnaireFolded ? '-rotate-90' : ''}`}
                />
              </button>
            </div>
            <div
              className={`overflow-hidden transition-all duration-300 ${questionnaireFolded ? 'max-h-0 opacity-0' : 'max-h-500 opacity-100 mt-3'}`}
            >
              {grouped.questionnaires.length === 0 ? (
                <EmptyState
                  title="No questionnaires"
                  description="No questionnaire contracts were discovered."
                />
              ) : (
                <div className="space-y-3">
                  {grouped.questionnaires.map((asset: PromptContractAsset) => (
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
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Decision contracts */}
          <Card elevation="flat" className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Decision contracts</h2>
              <button
                onClick={toggleDecision}
                className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={
                  decisionFolded ? 'Expand decision contracts' : 'Collapse decision contracts'
                }
              >
                <ChevronDown
                  className={`size-4 transition-transform duration-300 ${decisionFolded ? '-rotate-90' : ''}`}
                />
              </button>
            </div>
            <div
              className={`overflow-hidden transition-all duration-300 ${decisionFolded ? 'max-h-0 opacity-0' : 'max-h-500 opacity-100 mt-3'}`}
            >
              {grouped.decisions.length === 0 ? (
                <EmptyState
                  title="No open decisions"
                  description="No decision contracts require active review."
                />
              ) : (
                <div className="space-y-3">
                  {grouped.decisions.map((asset: PromptContractAsset) => (
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
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Policy contracts */}
          <Card elevation="flat" className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Policy contracts</h2>
              <button
                onClick={togglePolicy}
                className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={policyFolded ? 'Expand policy contracts' : 'Collapse policy contracts'}
              >
                <ChevronDown
                  className={`size-4 transition-transform duration-300 ${policyFolded ? '-rotate-90' : ''}`}
                />
              </button>
            </div>
            <div
              className={`overflow-hidden transition-all duration-300 ${policyFolded ? 'max-h-0 opacity-0' : 'max-h-500 opacity-100 mt-3'}`}
            >
              {grouped.policies.length === 0 ? (
                <EmptyState
                  title="No policies"
                  description="No policy contracts were returned by governance endpoints."
                />
              ) : (
                <div className="space-y-3">
                  {grouped.policies.map((asset: PromptContractAsset) => (
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
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
