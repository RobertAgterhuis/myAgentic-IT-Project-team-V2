// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * SDLC Domain Entity Definitions
 *
 * Core domain model for the SDLC platform. Defines the canonical entities
 * that flow through lifecycle workflows: Product → Project → Feature →
 * Requirement → Architecture Decision → Task → Test → Release → Incident.
 *
 * Zero external dependencies. Pure type definitions + factory functions.
 *
 * @module sdlc/entities
 */

// ─── Lifecycle Stages ────────────────────────────────────────

export const LIFECYCLE_STAGES = Object.freeze({
  IDEA: 'IDEA',
  REQUIREMENTS: 'REQUIREMENTS',
  ARCHITECTURE: 'ARCHITECTURE',
  PLANNING: 'PLANNING',
  IMPLEMENTATION: 'IMPLEMENTATION',
  TESTING: 'TESTING',
  SECURITY_VALIDATION: 'SECURITY_VALIDATION',
  RELEASE: 'RELEASE',
  OPERATIONS: 'OPERATIONS',
  IMPROVEMENT: 'IMPROVEMENT',
} as const);

export type LifecycleStage = (typeof LIFECYCLE_STAGES)[keyof typeof LIFECYCLE_STAGES];

// ─── Entity Types ────────────────────────────────────────────

export const ENTITY_TYPES = Object.freeze({
  PRODUCT: 'PRODUCT',
  PROJECT: 'PROJECT',
  FEATURE: 'FEATURE',
  REQUIREMENT: 'REQUIREMENT',
  ARCHITECTURE_DECISION: 'ARCHITECTURE_DECISION',
  IMPLEMENTATION_TASK: 'IMPLEMENTATION_TASK',
  TEST_ARTIFACT: 'TEST_ARTIFACT',
  RELEASE: 'RELEASE',
  DEPLOYMENT: 'DEPLOYMENT',
  INCIDENT: 'INCIDENT',
  IMPROVEMENT: 'IMPROVEMENT',
} as const);

export type EntityType = (typeof ENTITY_TYPES)[keyof typeof ENTITY_TYPES];

// ─── Entity Status ───────────────────────────────────────────

export const ENTITY_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  PROPOSED: 'PROPOSED',
  APPROVED: 'APPROVED',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  DONE: 'DONE',
  BLOCKED: 'BLOCKED',
  CANCELLED: 'CANCELLED',
  SUPERSEDED: 'SUPERSEDED',
} as const);

export type EntityStatus = (typeof ENTITY_STATUS)[keyof typeof ENTITY_STATUS];

// ─── Priority ────────────────────────────────────────────────

export const PRIORITY = Object.freeze({
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const);

export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY];

// ─── Base Entity ─────────────────────────────────────────────

export interface BaseEntity {
  id: string;
  type: EntityType;
  name: string;
  description: string;
  status: EntityStatus;
  stage: LifecycleStage;
  owner: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  links: TraceLink[];
  metadata: Record<string, unknown>;
}

// ─── Trace Link ──────────────────────────────────────────────

export const LINK_TYPES = Object.freeze({
  DERIVES_FROM: 'DERIVES_FROM',
  IMPLEMENTS: 'IMPLEMENTS',
  TESTED_BY: 'TESTED_BY',
  RELEASED_IN: 'RELEASED_IN',
  DEPLOYED_TO: 'DEPLOYED_TO',
  TRIGGERED_BY: 'TRIGGERED_BY',
  SUPERSEDES: 'SUPERSEDES',
  BLOCKS: 'BLOCKS',
  DEPENDS_ON: 'DEPENDS_ON',
} as const);

export type LinkType = (typeof LINK_TYPES)[keyof typeof LINK_TYPES];

export interface TraceLink {
  type: LinkType;
  target_id: string;
  target_type: EntityType;
  created_at: string;
}

// ─── Concrete Entities ───────────────────────────────────────

export interface Product extends BaseEntity {
  type: typeof ENTITY_TYPES.PRODUCT;
  vision: string;
  stakeholders: string[];
}

export interface Project extends BaseEntity {
  type: typeof ENTITY_TYPES.PROJECT;
  product_id: string;
  start_date: string;
  target_date: string;
}

export interface Feature extends BaseEntity {
  type: typeof ENTITY_TYPES.FEATURE;
  project_id: string;
  priority: Priority;
  acceptance_criteria: string[];
}

