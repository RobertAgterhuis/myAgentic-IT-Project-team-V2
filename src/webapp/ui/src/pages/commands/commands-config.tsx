import type { OrchestratorCommandName, OrchestratorPackMetadataResponse } from '@/lib/api-types';
import { Play, Search, Zap, Bug, GitBranch, Users } from 'lucide-react';

export interface QuickActionConfig {
  command: OrchestratorCommandName;
  label: string;
  icon: React.ReactNode;
  description: string;
  whenToUse: string;
  nextStep: string;
}

export const QUICK_ACTIONS: QuickActionConfig[] = [
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
  {
    command: 'AGENCY ONLY',
    label: 'AGENCY ONLY',
    icon: <Users className="size-4" />,
    description: 'Run pure agency team execution',
    whenToUse: 'Use when you need the agency roster to execute without the full SDLC phase cycle.',
    nextStep: 'The runtime assembles and runs agency specialists with checklist-based handoffs.',
  },
  {
    command: 'HYBRID',
    label: 'HYBRID',
    icon: <GitBranch className="size-4" />,
    description: 'Run SDLC + agency specialist injection',
    whenToUse:
      'Use when you want the SDLC phase structure with agency specialist injections at boundaries.',
    nextStep:
      'The orchestrator runs SDLC phases and injects agency specialists using unified quality gates.',
  },
];

const COMMAND_PRIORITY = ['CREATE', 'AUDIT', 'FEATURE', 'HOTFIX', 'AGENCY_ONLY', 'HYBRID'];

function normalizeCommandId(value: unknown): string {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

const COMMAND_VARIANTS: Record<string, 'info' | 'warning' | 'secondary'> = {
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
  AGENCY_ONLY: 'secondary',
  HYBRID: 'info',
};

const COMMAND_ICON_BY_NAME: Record<string, React.ReactNode> = {
  CREATE: <Play className="size-4" />,
  AUDIT: <Search className="size-4" />,
  FEATURE: <Zap className="size-4" />,
  HOTFIX: <Bug className="size-4" />,
  AGENCY_ONLY: <Users className="size-4" />,
  HYBRID: <GitBranch className="size-4" />,
};

const DEFAULT_COMMAND_DETAILS = {
  description: 'Execute a pack-provided workflow command.',
  whenToUse: 'Use when this command best matches the work objective and available context.',
  nextStep: 'The orchestrator queues and starts this command according to pack runtime rules.',
};

export function getCommandVariant(command: string): 'info' | 'warning' | 'secondary' {
  return COMMAND_VARIANTS[normalizeCommandId(command)] ?? 'secondary';
}

export function buildQuickActionsFromPackMetadata(
  metadata?: OrchestratorPackMetadataResponse | null
): QuickActionConfig[] {
  const commands = metadata?.commands ?? [];
  const modeCommands = commands
    .filter((entry) => entry.mode !== false)
    .map((entry) => {
      const id = String(entry.id || '').trim();
      const normalized = normalizeCommandId(id);
      return {
        id,
        normalized,
        label: metadata?.labels?.commands?.[id] || entry.label || id,
      };
    })
    .filter((entry) => entry.id.length > 0);

  if (modeCommands.length === 0) {
    return QUICK_ACTIONS;
  }

  const preferred = COMMAND_PRIORITY.flatMap((priorityId) =>
    modeCommands.filter((entry) => entry.normalized === priorityId)
  );

  const remaining = modeCommands.filter(
    (entry) => !preferred.some((preferredEntry) => preferredEntry.id === entry.id)
  );

  const ranked = [...preferred, ...remaining].slice(0, 6);
  const quickActions: QuickActionConfig[] = [];
  for (const entry of ranked) {
    const fallback = QUICK_ACTIONS.find(
      (candidate) => normalizeCommandId(candidate.command) === entry.normalized
    );

    quickActions.push({
      command: entry.id,
      label: entry.label,
      icon: COMMAND_ICON_BY_NAME[entry.normalized] ?? <Play className="size-4" />,
      description: fallback?.description ?? DEFAULT_COMMAND_DETAILS.description,
      whenToUse: fallback?.whenToUse ?? DEFAULT_COMMAND_DETAILS.whenToUse,
      nextStep: fallback?.nextStep ?? DEFAULT_COMMAND_DETAILS.nextStep,
    });
  }

  return quickActions.length > 0 ? quickActions : QUICK_ACTIONS;
}
