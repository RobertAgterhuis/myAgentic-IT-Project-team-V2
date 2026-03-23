import { useDeferredValue, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Text } from '@/components/ui/typography';
import { useSimilarDecisions } from '@/hooks';

export function RelatedDecisionsPanel({
  query,
  excludeDecisionId,
  onOpenDecision,
  emptyHint,
  testId,
}: {
  query: string | null | undefined;
  excludeDecisionId?: string;
  onOpenDecision?: (decisionId: string) => void;
  emptyHint: string;
  testId: string;
}) {
  const deferredQuery = useDeferredValue(query?.trim() || '');
  const { data, isLoading } = useSimilarDecisions(deferredQuery);
  const matches = useMemo(
    () => (data || []).filter((match) => match.decisionId !== excludeDecisionId).slice(0, 3),
    [data, excludeDecisionId]
  );

  return (
    <Card elevation="flat" className="space-y-4 border border-border/70 p-4" data-testid={testId}>
      <div className="space-y-1">
        <Text muted className="text-xs uppercase tracking-[0.16em]">
          Related decisions
        </Text>
        <h3 className="text-base font-semibold">Top similar past decisions</h3>
        <Text muted className="text-sm">
          Retrieved from the decisions collection and shown as non-authoritative context.
        </Text>
      </div>

      {!deferredQuery ? (
        <AlertBanner variant="info">{emptyHint}</AlertBanner>
      ) : isLoading ? (
        <AlertBanner variant="info">Loading related decisions...</AlertBanner>
      ) : matches.length > 0 ? (
        <div className="space-y-3">
          {matches.map((match) => (
            <div
              key={`${match.decisionId}:${match.score}`}
              className="rounded-lg border border-border/70 bg-background p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold leading-tight">{match.title}</h4>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{match.decisionId}</Badge>
                    <span>Score {(match.score * 100).toFixed(0)}%</span>
                  </div>
                </div>
                {onOpenDecision ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onOpenDecision(match.decisionId)}
                    aria-label={`Open source decision ${match.decisionId}`}
                  >
                    Open source decision
                  </Button>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-6">{match.excerpt}</p>
            </div>
          ))}
        </div>
      ) : (
        <AlertBanner variant="info">
          No similar past decisions were retrieved for this subject.
        </AlertBanner>
      )}
    </Card>
  );
}
