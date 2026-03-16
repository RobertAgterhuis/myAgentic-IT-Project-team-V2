// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * SDLC Lifecycle Model
 *
 * Defines the canonical lifecycle stages and transition rules for SDLC
 * entities. Each stage has allowed predecessors, successors, and gate
 * conditions. The lifecycle model is the backbone of workflow orchestration.
 *
 * Stage sequence: IDEA → REQUIREMENTS → ARCHITECTURE → PLANNING →
 * IMPLEMENTATION → TESTING → SECURITY_VALIDATION → RELEASE → OPERATIONS →
 * IMPROVEMENT (→ loops back to REQUIREMENTS or ARCHITECTURE).
 *
 * Zero external dependencies. Pure functions.
 *
 * @module sdlc/lifecycle
 */

import {
  LIFECYCLE_STAGES,
  type LifecycleStage,
  type EntityType,
  ENTITY_TYPES,
  type Release,
  type ImplementationTask,
  createRelease,
  ENTITY_STATUS,
  LINK_TYPES,
} from './entities.js';

// ─── Gate Condition ──────────────────────────────────────────

export interface GateCondition {
  id: string;
  name: string;
  description: string;
  required: boolean;
}

// ─── Stage Definition ────────────────────────────────────────

export interface StageDefinition {
  stage: LifecycleStage;
  label: string;
  description: string;
  order: number;
  predecessors: LifecycleStage[];
  successors: LifecycleStage[];
  gates: GateCondition[];
  applicable_entities: EntityType[];
}

// ─── Stage Definitions (canonical) ───────────────────────────

