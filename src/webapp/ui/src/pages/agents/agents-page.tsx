/**
 * Agents page — list all tracked agents with activity status and detail panel.
 * M15 / Issue #M15-030
 */
import { useState } from 'react';
import { Heading, Text } from '@/components/ui/typography';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { MetricCard } from '@/components/ui/metric-card';
import { ExplainabilityPanel } from '@/components/runtime/explainability-panel';
import { useAgents } from '@/hooks';
import type { AgentDetailStatus, AgentDetailEntry } from '@/lib/api-types';
import { Bot, Activity, CheckCircle, XCircle, Clock, RotateCcw } from 'lucide-react';

const statusConfig: Record<
  AgentDetailStatus,
  { variant: 'success' | 'warning' | 'error' | 'info' | 'secondary'; icon: React.ReactNode }
> = {
  idle: { variant: 'secondary', icon: <Clock className="size-3" /> },
  running: { variant: 'info', icon: <Activity className="size-3" /> },
  completed: { variant: 'success', icon: <CheckCircle className="size-3" /> },
  failed: { variant: 'error', icon: <XCircle className="size-3" /> },
  retrying: { variant: 'warning', icon: <RotateCcw className="size-3" /> },
};

export default function AgentsPage() {
  const { data, isLoading } = useAgents();
  const [selectedAgent, setSelectedAgent] = useState<AgentDetailEntry | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner label="Loading agents…" />
      </div>
    );
  }

  const agents = data?.agents ?? [];

  // Performance summary
  const total = agents.length;
  const completed = agents.filter((a) => a.status === 'completed').length;
  const failed = agents.filter((a) => a.status === 'failed').length;
  const running = agents.filter((a) => a.status === 'running').length;
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="p-6 space-y-6" data-testid="agents-page">
      {/* Header */}
      <div>
        <Heading level={1}>
          <Bot className="size-5 inline mr-2" />
          Agents
        </Heading>
        <Text muted>All tracked agents — click an agent for details</Text>
      </div>

      {/* Performance overview */}
      {agents.length > 0 && (
        <section aria-label="Agent performance overview">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total Invocations"
              value={total}
              icon={<Bot className="size-4" />}
              trend="neutral"
            />
            <MetricCard
              label="Running"
              value={running}
              icon={<Activity className="size-4" />}
              trend="neutral"
            />
            <MetricCard
              label="Success Rate"
              value={`${successRate}%`}
              icon={<CheckCircle className="size-4" />}
              trend={successRate >= 80 ? 'up' : 'down'}
            />
            <MetricCard
              label="Failed"
              value={failed}
              icon={<XCircle className="size-4" />}
              trend={failed > 0 ? 'down' : 'neutral'}
            />
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent list */}
        <section aria-label="Agent list" className="lg:col-span-2">
          {agents.length === 0 ? (
            <EmptyState
              icon={<Bot className="size-8" />}
              title="No agents tracked"
              description="Agent activity will appear once the orchestrator starts running."
            />
          ) : (
            <div className="space-y-2">
              {agents.map((agent) => {
                const config = statusConfig[agent.status];
                const isSelected = selectedAgent?.id === agent.id;
                return (
                  <Card
                    key={agent.id}
                    clickable
                    onClick={() => setSelectedAgent(isSelected ? null : agent)}
                    elevation="outlined"
                    className={isSelected ? 'border-primary' : ''}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge variant={config.variant} className="gap-1 shrink-0">
                          {config.icon}
                          {agent.status}
                        </Badge>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{agent.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {agent.task_description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                        <span>{agent.phase}</span>
                        {agent.duration_ms > 0 && (
                          <span>{(agent.duration_ms / 1000).toFixed(1)}s</span>
                        )}
                        {agent.retry_count > 0 && (
                          <Badge variant="warning" className="text-[10px]">
                            {agent.retry_count} retries
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Detail side panel */}
        <section aria-label="Agent detail" className="lg:col-span-1">
          {selectedAgent ? (
            <ExplainabilityPanel
              title={selectedAgent.name}
              reason={selectedAgent.task_description}
              suggestedAction={
                selectedAgent.status === 'failed' ? 'Review error logs and retry' : undefined
              }
              details={{
                ID: selectedAgent.id,
                Status: selectedAgent.status,
                Phase: selectedAgent.phase,
                Session: selectedAgent.session_id,
                Retries: String(selectedAgent.retry_count),
                Outputs: selectedAgent.outputs.length > 0 ? selectedAgent.outputs.join(', ') : '—',
                ...(selectedAgent.duration_ms > 0
                  ? { Duration: `${(selectedAgent.duration_ms / 1000).toFixed(1)}s` }
                  : {}),
                Started: new Date(selectedAgent.started_at).toLocaleString(),
              }}
              onDismiss={() => setSelectedAgent(null)}
            />
          ) : (
            <Card elevation="flat" className="p-4">
              <Text muted className="text-xs text-center">
                Select an agent to view details
              </Text>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
