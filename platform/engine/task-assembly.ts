// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * M3: Task-Aware Agent Assembly
 *
 * Provides:
 *  - TaskDefinition schema types  (Issue #1392)
 *  - Agent matching algorithm     (Issue #1393)
 *  - Pre-built team configurations (Issue #1394)
 *  - assembleTeam service          (Issue #1395)
 *
 * @module platform/engine/task-assembly
 */

import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import {
  loadAgentRegistry,
  type AgentRegistryEntry,
  type AgentDomain,
  type AgentTimelineEstimate,
} from './agent-registry';

// ─── Schema path ────────────────────────────────────────────────────────────

export const TASK_ASSEMBLY_SCHEMA_PATH = path.resolve(
  __dirname,
  '..',
  'schema',
  'task-assembly.schema.json'
);

// ─── Types ──────────────────────────────────────────────────────────────────

export type TaskCommandMode =
  | 'CREATE'
  | 'AUDIT'
  | 'CREATE_BUSINESS'
  | 'CREATE_TECH'
  | 'CREATE_UX'
  | 'CREATE_MARKETING'
  | 'FEATURE'
  | 'SCOPE_CHANGE'
  | 'HOTFIX';

export interface TaskConstraints {
  /** Maximum agents in the assembled team */
  maxAgents: number;
  /** Maximum acceptable timeline */
  timeline: AgentTimelineEstimate;
  /** Minimum quality threshold (0–1) */
  minQuality?: number;
  /** Capabilities that must be covered by at least one team member */
  requiredCapabilities?: string[];
  /** Agent IDs explicitly excluded from assembly */
  excludedAgentIds?: string[];
}

export interface TaskPreferences {
  sortBy?: 'success_rate' | 'name' | 'recency';
  preferredAgentIds?: string[];
  includeAlternatives?: boolean;
}

/** Task input contract for orchestrator assembly */
export interface TaskDefinition {
  id: string;
  title: string;
  description: string;
  goals: string[];
  domains: AgentDomain[];
  constraints: TaskConstraints;
  preferences?: TaskPreferences;
  commandMode?: TaskCommandMode;
}

export interface ScoredAgent {
  agent: AgentRegistryEntry;
  /** Overall match score 0–1 */
  score: number;
  /** Per-factor breakdown */
  scoringDetail: {
    domainScore: number;
    capabilityScore: number;
    successRateScore: number;
    timelineScore: number;
    preferenceBoost: number;
  };
  /** Human-readable matching rationale */
  reasoning: string;
}

export interface AssembledTeam {
  taskId: string;
  selectedTeam: ScoredAgent[];
  alternatives: ScoredAgent[];
  /** Overall assembly confidence 0–1 */
  confidence: number;
  /** Identified risks for this team composition */
  risks: string[];
  /** Narrative reasoning for the overall assembly */
  reasoning: string;
  /** Estimated collective timeline */
  estimatedTimeline: AgentTimelineEstimate;
  assembledAt: string;
}

// ─── Timeline ordering ───────────────────────────────────────────────────────

const TIMELINE_RANK: Record<AgentTimelineEstimate, number> = {
  '<4 hours': 1,
  '4-8 hours': 2,
  '1-3 days': 3,
  '3-5 days': 4,
  '>1 week': 5,
};

// ─── Agent Matching Algorithm (Issue #1393) ──────────────────────────────────

/**
 * Score a single agent candidate against a task definition.
 *
 * Weights:
 *  - 40% domain overlap
 *  - 30% capability overlap
 *  - 20% success rate
 *  - 10% timeline fitness
 *
 * A 0.1 preference boost is applied (uncapped at 1) for agents in preferredAgentIds.
 */
function scoreAgent(agent: AgentRegistryEntry, task: TaskDefinition): ScoredAgent {
  const agentDomains = new Set(agent.domain);
  const taskDomains = new Set(task.domains);

  // Domain score: fraction of task domains the agent covers
  const matchedDomains = task.domains.filter((d) => agentDomains.has(d)).length;
  const domainScore = task.domains.length > 0 ? matchedDomains / task.domains.length : 0;

  // Capability score: fraction of requiredCapabilities the agent has
  const required = (task.constraints.requiredCapabilities ?? []).map((c) => c.toLowerCase());
  let capabilityScore = 0;
  if (required.length > 0) {
    const agentCaps = agent.capabilities.map((c) => c.toLowerCase());
    const covered = required.filter((req) =>
      agentCaps.some((cap) => cap.includes(req) || req.includes(cap))
    ).length;
    capabilityScore = covered / required.length;
  } else {
    // No required capabilities specified — neutral full score
    capabilityScore = 1;
  }

  // Success rate score: normalised from 0–1 (agent.successRate is already 0–1)
  const successRateScore = agent.successRate;

  // Timeline fitness: agent estimate must not exceed task constraint
  const taskTimelineRank = TIMELINE_RANK[task.constraints.timeline] ?? 5;
  const agentTimelineRank = TIMELINE_RANK[agent.timelineEstimate] ?? 5;
  const timelineScore = agentTimelineRank <= taskTimelineRank ? 1 : 0;

  // Preference boost
  const preferred = task.preferences?.preferredAgentIds ?? [];
  const preferenceBoost = preferred.includes(agent.id) ? 0.1 : 0;

  const rawScore =
    0.4 * domainScore +
    0.3 * capabilityScore +
    0.2 * successRateScore +
    0.1 * timelineScore +
    preferenceBoost;

  const score = Math.min(1, rawScore);

  const reasoning = buildAgentReasoning(agent, {
    domainScore,
    capabilityScore,
    successRateScore,
    timelineScore,
    preferenceBoost,
    taskDomains,
    agentDomains,
  });

  return {
    agent,
    score,
    scoringDetail: {
      domainScore,
      capabilityScore,
      successRateScore,
      timelineScore,
      preferenceBoost,
    },
    reasoning,
  };
}

function buildAgentReasoning(
  agent: AgentRegistryEntry,
  ctx: {
    domainScore: number;
    capabilityScore: number;
    successRateScore: number;
    timelineScore: number;
    preferenceBoost: number;
    taskDomains: Set<AgentDomain>;
    agentDomains: Set<AgentDomain>;
  }
): string {
  const parts: string[] = [];

  const matchedDomains = [...ctx.taskDomains].filter((d) => ctx.agentDomains.has(d));
  if (matchedDomains.length > 0) {
    parts.push(`domain match on [${matchedDomains.join(', ')}]`);
  } else {
    parts.push('no direct domain overlap');
  }

  if (ctx.capabilityScore >= 0.8) {
    parts.push('high capability alignment');
  } else if (ctx.capabilityScore >= 0.5) {
    parts.push('partial capability alignment');
  } else {
    parts.push('limited capability alignment');
  }

  parts.push(`success rate ${Math.round(ctx.successRateScore * 100)}%`);

  if (ctx.timelineScore === 0) {
    parts.push(`timeline exceeds constraint (${agent.timelineEstimate})`);
  }

  if (ctx.preferenceBoost > 0) {
    parts.push('preferred by task requester');
  }

  return `${agent.name}: ${parts.join('; ')}.`;
}

/**
 * Apply secondary sort after scoring.
 */
function applySort(
  agents: ScoredAgent[],
  sortBy?: 'success_rate' | 'name' | 'recency'
): ScoredAgent[] {
  if (!sortBy || sortBy === 'success_rate') {
    return [...agents].sort((a, b) => b.score - a.score);
  }
  if (sortBy === 'name') {
    return [...agents].sort((a, b) => a.agent.name.localeCompare(b.agent.name));
  }
  if (sortBy === 'recency') {
    return [...agents].sort(
      (a, b) => new Date(b.agent.lastUpdated).getTime() - new Date(a.agent.lastUpdated).getTime()
    );
  }
  return agents;
}

// ─── Pre-built Team Configurations (Issue #1394) ─────────────────────────────

export interface TeamConfiguration {
  id: string;
  name: string;
  description: string;
  commandMode: TaskCommandMode;
  /** Ordered agent IDs; agents are resolved from the live registry at assembly time */
  agentIds: string[];
  /** Sequence dependencies between agents: key depends on value */
  dependencies: Record<string, string[]>;
  /** Indicative combined timeline */
  timelineHint: AgentTimelineEstimate;
  /** Domains this configuration typically covers */
  domains: AgentDomain[];
}

export const TEAM_CONFIGURATIONS: TeamConfiguration[] = [
  {
    id: 'config-create-full',
    name: 'Full CREATE Cycle',
    description: 'Complete business → tech → UX → marketing cycle covering all 4 phases.',
    commandMode: 'CREATE',
    agentIds: [
      'agent-01-business-analyst',
      'agent-02-domain-expert',
      'agent-03-sales-strategist',
      'agent-04-financial-analyst',
      'agent-34-product-manager',
      'agent-05-software-architect',
      'agent-06-senior-developer',
      'agent-07-devops-engineer',
      'agent-08-security-architect',
      'agent-09-data-architect',
      'agent-33-legal-counsel',
      'agent-10-ux-researcher',
      'agent-11-ux-designer',
      'agent-12-ui-designer',
      'agent-13-accessibility-specialist',
      'agent-32-content-strategist',
      'agent-14-brand-strategist',
      'agent-15-growth-marketer',
      'agent-16-cro-specialist',
    ],
    dependencies: {
      'agent-02-domain-expert': ['agent-01-business-analyst'],
      'agent-03-sales-strategist': ['agent-02-domain-expert'],
      'agent-04-financial-analyst': ['agent-03-sales-strategist'],
      'agent-34-product-manager': ['agent-04-financial-analyst'],
      'agent-05-software-architect': ['agent-34-product-manager'],
      'agent-06-senior-developer': ['agent-05-software-architect'],
      'agent-07-devops-engineer': ['agent-06-senior-developer'],
      'agent-08-security-architect': ['agent-07-devops-engineer'],
      'agent-09-data-architect': ['agent-08-security-architect'],
      'agent-33-legal-counsel': ['agent-09-data-architect'],
      'agent-10-ux-researcher': ['agent-34-product-manager'],
      'agent-11-ux-designer': ['agent-10-ux-researcher'],
      'agent-12-ui-designer': ['agent-11-ux-designer'],
      'agent-13-accessibility-specialist': ['agent-12-ui-designer'],
      'agent-32-content-strategist': ['agent-13-accessibility-specialist'],
      'agent-14-brand-strategist': ['agent-34-product-manager'],
      'agent-15-growth-marketer': ['agent-14-brand-strategist'],
      'agent-16-cro-specialist': ['agent-15-growth-marketer'],
    },
    timelineHint: '>1 week',
    domains: ['product', 'engineering', 'design', 'marketing', 'strategy', 'sdlc'],
  },
  {
    id: 'config-create-tech',
    name: 'Tech-Only CREATE (Phase 2)',
    description: 'Software architecture, development, DevOps, security, and data architecture.',
    commandMode: 'CREATE_TECH',
    agentIds: [
      'agent-05-software-architect',
      'agent-06-senior-developer',
      'agent-07-devops-engineer',
      'agent-08-security-architect',
      'agent-09-data-architect',
      'agent-33-legal-counsel',
    ],
    dependencies: {
      'agent-06-senior-developer': ['agent-05-software-architect'],
      'agent-07-devops-engineer': ['agent-06-senior-developer'],
      'agent-08-security-architect': ['agent-07-devops-engineer'],
      'agent-09-data-architect': ['agent-08-security-architect'],
      'agent-33-legal-counsel': ['agent-09-data-architect'],
    },
    timelineHint: '3-5 days',
    domains: ['engineering', 'sdlc'],
  },
  {
    id: 'config-create-ux',
    name: 'UX-Only CREATE (Phase 3)',
    description: 'Research, design, accessibility, and content for user experience.',
    commandMode: 'CREATE_UX',
    agentIds: [
      'agent-10-ux-researcher',
      'agent-11-ux-designer',
      'agent-12-ui-designer',
      'agent-13-accessibility-specialist',
      'agent-32-content-strategist',
      'agent-35-localization-specialist',
    ],
    dependencies: {
      'agent-11-ux-designer': ['agent-10-ux-researcher'],
      'agent-12-ui-designer': ['agent-11-ux-designer'],
      'agent-13-accessibility-specialist': ['agent-12-ui-designer'],
      'agent-32-content-strategist': ['agent-13-accessibility-specialist'],
      'agent-35-localization-specialist': ['agent-32-content-strategist'],
    },
    timelineHint: '3-5 days',
    domains: ['design', 'product'],
  },
  {
    id: 'config-create-marketing',
    name: 'Marketing-Only CREATE (Phase 4)',
    description: 'Brand strategy, growth marketing, and conversion rate optimisation.',
    commandMode: 'CREATE_MARKETING',
    agentIds: [
      'agent-14-brand-strategist',
      'agent-15-growth-marketer',
      'agent-16-cro-specialist',
      'agent-30-brand-assets-agent',
    ],
    dependencies: {
      'agent-15-growth-marketer': ['agent-14-brand-strategist'],
      'agent-16-cro-specialist': ['agent-15-growth-marketer'],
      'agent-30-brand-assets-agent': ['agent-14-brand-strategist'],
    },
    timelineHint: '1-3 days',
    domains: ['marketing', 'paid-media', 'strategy'],
  },
  {
    id: 'config-create-business',
    name: 'Business-Only CREATE (Phase 1)',
    description: 'Business analysis, domain expertise, sales strategy, and financial analysis.',
    commandMode: 'CREATE_BUSINESS',
    agentIds: [
      'agent-01-business-analyst',
      'agent-02-domain-expert',
      'agent-03-sales-strategist',
      'agent-04-financial-analyst',
      'agent-34-product-manager',
    ],
    dependencies: {
      'agent-02-domain-expert': ['agent-01-business-analyst'],
      'agent-03-sales-strategist': ['agent-02-domain-expert'],
      'agent-04-financial-analyst': ['agent-03-sales-strategist'],
      'agent-34-product-manager': ['agent-04-financial-analyst'],
    },
    timelineHint: '1-3 days',
    domains: ['product', 'sales', 'strategy'],
  },
  {
    id: 'config-audit',
    name: 'Full AUDIT Cycle',
    description: 'Complete audit covering all 4 phases — mirrors CREATE but in audit mode.',
    commandMode: 'AUDIT',
    agentIds: [
      'agent-01-business-analyst',
      'agent-02-domain-expert',
      'agent-05-software-architect',
      'agent-06-senior-developer',
      'agent-08-security-architect',
      'agent-09-data-architect',
      'agent-10-ux-researcher',
      'agent-12-ui-designer',
      'agent-14-brand-strategist',
      'agent-38-architecture-compliance-reviewer',
    ],
    dependencies: {
      'agent-02-domain-expert': ['agent-01-business-analyst'],
      'agent-06-senior-developer': ['agent-05-software-architect'],
      'agent-08-security-architect': ['agent-06-senior-developer'],
      'agent-09-data-architect': ['agent-08-security-architect'],
      'agent-12-ui-designer': ['agent-10-ux-researcher'],
      'agent-38-architecture-compliance-reviewer': ['agent-09-data-architect'],
    },
    timelineHint: '>1 week',
    domains: ['engineering', 'product', 'design', 'strategy', 'sdlc'],
  },
  {
    id: 'config-feature',
    name: 'FEATURE Full Cycle',
    description: 'Feature-scoped cycle covering all 4 phases for a new product feature.',
    commandMode: 'FEATURE',
    agentIds: [
      'agent-01-business-analyst',
      'agent-34-product-manager',
      'agent-05-software-architect',
      'agent-06-senior-developer',
      'agent-07-devops-engineer',
      'agent-10-ux-researcher',
      'agent-11-ux-designer',
      'agent-21-test-agent',
    ],
    dependencies: {
      'agent-34-product-manager': ['agent-01-business-analyst'],
      'agent-05-software-architect': ['agent-34-product-manager'],
      'agent-06-senior-developer': ['agent-05-software-architect'],
      'agent-07-devops-engineer': ['agent-06-senior-developer'],
      'agent-11-ux-designer': ['agent-10-ux-researcher'],
      'agent-21-test-agent': ['agent-06-senior-developer'],
    },
    timelineHint: '3-5 days',
    domains: ['engineering', 'product', 'design', 'sdlc'],
  },
  {
    id: 'config-hotfix',
    name: 'HOTFIX Emergency Bypass',
    description: 'Minimal team for emergency hotfix — bypasses gates.',
    commandMode: 'HOTFIX',
    agentIds: [
      'agent-06-senior-developer',
      'agent-08-security-architect',
      'agent-21-test-agent',
      'agent-22-pr-review-agent',
    ],
    dependencies: {
      'agent-21-test-agent': ['agent-06-senior-developer'],
      'agent-22-pr-review-agent': ['agent-21-test-agent'],
    },
    timelineHint: '<4 hours',
    domains: ['engineering', 'sdlc'],
  },
  {
    id: 'config-scope-change',
    name: 'SCOPE_CHANGE Re-analysis',
    description: 'Scope change analysis team — reviews impact across all affected domains.',
    commandMode: 'SCOPE_CHANGE',
    agentIds: [
      'agent-01-business-analyst',
      'agent-34-product-manager',
      'agent-05-software-architect',
      'agent-37-scope-change-agent',
    ],
    dependencies: {
      'agent-34-product-manager': ['agent-01-business-analyst'],
      'agent-37-scope-change-agent': ['agent-34-product-manager', 'agent-05-software-architect'],
    },
    timelineHint: '1-3 days',
    domains: ['product', 'engineering', 'strategy', 'sdlc'],
  },
];

// ─── Validation ───────────────────────────────────────────────────────────────

type ValidateFn = ReturnType<Ajv2020['compile']>;
let _validateFn: ValidateFn | null = null;

function getValidateFn(): ValidateFn {
  if (_validateFn) return _validateFn;
  const fs = require('node:fs') as typeof import('node:fs');
  const schema = JSON.parse(fs.readFileSync(TASK_ASSEMBLY_SCHEMA_PATH, 'utf8')) as Record<
    string,
    unknown
  >;
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  _validateFn = ajv.compile(schema);
  return _validateFn;
}

/**
 * Validate a TaskDefinition object against the JSON schema.
 * Returns `{ valid, errors }`.
 */
export function validateTaskDefinition(task: unknown): { valid: boolean; errors: string[] } {
  const validate = getValidateFn();
  const valid = validate(task) as boolean;
  const errors = (validate.errors ?? []).map((e) => `${e.instancePath} ${e.message ?? ''}`.trim());
  return { valid, errors };
}

/** Reset cached validator — for testing only */
export function _resetValidatorCache(): void {
  _validateFn = null;
}

// ─── Assembly Service (Issue #1395) ──────────────────────────────────────────

export interface AssemblyOptions {
  /** Provide an explicit registry for testing; defaults to the live registry file */
  registry?: ReturnType<typeof loadAgentRegistry>;
}

/**
 * Assemble an agent team for the given task.
 *
 * Algorithm:
 *  1. Load registry (or use provided one)
 *  2. Filter: remove excluded agents + agents that exceed the timeline constraint
 *  3. Score remaining candidates
 *  4. Apply secondary sort
 *  5. Select top N candidates (maxAgents)
 *  6. Remaining high-scoring candidates become alternatives
 *  7. Derive collective confidence, risks, and timeline
 *
 * If a commandMode is specified, the matching pre-built configuration is used
 * to seed the initial agent set (useful when the full IDs are known).
 */
export function assembleTeam(task: TaskDefinition, options: AssemblyOptions = {}): AssembledTeam {
  const registry = options.registry ?? loadAgentRegistry();
  const excluded = new Set(task.constraints.excludedAgentIds ?? []);

  // Filter phase: remove excluded and timeline-violating agents
  const taskTimelineRank = TIMELINE_RANK[task.constraints.timeline] ?? 5;
  const minQuality = task.constraints.minQuality ?? 0;

  const candidates = registry.agents.filter((a) => {
    if (excluded.has(a.id)) return false;
    if (TIMELINE_RANK[a.timelineEstimate] > taskTimelineRank) return false;
    if (a.avgQualityScore < minQuality) return false;
    return true;
  });

  // Score all passing candidates
  let scored = candidates.map((a) => scoreAgent(a, task));

  // Secondary sort
  scored = applySort(scored, task.preferences?.sortBy);

  // Select top maxAgents
  const maxAgents = task.constraints.maxAgents;
  const selected = scored.slice(0, maxAgents);
  const rest = scored.slice(maxAgents);

  // Alternatives: non-selected agents with score >= 0.5
  const includeAlts = task.preferences?.includeAlternatives !== false;
  const alternatives = includeAlts ? rest.filter((s) => s.score >= 0.5).slice(0, 5) : [];

  // Confidence: mean of selected scores
  const confidence =
    selected.length > 0 ? selected.reduce((sum, s) => sum + s.score, 0) / selected.length : 0;

  // Derive risks
  const risks = deriveRisks(selected, task, scored.length);

  // Estimated collective timeline: maximum of selected agent timelines
  const estimatedTimeline = deriveCollectiveTimeline(selected);

  const reasoning = buildAssemblyReasoning(task, selected, confidence, risks);

  return {
    taskId: task.id,
    selectedTeam: selected,
    alternatives,
    confidence: Math.round(confidence * 100) / 100,
    risks,
    reasoning,
    estimatedTimeline,
    assembledAt: new Date().toISOString(),
  };
}

function deriveRisks(
  selected: ScoredAgent[],
  task: TaskDefinition,
  totalCandidates: number
): string[] {
  const risks: string[] = [];

  if (selected.length === 0) {
    risks.push('No agents matched the task constraints — broaden domains or relax timeline.');
    return risks;
  }

  const avgScore = selected.reduce((s, a) => s + a.score, 0) / selected.length;
  if (avgScore < 0.5) {
    risks.push(
      'Low overall team quality score — consider relaxing constraints or adding required agents.'
    );
  }

  // Check for uncovered required capabilities
  const requiredCaps = (task.constraints.requiredCapabilities ?? []).map((c) => c.toLowerCase());
  if (requiredCaps.length > 0) {
    const teamCaps = new Set(
      selected.flatMap((s) => s.agent.capabilities.map((c) => c.toLowerCase()))
    );
    const uncovered = requiredCaps.filter(
      (req) => ![...teamCaps].some((cap) => cap.includes(req) || req.includes(cap))
    );
    if (uncovered.length > 0) {
      risks.push(`Required capabilities not fully covered: ${uncovered.join(', ')}.`);
    }
  }

  // Conflict check
  const selectedIds = new Set(selected.map((s) => s.agent.id));
  for (const s of selected) {
    const conflicts = s.agent.conflictsWith.filter((id) => selectedIds.has(id));
    if (conflicts.length > 0) {
      risks.push(`Agent ${s.agent.name} conflicts with ${conflicts.join(', ')}.`);
    }
  }

  if (totalCandidates < task.constraints.maxAgents) {
    risks.push('Fewer candidates than maxAgents — team may be under-resourced.');
  }

  return risks;
}

function deriveCollectiveTimeline(selected: ScoredAgent[]): AgentTimelineEstimate {
  if (selected.length === 0) return '<4 hours';
  const maxRank = Math.max(...selected.map((s) => TIMELINE_RANK[s.agent.timelineEstimate] ?? 1));
  const entry = Object.entries(TIMELINE_RANK).find(([, v]) => v === maxRank);
  return (entry?.[0] as AgentTimelineEstimate) ?? '<4 hours';
}

function buildAssemblyReasoning(
  task: TaskDefinition,
  selected: ScoredAgent[],
  confidence: number,
  risks: string[]
): string {
  if (selected.length === 0) {
    return `No agents could be assembled for task "${task.title}" given the current constraints.`;
  }
  const names = selected
    .slice(0, 3)
    .map((s) => s.agent.name)
    .join(', ');
  const more = selected.length > 3 ? ` and ${selected.length - 3} more` : '';
  const confPct = Math.round(confidence * 100);
  const riskNote =
    risks.length > 0 ? ` ${risks.length} risk(s) identified.` : ' No critical risks detected.';
  return (
    `Assembled ${selected.length} agent(s) for "${task.title}" ` +
    `(${confPct}% confidence): ${names}${more}.${riskNote}`
  );
}

/**
 * Get all pre-built team configurations.
 */
export function listTeamConfigurations(): TeamConfiguration[] {
  return TEAM_CONFIGURATIONS;
}

/**
 * Get a pre-built team configuration by ID or commandMode.
 */
export function getTeamConfiguration(idOrMode: string): TeamConfiguration | undefined {
  return TEAM_CONFIGURATIONS.find((c) => c.id === idOrMode || c.commandMode === idOrMode);
}
