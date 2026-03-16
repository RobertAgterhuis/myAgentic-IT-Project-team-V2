// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * SDLC Platform — Public API
 *
 * Barrel export for all SDLC domain modules. Import from this file to access
 * entities, lifecycle, artifacts, governance, traceability, observability,
 * and tool adapters.
 *
 * @module sdlc
 */

// Domain entities
export {
  LIFECYCLE_STAGES,
  ENTITY_TYPES,
  ENTITY_STATUS,
  PRIORITY,
  LINK_TYPES,
  type LifecycleStage,
  type EntityType,
  type EntityStatus,
  type Priority,
  type LinkType,
  type BaseEntity,
  type TraceLink,
  type Product,
  type Project,
  type Feature,
  type Requirement,
  type ArchitectureDecision,
  type ImplementationTask,
  type TestArtifact,
  type Release,
  type Deployment,
  type Incident,
  type Improvement,
  type SdlcEntity,
  generateId,
  resetIdCounter,
  createProduct,
  createProject,
  createFeature,
  createRequirement,
  createArchitectureDecision,
  createImplementationTask,
  createTestArtifact,
  createRelease,
  createDeployment,
  createIncident,
  createImprovement,
} from './entities.js';

// Lifecycle model
export {
  type GateCondition,
  type StageDefinition,
  type TransitionResult,
  type SprintCompletionInput,
  STAGE_DEFINITIONS,
  STAGE_SEQUENCE,
  getStageDefinition,
  canTransition,
  validateTransition,
  nextStage,
  createReleaseFromSprint,
} from './lifecycle.js';

// Artifact management
export {
  ARTIFACT_TYPES,
  ARTIFACT_STATUS,
  type ArtifactType,
  type ArtifactStatus,
  type Artifact,
  type ArtifactVersion,
  type ArtifactStore,
  type LineageEdge,
  ArtifactRegistry,
  generateArtifactId,
  resetArtifactIdCounter,
  createArtifact,
} from './artifacts.js';

// Governance
export {
  ROLES,
  PERMISSIONS,
  APPROVAL_STATUS,
  DEFAULT_POLICIES,
  type Role,
  type Permission,
  type RoleBinding,
  type ApprovalRequest,
  type ApprovalStatus,
  type ApprovalPolicy,
  GovernanceEngine,
} from './governance.js';

// Traceability
export {
  type TraceNode,
  type TraceEdge,
  type CoverageReport,
  type CoverageGap,
  type ImpactReport,
  type ImpactedEntity,
  TraceabilityMatrix,
} from './traceability.js';

// Observability / DORA
export {
  DORA_LEVELS,
  type DoraLevel,
  type CommitEvent,
  type DeploymentEvent,
  type IncidentEvent,
  type SprintMetrics,
  type DoraReport,
  type ProjectKpiReport,
  type MetricDataPoint,
  type TimeSeriesMetric,
  type MetricsStore,
  type AgentPerformanceRecord,
  type AgentPerformanceStats,
  type VelocityTrendEntry,
  type DoraTrendEntry,
  computeLeadTime,
  computeDeploymentFrequency,
  computeChangeFailureRate,
  computeMTTR,
  classifyLeadTime,
  classifyDeploymentFrequency,
  classifyChangeFailureRate,
  classifyMTTR,
  computeDoraReport,
  computeVelocityTrend,
  computeDefectDensity,
  createMetricsStore,
  ensureMetric,
  appendMetric,
  queryMetric,
  serializeMetricsStore,
  deserializeMetricsStore,
  recordAgentPerformance,
  computeAgentStats,
  computeVelocityTrendEntry,
  recordSprintBoundary,
} from './observability.js';

// Adapters
export {
  ADAPTER_CATEGORIES,
  HEALTH_STATUS,
  type ToolAdapter,
  type AdapterResult,
  type HealthCheck,
  type HealthStatus,
  type AdapterCategory,
  AdapterRegistry,
  BaseAdapter,
} from './adapters/index.js';
