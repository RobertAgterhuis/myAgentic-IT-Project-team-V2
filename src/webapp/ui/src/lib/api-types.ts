/* ──────────────────────────────────────────────
 * Shared API response types
 * ────────────────────────────────────────────── */

/** Generic OK envelope used by many endpoints */
export interface OkResponse {
  ok: true;
}

/** Timestamped envelope */
export interface TimestampedResponse<T> extends OkResponse {
  data: T;
  timestamp: string;
}

/* ──────────────────────────────────────────────
 * Questionnaires
 * ────────────────────────────────────────────── */

export interface QuestionnaireQuestion {
  id: string;
  classification: 'REQUIRED' | 'OPTIONAL';
  question: string;
  whyNeeded: string;
  expectedFormat: string;
  example: string;
  answer: string;
  section: string;
  status: 'OPEN' | 'ANSWERED' | 'DEFERRED';
  lastUpdated: string;
}

export interface QuestionnaireSection {
  title: string;
  questions: QuestionnaireQuestion[];
}

export interface Questionnaire {
  file: string;
  agent: string;
  phase: string;
  generated: string;
  version: string;
  sections: QuestionnaireSection[];
  questions: QuestionnaireQuestion[];
}

export interface CorruptionWarning {
  file: string;
  issues: string[];
}

export interface QuestionnairesResponse {
  questionnaires: Questionnaire[];
  corruptionWarnings?: CorruptionWarning[];
}

export interface QuestionUpdate {
  questionId: string;
  answer: string;
  status: 'OPEN' | 'ANSWERED' | 'DEFERRED';
}

export interface SaveQuestionnairesPayload {
  file: string;
  updates: QuestionUpdate[];
}

export interface SaveQuestionnairesResponse extends OkResponse {
  saved: number;
  secretWarnings?: string[];
}

/* ──────────────────────────────────────────────
 * Decisions
 * ────────────────────────────────────────────── */

export type DecisionPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface OpenDecision {
  id: string;
  type: 'OPEN_QUESTION';
  status: 'OPEN';
  priority: DecisionPriority;
  scope: string;
  question: string;
  answer: string;
  date: string;
}

export interface DecidedDecision {
  id: string;
  type: 'DECIDED';
  status: 'DECIDED';
  priority: DecisionPriority;
  scope: string;
  decision: string;
  notes: string;
  date: string;
  category?: string;
}

export interface DeferredDecision {
  id: string;
  status: 'DEFERRED' | 'EXPIRED';
  scope: string;
  subject: string;
  reason: string;
  date: string;
}

export interface DecisionCategory {
  name: string;
  stack: string;
  status: 'ACTIVE' | 'DEFERRED';
  applicable: 'YES' | 'NO' | 'PARTIAL';
  reason: string;
  file: string;
  count: number;
}

export interface DecisionsResponse {
  open: OpenDecision[];
  decided: DecidedDecision[];
  deferred: DeferredDecision[];
  categories: DecisionCategory[];
}

export type DecisionAction =
  | 'create'
  | 'answer'
  | 'decide'
  | 'defer'
  | 'expire'
  | 'reopen'
  | 'edit';

export interface CreateDecisionPayload {
  action: 'create';
  type: 'OPEN_QUESTION' | 'DECIDED' | 'question' | 'operational';
  priority: DecisionPriority;
  scope: string;
  text: string;
  notes?: string;
}

export interface MutateDecisionPayload {
  action: 'answer' | 'decide' | 'defer' | 'expire' | 'reopen' | 'edit';
  id: string;
  answer?: string;
  reason?: string;
  priority?: DecisionPriority;
  scope?: string;
  text?: string;
  notes?: string;
}

export type DecisionPayload = CreateDecisionPayload | MutateDecisionPayload;

export interface DecisionMutationResponse extends OkResponse {
  id: string;
  action: string;
}

export interface ActivateCategoryPayload {
  file: string;
}

