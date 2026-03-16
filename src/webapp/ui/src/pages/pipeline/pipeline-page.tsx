/**
 * Pipeline page — visualizes orchestrator state machine flow with phase gates.
 * Issue #240 (S9F-33)
 */
import { useState } from 'react';
import { Heading, Text } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { PhaseCard } from '@/components/runtime/phase-card';
import { useOrchestratorStatus, useProgress } from '@/hooks';
import { GitBranch } from 'lucide-react';

/* ── Pipeline connector ── */

function Connector() {
  return (
    <div className="flex justify-center" aria-hidden>
      <div className="w-0.5 h-6 bg-border" />
    </div>
  );
}

/* ── Main page ── */

export default function PipelinePage() {
  const { data: status } = useOrchestratorStatus();
  const { data: progress, isLoading } = useProgress();
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner label="Loading pipeline…" />
      </div>
    );
  }

  const phases = progress?.phases ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Heading level={1}>Pipeline</Heading>
          <Text muted>Orchestrator state machine flow and phase gates</Text>
        </div>
        {status && (
          <Badge variant={status.state === 'IDLE' ? 'secondary' : 'info'}>{status.state}</Badge>
        )}
      </div>

      {/* Session info */}
      {progress?.session && (
        <Card elevation="flat">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <Text muted className="text-xs">
                Cycle
              </Text>
              <span className="font-medium">{progress.session.cycle_type}</span>
            </div>
            <div>
              <Text muted className="text-xs">
                Phase
              </Text>
              <span className="font-medium">{progress.session.current_phase}</span>
            </div>
            <div>
              <Text muted className="text-xs">
                Agent
              </Text>
              <span className="font-medium">{progress.session.current_agent}</span>
            </div>
            <div>
              <Text muted className="text-xs">
                Step
              </Text>
              <span className="font-medium">{progress.session.current_step}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Pipeline visualization */}
      {phases.length > 0 ? (
        <div className="max-w-xl mx-auto">
          {phases.map((phase, i) => (
            <div key={phase.key}>
              <PhaseCard
                phase={phase}
                isExpanded={expandedPhase === phase.key}
                onToggle={() => setExpandedPhase((prev) => (prev === phase.key ? null : phase.key))}
              />
              {i < phases.length - 1 && <Connector />}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<GitBranch className="size-12" />}
          title="No active pipeline"
          description="Start a CREATE or AUDIT command to see the pipeline in action."
        />
      )}
    </div>
  );
}
