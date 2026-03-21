/**
 * Agents page — list all tracked agents with activity status and detail panel.
 * M15 / Issue #M15-030, M31-001 … M31-006
 */
import { useState, useMemo } from 'react';
import { Text } from '@/components/ui/typography';
import { PageHeader } from '@/components/layout/page-header';
import { ContextStrip, type ContextStripItem } from '@/components/layout/context-strip';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/ui/metric-card';
import { MissionControlHero } from '@/components/ui/mission-control-hero';
import { StatusMotif } from '@/components/ui/status-motif';
import { ControlSignalBadge } from '@/components/ui/control-signal';
import { ExplainabilityPanel } from '@/components/runtime/explainability-panel';
import { AgentExecuteModal } from '@/components/runtime/agent-execute-modal';
import { useAgents } from '@/hooks';
import type { AgentDetailStatus, AgentDetailEntry } from '@/lib/api-types';
import {
  Bot,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
  RefreshCw,
  Play,
  Loader2,
} from 'lucide-react';

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
  const { data, isLoading, error, refetch } = useAgents();
  const [selectedAgent, setSelectedAgent] = useState<AgentDetailEntry | null>(null);
  const [executeAgent, setExecuteAgent] = useState<AgentDetailEntry | null>(null);
  const [runningAgentIds, setRunningAgentIds] = useState<Set<string>>(new Set());

  const markRunning = (id: string) => setRunningAgentIds((prev) => new Set(prev).add(id));
  const clearRunning = (id: string) =>
    setRunningAgentIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  // Derive summary data before any early returns (Rules of Hooks)
  const agents = data?.agents ?? [];
  const total = agents.length;
  const completed = agents.filter((a) => a.status === 'completed').length;
  const failed = agents.filter((a) => a.status === 'failed').length;
  const running = agents.filter((a) => a.status === 'running').length;
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const contextItems = useMemo<ContextStripItem[]>(
    () => [
      { id: 'total', label: 'Invocations', value: String(total) },
      {
        id: 'running',
        label: 'Running',
        value: String(running),
        tone: running > 0 ? 'success' : 'neutral',
      },
      {
        id: 'success-rate',
        label: 'Success rate',
        value: `${successRate}%`,
        tone: successRate >= 80 ? 'success' : 'warning',
      },
      {
        id: 'failed',
        label: 'Failed',
        value: String(failed),
        tone: failed > 0 ? 'critical' : 'neutral',
      },
    ],
    [total, running, successRate, failed]
  );

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner label="Loading agents…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <AlertBanner variant="error">
          <div className="flex items-center justify-between gap-4 w-full">
            <span>Failed to load agents: {(error as Error).message}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-3 mr-1.5" /> Retry
            </Button>
          </div>
        </AlertBanner>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="agents-page">
      <PageHeader
        title="Agents"
        subtitle="Active and historical agent operations, execution status, and performance."
        chips={[
          { id: 'agent-registry', label: 'Agent Registry', tone: 'info' },
          { id: 'governed', label: 'Governed' },
        ]}
      />

      <ContextStrip items={contextItems} />

      <MissionControlHero
        eyebrow="Agent operations"
        title="Inspect active agents like operators, not just list items"
        description="The agent surface shows which specialists are running, which have failed, and which executions need a human to diagnose or retry."
        badges={
          <>
            <ControlSignalBadge signal="governed" />
            {running > 0 && <ControlSignalBadge signal="active-agent" />}
            {failed > 0 && <ControlSignalBadge signal="needs-human-input" />}
            <Badge variant="outline">Agents</Badge>
          </>
        }
        metrics={[
          { label: 'Total invocations', value: String(total), detail: 'Tracked agent runs' },
          { label: 'Running', value: String(running), detail: 'Currently executing agents' },
          { label: 'Success rate', value: `${successRate}%`, detail: 'Completed without failure' },
          { label: 'Failed', value: String(failed), detail: 'Runs likely needing human review' },
        ]}
        motifs={
          <>
            <StatusMotif
              kind="governance"
              title="Operational visibility stays controlled"
              description="The page makes agent health and execution status visible without losing the disciplined tone of the product."
            />
            <StatusMotif
              kind="agent"
              title="Execution ownership is obvious"
              description="Running and selected agents are easy to spot so the operator knows where runtime effort is concentrated."
            />
            <StatusMotif
              kind="human-loop"
              title="Failures imply intervention"
              description="Retries, failed runs, and manual execution actions clearly read as human checkpoints rather than background noise."
            />
          </>
        }
        asideTitle="How to read this"
        asideDescription="Scan the overview metrics first, then inspect the list for failures or retries, and finally use the side panel to understand a single agent in context."
      />

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
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                          disabled={agent.status === 'running' || runningAgentIds.has(agent.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExecuteAgent(agent);
                          }}
                          aria-label={`Execute ${agent.name}`}
                        >
                          {runningAgentIds.has(agent.id) ? (
                            <>
                              <Loader2 className="size-3 mr-1 animate-spin" /> Running…
                            </>
                          ) : (
                            <>
                              <Play className="size-3 mr-1" /> Execute
                            </>
                          )}
                        </Button>
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

      {/* Agent Execute Modal (M31-001) */}
      {executeAgent && (
        <AgentExecuteModal
          agent={executeAgent}
          open={!!executeAgent}
          onOpenChange={(open) => {
            if (!open) setExecuteAgent(null);
          }}
          onExecutionStart={() => markRunning(executeAgent.id)}
          onExecutionEnd={() => clearRunning(executeAgent.id)}
        />
      )}
    </div>
  );
}