export interface ActivateCategoryResponse extends OkResponse {
  action: 'activated';
  file: string;
  name: string;
  stack: string;
}

/* ──────────────────────────────────────────────
 * Lesson Promotion
 * ────────────────────────────────────────────── */

export interface PromoteLessonPayload {
  lessonId: string;
  priority?: DecisionPriority;
  scope?: string;
}

export interface PromoteLessonResponse extends OkResponse {
  id: string;
  lessonId: string;
  action: 'promoted';
}

/* ──────────────────────────────────────────────
 * Milestones
 * ────────────────────────────────────────────── */

export type MilestoneStatus = 'not started' | 'in progress' | 'complete' | 'blocked';

export interface Milestone {
  id: string;
  name: string;
  status: MilestoneStatus;
  progress: number;
  completion: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
  template_id?: string;
}

export interface CreateMilestonePayload {
  name: string;
  status: MilestoneStatus;
  progress: number;
  completion: string;
}

export interface UpdateMilestonePayload {
  name?: string;
  status?: MilestoneStatus;
  progress?: number;
  completion?: string;
}

export type MilestoneResponse = TimestampedResponse<Milestone>;

export interface MilestonesListResponse extends TimestampedResponse<Milestone[]> {
  count: number;
}

export interface MilestoneTemplate {
  id: string;
  name: string;
  namePattern?: string;
  defaultStatus: MilestoneStatus;
  defaultProgress: number;
}

export interface CreateMilestoneTemplatePayload {
  name: string;
  namePattern?: string;
  defaultStatus: MilestoneStatus;
  defaultProgress: number;
}

export interface ApplyTemplatePayload {
  name?: string;
  completion: string;
}

/* ──────────────────────────────────────────────
 * Orchestrator
 * ────────────────────────────────────────────── */

export interface OrchestratorStatus {
  state: string;
  mode: string;
  [key: string]: unknown;
}

export interface AdvanceOrchestratorPayload {
  gateResult?: unknown;
}

export interface AdvanceOrchestratorResponse extends OkResponse {
  transition: Record<string, unknown>;
  status: OrchestratorStatus;
}

export interface OrchestratorErrorPayload {
  reason: string;
}

export interface OrchestratorResetPayload {
  mode: string;
  phases?: string[];
}

export interface ValidateGatePayload {
  deliverables: string[];
}

export interface ValidateGateResponse extends OkResponse {
  verdict: string;
  summary: {
    phase: string;
    totalViolations: number;
    exitCriteria?: {
      total: number;
      unmet: ExitCriterionDiagnostic[];
      allSatisfied: boolean;
    };
  };
}

export interface ExitCriterionDiagnostic {
  id: string;
  title: string;
  description: string;
  blocking: boolean;
  actual?: number | boolean;
  expected?: number | boolean;
  evidence?: unknown;
}

/** Gate failure info surfaced in ExplainabilityPanel (M15-037). */
export interface GateFailureInfo {
  phase: string;
  reason: string;
  suggestedAction?: string;
  violations: number;
  timestamp: string;
  relatedArtifactId?: string;
  relatedDecisionId?: string;
  unmetCriteria?: string[];
}

export interface GateDiagnosticsResponse extends OkResponse {
  sessionId: string;
  totalFailures: number;
  latest: {
    eventId: string;
    timestamp: string;
    phase: string | null;
    description: string;
    verdict: string;
    violations: number;
    unmetCriteria: ExitCriterionDiagnostic[];
  } | null;
  diagnostics: Array<{
    eventId: string;
    timestamp: string;
    phase: string | null;
    description: string;
    verdict: string;
    violations: number;
    unmetCriteria: ExitCriterionDiagnostic[];
  }>;
}

export type RuntimeProfile =
  | 'local-dev'
  | 'ci-test'
  | 'production-single-node'
  | 'production-distributed';

