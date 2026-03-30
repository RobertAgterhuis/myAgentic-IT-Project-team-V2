/**
 * Pipeline page — visualizes orchestrator state machine flow with phase swimlanes.
 * Issue #240 (S9F-33)
 */
import { useNavigate } from 'react-router-dom';
import { Text } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageShell } from '@/components/ui/page-shell';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress';
import { MissionControlHero } from '@/components/ui/mission-control-hero';
import { StatusMotif } from '@/components/ui/status-motif';
import { ControlSignalBadge } from '@/components/ui/control-signal';
import { PageHeader } from '@/components/layout/page-header';
import { ContextStrip, type ContextStripItem } from '@/components/layout/context-strip';
import { PageHelpStrip } from '@/components/help-panel/page-help-strip';
import { useOrchestratorPackMetadata, useOrchestratorStatus, useProgress } from '@/hooks';
import type {
  AgentEntry,
  OrchestratorPackMetadataResponse,
  PhaseEntry,
  SessionInfo,
} from '@/lib/api-types';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Circle,
  GitBranch,
  PlayCircle,
  Sparkles,
  Users,
} from 'lucide-react';

type SwimlaneStatus = PhaseEntry['status'] | 'needs-input';
type SwimlaneAgentStatus = AgentEntry['status'] | 'needs-input';

interface SwimlaneAgent extends AgentEntry {
  swimlaneStatus: SwimlaneAgentStatus;
}

interface SwimlanePhase extends Omit<PhaseEntry, 'agents' | 'status'> {
  status: SwimlaneStatus;
  agents: SwimlaneAgent[];
  activeAgentName: string | null;
  openEscalations: number;
  humanBlockers: number;
}

type GuidanceCard = {
  id: string;
  title: string;
  blocker: string;
  nextAction: string;
  tone: 'warning' | 'critical' | 'info';
};

const laneTone: Record<SwimlaneStatus, 'default' | 'info' | 'warning' | 'success'> = {
  pending: 'default',
  active: 'info',
  done: 'success',
  'needs-input': 'warning',
};

const laneAccentClasses: Record<SwimlaneStatus, string> = {
  pending: 'border-l-slate-300',
  active: 'border-l-info',
  done: 'border-l-success',
  'needs-input': 'border-l-warning',
};

const laneBadgeVariant: Record<SwimlaneStatus, 'secondary' | 'info' | 'success' | 'warning'> = {
  pending: 'secondary',
  active: 'info',
  done: 'success',
  'needs-input': 'warning',
};

const laneStatusLabel: Record<SwimlaneStatus, string> = {
  pending: 'Queued',
  active: 'Active',
  done: 'Completed',
  'needs-input': 'Needs input',
};

const laneIcon: Record<SwimlaneStatus, React.ReactNode> = {
  pending: <Circle className="size-5 text-muted-foreground" />,
  active: <PlayCircle className="size-5 text-info animate-pulse" />,
  done: <CheckCircle2 className="size-5 text-success" />,
  'needs-input': <AlertCircle className="size-5 text-warning" />,
};

const agentTileClass: Record<SwimlaneAgentStatus, string> = {
  pending: 'border-border bg-background text-foreground',
  active: 'border-info/40 bg-info/10 text-foreground shadow-sm',
  done: 'border-success/40 bg-success/10 text-foreground',
  'needs-input': 'border-warning/40 bg-warning/10 text-foreground shadow-sm',
};

const agentBadgeVariant: Record<SwimlaneAgentStatus, 'secondary' | 'info' | 'success' | 'warning'> =
  {
    pending: 'secondary',
    active: 'info',
    done: 'success',
    'needs-input': 'warning',
  };

