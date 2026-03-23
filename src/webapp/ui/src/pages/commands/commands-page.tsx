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
import { PageHeader } from '@/components/layout/page-header';
import { ContextStrip, type ContextStripItem } from '@/components/layout/context-strip';
import { PageHelpStrip } from '@/components/help-panel/page-help-strip';
import { useOrchestratorStatus, useOrchestratorQueue, useQueueCommand } from '@/hooks';
import type { OrchestratorCommandName } from '@/lib/api-types';
import { cn } from '@/lib/utils';
import {
  Terminal,
  Play,
  Zap,
  Bug,
  Search,
  Send,
  Sparkles,
  ArrowRight,
  ClipboardList,
  Radar,
  ShieldAlert,
} from 'lucide-react';

const QUICK_ACTIONS: {
  command: OrchestratorCommandName;
  label: string;
  icon: React.ReactNode;
  description: string;
  whenToUse: string;
  nextStep: string;
}[] = [
  {
    command: 'CREATE',
    label: 'CREATE',
    icon: <Play className="size-4" />,
    description: 'Start full creation cycle',
    whenToUse: 'Use when you are starting a new product, idea, or initiative from scratch.',
    nextStep: 'The orchestrator starts with onboarding and Phase 1 discovery based on your brief.',
  },
  {
    command: 'AUDIT',
    label: 'AUDIT',
    icon: <Search className="size-4" />,
    description: 'Audit existing software',
    whenToUse:
      'Use when you already have a codebase or platform and want analysis before changing it.',
    nextStep:
      'The team inspects the current state, risks, and improvement areas before implementation.',
  },
  {
    command: 'FEATURE',
    label: 'FEATURE',
    icon: <Zap className="size-4" />,
    description: 'Add a new feature',
    whenToUse: 'Use when the product already exists and you want to add a scoped capability.',
    nextStep: 'The team prepares the feature path, then moves into design and implementation work.',
  },
  {
    command: 'HOTFIX',
    label: 'HOTFIX',
    icon: <Bug className="size-4" />,
    description: 'Emergency hotfix',
    whenToUse: 'Use only for urgent production problems that need minimal, fast remediation.',
    nextStep: 'The team prioritizes containment and implementation over broad discovery work.',
  },
];

const COMMAND_VARIANTS: Record<OrchestratorCommandName, 'info' | 'warning' | 'secondary'> = {
  CREATE: 'info',
  CREATE_BUSINESS: 'info',
  CREATE_TECH: 'info',
  CREATE_UX: 'info',
  CREATE_MARKETING: 'info',
  REEVALUATE: 'warning',
  FEATURE: 'secondary',
  SCOPE_CHANGE: 'warning',
  HOTFIX: 'warning',
  AUDIT: 'secondary',
};

const statusVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'secondary'> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  DONE: 'success',
  ERROR: 'error',
};

function getRecommendedAction(command: OrchestratorCommandName) {
  return QUICK_ACTIONS.find((action) => action.command === command) ?? QUICK_ACTIONS[0];
}

