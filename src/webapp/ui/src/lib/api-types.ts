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