export const STAGE_DEFINITIONS: readonly StageDefinition[] = Object.freeze([
  {
    stage: LIFECYCLE_STAGES.IDEA,
    label: 'Idea',
    description: 'Initial concept formulation — vision, stakeholders, feasibility.',
    order: 0,
    predecessors: [],
    successors: [LIFECYCLE_STAGES.REQUIREMENTS],
    gates: [
      {
        id: 'G-IDEA-01',
        name: 'Vision Statement',
        description: 'Product vision is documented',
        required: true,
      },
      {
        id: 'G-IDEA-02',
        name: 'Stakeholder Identification',
        description: 'Key stakeholders listed',
        required: true,
      },
    ],
    applicable_entities: [ENTITY_TYPES.PRODUCT],
  },
  {
    stage: LIFECYCLE_STAGES.REQUIREMENTS,
    label: 'Requirements',
    description: 'Elicit, analyze, and prioritize functional and non-functional requirements.',
    order: 1,
    predecessors: [LIFECYCLE_STAGES.IDEA, LIFECYCLE_STAGES.IMPROVEMENT],
    successors: [LIFECYCLE_STAGES.ARCHITECTURE],
    gates: [
      {
        id: 'G-REQ-01',
        name: 'Requirements Documented',
        description: 'All requirements have acceptance criteria',
        required: true,
      },
      {
        id: 'G-REQ-02',
        name: 'Stakeholder Sign-off',
        description: 'Requirements reviewed by product owner',
        required: true,
      },
      {
        id: 'G-REQ-03',
        name: 'Prioritization Complete',
        description: 'All requirements are prioritized',
        required: false,
      },
    ],
    applicable_entities: [ENTITY_TYPES.FEATURE, ENTITY_TYPES.REQUIREMENT],
  },
  {
    stage: LIFECYCLE_STAGES.ARCHITECTURE,
    label: 'Architecture',
    description: 'System design, technology selection, ADRs, security design, data model.',
    order: 2,
    predecessors: [LIFECYCLE_STAGES.REQUIREMENTS, LIFECYCLE_STAGES.IMPROVEMENT],
    successors: [LIFECYCLE_STAGES.PLANNING],
    gates: [
      {
        id: 'G-ARCH-01',
        name: 'ADR Recorded',
        description: 'Architecture decisions documented',
        required: true,
      },
      {
        id: 'G-ARCH-02',
        name: 'Security Review',
        description: 'Security architecture reviewed',
        required: true,
      },
      {
        id: 'G-ARCH-03',
        name: 'Scalability Assessment',
        description: 'Non-functional constraints validated',
        required: false,
      },
    ],
    applicable_entities: [ENTITY_TYPES.ARCHITECTURE_DECISION, ENTITY_TYPES.PROJECT],
  },
  {
    stage: LIFECYCLE_STAGES.PLANNING,
    label: 'Planning',
    description: 'Sprint breakdown, task estimation, dependency analysis, team allocation.',
    order: 3,
    predecessors: [LIFECYCLE_STAGES.ARCHITECTURE],
    successors: [LIFECYCLE_STAGES.IMPLEMENTATION],
    gates: [
      {
        id: 'G-PLAN-01',
        name: 'Sprint Backlog Ready',
        description: 'Tasks estimated and assigned',
        required: true,
      },
      {
        id: 'G-PLAN-02',
        name: 'Definition of Ready',
        description: 'All stories meet DoR criteria',
        required: true,
      },
    ],
    applicable_entities: [ENTITY_TYPES.PROJECT, ENTITY_TYPES.IMPLEMENTATION_TASK],
  },
  {
    stage: LIFECYCLE_STAGES.IMPLEMENTATION,
    label: 'Implementation',
    description: 'Code development, code review, pair programming, CI integration.',
    order: 4,
    predecessors: [LIFECYCLE_STAGES.PLANNING],
    successors: [LIFECYCLE_STAGES.TESTING],
    gates: [
      {
        id: 'G-IMPL-01',
        name: 'Code Review Passed',
        description: 'PR approved by at least one reviewer',
        required: true,
      },
      { id: 'G-IMPL-02', name: 'CI Green', description: 'All CI checks pass', required: true },
      {
        id: 'G-IMPL-03',
        name: 'Secret Scan Clean',
        description: 'No secrets detected in codebase',
        required: true,
      },
    ],
    applicable_entities: [ENTITY_TYPES.IMPLEMENTATION_TASK],
  },
  {
    stage: LIFECYCLE_STAGES.TESTING,
    label: 'Testing',
    description: 'Unit, integration, E2E, performance testing, coverage validation.',
    order: 5,
    predecessors: [LIFECYCLE_STAGES.IMPLEMENTATION],
    successors: [LIFECYCLE_STAGES.SECURITY_VALIDATION],
    gates: [
      {
        id: 'G-TEST-01',
        name: 'Coverage Threshold Met',
        description: 'Code coverage meets minimum thresholds',
        required: true,
      },
      {
        id: 'G-TEST-02',
        name: 'No Critical Failures',
        description: 'All critical test cases pass',
        required: true,
      },
      {
        id: 'G-TEST-03',
        name: 'E2E Smoke Pass',
        description: 'E2E smoke tests pass in staging',
        required: false,
      },
    ],
    applicable_entities: [ENTITY_TYPES.TEST_ARTIFACT],
  },
  {
    stage: LIFECYCLE_STAGES.SECURITY_VALIDATION,
    label: 'Security Validation',
    description: 'SAST, DAST, dependency audit, OWASP top-10 compliance check.',
    order: 6,
    predecessors: [LIFECYCLE_STAGES.TESTING],
    successors: [LIFECYCLE_STAGES.RELEASE],
    gates: [
      {
        id: 'G-SEC-01',
        name: 'SAST Clean',
        description: 'No critical/high SAST findings',
        required: true,
      },
      {
        id: 'G-SEC-02',
        name: 'Dependency Audit',
        description: 'No known critical CVEs in dependencies',
        required: true,
      },
      {
        id: 'G-SEC-03',
        name: 'OWASP Compliance',
        description: 'OWASP top-10 mitigations verified',
        required: false,
      },
    ],
    applicable_entities: [ENTITY_TYPES.RELEASE, ENTITY_TYPES.TEST_ARTIFACT],
  },
  {
    stage: LIFECYCLE_STAGES.RELEASE,
    label: 'Release',
    description: 'Version tagging, changelog, artifact packaging, release approval.',
    order: 7,
    predecessors: [LIFECYCLE_STAGES.SECURITY_VALIDATION],
    successors: [LIFECYCLE_STAGES.OPERATIONS],
    gates: [
      {
        id: 'G-REL-01',
        name: 'Release Notes',
        description: 'Changelog and release notes published',
        required: true,
      },
      {
        id: 'G-REL-02',
        name: 'Version Tagged',
        description: 'Git tag created for release version',
        required: true,
      },
      {
        id: 'G-REL-03',
        name: 'Approval Gate',
        description: 'Release approved by designated authority',
        required: true,
      },
    ],
    applicable_entities: [ENTITY_TYPES.RELEASE],
  },
  {
    stage: LIFECYCLE_STAGES.OPERATIONS,
    label: 'Operations',
    description: 'Deployment, monitoring, incident response, SLA tracking.',
    order: 8,
    predecessors: [LIFECYCLE_STAGES.RELEASE],
    successors: [LIFECYCLE_STAGES.IMPROVEMENT],
    gates: [
      {
        id: 'G-OPS-01',
        name: 'Deployment Verified',
        description: 'Health checks pass in production',
        required: true,
      },
      {
        id: 'G-OPS-02',
        name: 'Monitoring Active',
        description: 'Alerting and dashboards configured',
        required: true,
      },
    ],
    applicable_entities: [ENTITY_TYPES.DEPLOYMENT, ENTITY_TYPES.INCIDENT],
  },
  {
    stage: LIFECYCLE_STAGES.IMPROVEMENT,
    label: 'Improvement',
    description: 'Retrospective, metrics review, process refinement, feedback loop.',
    order: 9,
    predecessors: [LIFECYCLE_STAGES.OPERATIONS],
    successors: [LIFECYCLE_STAGES.REQUIREMENTS, LIFECYCLE_STAGES.ARCHITECTURE],
    gates: [
      {
        id: 'G-IMP-01',
        name: 'Retrospective Done',
        description: 'Sprint retrospective completed',
        required: true,
      },
      {
        id: 'G-IMP-02',
        name: 'Metrics Reviewed',
        description: 'DORA metrics and KPIs assessed',
        required: false,
      },
    ],
    applicable_entities: [ENTITY_TYPES.IMPROVEMENT],
  },
]);