export default function CommandsPage() {
  const [briefText, setBriefText] = useState('');
  const [projectName, setProjectName] = useState('');

  const { data: status } = useOrchestratorStatus();
  const { data: queue } = useOrchestratorQueue();
  const queueCommand = useQueueCommand();
  const activeQueueEntry = queue?.command ?? queue?.queue?.[0] ?? null;
  const hasProjectName = projectName.trim().length > 0;
  const hasBrief = briefText.trim().length > 0;
  const recommendedAction = hasBrief
    ? getRecommendedAction('CREATE')
    : getRecommendedAction('AUDIT');
  const guidanceStep = activeQueueEntry
    ? {
        title: `Command ${activeQueueEntry.status.toLowerCase()} in queue`,
        description:
          activeQueueEntry.status === 'PROCESSING'
            ? `Track ${activeQueueEntry.command} in the pipeline and wait for the next agent handoff.`
            : `A ${activeQueueEntry.command} command is queued. You can monitor status below or in Pipeline.`,
        badge: activeQueueEntry.command,
      }
    : !hasProjectName && !hasBrief
      ? {
          title: 'Start with project context',
          description:
            'Fill in a project name and a short brief so the system can decide how to start the work.',
          badge: 'Step 1',
        }
      : hasProjectName && !hasBrief
        ? {
            title: 'Add the brief that explains the intent',
            description:
              'Describe the outcome, problem, or scope. That gives the orchestrator enough context to begin.',
            badge: 'Step 2',
          }
        : {
            title: 'Ready to start',
            description:
              'Submit the brief to start a CREATE cycle, or use a quick action if AUDIT, FEATURE, or HOTFIX is a better fit.',
            badge: 'Step 3',
          };
  const contextItems: ContextStripItem[] = [
    {
      id: 'runtime-state',
      label: 'Runtime state',
      value: status?.state ?? 'UNKNOWN',
      tone: status?.state === 'IDLE' ? 'neutral' : 'info',
    },
    {
      id: 'queue-depth',
      label: 'Queue depth',
      value: String(queue?.queue?.length ?? 0),
      tone: (queue?.queue?.length ?? 0) > 0 ? 'info' : 'neutral',
    },
    {
      id: 'brief-ready',
      label: 'Brief status',
      value: hasProjectName && hasBrief ? 'Ready to submit' : 'Needs input',
      tone: hasProjectName && hasBrief ? 'success' : 'warning',
    },
    {
      id: 'recommended-command',
      label: 'Recommended',
      value: recommendedAction.label,
      tone: 'info',
    },
  ];

  function handleQuickAction(command: OrchestratorCommandName) {
    queueCommand.mutate({
      command,
      project: projectName || undefined,
      description: briefText.trim() || undefined,
      brief: briefText.trim() || undefined,
    });
  }

  function handleSubmitBrief() {
    if (!projectName.trim() || !briefText.trim()) return;
    queueCommand.mutate({
      command: 'CREATE',
      project: projectName.trim(),
      description: briefText.trim(),
      brief: briefText.trim(),
    });
    setBriefText('');
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Commands"
        subtitle="Choose the right action, understand what happens next, and then queue it with clear operational context."
        chips={[
          {
            id: 'commands-state',
            label: status?.state ?? 'UNKNOWN',
            tone: status?.state === 'IDLE' ? 'default' : 'info',
          },
          {
            id: 'commands-mode',
            label: status?.mode ?? 'No mode',
            tone: 'info',
          },
          {
            id: 'commands-queue',
            label: `${queue?.queue?.length ?? 0} queued`,
            tone: (queue?.queue?.length ?? 0) > 0 ? 'warning' : 'success',
          },
        ]}
      />

      <PageHelpStrip routeSlug="commands" />

      <ContextStrip items={contextItems} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
        <Card elevation="flat" className="border border-border/70 px-5 py-5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-5 text-info" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">How to proceed</span>
                <Badge variant="outline">3 steps</Badge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <Badge variant="secondary">1</Badge>
                  <div className="mt-3 font-medium">Name the work</div>
                  <Text muted className="mt-1 text-xs">
                    Enter the project or feature name so queued commands are recognizable in the
                    pipeline.
                  </Text>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <Badge variant="secondary">2</Badge>
                  <div className="mt-3 font-medium">Explain the goal</div>
                  <Text muted className="mt-1 text-xs">
                    Add a short brief with outcome, scope, or problem statement. This becomes
                    execution context.
                  </Text>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <Badge variant="secondary">3</Badge>
                  <div className="mt-3 font-medium">Choose the right command</div>
                  <Text muted className="mt-1 text-xs">
                    Use Submit Brief for a guided CREATE start, or select AUDIT, FEATURE, or HOTFIX
                    directly.
                  </Text>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card elevation="flat" className="border border-border/70 px-5 py-5">
          <div className="flex items-start gap-3">
            <ClipboardList className="mt-0.5 size-5 text-warning" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">Recommended next step</span>
                <Badge variant="warning">{guidanceStep.badge}</Badge>
              </div>
              <div className="mt-3 text-sm font-medium">{guidanceStep.title}</div>
              <Text muted className="mt-1 text-sm">
                {guidanceStep.description}
              </Text>
              <div className="mt-4 rounded-2xl border border-border/70 bg-background/70 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <Radar className="size-3.5" /> Suggested command
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant={COMMAND_VARIANTS[recommendedAction.command]}>
                    {recommendedAction.label}
                  </Badge>
                  <span className="text-sm font-medium">{recommendedAction.description}</span>
                </div>
                <Text muted className="mt-2 text-xs">
                  {recommendedAction.nextStep}
                </Text>
              </div>
            </div>
          </div>
        </Card>
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
            helperText="Use the product, initiative, or feature name you want to see in the queue and pipeline."
          />

          <div className="space-y-1.5">
            <label htmlFor="brief-input" className="text-sm font-medium">
              Brief description
            </label>
            <textarea
              id="brief-input"
              className="flex min-h-30 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
              placeholder="Describe the desired outcome, current problem, or scope you want the agent team to handle…"
              value={briefText}
              onChange={(e) => setBriefText(e.target.value)}
            />
            <Text muted className="text-sm">
              Good brief example: “Audit our current SDLC workflow and identify blockers for faster
              feature delivery.”
            </Text>
          </div>

          <div className="rounded-2xl border border-info/30 bg-info/10 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <ArrowRight className="size-4 text-info" /> What happens when you click Submit Brief
            </div>
            <Text muted className="mt-1 text-sm">
              A CREATE command is queued with your project name and brief. The orchestrator then
              starts onboarding and the first analysis phase.
            </Text>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSubmitBrief}
              disabled={!projectName.trim() || !briefText.trim() || queueCommand.isPending}
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
        <Text muted className="mb-3 text-sm">
          Use a quick action when you already know the type of work. Each card explains when to use
          it and what starts immediately after.
        </Text>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <Card
              key={action.command}
              clickable
              onClick={() => handleQuickAction(action.command)}
              elevation="outlined"
              className={cn(
                'px-4 py-4 text-left transition-colors',
                recommendedAction.command === action.command && 'border-info/40 bg-info/5'
              )}
            >
              <div className="flex flex-col gap-3 py-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {action.icon}
                    <span className="font-semibold text-sm">{action.label}</span>
                  </div>
                  {recommendedAction.command === action.command && (
                    <Badge variant="info">Suggested</Badge>
                  )}
                </div>
                <Text muted className="text-xs">
                  {action.description}
                </Text>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-medium text-foreground">Use when:</span>{' '}
                    <span className="text-muted-foreground">{action.whenToUse}</span>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Next:</span>{' '}
                    <span className="text-muted-foreground">{action.nextStep}</span>
                  </div>
                </div>
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
        <Text muted className="mb-3 text-sm">
          After submitting, check here first: `PENDING` means waiting, `PROCESSING` means agents are
          actively running, and `DONE` means the command finished.
        </Text>

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
                {entry.status === 'PROCESSING' && (
                  <div className="mt-3 rounded-xl border border-info/30 bg-info/10 px-3 py-2 text-xs text-muted-foreground">
                    This command is currently being executed. Open Pipeline to follow phase and
                    agent progress.
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<ShieldAlert className="size-8" />}
            title="No commands in queue"
            description="Start with the three steps above: name the work, add the brief, then choose Submit Brief or the best matching quick action."
          />
        )}
      </div>
    </div>
  );
}