export interface RuntimeProfileContract {
  profile: RuntimeProfile;
  name: string;
  description: string;
  storageProvider: {
    required: boolean;
    allowedValues: string[];
    recommended: string;
  };
  queueProvider: {
    required: boolean;
    allowedValues: string[];
    recommended: string;
  };
  sessionStore: {
    required: boolean;
    allowedValues: string[];
    recommended: string;
  };
  redis: {
    required: boolean;
    description: string;
  };
  auth: {
    required: boolean;
    description: string;
  };
  trustProxy: {
    required: boolean;
    description: string;
  };
  startupBehavior: string;
}

export interface OnboardingDiagnosticsResponse extends OkResponse {
  generatedAt: string;
  profile: RuntimeProfile;
  contract: RuntimeProfileContract;
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  environment: {
    nodeEnv: string;
    host: string;
    storageProvider: string;
    queueProvider: string;
    sessionStore: string;
    redisConfigured: boolean;
    authConfigured: boolean;
    trustProxy: boolean | number | string | string[];
  };
}

export type OrchestratorCommandName =
  | 'CREATE'
  | 'CREATE_BUSINESS'
  | 'CREATE_TECH'
  | 'CREATE_UX'
  | 'CREATE_MARKETING'
  | 'REEVALUATE'
  | 'FEATURE'
  | 'SCOPE_CHANGE'
  | 'HOTFIX'
  | 'AUDIT';

export interface OrchestratorCommandPayload {
  command: OrchestratorCommandName;
  platform?: 'copilot' | 'claude' | 'codex';
  resume?: boolean;
  project?: string;
}

export interface SprintGatePayload {
  sprintId: string;
  stories?: unknown[];
  plannedItems?: number;
  paths?: Record<string, unknown>;
}

export interface SprintGateResponse extends OkResponse {
  verdict: string;
  summary: {
    sprintId: string;
    totalBlockers: number;
  };
}

export interface CommandQueueEntry {
  command: string;
  project: string | null;
  description: string | null;
  scope: string | null;
  requested_at: string;
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'ERROR';
  source: string;
  clipboard_text: string;
}

export interface CommandQueueResponse {
  command: CommandQueueEntry | null;
  queue: CommandQueueEntry[];
}

/* ──────────────────────────────────────────────
 * Dashboard
 * ────────────────────────────────────────────── */

export interface HealthIndicator {
  value: number | string;
  label: string;
  status: string;
  details: string;
}

export interface DashboardHealth {
  quality: HealthIndicator;
  coverage: HealthIndicator;
  builds: HealthIndicator;
  deployment: HealthIndicator;
}

export interface MetricEntry {
  value: number | string;
  label: string;
  period: string;
  trend: string;
}

export interface DashboardMetrics {
  http_requests: MetricEntry;
  error_rate: MetricEntry;
  response_time: MetricEntry;
}