export interface Requirement extends BaseEntity {
  type: typeof ENTITY_TYPES.REQUIREMENT;
  feature_id: string;
  priority: Priority;
  classification: 'FUNCTIONAL' | 'NON_FUNCTIONAL';
  source: string;
}

export interface ArchitectureDecision extends BaseEntity {
  type: typeof ENTITY_TYPES.ARCHITECTURE_DECISION;
  context: string;
  decision: string;
  consequences: string[];
  alternatives: string[];
}

export interface ImplementationTask extends BaseEntity {
  type: typeof ENTITY_TYPES.IMPLEMENTATION_TASK;
  requirement_ids: string[];
  sprint_id: string;
  estimate_hours: number;
  assignee: string;
}

export interface TestArtifact extends BaseEntity {
  type: typeof ENTITY_TYPES.TEST_ARTIFACT;
  task_id: string;
  test_type: 'UNIT' | 'INTEGRATION' | 'E2E' | 'SECURITY' | 'PERFORMANCE';
  result: 'PASS' | 'FAIL' | 'SKIPPED' | 'PENDING';
  coverage_pct: number | null;
}

export interface Release extends BaseEntity {
  type: typeof ENTITY_TYPES.RELEASE;
  version: string;
  changelog: string[];
  task_ids: string[];
  test_ids: string[];
}

export interface Deployment extends BaseEntity {
  type: typeof ENTITY_TYPES.DEPLOYMENT;
  release_id: string;
  environment: string;
  deployed_at: string;
  deployed_by: string;
}

export interface Incident extends BaseEntity {
  type: typeof ENTITY_TYPES.INCIDENT;
  severity: Priority;
  release_id: string;
  root_cause: string;
  resolution: string;
  resolved_at: string | null;
}

export interface Improvement extends BaseEntity {
  type: typeof ENTITY_TYPES.IMPROVEMENT;
  source_type: 'INCIDENT' | 'RETROSPECTIVE' | 'METRIC' | 'FEEDBACK';
  source_id: string;
  proposed_action: string;
}

// ─── Entity Union ────────────────────────────────────────────

export type SdlcEntity =
  | Product
  | Project
  | Feature
  | Requirement
  | ArchitectureDecision
  | ImplementationTask
  | TestArtifact
  | Release
  | Deployment
  | Incident
  | Improvement;

// ─── Factory Functions ───────────────────────────────────────

let _counter = 0;

export function generateId(prefix: string): string {
  _counter += 1;
  const ts = Date.now().toString(36);
  const seq = _counter.toString(36).padStart(4, '0');
  return `${prefix}-${ts}-${seq}`;
}

/** Reset the internal counter (for deterministic testing). */
export function resetIdCounter(): void {
  _counter = 0;
}

function baseFields(
  type: EntityType,
  name: string,
  stage: LifecycleStage,
  overrides: Partial<BaseEntity> = {}
): BaseEntity {
  const now = new Date().toISOString();
  return {
    id: overrides.id || generateId(type.toLowerCase()),
    type,
    name,
    description: overrides.description || '',
    status: overrides.status || ENTITY_STATUS.DRAFT,
    stage,
    owner: overrides.owner || '',
    created_at: overrides.created_at || now,
    updated_at: overrides.updated_at || now,
    tags: overrides.tags || [],
    links: overrides.links || [],
    metadata: overrides.metadata || {},
  };
}

export function createProduct(name: string, overrides: Partial<Product> = {}): Product {
  return {
    ...baseFields(ENTITY_TYPES.PRODUCT, name, LIFECYCLE_STAGES.IDEA, overrides),
    type: ENTITY_TYPES.PRODUCT,
    vision: overrides.vision || '',
    stakeholders: overrides.stakeholders || [],
  };
}

export function createProject(
  name: string,
  productId: string,
  overrides: Partial<Project> = {}
): Project {
  return {
    ...baseFields(ENTITY_TYPES.PROJECT, name, LIFECYCLE_STAGES.PLANNING, overrides),
    type: ENTITY_TYPES.PROJECT,
    product_id: productId,
    start_date: overrides.start_date || '',
    target_date: overrides.target_date || '',
  };
}

export function createFeature(
  name: string,
  projectId: string,
  overrides: Partial<Feature> = {}
): Feature {
  return {
    ...baseFields(ENTITY_TYPES.FEATURE, name, LIFECYCLE_STAGES.REQUIREMENTS, overrides),
    type: ENTITY_TYPES.FEATURE,
    project_id: projectId,
    priority: overrides.priority || PRIORITY.MEDIUM,
    acceptance_criteria: overrides.acceptance_criteria || [],
  };
}

