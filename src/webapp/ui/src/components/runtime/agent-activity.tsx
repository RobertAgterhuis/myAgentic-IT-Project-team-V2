import { cn } from '@/lib/utils';
import { AgentCard, type AgentCardStatus } from './agent-card';

export interface AgentEntry {
  id: string;
  name: string;
  status: AgentCardStatus;
  taskDescription?: string;
  progress?: number;
  startedAt?: string;
  retryCount?: number;
}

interface AgentActivityProps extends React.ComponentProps<'section'> {
  agents: AgentEntry[];
  onAgentClick?: (agentId: string) => void;
}

const statusOrder: Record<AgentCardStatus, number> = {
  running: 0,
  retrying: 1,
  failed: 2,
  completed: 3,
  idle: 4,
};

export function AgentActivity({ agents, onAgentClick, className, ...props }: AgentActivityProps) {
  const sorted = [...agents].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  return (
    <section aria-label="Agent activity" className={cn('space-y-3', className)} {...props}>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No agents active</p>
      ) : (
        sorted.map((agent) => (
          <AgentCard
            key={agent.id}
            name={agent.name}
            status={agent.status}
            taskDescription={agent.taskDescription}
            progress={agent.progress}
            startedAt={agent.startedAt}
            retryCount={agent.retryCount}
            onClick={onAgentClick ? () => onAgentClick(agent.id) : undefined}
          />
        ))
      )}
    </section>
  );
}
