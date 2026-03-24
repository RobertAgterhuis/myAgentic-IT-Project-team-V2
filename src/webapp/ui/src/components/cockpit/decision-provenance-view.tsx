import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Network } from 'lucide-react';
import type { ProvenanceEntry } from '@/lib/api-types';

interface DecisionProvenanceViewProps {
  items: ProvenanceEntry[];
}

function actorBadgeVariant(
  actorType: ProvenanceEntry['actor_type']
): 'info' | 'warning' | 'secondary' {
  return actorType === 'human' ? 'info' : 'secondary';
}

function decisionBadgeVariant(
  decisionType: ProvenanceEntry['decision_type']
): 'warning' | 'error' | 'outline' | 'success' {
  if (decisionType === 'human_override') return 'warning';
  if (decisionType === 'error' || decisionType === 'gate_failure') return 'error';
  if (decisionType === 'approval') return 'success';
  return 'outline';
}

function feedbackBadgeVariant(
  status: NonNullable<ProvenanceEntry['feedback_propagation']>['status']
): 'success' | 'warning' {
  return status === 'observed' ? 'success' : 'warning';
}

export function DecisionProvenanceView({ items }: DecisionProvenanceViewProps) {
  if (!items || items.length === 0) {
    return (
      <EmptyState
        icon={<Network className="size-8" />}
        title="No provenance events yet"
        description="Human and machine decision lineage appears here once orchestration and approvals run."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id} elevation="outlined" tone="default">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={decisionBadgeVariant(item.decision_type)}>{item.decision_type}</Badge>
              <Badge variant={actorBadgeVariant(item.actor_type)}>{item.actor_type}</Badge>
              <Badge variant="outline">{item.action}</Badge>
            </div>
            <CardTitle className="text-base">{item.rationale}</CardTitle>
            <CardDescription>
              {item.actor} • {new Date(item.timestamp).toLocaleString()} • source: {item.source}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            {item.state || item.mode ? (
              <div>
                state: {item.state || 'n/a'} | mode: {item.mode || 'n/a'}
              </div>
            ) : null}
            {item.feedback_propagation ? (
              <div className="mt-3 rounded-xl border border-border/60 bg-background/70 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={feedbackBadgeVariant(item.feedback_propagation.status)}>
                    Feedback propagation
                  </Badge>
                  <Badge variant="outline">
                    {item.feedback_propagation.impacted_event_count} downstream event
                    {item.feedback_propagation.impacted_event_count === 1 ? '' : 's'}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-foreground">{item.feedback_propagation.summary}</p>
                {item.feedback_propagation.downstream_event_types.length > 0 ? (
                  <p className="mt-1 text-xs">
                    Markers: {item.feedback_propagation.downstream_event_types.join(', ')}
                  </p>
                ) : null}
                {item.feedback_propagation.latest_timestamp ? (
                  <p className="mt-1 text-xs">
                    Latest downstream signal:{' '}
                    {new Date(item.feedback_propagation.latest_timestamp).toLocaleString()}
                  </p>
                ) : null}
              </div>
            ) : null}
            {item.metadata ? <div className="mt-1">metadata captured</div> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
