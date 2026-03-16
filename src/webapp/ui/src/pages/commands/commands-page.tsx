/**
 * Commands page — project brief input and orchestrator command queue.
 * Renamed from Command Center (M15-031).
 */
import { useState } from 'react';
import { Heading, Text } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { InputField } from '@/components/ui/input-field';
import { useOrchestratorStatus, useOrchestratorQueue, useQueueCommand } from '@/hooks';
import type { OrchestratorCommandName } from '@/lib/api-types';
import { Terminal, Play, Zap, Bug, Search, Send } from 'lucide-react';

const QUICK_ACTIONS: {
  command: OrchestratorCommandName;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    command: 'CREATE',
    label: 'CREATE',
    icon: <Play className="size-4" />,
    description: 'Start full creation cycle',
  },
  {
    command: 'AUDIT',
    label: 'AUDIT',
    icon: <Search className="size-4" />,
    description: 'Audit existing software',
  },
  {
    command: 'FEATURE',
    label: 'FEATURE',
    icon: <Zap className="size-4" />,
    description: 'Add a new feature',
  },
  {
    command: 'HOTFIX',
    label: 'HOTFIX',
    icon: <Bug className="size-4" />,
    description: 'Emergency hotfix',
  },
];

const statusVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'secondary'> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  DONE: 'success',
  ERROR: 'error',
};

export default function CommandsPage() {
  const [briefText, setBriefText] = useState('');
  const [projectName, setProjectName] = useState('');

  const { data: status } = useOrchestratorStatus();
  const { data: queue } = useOrchestratorQueue();
  const queueCommand = useQueueCommand();

  function handleQuickAction(command: OrchestratorCommandName) {
    queueCommand.mutate({
      command,
      project: projectName || undefined,
    });
  }

  function handleSubmitBrief() {
    if (!briefText.trim()) return;
    queueCommand.mutate({
      command: 'CREATE',
      project: briefText.trim(),
    });
    setBriefText('');
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Heading level={1}>Commands</Heading>
          <Text muted>Submit project briefs and manage orchestrator commands</Text>
        </div>
        {status && (
          <Badge variant={status.state === 'IDLE' ? 'secondary' : 'info'}>
            {status.state} — {status.mode}
          </Badge>
        )}
      </div>

      {/* Project Brief Input */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Terminal className="size-5" />
            <span className="font-semibold">Project Brief</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <InputField
            label="Project name"
            placeholder="e.g., My SaaS Platform"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />

          <div className="space-y-1.5">
            <label htmlFor="brief-input" className="text-sm font-medium">
              Brief description
            </label>
            <textarea
              id="brief-input"
              className="flex min-h-30 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
              placeholder="Describe the project you want to create or audit…"
              value={briefText}
              onChange={(e) => setBriefText(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSubmitBrief}
              disabled={!briefText.trim() || queueCommand.isPending}
              loading={queueCommand.isPending}
            >
              <Send className="size-4 mr-2" />
              Submit Brief
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div>
        <Heading level={2} className="mb-3">
          Quick Actions
        </Heading>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <Card
              key={action.command}
              clickable
              onClick={() => handleQuickAction(action.command)}
              elevation="outlined"
            >
              <div className="flex flex-col items-center gap-2 py-2 text-center">
                {action.icon}
                <span className="font-semibold text-sm">{action.label}</span>
                <Text muted className="text-xs">
                  {action.description}
                </Text>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Command Queue */}
      <div>
        <Heading level={2} className="mb-3">
          Command Queue
        </Heading>

        {queue?.queue && queue.queue.length > 0 ? (
          <div className="space-y-2">
            {queue.queue.map((entry, i) => (
              <Card key={`${entry.command}-${entry.requested_at}-${i}`} elevation="outlined">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={statusVariant[entry.status] ?? 'secondary'}>
                      {entry.status}
                    </Badge>
                    <div>
                      <span className="font-mono text-sm font-medium">{entry.command}</span>
                      {entry.project && (
                        <Text muted className="text-xs ml-2">
                          {entry.project}
                        </Text>
                      )}
                    </div>
                  </div>
                  <Text muted className="text-xs">
                    {new Date(entry.requested_at).toLocaleTimeString()}
                  </Text>
                </div>
                {entry.description && (
                  <Text muted className="text-xs mt-1">
                    {entry.description}
                  </Text>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Terminal className="size-8" />}
            title="No commands in queue"
            description="Submit a project brief or use a quick action to get started."
          />
        )}
      </div>
    </div>
  );
}
