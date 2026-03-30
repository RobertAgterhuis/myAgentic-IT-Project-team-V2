/**
 * Execution Mode definitions and utilities
 * Maps to platform/engine/execution-mode.ts
 * M4: Hybrid SDLC + Agency Execution Model
 */

export type ExecutionMode = 'SDLC_ONLY' | 'AGENCY_ONLY' | 'HYBRID';

export const VALID_EXECUTION_MODES: readonly ExecutionMode[] = Object.freeze([
  'SDLC_ONLY',
  'AGENCY_ONLY',
  'HYBRID',
]);

export const EXECUTION_MODE_DESCRIPTORS = {
  SDLC_ONLY: {
    label: 'SDLC Only',
    description: 'Traditional SDLC-only execution (default)',
    phases: ['PHASE_1', 'PHASE_2', 'PHASE_3', 'PHASE_4'],
    agentsPerPhase: 5,
    color: 'blue',
    icon: 'CheckCircle',
    summary: 'Full SDLC workflow with all specialized phases',
  },
  AGENCY_ONLY: {
    label: 'Agency Only',
    description: 'Pure agency team execution without SDLC phases',
    phases: [],
    agentsPerPhase: 'variable',
    color: 'purple',
    icon: 'Users',
    summary: 'Sequential agency team execution with handoff validation',
  },
  HYBRID: {
    label: 'Hybrid',
    description: 'Hybrid SDLC + agency specialist injection at phase boundaries',
    phases: ['PHASE_1', 'PHASE_2', 'PHASE_3', 'PHASE_4'],
    agentsPerPhase: '5+',
    color: 'emerald',
    icon: 'GitBranch',
    summary: 'SDLC phases with injected agency specialists for context-safe collaboration',
  },
} as const;

export const MILESTONES = {
  M0: {
    id: 'M0',
    name: 'Foundation & Platform Setup',
    description: 'Project initialization and platform infrastructure',
    status: 'completed' as const,
    progress: 100,
  },
  M1: {
    id: 'M1',
    name: 'Agent Registry & Metadata',
    description: 'Catalog all agency + SDLC agents with structured metadata',
    status: 'completed' as const,
    progress: 100,
  },
  M2: {
    id: 'M2',
    name: 'Handoff Protocol Standardization',
    description: 'Define and validate unified handoff contract across agent types',
    status: 'completed' as const,
    progress: 100,
  },
  M3: {
    id: 'M3',
    name: 'Task-Aware Agent Assembly',
    description: 'Implement task schema, matching, and team assembly logic',
    status: 'completed' as const,
    progress: 100,
  },
  M4: {
    id: 'M4',
    name: 'Hybrid SDLC + Agency Execution',
    description: 'Run SDLC_ONLY, AGENCY_ONLY, and HYBRID modes with unified quality gates',
    status: 'completed' as const,
    progress: 100,
  },
  M5: {
    id: 'M5',
    name: 'Learning & Optimization Engine',
    description: 'Track outcomes and improve team recommendations over time',
    status: 'in-progress' as const,
    progress: 55,
  },
} as const;

export function isValidExecutionMode(value: unknown): value is ExecutionMode {
  return typeof value === 'string' && VALID_EXECUTION_MODES.includes(value as ExecutionMode);
}

export function getExecutionModeDescriptor(mode: ExecutionMode) {
  return EXECUTION_MODE_DESCRIPTORS[mode];
}

export function getMilestoneById(id: keyof typeof MILESTONES) {
  return MILESTONES[id];
}

export function getAllMilestones() {
  return Object.values(MILESTONES);
}

export function getMilestoneProgress() {
  const milestones = Object.values(MILESTONES);
  const completed = milestones.filter((m) => m.status === 'completed').length;
  return {
    total: milestones.length,
    completed,
    inProgress: milestones.filter((m) => m.status === 'in-progress').length,
    percentage: Math.round((completed / milestones.length) * 100),
  };
}
