import { Badge } from '@/components/ui/badge';
import type { AgentEntry } from '@/lib/api-types';

const agentStatusBadge: Record<string, 'success' | 'info' | 'secondary'> = {
  done: 'success',
  active: 'info',
  pending: 'secondary',
};

export function AgentList({ agents }: { agents: AgentEntry[] }) {
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
