import { cn } from '@/lib/utils';
import { FlowStep, type FlowStepStatus } from './flow-step';
import { TimelineConnector } from '@/components/ui/timeline-connector';

export interface FlowPhase {
  id: string;
  label: string;
  status: FlowStepStatus;
}

interface FlowTimelineProps extends React.ComponentProps<'nav'> {
  phases: FlowPhase[];
  activePhaseId?: string;
  onPhaseClick?: (id: string) => void;
}

export function FlowTimeline({
  phases,
  activePhaseId,
  onPhaseClick,
  className,
  ...props
}: FlowTimelineProps) {
  if (phases.length === 0) {
    return (
      <nav aria-label="Phase timeline" className={className} {...props}>
        <p className="text-sm text-muted-foreground">No phases available</p>
      </nav>
    );
  }

  return (
    <nav aria-label="Phase timeline" className={className} {...props}>
      {/* Horizontal layout ≥ md, vertical < md */}
      <ol className={cn('flex flex-col items-start gap-1 md:flex-row md:items-center md:gap-0')}>
        {phases.map((phase, i) => {
          const isActive = phase.id === activePhaseId;
          const isConnectorActive = phase.status === 'completed' || phase.status === 'running';

          return (
            <li key={phase.id} className="flex items-center gap-0">
              <FlowStep
                label={phase.label}
                status={phase.status}
                isActive={isActive}
                onClick={onPhaseClick ? () => onPhaseClick(phase.id) : undefined}
              />
              {i < phases.length - 1 && (
                <>
                  <TimelineConnector
                    orientation="horizontal"
                    active={isConnectorActive}
                    className="hidden md:block"
                  />
                  <TimelineConnector
                    orientation="vertical"
                    active={isConnectorActive}
                    className="ml-5 block md:hidden"
                  />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
