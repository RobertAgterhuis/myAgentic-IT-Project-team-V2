import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress';
import { GateIndicator } from './gate-indicator';
import { AgentList } from './agent-list';
import type { PhaseEntry } from '@/lib/api-types';
import { CheckCircle, Circle, PlayCircle } from 'lucide-react';

const phaseIcons: Record<string, React.ReactNode> = {
  done: <CheckCircle className="size-5 text-green-600" />,
  active: <PlayCircle className="size-5 text-blue-600 animate-pulse" />,
  pending: <Circle className="size-5 text-muted-foreground" />,
};

function deriveGateStatus(phase: PhaseEntry): 'passed' | 'pending' | 'blocked' {
  if (phase.status === 'done') return 'passed';
  if (phase.status === 'active') return 'pending';
  return 'pending';
}

export function PhaseCard({
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

          <ProgressBar
            value={pct}
            label={`${phase.done}/${phase.total} agents`}
            showPercentage
            className="mt-2"
          />
        </div>
      </div>

      {isExpanded && phase.agents.length > 0 && <AgentList agents={phase.agents} />}
    </Card>
  );
}