export interface ActivityEntry {
  type: string;
  user?: string;
  action: string;
  details: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface StatEntry {
  value: number | string;
  label: string;
  icon: string;
  details: string;
}

export interface DashboardStats {
  active_files: StatEntry;
  team_members: StatEntry;
  sprint_progress: StatEntry;
  github_stars: StatEntry;
}

/* ──────────────────────────────────────────────
 * Drift Detection
 * ────────────────────────────────────────────── */

export type DriftSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface DriftEntry {
  id: string;
  type: string;
  severity: DriftSeverity;
  sprint: string;
  expected: string;
  actual: string;
  recommendation: string;
}

export interface DriftResponse {
  generated_at: string;
  summary: {
    total_drifts: number;
    critical: number;
    warning: number;
    info: number;
  };
  drifts: DriftEntry[];
  in_sync: {
    sprints: string[];
    stories: number;
  };
  error?: string;
}

/* ──────────────────────────────────────────────
 * Progress
 * ────────────────────────────────────────────── */

export type AgentStatus = 'pending' | 'active' | 'done';

export interface AgentEntry {
  id: string;
  name: string;
  status: AgentStatus;
}

export type PhaseKey = 'ONBOARDING' | 'PHASE-1' | 'PHASE-2' | 'PHASE-3' | 'PHASE-4' | 'PHASE-5';

export interface PhaseEntry {
  key: PhaseKey | string;
  label: string;
  status: 'pending' | 'active' | 'done';
  agents: AgentEntry[];
  done: number;
  total: number;
}

export interface SessionInfo {
  session_id: string;
  cycle_type: string;
  status: string;
  current_phase: string;
  current_agent: string;
  current_step: string;
  initiated_at: string;
  last_updated: string;
  blockers: unknown[];
  open_human_escalations: unknown[];
}

export interface ProgressResponse {
  active: boolean;
  session: SessionInfo | null;
  phases: PhaseEntry[];
  sprints?: {
    total: number;
    statuses: Record<string, string>;
  };
  command: CommandQueueEntry | null;
}

/* ──────────────────────────────────────────────
 * Session
 * ────────────────────────────────────────────── */

export interface SessionResponse {
  session: Record<string, unknown> | null;
}

/* ──────────────────────────────────────────────
 * Server Metrics
 * ────────────────────────────────────────────── */

export interface ServerMetrics {
  uptime_seconds: number;
  request_count: number;
  error_count: number;
  error_rate: number;
  response_time_p50: number;
  response_time_p95: number;
  response_time_p99: number;
  sse_connections: number;
  file_ops_count: number;
  cache_hit_ratio: number;
  per_endpoint: Record<
    string,
    {
      count: number;
      p50: number;
      p95: number;
      p99: number;
    }
  >;
}

/* ──────────────────────────────────────────────
 * Analytics (M7 / Issue #375-376)
 * ────────────────────────────────────────────── */

export interface MetricDataPoint {
  timestamp: string;
  value: number;
  labels?: Record<string, string>;
}

export interface VelocityTrendEntry {
  sprint_id: string;
  date: string;
  planned_points: number;
  completed_points: number;
  velocity_ratio: number;
  trailing_avg_velocity: number;
  window_size: number;
}

export interface AnalyticsTrendsData {
  velocity: VelocityTrendEntry[];
  dora: {
    lead_time: MetricDataPoint[];
    deployment_frequency: MetricDataPoint[];
    change_failure_rate: MetricDataPoint[];
    mttr: MetricDataPoint[];
  };
  sprints: {
    planned_points: MetricDataPoint[];
    completed_points: MetricDataPoint[];
    defects_found: MetricDataPoint[];
  };
}

export interface AgentPerformanceStats {
  agent_id: string;
  agent_name: string;
  total_invocations: number;
  successful: number;
  failed: number;
  success_rate_pct: number;
  avg_duration_ms: number;
  min_duration_ms: number;
  max_duration_ms: number;
  p95_duration_ms: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  avg_total_tokens: number;
  avg_provider_latency_ms: number;
  avg_model_attempts: number;
  avg_model_retries: number;
  providers: string[];
  models: string[];
}

export interface MetricSummary {
  name: string;
  unit: string;
  data_points_count: number;
  latest: MetricDataPoint | null;
}

/* ──────────────────────────────────────────────
 * Artifacts (M10 / Issue #392-393)
 * ────────────────────────────────────────────── */

export interface Artifact {
  id: string;
  artifact_type: string;
  stage: string;
  status: string;
  content_hash: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export interface ArtifactListResponse extends OkResponse {
  count: number;
  artifacts: Artifact[];
}

export interface ArtifactDetailResponse extends OkResponse {
  artifact: Artifact;
}

export interface ArtifactStatsResponse extends OkResponse {
  stats: Record<string, unknown>;
}

export interface LineageNode {
  id: string;
  artifact_type: string;
  status: string;
  stage: string;
}

export interface LineageEdge {
  source: string;
  target: string;
  relationship: 'PRODUCES' | 'CONSUMES' | 'SUPERSEDES';
}

export interface ArtifactLineage {
  nodes: LineageNode[];
  edges: LineageEdge[];
}

export interface ArtifactLineageResponse extends OkResponse {
  artifact_id: string;
  lineage: ArtifactLineage;
}

/* ──────────────────────────────────────────────
 * Governance (M10 / Issue #394)
 * ────────────────────────────────────────────── */

export interface ApprovalEntry {
  id: string;
  entity_id: string;
  gate_id: string;
  stage: string;
  requested_by: string;
  requested_at: string;
  required_role: string;
  status: string;
}

export interface ApprovalsListResponse {
  approvals: ApprovalEntry[];
  count: number;
}

export interface ApprovalDecideResponse extends OkResponse {
  approval: {
    id: string;
    status: string;
    decided_by: string;
    decided_at: string;
    reason: string;
  };
}

/* ──────────────────────────────────────────────
 * Policies (M22 / Policy-as-Code Governance)
 * ────────────────────────────────────────────── */

export interface PolicyEntry {
  id: string;
  name: string;
  description?: string;
  scope: string;
  category: string;
  severity: string;
  condition_type: string;
  condition_check: string;
  action_message?: string;
  exception_count: number;
  pack_id?: string;
}

export interface PolicyListResponse {
  policies: PolicyEntry[];
  count: number;
}

export interface PolicyPackSummary {
  pack_id: string;
  pack_name: string;
  version?: string;
  policy_count: number;
  categories: string[];
  severities: string[];
}

export interface PolicyPacksResponse {
  packs: PolicyPackSummary[];
  count: number;
}

export interface PolicySignal {
  check: string;
  passed: boolean;
  source: string;
  details?: string;
  measured_at?: string | null;
}

export interface PolicySignalsResponse {
  checks: Record<string, boolean>;
  signals: PolicySignal[];
  missing: string[];
  generated_at: string;
}

export interface PolicyResult {
  policy_id: string;
  policy_name: string;
  severity: string;
  passed: boolean;
  reason: string;
  exception_applied?: string;
}

export interface PolicyEvaluationResponse {
  evaluation: {
    timestamp: string;
    context: { type: string; scope: string };
    results: PolicyResult[];
    summary: {
      total: number;
      passed: number;
      failed: number;
      skipped: number;
      blocking_failures: number;
    };
  };
}

export interface ExceptionCreateResponse extends OkResponse {
  exception: {
    id: string;
    reason: string;
    approved_by: string;
    expires: string;
  };
  policy_id: string;
}

export interface PolicyUpdatePayload {
  policy_id: string;
  name?: string;
  description?: string;
  scope?: 'global' | 'org' | 'team' | 'repo' | 'sprint';
  category?: 'security' | 'quality' | 'compliance' | 'process' | 'architecture';
  severity?: 'blocking' | 'warning' | 'advisory';
  condition_type?: 'gate' | 'pr' | 'deploy' | 'artifact' | 'schedule';
  condition_check?: string;
  action_message?: string;
}

export interface PolicyUpdateResponse extends OkResponse {
  policy: PolicyEntry;
}

/* ──────────────────────────────────────────────
 * Traceability (M10 / Issue #396)
 * ────────────────────────────────────────────── */

export type TraceEntityType = 'requirement' | 'design' | 'code' | 'test';

export interface TraceEntity {
  id: string;
  type: TraceEntityType;
  label: string;
  phase: string;
  status: string;
}

export interface TraceLink {
  source: string;
  target: string;
  relationship: string;
}

export interface TraceChain {
  entities: TraceEntity[];
  links: TraceLink[];
  gaps: TraceGap[];
}

export interface TraceGap {
  entity_id: string;
  entity_type: TraceEntityType;
  missing: TraceEntityType;
  label: string;
}

/* ──────────────────────────────────────────────
 * Audit/Evidence Aggregation (UI-025)
 * ────────────────────────────────────────────── */

export type AuditTimelineDomain =
  | 'artifacts'
  | 'traceability'
  | 'approvals'
  | 'policies'
  | 'sessions';

export type AuditEventSeverity = 'info' | 'warning' | 'critical';

export interface AuditTimelineEntry {
  id: string;
  timestamp: string;
  domain: AuditTimelineDomain;
  event_type: string;
  title: string;
  description: string;
  severity: AuditEventSeverity;
  entity_id?: string;
  session_id?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditEvidencePack {
  id: string;
  title: string;
  status: 'complete' | 'partial' | 'missing';
  phase: string;
  artifact_ids: string[];
  trace_entity_ids: string[];
  approval_ids: string[];
  coverage_score: number;
  last_updated: string;
}

export interface AuditEvidenceAggregationResponse extends OkResponse {
  generated_at: string;
  timeline: AuditTimelineEntry[];
  packs: AuditEvidencePack[];
  summary: {
    total_events: number;
    critical_events: number;
    open_packs: number;
  };
}

/* ──────────────────────────────────────────────
 * Observability Telemetry Contracts (UI-026)
 * ────────────────────────────────────────────── */

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';

export interface ObservabilityAlertEntry {
  id: string;
  source: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  first_seen: string;
  last_seen: string;
  related_session_id?: string;
  metadata?: Record<string, unknown>;
}

export interface ObservabilityTelemetryPoint {
  timestamp: string;
  value: number;
}

export interface ObservabilityTelemetryStream {
  id: string;
  name: string;
  kind: 'latency' | 'throughput' | 'errors' | 'agent';
  unit: string;
  latest: number;
  sample_count: number;
  points: ObservabilityTelemetryPoint[];
}

export interface ObservabilityTelemetryContractResponse extends OkResponse {
  generated_at: string;
  alerts: ObservabilityAlertEntry[];
  streams: ObservabilityTelemetryStream[];
  summary: {
    open_alerts: number;
    critical_alerts: number;
    stream_count: number;
    stale_streams: number;
  };
}

/* ──────────────────────────────────────────────
 * Help (M-UX-1a)
 * ────────────────────────────────────────────── */

export interface HelpAction {
  label: string;
  description: string;
}

export interface HelpRelatedPage {
  routeSlug: string;
  title: string;
}

export interface HelpTopicLink {
  topicId: string;
  title: string;
}

export interface HelpStateVariant {
  condition: string;
  additionalContent: string;
}

export interface PageHelpResponse {
  routeSlug: string;
  routePath: string;
  pageTitle: string;
  purpose: string;
  coreActions: HelpAction[];
  inputsOutputs: string;
  permissions: string;
  relatedPages: HelpRelatedPage[];
  keywords: string[];
  topicLinks: HelpTopicLink[];
  stateVariants?: HelpStateVariant[];
}

export interface HelpTopicResponse {
  topicId: string;
  title: string;
  description: string;
  markdown: string;
  html: string;
  keywords: string[];
}

/* ──────────────────────────────────────────────
 * Sessions (M15 / Issue #M15-022)
 * ────────────────────────────────────────────── */

export type SessionStatus = 'active' | 'completed' | 'failed' | 'paused';

export interface Session {
  id: string;
  project: string;
  flow: string;
  phase: string;
  status: SessionStatus;
  progress: number;
  started_at: string;
  completed_at: string | null;
  current_agent: string | null;
}

export interface SessionsListResponse extends OkResponse {
  count: number;
  sessions: Session[];
}

export type TimelineEventType =
  | 'session_start'
  | 'session_complete'
  | 'phase_start'
  | 'phase_complete'
  | 'agent_start'
  | 'agent_complete'
  | 'artifact_created'
  | 'gate_passed'
  | 'gate_failed'
  | 'decision_created'
  | 'error'
  | 'retry';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  timestamp: string;
  description: string;
  agent?: string;
  phase?: string;
  artifact_id?: string;
  metadata?: Record<string, unknown>;
}

export interface SessionDetailResponse extends OkResponse {
  session: Session;
  agents: AgentDetailEntry[];
  timeline: TimelineEvent[];
}

export interface TimelineResponse extends OkResponse {
  session_id: string;
  count: number;
  timeline: TimelineEvent[];
}

/* ──────────────────────────────────────────────
 * Agent Detail (M15 / Issue #M15-023-024)
 * ────────────────────────────────────────────── */

export type AgentDetailStatus = 'idle' | 'running' | 'completed' | 'failed' | 'retrying';

export interface AgentDetailEntry {
  id: string;
  name: string;
  status: AgentDetailStatus;
  task_description: string;
  started_at: string;
  duration_ms: number;
  prompt_summary?: string;
  outputs: string[];
  retry_count: number;
  session_id: string;
  phase: string;
}

export interface AgentsListResponse extends OkResponse {
  count: number;
  agents: AgentDetailEntry[];
}

export interface AgentDetailResponse extends OkResponse {
  agent: AgentDetailEntry;
}

/* ──────────────────────────────────────────────
 * Cockpit — Confidence Indicators (M27-004)
 * ────────────────────────────────────────────── */

export interface ConfidenceScore {
  label: string;
  score: number; // 0–100
  factors: { label: string; value: number; weight: number }[];
}

export interface CockpitHealthResponse extends OkResponse {
  session_health: ConfidenceScore;
  sprint_readiness: ConfidenceScore;
  agent_confidence: ConfidenceScore;
}

export interface ProvenanceEntry {
  id: string;
  decision_type: 'human_override' | 'approval' | 'policy_exception' | 'gate_failure' | 'error';
  actor_type: 'human' | 'machine';
  actor: string;
  action: string;
  rationale: string;
  source: string;
  state?: string;
  mode?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ProvenanceQueryParams {
  actor_type?: 'human' | 'machine';
  decision_type?: 'human_override' | 'approval' | 'policy_exception' | 'gate_failure' | 'error';
  source?: string;
  from?: string;
  to?: string;
  page?: number;
  page_size?: number;
}

/* ──────────────────────────────────────────────
 * Workspaces (UI-014)
 * ────────────────────────────────────────────── */

export type WorkspaceRepositoryProvider = 'github' | 'azure-devops' | 'gitlab' | 'local';

export interface WorkspaceRepository {
  id: string;
  name: string;
  provider: WorkspaceRepositoryProvider;
  url: string;
  defaultBranch: string;
  tags?: string[];
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  repositories: WorkspaceRepository[];
  owner: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceProject {
  id: string;
  workspaceId: string;
  name: string;
  repositories: string[];
  sessions: string[];
  status: 'active' | 'archived' | 'draft';
  created_at: string;
  updated_at: string;
}

export interface WorkspacesListResponse extends OkResponse {
  count: number;
  workspaces: WorkspaceSummary[];
}

export interface WorkspaceDetailResponse extends OkResponse {
  workspace: WorkspaceSummary;
  projects: WorkspaceProject[];
}

/* ──────────────────────────────────────────────
 * Prompts & Contracts (UI-015)
 * ────────────────────────────────────────────── */

export interface PromptContractAsset {
  id: string;
  type: 'questionnaire' | 'decision' | 'policy';
  title: string;
  scope: string;
  governance_status: 'compliant' | 'review' | 'attention';
  updated_at?: string;
}

export interface PromptContractAssetsResponse extends OkResponse {
  generated_at: string;
  assets: PromptContractAsset[];
  summary: {
    total_assets: number;
    compliant_assets: number;
    review_assets: number;
    attention_assets: number;
  };
}

/* ──────────────────────────────────────────────
 * Administration / RBAC / Integrations (UI-016)
 * ────────────────────────────────────────────── */

export interface AdminUser {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: 'admin' | 'operator' | 'viewer';
  created_at?: string;
  last_login?: string;
}

export interface AdminUsersResponse {
  users: AdminUser[];
}

export interface AdministrationIntegrationStatus {
  id: string;
  label: string;
  status: 'healthy' | 'degraded' | 'offline';
  detail: string;
}

export interface AdministrationOverviewResponse extends OkResponse {
  integrations: AdministrationIntegrationStatus[];
  role_counts: {
    admin: number;
    operator: number;
    viewer: number;
  };
}

export interface ProvenanceResponse extends OkResponse {
  count: number;
  total?: number;
  page?: number;
  page_size?: number;
  items: ProvenanceEntry[];
}

/* ──────────────────────────────────────────────
 * Cockpit — Dependency Graph (M27-003)
 * ────────────────────────────────────────────── */

export interface DependencyNode {
  id: string;
  type: 'decision' | 'gate' | 'sprint' | 'questionnaire';
  label: string;
  status: 'resolved' | 'pending' | 'blocked' | 'passed' | 'failed';
}

export interface DependencyEdge {
  source: string;
  target: string;
  relationship: 'blocks' | 'feeds' | 'requires';
  critical: boolean;
}

export interface DependencyGraphResponse extends OkResponse {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  critical_path: string[];
}

/* ──────────────────────────────────────────────
 * Cockpit — Root-Cause Analysis (M27-006)
 * ────────────────────────────────────────────── */

export interface RootCauseEntry {
  id: string;
  type: 'gate_failure' | 'uncertain' | 'insufficient_data' | 'sprint_blocked';
  summary: string;
  source_agent?: string;
  source_file?: string;
  source_line?: number;
  cause_chain: string[];
  actionable_link?: string;
  actionable_type?: 'questionnaire' | 'decision' | 'document' | 'sprint';
  timestamp: string;
}

export interface RootCauseResponse extends OkResponse {
  items: RootCauseEntry[];
  session_id?: string;
}

/* ──────────────────────────────────────────────
 * Cockpit — Approval Detail (M27-005)
 * ────────────────────────────────────────────── */

export interface ApprovalDetail extends ApprovalEntry {
  context: string;
  risk_assessment: string;
  recommended_action: string;
  related_artifacts: string[];
  comparison?: { before: string; after: string };
}

export interface ApprovalDetailResponse extends OkResponse {
  approval: ApprovalDetail;
}

export interface ApprovalHistoryEntry {
  id: string;
  approval_id: string;
  action: 'APPROVED' | 'REJECTED';
  user: string;
  reason: string;
  decided_at: string;
}

export interface ApprovalHistoryResponse extends OkResponse {
  history: ApprovalHistoryEntry[];
}

/* ──────────────────────────────────────────────
 * Agent Execution (M31-001 … M31-009)
 * ────────────────────────────────────────────── */

export type AgentExecutionStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface AgentExecutionContext {
  predecessorPaths?: string[];
  questionnairePath?: string;
}

export interface AgentExecutePayload {
  context?: AgentExecutionContext;
}

export interface ExecutionLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface AgentExecutionResult {
  job_id: string;
  agent_id: string;
  agent_name: string;
  status: AgentExecutionStatus;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  output_path?: string;
  error?: string;
  confidence?: number;
  uncertainty_reasons?: string[];
  needs_human_review?: boolean;
  logs: ExecutionLogEntry[];
}

export interface AgentExecuteResponse extends OkResponse {
  execution: AgentExecutionResult;
}

/** M31-002 — GET /api/agents/jobs/:jobId/status */
export interface AgentJobStatusResponse extends OkResponse {
  job_id: string;
  agent_id: string;
  agent_name: string;
  status: AgentExecutionStatus;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
}

/** M31-004 — GET /api/agents/jobs/:jobId/result (202 if running) */
export interface AgentJobResultResponse extends OkResponse {
  status?: 'running';
  message?: string;
  execution?: AgentExecutionResult;
}

/** M31-009 — GET /api/agents/executions */
export interface AgentExecutionHistoryResponse extends OkResponse {
  count: number;
  executions: AgentExecutionResult[];
}
