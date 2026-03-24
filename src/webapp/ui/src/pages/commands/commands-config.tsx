import type { OrchestratorCommandName } from '@/lib/api-types';
import { Play, Search, Zap, Bug } from 'lucide-react';

export const QUICK_ACTIONS: {
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

export const COMMAND_VARIANTS: Record<OrchestratorCommandName, 'info' | 'warning' | 'secondary'> = {
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