export function createRequirement(
  name: string,
  featureId: string,
  overrides: Partial<Requirement> = {}
): Requirement {
  return {
    ...baseFields(ENTITY_TYPES.REQUIREMENT, name, LIFECYCLE_STAGES.REQUIREMENTS, overrides),
    type: ENTITY_TYPES.REQUIREMENT,
    feature_id: featureId,
    priority: overrides.priority || PRIORITY.MEDIUM,
    classification: overrides.classification || 'FUNCTIONAL',
    source: overrides.source || '',
  };
}

export function createArchitectureDecision(
  name: string,
  overrides: Partial<ArchitectureDecision> = {}
): ArchitectureDecision {
  return {
    ...baseFields(
      ENTITY_TYPES.ARCHITECTURE_DECISION,
      name,
      LIFECYCLE_STAGES.ARCHITECTURE,
      overrides
    ),
    type: ENTITY_TYPES.ARCHITECTURE_DECISION,
    context: overrides.context || '',
    decision: overrides.decision || '',
    consequences: overrides.consequences || [],
    alternatives: overrides.alternatives || [],
  };
}

export function createImplementationTask(
  name: string,
  sprintId: string,
  overrides: Partial<ImplementationTask> = {}
): ImplementationTask {
  return {
    ...baseFields(
      ENTITY_TYPES.IMPLEMENTATION_TASK,
      name,
      LIFECYCLE_STAGES.IMPLEMENTATION,
      overrides
    ),
    type: ENTITY_TYPES.IMPLEMENTATION_TASK,
    requirement_ids: overrides.requirement_ids || [],
    sprint_id: sprintId,
    estimate_hours: overrides.estimate_hours || 0,
    assignee: overrides.assignee || '',
  };
}

export function createTestArtifact(
  name: string,
  taskId: string,
  overrides: Partial<TestArtifact> = {}
): TestArtifact {
  return {
    ...baseFields(ENTITY_TYPES.TEST_ARTIFACT, name, LIFECYCLE_STAGES.TESTING, overrides),
    type: ENTITY_TYPES.TEST_ARTIFACT,
    task_id: taskId,
    test_type: overrides.test_type || 'UNIT',
    result: overrides.result || 'PENDING',
    coverage_pct: overrides.coverage_pct ?? null,
  };
}

export function createRelease(version: string, overrides: Partial<Release> = {}): Release {
  return {
    ...baseFields(ENTITY_TYPES.RELEASE, `Release ${version}`, LIFECYCLE_STAGES.RELEASE, overrides),
    type: ENTITY_TYPES.RELEASE,
    version,
    changelog: overrides.changelog || [],
    task_ids: overrides.task_ids || [],
    test_ids: overrides.test_ids || [],
  };
}

export function createDeployment(
  releaseId: string,
  environment: string,
  overrides: Partial<Deployment> = {}
): Deployment {
  const now = new Date().toISOString();
  return {
    ...baseFields(
      ENTITY_TYPES.DEPLOYMENT,
      `Deploy ${environment}`,
      LIFECYCLE_STAGES.OPERATIONS,
      overrides
    ),
    type: ENTITY_TYPES.DEPLOYMENT,
    release_id: releaseId,
    environment,
    deployed_at: overrides.deployed_at || now,
    deployed_by: overrides.deployed_by || '',
  };
}

export function createIncident(
  name: string,
  releaseId: string,
  overrides: Partial<Incident> = {}
): Incident {
  return {
    ...baseFields(ENTITY_TYPES.INCIDENT, name, LIFECYCLE_STAGES.OPERATIONS, overrides),
    type: ENTITY_TYPES.INCIDENT,
    severity: overrides.severity || PRIORITY.MEDIUM,
    release_id: releaseId,
    root_cause: overrides.root_cause || '',
    resolution: overrides.resolution || '',
    resolved_at: overrides.resolved_at || null,
  };
}

export function createImprovement(
  name: string,
  sourceType: Improvement['source_type'],
  sourceId: string,
  overrides: Partial<Improvement> = {}
): Improvement {
  return {
    ...baseFields(ENTITY_TYPES.IMPROVEMENT, name, LIFECYCLE_STAGES.IMPROVEMENT, overrides),
    type: ENTITY_TYPES.IMPROVEMENT,
    source_type: sourceType,
    source_id: sourceId,
    proposed_action: overrides.proposed_action || '',
  };
}
