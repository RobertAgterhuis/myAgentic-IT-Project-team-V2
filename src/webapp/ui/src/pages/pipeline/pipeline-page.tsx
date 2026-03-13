/**
 * Pipeline page — visualizes orchestrator state machine flow with phase gates.
 * Issue #240 (S9F-33)
 */
import { useState } from 'react';
import { Heading, Text } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { useOrchestratorStatus, useProgress } from '@/hooks';
import type { PhaseEntry, AgentEntry } from '@/lib/api-types';
import {
  CheckCircle,
  Circle,
  PlayCircle,
  ShieldCheck,
  ShieldAlert,
  Clock,
  GitBranch,
} from 'lucide-react';

/* ── Phase card status icons ── */

const phaseIcons: Record<string, React.ReactNode> = {
  done: <CheckCircle className="size-5 text-green-600" />,
  active: <PlayCircle className="size-5 text-blue-600 animate-pulse" />,
  pending: <Circle className="size-5 text-muted-foreground" />,
};

const agentStatusBadge: Record<string, 'success' | 'info' | 'secondary'> = {
  done: 'success',
  active: 'info',
  pending: 'secondary',
};

/* ── Gate indicator ── */

function GateIndicator({ status }: { status: 'passed' | 'pending' | 'blocked' }) {
  if (status === 'passed') return <ShieldCheck className="size-4 text-green-600" aria-label="Gate passed" />;
  if (status === 'blocked') return <ShieldAlert className="size-4 text-red-600" aria-label="Gate blocked" />;
  return <Clock className="size-4 text-muted-foreground" aria-label="Gate pending" />;
}

function deriveGateStatus(phase: PhaseEntry): 'passed' | 'pending' | 'blocked' {
  if (phase.status === 'done') return 'passed';
  if (phase.status === 'active') return 'pending';
  return 'pending';
}

/* ── Agent detail list ── */

function AgentList({ agents }: { agents: AgentEntry[] }) {
  return (
    <ul className="space-y-1 mt-3" role="list" aria-label="Agents">
      {agents.map((agent) => (
        <li key={agent.id} className="flex items-center gap-2 text-sm">
          <Badge variant={agentStatusBadge[agent.status] ?? 'secondary'} className="text-xs">
            {agent.status}
          </Badge>
          <span>{agent.name}</span>
        </li>
      ))}
    </ul>
  );
}

/* ── Phase card ── */

function PhaseCard({
  phase,
  isExpanded,
  onToggle,
}: {
  phase: PhaseEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const pct = phase.total > 0 ? Math.round((phase.done / phase.total) * 100) : 0;

  return (
    <Card
      clickable
      onClick={onToggle}
      elevation={phase.status === 'active' ? 'raised' : 'outlined'}
      tone={phase.status === 'active' ? 'info' : 'default'}
    >
      <div className="flex items-start gap-3">
        {phaseIcons[phase.status] ?? phaseIcons.pending}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">{phase.label}</span>
            <GateIndicator status={deriveGateStatus(phase)} />
          </div>

          <ProgressBar value={pct} label={`${phase.done}/${phase.total} agents`} showPercentage className="mt-2" />
        </div>
      </div>

      {isExpanded && phase.agents.length > 0 && <AgentList agents={phase.agents} />}
    </Card>
  );
}

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
          <Badge variant={status.state === 'IDLE' ? 'secondary' : 'info'}>
            {status.state}
          </Badge>
        )}
      </div>

      {/* Session info */}
      {progress?.session && (
        <Card elevation="flat">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <Text muted className="text-xs">Cycle</Text>
              <span className="font-medium">{progress.session.cycle_type}</span>
            </div>
            <div>
              <Text muted className="text-xs">Phase</Text>
              <span className="font-medium">{progress.session.current_phase}</span>
            </div>
            <div>
              <Text muted className="text-xs">Agent</Text>
              <span className="font-medium">{progress.session.current_agent}</span>
            </div>
            <div>
              <Text muted className="text-xs">Step</Text>
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
                onToggle={() =>
                  setExpandedPhase((prev) => (prev === phase.key ? null : phase.key))
                }
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