const agentStatusLabel: Record<SwimlaneAgentStatus, string> = {
  pending: 'Pending',
  active: 'Active',
  done: 'Done',
  'needs-input': 'Needs input',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getCurrentAgentIds(session: SessionInfo | null): string[] {
  if (!session) return [];

  const currentAgents = Array.isArray(session.current_agents)
    ? session.current_agents.filter(
        (agent): agent is string => typeof agent === 'string' && !!agent
      )
    : [];

  if (currentAgents.length > 0) {
    return Array.from(new Set(currentAgents));
  }

  return session.current_agent ? [session.current_agent] : [];
}

function formatCurrentAgentsLabel(currentAgents: string[]): string {
  if (currentAgents.length === 0) return 'No active agent';
  if (currentAgents.length === 1) return currentAgents[0];
  if (currentAgents.length === 2) return `${currentAgents[0]}, ${currentAgents[1]}`;
  return `${currentAgents[0]}, ${currentAgents[1]} +${currentAgents.length - 2}`;
}

function isCurrentAgent(session: SessionInfo | null, phaseKey: string, agentId: string): boolean {
  const currentPhase = session?.current_phase ?? null;
  const currentAgents = getCurrentAgentIds(session);

  if (currentAgents.length === 0 || currentPhase !== phaseKey) return false;
  return currentAgents.some((agent) => agent === agentId || agent.startsWith(`${agentId}-`));
}

function isHumanRequiredBlocker(blocker: unknown): boolean {
  return isRecord(blocker) && blocker.type === 'HUMAN_REQUIRED';
}

function buildSwimlanes(phases: PhaseEntry[], session: SessionInfo | null): SwimlanePhase[] {
  const openEscalations = Array.isArray(session?.open_human_escalations)
    ? session.open_human_escalations
    : [];
  const blockers = Array.isArray(session?.blockers) ? session.blockers : [];
  const humanBlockers = blockers.filter(isHumanRequiredBlocker).length;
  const awaitingHuman =
    session?.status === 'AWAITING_HUMAN' || openEscalations.length > 0 || humanBlockers > 0;

  return phases.map((phase) => {
    const laneNeedsInput = awaitingHuman && session?.current_phase === phase.key;
    const agents = phase.agents.map((agent) => {
      const current = isCurrentAgent(session, phase.key, agent.id);
      const swimlaneStatus: SwimlaneAgentStatus =
        laneNeedsInput && current ? 'needs-input' : agent.status;

      return {
        ...agent,
        swimlaneStatus,
      };
    });
    const laneStatus: SwimlaneStatus = laneNeedsInput ? 'needs-input' : phase.status;

    return {
      ...phase,
      status: laneStatus,
      agents,
      activeAgentName:
        agents.find((agent) => currentAgentMatch(agent, session, phase.key))?.name ?? null,
      openEscalations: laneNeedsInput ? openEscalations.length : 0,
      humanBlockers: laneNeedsInput ? humanBlockers : 0,
    };
  });
}

function currentAgentMatch(
  agent: AgentEntry,
  session: SessionInfo | null,
  phaseKey: string
): boolean {
  return isCurrentAgent(session, phaseKey, agent.id);
}

function renderSessionValue(value: string | null | undefined, fallback: string): string {
  return value && value.trim().length > 0 ? value : fallback;
}

function getPipelineGuidance(
  swimlanes: SwimlanePhase[],
  session: SessionInfo | null,
  openEscalations: number,
  humanBlockers: number,
  launchCommandHint: string
) {
  const activeLane = swimlanes.find(
    (lane) => lane.status === 'active' || lane.status === 'needs-input'
  );

  if (!session) {
    return {
      title: 'Start a command first',
      description: `This page becomes useful after you launch ${launchCommandHint} from Commands.`,
      actionLabel: 'Go to Commands',
      actionHref: '/commands',
      badge: 'Idle',
    };
  }

  if (openEscalations > 0 || humanBlockers > 0) {
    return {
      title: 'Answer the blocked question first',
      description:
        'The pipeline is waiting for more information. Open the current session to see the exact escalation and continue execution.',
      actionLabel: 'Open Session',
      actionHref: session.session_id
        ? `/sessions/${encodeURIComponent(session.session_id)}`
        : '/sessions',
      badge: 'Needs input',
    };
  }

  if (activeLane) {
    return {
      title: `Follow ${activeLane.label}`,
      description: activeLane.activeAgentName
        ? `${activeLane.activeAgentName} is currently active. Use this page to see which phase is live and which agents are next.`
        : 'A phase is active. Follow the highlighted lane and its agents to track what is happening now.',
      actionLabel: 'Open Session',
      actionHref: session.session_id
        ? `/sessions/${encodeURIComponent(session.session_id)}`
        : '/sessions',
      badge: laneStatusLabel[activeLane.status],
    };
  }

  return {
    title: 'Review the full delivery flow',
    description:
      'All lanes are visible here. Use this page to understand which phases are complete and what remains before the cycle finishes.',
    actionLabel: 'Open Sessions',
    actionHref: '/sessions',
    badge: 'Overview',
  };
}

function getLaunchCommandHint(metadata?: OrchestratorPackMetadataResponse | null): string {
  const normalize = (value: string) =>
    value
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_');

  const commands = (metadata?.commands ?? [])
    .filter((entry) => entry.mode !== false)
    .map((entry) => String(entry.id || '').trim())
    .filter((entry) => entry.length > 0);

  const priority = ['CREATE', 'AUDIT', 'FEATURE', 'HOTFIX', 'HYBRID', 'AGENCY_ONLY'];
  const prioritized = [
    ...priority.flatMap((target) => commands.filter((command) => normalize(command) === target)),
    ...commands.filter((command) => !priority.includes(normalize(command))),
  ].slice(0, 6);

  const hintCommands = prioritized.length > 0 ? prioritized : commands.slice(0, 6);
  if (hintCommands.length === 0) {
    return 'CREATE, AUDIT, FEATURE, HOTFIX, HYBRID, or AGENCY ONLY';
  }
  if (hintCommands.length === 1) {
    return hintCommands[0];
  }
  if (hintCommands.length === 2) {
    return `${hintCommands[0]} or ${hintCommands[1]}`;
  }
  return `${hintCommands.slice(0, -1).join(', ')}, or ${hintCommands[hintCommands.length - 1]}`;
}

function getRuntimeStageSequence(
  swimlanes: SwimlanePhase[],
  metadata?: OrchestratorPackMetadataResponse | null
): string[] {
  const packStages = (metadata?.stages ?? [])
    .map((stage) => {
      const label = typeof stage.label === 'string' ? stage.label : '';
      const id = typeof stage.id === 'string' ? stage.id : '';
      return (label || id).trim();
    })
    .filter((entry) => entry.length > 0);

  if (packStages.length > 0) {
    return packStages;
  }

  return swimlanes.map((lane) => lane.label);
}

function getGateGuidance(metadata?: OrchestratorPackMetadataResponse | null): string[] {
  const gates = metadata?.gates ?? [];
  return gates
    .map((gate) => {
      const id = typeof gate.id === 'string' ? gate.id : '';
      const label =
        metadata?.labels?.gates?.[id] ?? (typeof gate.type === 'string' ? gate.type : 'GATE');
      return `${id || 'gate'} (${label})`;
    })
    .filter((entry) => entry.length > 0);
}

function buildGuidanceCards(input: {
  session: SessionInfo | null;
  openEscalations: number;
  humanBlockers: number;
  fallbackActionLabel: string;
}): GuidanceCard[] {
  const cards: GuidanceCard[] = [];

  if (input.openEscalations > 0 || input.humanBlockers > 0) {
    cards.push({
      id: 'human-blocker',
      title: 'Human input required',
      blocker: `${input.openEscalations} escalation(s) and ${input.humanBlockers} blocker(s) are currently open.`,
      nextAction: 'Open the active session, resolve the pending question, then continue execution.',
      tone: 'critical',
    });
  }

  const runtimeAlerts = input.session?.runtime_alerts ?? [];
  for (const alert of runtimeAlerts) {
    cards.push({
      id: `runtime-${alert.id}`,
      title: alert.title,
      blocker: alert.detail,
      nextAction: alert.next_action,
      tone: alert.severity === 'critical' ? 'critical' : 'warning',
    });
  }

  if (cards.length === 0) {
    cards.push({
      id: 'default-guidance',
      title: 'Pipeline is healthy',
      blocker: 'No explicit blockers are active for the current run.',
      nextAction: input.fallbackActionLabel,
      tone: 'info',
    });
  }

  return cards;
}

/* ── Main page ── */

export default function PipelinePage() {
  const navigate = useNavigate();
  const { data: status } = useOrchestratorStatus();
  const { data: packMetadata } = useOrchestratorPackMetadata();
  const { data: progress, isLoading, error, refetch } = useProgress();

  const phases = progress?.phases ?? [];
  const swimlanes = buildSwimlanes(phases, progress?.session ?? null);
  const openEscalations = Array.isArray(progress?.session?.open_human_escalations)
    ? progress.session.open_human_escalations.length
    : 0;
  const humanBlockers = Array.isArray(progress?.session?.blockers)
    ? progress.session.blockers.filter(isHumanRequiredBlocker).length
    : 0;
  const launchCommandHint = getLaunchCommandHint(packMetadata);
  const runtimeStageSequence = getRuntimeStageSequence(swimlanes, packMetadata);
  const gateGuidance = getGateGuidance(packMetadata);
  const nextStep = getPipelineGuidance(
    swimlanes,
    progress?.session ?? null,
    openEscalations,
    humanBlockers,
    launchCommandHint
  );
  const guidanceCards = buildGuidanceCards({
    session: progress?.session ?? null,
    openEscalations,
    humanBlockers,
    fallbackActionLabel: `${nextStep.actionLabel} to keep the pipeline moving.`,
  });
  const activeAgentIds = getCurrentAgentIds(progress?.session ?? null);
  const activeAgentsLabel = formatCurrentAgentsLabel(activeAgentIds);
  const contextItems: ContextStripItem[] = [
    {
      id: 'phases',
      label: 'Visible phases',
      value: String(swimlanes.length),
      tone: swimlanes.length > 0 ? 'info' : 'neutral',
    },
    {
      id: 'state',
      label: 'Runtime state',
      value: status?.state ?? 'UNKNOWN',
      tone: status?.state === 'IDLE' ? 'neutral' : 'info',
    },
    {
      id: 'escalations',
      label: 'Open escalations',
      value: String(openEscalations),
      tone: openEscalations > 0 ? 'warning' : 'success',
    },
    {
      id: 'recommended',
      label: 'Recommended',
      value: nextStep.title,
      tone: openEscalations > 0 || humanBlockers > 0 ? 'warning' : 'info',
    },
  ];

  return (
    <PageShell
      isLoading={isLoading}
      loadingLabel="Loading pipeline…"
      error={error as Error | null}
      onRetry={() => refetch()}
    >
      <div className="page-container-wide space-y-6 p-6">
        <PageHeader
          title="Pipeline"
          subtitle="Track every orchestration phase, active agent, and escalation in one governed execution view."
          chips={[
            {
              id: 'pipeline-state',
              label: status?.state ?? 'UNKNOWN',
              tone: status?.state === 'IDLE' ? 'default' : 'info',
            },
            {
              id: 'pipeline-escalations',
              label: `${openEscalations} escalations`,
              tone: openEscalations > 0 ? 'warning' : 'success',
            },
            {
              id: 'pipeline-blockers',
              label: `${humanBlockers} blockers`,
              tone: humanBlockers > 0 ? 'warning' : 'success',
            },
          ]}
          actions={
            <Button
              variant="outline"
              size="sm"
              className="motion-transition-base"
              onClick={() => navigate(nextStep.actionHref)}
            >
              {nextStep.actionLabel}
              <ArrowRight className="ml-1 size-3" />
            </Button>
          }
        />

        <PageHelpStrip routeSlug="pipeline" />

        <ContextStrip items={contextItems} />

        <section aria-label="Runtime sequence and gates" className="grid gap-4 md:grid-cols-2">
          <Card elevation="flat" className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Stage sequence</p>
              <Badge variant="info">Pack runtime</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Runtime stages are rendered from pack metadata when available.
            </p>
            <div className="flex flex-wrap gap-2">
              {runtimeStageSequence.map((stage, index) => (
                <Badge key={`${stage}-${index}`} variant="secondary">
                  {index + 1}. {stage}
                </Badge>
              ))}
            </div>
          </Card>

          <Card elevation="flat" className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Gate guidance</p>
              <Badge variant="outline">Governance</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Gate checkpoints are sourced from the active pack definition.
            </p>
            {gateGuidance.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {gateGuidance.map((gate) => (
                  <Badge key={gate} variant="warning">
                    {gate}
                  </Badge>
                ))}
              </div>
            ) : (
              <Text muted className="text-sm">
                No explicit gate metadata is currently available.
              </Text>
            )}
          </Card>
        </section>

        <section aria-label="Blockers and next actions" className="grid gap-4 md:grid-cols-2">
          {guidanceCards.map((card) => (
            <Card key={card.id} elevation="flat" className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{card.title}</p>
                <Badge
                  variant={
                    card.tone === 'critical'
                      ? 'error'
                      : card.tone === 'warning'
                        ? 'warning'
                        : 'info'
                  }
                >
                  {card.tone === 'critical'
                    ? 'Blocking'
                    : card.tone === 'warning'
                      ? 'Attention'
                      : 'Guidance'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{card.blocker}</p>
              <p className="text-sm">{card.nextAction}</p>
            </Card>
          ))}
        </section>

        <MissionControlHero
          heroId="pipeline"
          eyebrow="Swimlane telemetry"
          title="Follow orchestration like a governed flight deck"
          description="Every phase, agent handoff, and human escalation is visible in sequence so teams can see where automation is flowing and where human judgment is required."
          badges={
            <>
              <ControlSignalBadge signal="governed" />
              {activeAgentIds.length > 0 && <ControlSignalBadge signal="active-agent" />}
              {(openEscalations > 0 || humanBlockers > 0) && (
                <ControlSignalBadge signal="needs-human-input" />
              )}
              {status && (
                <Badge variant={status.state === 'IDLE' ? 'secondary' : 'info'}>
                  {status.state}
                </Badge>
              )}
              <Badge variant="outline">Pipeline</Badge>
            </>
          }
          metrics={[
            {
              label: 'Visible phases',
              value: String(swimlanes.length),
              detail: 'End-to-end runtime lanes',
            },
            {
              label: 'Open escalations',
              value: String(openEscalations),
              detail: 'Questions awaiting an answer',
            },
            {
              label: 'Human blockers',
              value: String(humanBlockers),
              detail: 'Manual decisions halting flow',
            },
            {
              label: 'Current phase',
              value: renderSessionValue(progress?.session?.current_phase, 'Idle'),
              detail: 'Where orchestration is focused now',
            },
          ]}
          motifs={
            <>
              <StatusMotif
                kind="governance"
                title="Phase gates stay explicit"
                description="The lane structure keeps delivery disciplined by making each gate and review stage visible."
              />
              <StatusMotif
                kind="agent"
                title="Agent motion is trackable"
                description="Active work is emphasized so the current executor and next queued specialists are immediately obvious."
              />
              <StatusMotif
                kind="human-loop"
                title="Escalations stop silent failure"
                description="Needs-input states are treated as first-class operational signals rather than hidden background errors."
              />
            </>
          }
          asideTitle="Operator reading"
          asideDescription="Start with the highlighted lane, then inspect active agents and any blocked human decisions before moving to later phases."
          asideContent={
            <div className="space-y-3">
              <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Current action
                </div>
                <div className="mt-2 text-sm font-medium">{nextStep.title}</div>
                <Text muted className="mt-1 text-xs">
                  {nextStep.description}
                </Text>
              </div>
              <Button
                className="w-full justify-between"
                variant="outline"
                onClick={() => navigate(nextStep.actionHref)}
              >
                {nextStep.actionLabel}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          }
        />

        <div className="page-split-grid">
          <Card elevation="flat" className="border border-border/70 px-5 py-5">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 size-5 text-info" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">How to use this page</span>
                  <Badge variant="outline">Pipeline guide</Badge>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                    <Badge variant="secondary">1</Badge>
                    <div className="mt-3 font-medium">Find the highlighted lane</div>
                    <Text muted className="mt-1 text-xs">
                      The active phase is visually emphasized. Start there before reading the other
                      lanes.
                    </Text>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                    <Badge variant="secondary">2</Badge>
                    <div className="mt-3 font-medium">Check the active agent</div>
                    <Text muted className="mt-1 text-xs">
                      Each lane shows which agent is currently running and which agents are still
                      pending.
                    </Text>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                    <Badge variant="secondary">3</Badge>
                    <div className="mt-3 font-medium">Respond to warnings quickly</div>
                    <Text muted className="mt-1 text-xs">
                      If a lane shows `Needs input`, the cycle is paused until the required answer
                      is provided.
                    </Text>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card elevation="flat" className="border border-border/70 px-5 py-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 size-5 text-warning" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">Recommended next step</span>
                  <Badge variant={openEscalations > 0 || humanBlockers > 0 ? 'warning' : 'info'}>
                    {nextStep.badge}
                  </Badge>
                </div>
                <div className="mt-3 text-sm font-medium">{nextStep.title}</div>
                <Text muted className="mt-1 text-sm">
                  {nextStep.description}
                </Text>
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => navigate(nextStep.actionHref)}
                >
                  {nextStep.actionLabel}
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Session info */}
        {progress?.session && (
          <Card elevation="flat" className="gap-4 border border-border/70 px-5 py-5">
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <Text muted className="text-xs">
                  Cycle
                </Text>
                <span className="font-medium">
                  {renderSessionValue(progress.session.cycle_type, 'Not started')}
                </span>
              </div>
              <div>
                <Text muted className="text-xs">
                  Phase
                </Text>
                <span className="font-medium">
                  {renderSessionValue(progress.session.current_phase, 'Waiting')}
                </span>
              </div>
              <div>
                <Text muted className="text-xs">
                  {activeAgentIds.length > 1 ? 'Agents' : 'Agent'}
                </Text>
                <span className="font-medium">{activeAgentsLabel}</span>
              </div>
              <div>
                <Text muted className="text-xs">
                  Step
                </Text>
                <span className="font-medium">
                  {renderSessionValue(progress.session.current_step, 'Waiting for orchestration')}
                </span>
              </div>
            </div>

            {(openEscalations > 0 || humanBlockers > 0) && (
              <div className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <AlertCircle className="size-4 text-warning" /> Needs human input
                </div>
                <Text className="mt-1 text-sm text-muted-foreground">
                  The active agent is waiting for user input before the pipeline can continue.
                </Text>
              </div>
            )}
          </Card>
        )}

        {/* Pipeline visualization */}
        {swimlanes.length > 0 ? (
          <div className="space-y-4">
            {swimlanes.map((phase) => (
              <section key={phase.key} aria-label={`${phase.label} swimlane`}>
                <Card
                  elevation={
                    phase.status === 'active' || phase.status === 'needs-input'
                      ? 'raised'
                      : 'outlined'
                  }
                  tone={laneTone[phase.status]}
                  className={cn('gap-4 border-l-4 px-5 py-5', laneAccentClasses[phase.status])}
                >
                  <div className="grid gap-4 xl:items-center xl:grid-cols-[18rem_minmax(0,1fr)]">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            {laneIcon[phase.status]}
                            <span>{phase.label}</span>
                          </div>
                          <Text muted className="mt-1 text-xs">
                            {phase.done}/{phase.total} agents complete in this lane
                          </Text>
                        </div>
                        <Badge variant={laneBadgeVariant[phase.status]}>
                          {laneStatusLabel[phase.status]}
                        </Badge>
                      </div>

                      <ProgressBar
                        value={phase.total > 0 ? Math.round((phase.done / phase.total) * 100) : 0}
                        label={`${phase.done}/${phase.total} agents`}
                        showPercentage
                      />

                      {phase.activeAgentName && (
                        <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm">
                          <ControlSignalBadge signal="active-agent" className="mb-2" />
                          <div className="mt-1 font-medium">{phase.activeAgentName}</div>
                        </div>
                      )}

                      {phase.status === 'needs-input' && (
                        <div className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
                          <ControlSignalBadge signal="needs-human-input" className="mb-2" />
                          <Text className="mt-1 text-sm text-muted-foreground">
                            {phase.openEscalations} open escalation(s) and {phase.humanBlockers}{' '}
                            human blocker(s) are holding this lane.
                          </Text>
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          <Users className="size-3.5" /> Agents
                        </div>
                        <span className="text-xs text-muted-foreground">{phase.total} total</span>
                      </div>

                      <div
                        className="flex gap-3 overflow-x-auto pb-1"
                        tabIndex={0}
                        aria-label={`Agent swimlane cards for ${phase.label}`}
                      >
                        {phase.agents.map((agent) => (
                          <article
                            key={agent.id}
                            className={cn(
                              'min-w-44 rounded-2xl border px-4 py-3 transition-colors',
                              agentTileClass[agent.swimlaneStatus]
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="text-sm font-medium leading-snug">{agent.name}</div>
                              {laneIcon[agent.swimlaneStatus]}
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                              <Badge variant={agentBadgeVariant[agent.swimlaneStatus]} dot>
                                {agentStatusLabel[agent.swimlaneStatus]}
                              </Badge>
                            </div>
                            {agent.swimlaneStatus === 'needs-input' && (
                              <Text className="mt-2 text-xs text-muted-foreground">
                                Waiting for answer before the agent can continue.
                              </Text>
                            )}
                          </article>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </section>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<GitBranch className="size-12" />}
            title="No active pipeline"
            description={`Start ${launchCommandHint} to see the pipeline in action.`}
          />
        )}
      </div>
    </PageShell>
  );
}
