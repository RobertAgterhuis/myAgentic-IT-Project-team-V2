/**
 * Commands page — project brief input and orchestrator command queue.
 * Renamed from Command Center (M15-031).
 * Refactored to thin container (P1-UI-E1-I1).
 */
import { Text } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/layout/page-header';
import { ContextStrip, type ContextStripItem } from '@/components/layout/context-strip';
import { PageHelpStrip } from '@/components/help-panel/page-help-strip';
import { useCommandsController } from './use-commands-controller';
import { QuickActionsSection } from './quick-actions-section';
import { getCommandVariant, QUICK_ACTIONS } from './commands-config';
import { ProjectBriefSection } from './project-brief-section';
import { CommandQueueSection } from './command-queue-section';
import { Sparkles, ClipboardList, Radar } from 'lucide-react';

function getRecommendedAction(hasBrief: boolean, quickActions: typeof QUICK_ACTIONS) {
  if (quickActions.length === 0) {
    return QUICK_ACTIONS[0];
  }

  const createAction = quickActions.find((action) => action.command === 'CREATE');
  const auditAction = quickActions.find((action) => action.command === 'AUDIT');
  if (hasBrief && createAction) return createAction;
  if (!hasBrief && auditAction) return auditAction;
  return quickActions[0];
}

export default function CommandsPage() {
  const {
    briefText,
    setBriefText,
    projectName,
    setProjectName,
    status,
    queue,
    activeQueueEntry,
    hasProjectName,
    hasBrief,
    quickActions,
    isSubmitting,
    isLoading,
    error,
    refetch,
    handleQuickAction,
    handleSubmitBrief,
  } = useCommandsController();

  const recommendedAction = getRecommendedAction(hasBrief, quickActions);

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

  return (
    <PageShell
      isLoading={isLoading}
      loadingLabel="Loading commands…"
      error={error as Error | null}
      onRetry={refetch}
    >
      <div className="page-container-wide p-6 space-y-6">
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
                      Use Submit Brief for a guided CREATE start, or select AUDIT, FEATURE, or
                      HOTFIX directly.
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
                    <Badge variant={getCommandVariant(recommendedAction.command)}>
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

        <ProjectBriefSection
          projectName={projectName}
          setProjectName={setProjectName}
          briefText={briefText}
          setBriefText={setBriefText}
          onSubmit={handleSubmitBrief}
          isSubmitting={isSubmitting}
        />

        <QuickActionsSection
          actions={quickActions}
          recommendedCommand={recommendedAction.command}
          onAction={handleQuickAction}
        />

        <CommandQueueSection queue={queue} />
      </div>
    </PageShell>
  );
}