// ─── Lookup Helpers ──────────────────────────────────────────

const _stageMap = new Map<LifecycleStage, StageDefinition>();
for (const def of STAGE_DEFINITIONS) {
  _stageMap.set(def.stage, def);
}

export function getStageDefinition(stage: LifecycleStage): StageDefinition | undefined {
  return _stageMap.get(stage);
}

// ─── Ordered Stage Sequence ──────────────────────────────────

export const STAGE_SEQUENCE: readonly LifecycleStage[] = STAGE_DEFINITIONS.slice()
  .sort((a, b) => a.order - b.order)
  .map((d) => d.stage);

// ─── Transition Validation ───────────────────────────────────

export interface TransitionResult {
  allowed: boolean;
  reason: string;
  unmet_gates: GateCondition[];
}

/**
 * Check whether a stage transition is structurally allowed.
 * Does NOT evaluate gate condition fulfilment — that is the
 * responsibility of the caller (approval engine / gate validator).
 */
export function canTransition(from: LifecycleStage, to: LifecycleStage): TransitionResult {
  const fromDef = _stageMap.get(from);
  if (!fromDef) {
    return { allowed: false, reason: `Unknown source stage: ${from}`, unmet_gates: [] };
  }

  if (!fromDef.successors.includes(to)) {
    return {
      allowed: false,
      reason: `Transition ${from} → ${to} is not allowed. Valid successors: ${fromDef.successors.join(', ')}`,
      unmet_gates: [],
    };
  }

  const toDef = _stageMap.get(to);
  if (!toDef) {
    return { allowed: false, reason: `Unknown target stage: ${to}`, unmet_gates: [] };
  }

  // Return the required gates the caller needs to satisfy
  const requiredGates = toDef.gates.filter((g) => g.required);
  return {
    allowed: true,
    reason: `Transition ${from} → ${to} is structurally valid`,
    unmet_gates: requiredGates,
  };
}

/**
 * Validate a full gate evaluation for a stage transition.
 * `passedGateIds` is the set of gate IDs that have been satisfied.
 */
export function validateTransition(
  from: LifecycleStage,
  to: LifecycleStage,
  passedGateIds: ReadonlySet<string>
): TransitionResult {
  const structural = canTransition(from, to);
  if (!structural.allowed) return structural;

  const toDef = _stageMap.get(to)!;
  const unmetRequired = toDef.gates.filter((g) => g.required && !passedGateIds.has(g.id));

  if (unmetRequired.length > 0) {
    return {
      allowed: false,
      reason: `Transition ${from} → ${to} blocked by ${unmetRequired.length} unmet required gates`,
      unmet_gates: unmetRequired,
    };
  }

  return {
    allowed: true,
    reason: `Transition ${from} → ${to} approved — all required gates passed`,
    unmet_gates: toDef.gates.filter((g) => !g.required && !passedGateIds.has(g.id)),
  };
}

/**
 * Return the next stage in the canonical forward sequence.
 * Returns undefined when at the last stage (IMPROVEMENT).
 */
export function nextStage(current: LifecycleStage): LifecycleStage | undefined {
  const idx = STAGE_SEQUENCE.indexOf(current);
  if (idx < 0 || idx >= STAGE_SEQUENCE.length - 1) return undefined;
  return STAGE_SEQUENCE[idx + 1];
}

// ─── Release Creation at Sprint Completion ──────────────────

export interface SprintCompletionInput {
  sprint_id: string;
  version: string;
  completed_tasks: ImplementationTask[];
  test_ids: string[];
  changelog: string[];
  owner?: string;
}

/**
 * Create a Release entity from a completed sprint's tasks, linking it to
 * the tasks and test artifacts that were part of the sprint.
 */
export function createReleaseFromSprint(input: SprintCompletionInput): Release {
  const { sprint_id, version, completed_tasks, test_ids, changelog, owner } = input;

  const taskIds = completed_tasks.map((t) => t.id);

  const links = [
    ...completed_tasks.map((t) => ({
      type: LINK_TYPES.IMPLEMENTS as typeof LINK_TYPES.IMPLEMENTS,
      target_id: t.id,
      target_type: ENTITY_TYPES.IMPLEMENTATION_TASK as typeof ENTITY_TYPES.IMPLEMENTATION_TASK,
      created_at: new Date().toISOString(),
    })),
    ...test_ids.map((tid) => ({
      type: LINK_TYPES.TESTED_BY as typeof LINK_TYPES.TESTED_BY,
      target_id: tid,
      target_type: ENTITY_TYPES.TEST_ARTIFACT as typeof ENTITY_TYPES.TEST_ARTIFACT,
      created_at: new Date().toISOString(),
    })),
  ];

  return createRelease(version, {
    status: ENTITY_STATUS.DONE,
    owner: owner || '',
    changelog,
    task_ids: taskIds,
    test_ids,
    links,
    tags: ['sprint', sprint_id],
    metadata: { sprint_id },
  });
}
