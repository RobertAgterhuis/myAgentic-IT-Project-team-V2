// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * SDLC Observability & DORA Metrics
 *
 * Captures and computes engineering performance metrics following the DORA
 * (DevOps Research and Assessment) framework:
 *
 * 1. **Lead Time for Changes** — time from commit to production
 * 2. **Deployment Frequency** — how often code is deployed to production
 * 3. **Change Failure Rate** — % of deployments causing incidents
 * 4. **Mean Time to Recovery (MTTR)** — time from incident to resolution
 *
 * Also tracks project-level KPIs: cycle time, throughput, WIP, defect
 * density, and test coverage trends.
 *
 * Zero external dependencies. Pure functions.
 *
 * @module sdlc/observability
 */

// ─── DORA Classification ─────────────────────────────────────

export const DORA_LEVELS = Object.freeze({
  ELITE: 'ELITE',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const);

export type DoraLevel = (typeof DORA_LEVELS)[keyof typeof DORA_LEVELS];

// ─── Event Types ─────────────────────────────────────────────

export interface CommitEvent {
  id: string;
  timestamp: string;
  author: string;
  branch: string;
}

export interface DeploymentEvent {
  id: string;
  timestamp: string;
  environment: string;
  release_version: string;
  success: boolean;
  commit_ids: string[];
}

export interface IncidentEvent {
  id: string;
  opened_at: string;
  resolved_at: string | null;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  deployment_id: string;
}

export interface SprintMetrics {
  sprint_id: string;
  started_at: string;
  ended_at: string;
  planned_points: number;
  completed_points: number;
  tasks_completed: number;
  tasks_carried_over: number;
  defects_found: number;
  defects_fixed: number;
}

// ─── DORA Metrics Report ─────────────────────────────────────

export interface DoraReport {
  period_start: string;
  period_end: string;
  lead_time_hours: number;
  deployment_frequency_per_day: number;
  change_failure_rate_pct: number;
  mttr_hours: number;
  lead_time_level: DoraLevel;
  deployment_frequency_level: DoraLevel;
  change_failure_rate_level: DoraLevel;
  mttr_level: DoraLevel;
  overall_level: DoraLevel;
}

// ─── Project KPI Report ──────────────────────────────────────

export interface ProjectKpiReport {
  cycle_time_days: number;
  throughput_per_sprint: number;
  wip_count: number;
  defect_density: number;
  test_coverage_pct: number;
  velocity_trend: number[];
}

// ─── Metric Computation ──────────────────────────────────────

/**
 * Compute lead time for changes (average hours from commit to deploy).
 */
export function computeLeadTime(commits: CommitEvent[], deployments: DeploymentEvent[]): number {
  if (commits.length === 0 || deployments.length === 0) return 0;

  const commitById = new Map(commits.map((c) => [c.id, c]));
  const leadTimes: number[] = [];

  for (const deploy of deployments) {
    if (!deploy.success) continue;
    const deployTime = new Date(deploy.timestamp).getTime();

    for (const commitId of deploy.commit_ids) {
      const commit = commitById.get(commitId);
      if (commit) {
        const commitTime = new Date(commit.timestamp).getTime();
        const hours = (deployTime - commitTime) / (1000 * 60 * 60);
        if (hours >= 0) leadTimes.push(hours);
      }
    }
  }

  if (leadTimes.length === 0) return 0;
  return leadTimes.reduce((sum, t) => sum + t, 0) / leadTimes.length;
}

/**
 * Compute deployment frequency (deployments per day over a time period).
 */
export function computeDeploymentFrequency(
  deployments: DeploymentEvent[],
  periodStart: string,
  periodEnd: string
): number {
  const start = new Date(periodStart).getTime();
  const end = new Date(periodEnd).getTime();
  const days = (end - start) / (1000 * 60 * 60 * 24);
  if (days <= 0) return 0;

  const successfulDeploys = deployments.filter((d) => {
    const t = new Date(d.timestamp).getTime();
    return d.success && t >= start && t <= end;
  });

  return successfulDeploys.length / days;
}

/**
 * Compute change failure rate (% of deployments that caused incidents).
 */
export function computeChangeFailureRate(
  deployments: DeploymentEvent[],
  incidents: IncidentEvent[]
): number {
  const successfulDeploys = deployments.filter((d) => d.success);
  if (successfulDeploys.length === 0) return 0;

  const failedDeployIds = new Set(incidents.map((i) => i.deployment_id));
  const failedDeploys = successfulDeploys.filter((d) => failedDeployIds.has(d.id));

  return (failedDeploys.length / successfulDeploys.length) * 100;
}

/**
 * Compute mean time to recovery (average hours from incident open to resolve).
 */
export function computeMTTR(incidents: IncidentEvent[]): number {
  const resolved = incidents.filter((i) => i.resolved_at !== null);
  if (resolved.length === 0) return 0;

  const recoveryTimes = resolved.map((i) => {
    const open = new Date(i.opened_at).getTime();
    const close = new Date(i.resolved_at!).getTime();
    return (close - open) / (1000 * 60 * 60);
  });

  return recoveryTimes.reduce((sum, t) => sum + t, 0) / recoveryTimes.length;
}

// ─── DORA Level Classification ───────────────────────────────

export function classifyLeadTime(hours: number): DoraLevel {
  if (hours <= 24) return DORA_LEVELS.ELITE;
  if (hours <= 168) return DORA_LEVELS.HIGH; // ≤ 1 week
  if (hours <= 720) return DORA_LEVELS.MEDIUM; // ≤ 1 month
  return DORA_LEVELS.LOW;
}

export function classifyDeploymentFrequency(perDay: number): DoraLevel {
  if (perDay >= 1) return DORA_LEVELS.ELITE; // multiple per day
  if (perDay >= 1 / 7) return DORA_LEVELS.HIGH; // weekly
  if (perDay >= 1 / 30) return DORA_LEVELS.MEDIUM; // monthly
  return DORA_LEVELS.LOW;
}

export function classifyChangeFailureRate(pct: number): DoraLevel {
  if (pct <= 5) return DORA_LEVELS.ELITE;
  if (pct <= 10) return DORA_LEVELS.HIGH;
  if (pct <= 15) return DORA_LEVELS.MEDIUM;
  return DORA_LEVELS.LOW;
}

export function classifyMTTR(hours: number): DoraLevel {
  if (hours <= 1) return DORA_LEVELS.ELITE;
  if (hours <= 24) return DORA_LEVELS.HIGH;
  if (hours <= 168) return DORA_LEVELS.MEDIUM; // ≤ 1 week
  return DORA_LEVELS.LOW;
}

function overallLevel(levels: DoraLevel[]): DoraLevel {
  const order: DoraLevel[] = [
    DORA_LEVELS.ELITE,
    DORA_LEVELS.HIGH,
    DORA_LEVELS.MEDIUM,
    DORA_LEVELS.LOW,
  ];
  let worst = 0;
  for (const l of levels) {
    const idx = order.indexOf(l);
    if (idx > worst) worst = idx;
  }
  return order[worst];
}

// ─── Full DORA Report ────────────────────────────────────────

export function computeDoraReport(
  commits: CommitEvent[],
  deployments: DeploymentEvent[],
  incidents: IncidentEvent[],
  periodStart: string,
  periodEnd: string
): DoraReport {
  const leadTime = computeLeadTime(commits, deployments);
  const deployFreq = computeDeploymentFrequency(deployments, periodStart, periodEnd);
  const failureRate = computeChangeFailureRate(deployments, incidents);
  const mttr = computeMTTR(incidents);

  const ltLevel = classifyLeadTime(leadTime);
  const dfLevel = classifyDeploymentFrequency(deployFreq);
  const cfrLevel = classifyChangeFailureRate(failureRate);
  const mttrLevel = classifyMTTR(mttr);

  return {
    period_start: periodStart,
    period_end: periodEnd,
    lead_time_hours: Math.round(leadTime * 100) / 100,
    deployment_frequency_per_day: Math.round(deployFreq * 1000) / 1000,
    change_failure_rate_pct: Math.round(failureRate * 100) / 100,
    mttr_hours: Math.round(mttr * 100) / 100,
    lead_time_level: ltLevel,
    deployment_frequency_level: dfLevel,
    change_failure_rate_level: cfrLevel,
    mttr_level: mttrLevel,
    overall_level: overallLevel([ltLevel, dfLevel, cfrLevel, mttrLevel]),
  };
}

// ─── Sprint Velocity ─────────────────────────────────────────

export function computeVelocityTrend(sprints: SprintMetrics[]): number[] {
  return sprints.map((s) => s.completed_points);
}

export function computeDefectDensity(sprints: SprintMetrics[]): number {
  const totalTasks = sprints.reduce((sum, s) => sum + s.tasks_completed, 0);
  const totalDefects = sprints.reduce((sum, s) => sum + s.defects_found, 0);
  if (totalTasks === 0) return 0;
  return Math.round((totalDefects / totalTasks) * 100) / 100;
}

// ─── Time-Series Metrics Storage (M7 / Issue #372) ──────────

/** Single data point in a time-series metric. */
export interface MetricDataPoint {
  timestamp: string;
  value: number;
  labels?: Record<string, string>;
}

/** A named time-series metric with append-only data points. */
export interface TimeSeriesMetric {
  name: string;
  unit: string;
  data_points: MetricDataPoint[];
}

/** Persistent store for all time-series metrics. */
export interface MetricsStore {
  metrics: Record<string, TimeSeriesMetric>;
  last_updated: string;
}

/** Create an empty metrics store. */
export function createMetricsStore(): MetricsStore {
  return { metrics: {}, last_updated: new Date().toISOString() };
}

/** Ensure a named metric series exists in the store. */
export function ensureMetric(store: MetricsStore, name: string, unit: string): TimeSeriesMetric {
  if (!store.metrics[name]) {
    store.metrics[name] = { name, unit, data_points: [] };
  }
  return store.metrics[name];
}

/**
 * Append a data point to a named metric (append-only — never overwrites).
 * Returns the updated store for chaining.
 */
export function appendMetric(
  store: MetricsStore,
  name: string,
  unit: string,
  value: number,
  labels?: Record<string, string>
): MetricsStore {
  const metric = ensureMetric(store, name, unit);
  metric.data_points.push({
    timestamp: new Date().toISOString(),
    value,
    labels,
  });
  store.last_updated = new Date().toISOString();
  return store;
}

/**
 * Query data points for a metric within a time range.
 * Both bounds are inclusive. Omit either to leave that side open.
 */
export function queryMetric(
  store: MetricsStore,
  name: string,
  from?: string,
  to?: string
): MetricDataPoint[] {
  const metric = store.metrics[name];
  if (!metric) return [];

  const fromMs = from ? new Date(from).getTime() : 0;
  const toMs = to ? new Date(to).getTime() : Infinity;

  return metric.data_points.filter((dp) => {
    const t = new Date(dp.timestamp).getTime();
    return t >= fromMs && t <= toMs;
  });
}

/** Serialize the metrics store to JSON for persistence. */
export function serializeMetricsStore(store: MetricsStore): string {
  return JSON.stringify(store, null, 2);
}

/** Deserialize a metrics store from JSON. Returns empty store on invalid input. */
export function deserializeMetricsStore(json: string): MetricsStore {
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed.metrics === 'object' && parsed.last_updated) {
      return parsed as MetricsStore;
    }
  } catch {
    // fall through
  }
  return createMetricsStore();
}

// ─── Agent Performance Tracking (M7 / Issue #373) ───────────

/** Performance record for a single agent invocation. */
export interface AgentPerformanceRecord {
  agent_id: string;
  agent_name: string;
  state: string;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  success: boolean;
  attempt: number;
  error?: string;
  provider?: string;
  model?: string;
  provider_status?: string;
  finish_reason?: string;
  provider_latency_ms?: number;
  model_attempts?: number;
  model_retries?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  contract_validation_passed?: boolean;
}

/** Aggregated performance stats for an agent. */
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

/**
 * Record an agent invocation in the time-series store.
 * Creates two metric series: agent_duration_ms and agent_success.
 */
export function recordAgentPerformance(
  store: MetricsStore,
  record: AgentPerformanceRecord
): MetricsStore {
  const labels = {
    agent_id: record.agent_id,
    agent_name: record.agent_name,
    state: record.state,
    ...(record.provider ? { provider: record.provider } : {}),
    ...(record.model ? { model: record.model } : {}),
    ...(record.provider_status ? { provider_status: record.provider_status } : {}),
    ...(record.finish_reason ? { finish_reason: record.finish_reason } : {}),
  };
  appendMetric(store, 'agent_duration_ms', 'ms', record.duration_ms, labels);
  appendMetric(store, 'agent_success', 'boolean', record.success ? 1 : 0, labels);
  if (typeof record.provider_latency_ms === 'number') {
    appendMetric(store, 'agent_provider_latency_ms', 'ms', record.provider_latency_ms, labels);
  }
  if (typeof record.model_attempts === 'number') {
    appendMetric(store, 'agent_model_attempts', 'count', record.model_attempts, labels);
  }
  if (typeof record.model_retries === 'number') {
    appendMetric(store, 'agent_model_retries', 'count', record.model_retries, labels);
  }
  if (typeof record.prompt_tokens === 'number') {
    appendMetric(store, 'agent_prompt_tokens', 'tokens', record.prompt_tokens, labels);
  }
  if (typeof record.completion_tokens === 'number') {
    appendMetric(store, 'agent_completion_tokens', 'tokens', record.completion_tokens, labels);
  }
  if (typeof record.total_tokens === 'number') {
    appendMetric(store, 'agent_total_tokens', 'tokens', record.total_tokens, labels);
  }
  if (typeof record.contract_validation_passed === 'boolean') {
    appendMetric(
      store,
      'agent_contract_validation_passed',
      'boolean',
      record.contract_validation_passed ? 1 : 0,
      labels
    );
  }
  if (record.provider_status) {
    appendMetric(
      store,
      'agent_provider_status',
      'boolean',
      record.provider_status === 'success' ? 1 : 0,
      labels
    );
  }
  return store;
}

/**
 * Compute aggregated performance statistics per agent from stored metrics.
 */
export function computeAgentStats(store: MetricsStore): AgentPerformanceStats[] {
  const durationMetric = store.metrics['agent_duration_ms'];
  const successMetric = store.metrics['agent_success'];
  if (!durationMetric || !successMetric) return [];

  type AgentAccumulator = {
    durations: number[];
    successes: number[];
    promptTokens: number[];
    completionTokens: number[];
    totalTokens: number[];
    providerLatencies: number[];
    modelAttempts: number[];
    modelRetries: number[];
    providers: Set<string>;
    models: Set<string>;
    name: string;
  };

  // Group by agent_id
  const agentMap = new Map<string, AgentAccumulator>();

  function ensureAgent(id: string, name: string): AgentAccumulator {
    if (!agentMap.has(id)) {
      agentMap.set(id, {
        durations: [],
        successes: [],
        promptTokens: [],
        completionTokens: [],
        totalTokens: [],
        providerLatencies: [],
        modelAttempts: [],
        modelRetries: [],
        providers: new Set<string>(),
        models: new Set<string>(),
        name,
      });
    }
    return agentMap.get(id)!;
  }

  function ingestMetric(metricName: string, sink: keyof AgentAccumulator) {
    const metric = store.metrics[metricName];
    if (!metric) return;
    for (const dp of metric.data_points) {
      const id = dp.labels?.agent_id ?? 'unknown';
      const name = dp.labels?.agent_name ?? id;
      const entry = ensureAgent(id, name);
      const bucket = entry[sink] as number[];
      bucket.push(dp.value);
      if (dp.labels?.provider) entry.providers.add(dp.labels.provider);
      if (dp.labels?.model) entry.models.add(dp.labels.model);
    }
  }

  function average(values: number[]): number {
    if (values.length === 0) return 0;
    return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
  }

  function sum(values: number[]): number {
    return values.reduce((total, value) => total + value, 0);
  }

  for (const dp of durationMetric.data_points) {
    const id = dp.labels?.agent_id ?? 'unknown';
    const name = dp.labels?.agent_name ?? id;
    const entry = ensureAgent(id, name);
    entry.durations.push(dp.value);
    if (dp.labels?.provider) entry.providers.add(dp.labels.provider);
    if (dp.labels?.model) entry.models.add(dp.labels.model);
  }
  for (const dp of successMetric.data_points) {
    const id = dp.labels?.agent_id ?? 'unknown';
    const name = dp.labels?.agent_name ?? id;
    const entry = ensureAgent(id, name);
    entry.successes.push(dp.value);
    if (dp.labels?.provider) entry.providers.add(dp.labels.provider);
    if (dp.labels?.model) entry.models.add(dp.labels.model);
  }

  ingestMetric('agent_prompt_tokens', 'promptTokens');
  ingestMetric('agent_completion_tokens', 'completionTokens');
  ingestMetric('agent_total_tokens', 'totalTokens');
  ingestMetric('agent_provider_latency_ms', 'providerLatencies');
  ingestMetric('agent_model_attempts', 'modelAttempts');
  ingestMetric('agent_model_retries', 'modelRetries');

  const stats: AgentPerformanceStats[] = [];
  for (const [id, data] of agentMap) {
    const total = data.successes.length;
    const successful = data.successes.filter((v) => v === 1).length;
    const sorted = [...data.durations].sort((a, b) => a - b);
    const p95Idx = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
    stats.push({
      agent_id: id,
      agent_name: data.name,
      total_invocations: total,
      successful,
      failed: total - successful,
      success_rate_pct: total > 0 ? Math.round((successful / total) * 10000) / 100 : 0,
      avg_duration_ms:
        sorted.length > 0 ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : 0,
      min_duration_ms: sorted.length > 0 ? sorted[0] : 0,
      max_duration_ms: sorted.length > 0 ? sorted[sorted.length - 1] : 0,
      p95_duration_ms: sorted.length > 0 ? sorted[p95Idx] : 0,
      total_prompt_tokens: sum(data.promptTokens),
      total_completion_tokens: sum(data.completionTokens),
      total_tokens: sum(data.totalTokens),
      avg_total_tokens: average(data.totalTokens),
      avg_provider_latency_ms: average(data.providerLatencies),
      avg_model_attempts: average(data.modelAttempts),
      avg_model_retries: average(data.modelRetries),
      providers: [...data.providers].sort(),
      models: [...data.models].sort(),
    });
  }

  return stats.sort((a, b) => a.agent_id.localeCompare(b.agent_id));
}

// ─── Sprint Boundary Trend Computation (M7 / Issue #374) ────

/** Velocity trend entry computed at a sprint boundary. */
export interface VelocityTrendEntry {
  sprint_id: string;
  date: string;
  planned_points: number;
  completed_points: number;
  velocity_ratio: number;
  trailing_avg_velocity: number;
  window_size: number;
}

/** DORA trend entry computed at a sprint boundary. */
export interface DoraTrendEntry {
  sprint_id: string;
  date: string;
  lead_time_hours: number;
  deployment_frequency_per_day: number;
  change_failure_rate_pct: number;
  mttr_hours: number;
  overall_level: DoraLevel;
}

/**
 * Compute velocity trend at sprint boundary.
 * Persists the result into the metrics store.
 */
export function computeVelocityTrendEntry(
  sprints: SprintMetrics[],
  windowSize: number = 3
): VelocityTrendEntry[] {
  const entries: VelocityTrendEntry[] = [];
  for (let i = 0; i < sprints.length; i++) {
    const s = sprints[i];
    const ratio = s.planned_points > 0 ? s.completed_points / s.planned_points : 0;
    const start = Math.max(0, i - windowSize + 1);
    const window = sprints.slice(start, i + 1);
    const trailingAvg =
      window.length > 0
        ? window.reduce((sum, w) => sum + w.completed_points, 0) / window.length
        : 0;
    entries.push({
      sprint_id: s.sprint_id,
      date: s.ended_at,
      planned_points: s.planned_points,
      completed_points: s.completed_points,
      velocity_ratio: Math.round(ratio * 1000) / 1000,
      trailing_avg_velocity: Math.round(trailingAvg * 10) / 10,
      window_size: window.length,
    });
  }
  return entries;
}

/**
 * Record sprint boundary metrics into the time-series store.
 * Appends velocity and DORA snapshots so they accumulate over time.
 */
export function recordSprintBoundary(
  metricsStore: MetricsStore,
  sprint: SprintMetrics,
  doraReport?: DoraReport
): MetricsStore {
  const labels = { sprint_id: sprint.sprint_id };
  appendMetric(metricsStore, 'sprint_planned_points', 'points', sprint.planned_points, labels);
  appendMetric(metricsStore, 'sprint_completed_points', 'points', sprint.completed_points, labels);
  const ratio = sprint.planned_points > 0 ? sprint.completed_points / sprint.planned_points : 0;
  appendMetric(
    metricsStore,
    'sprint_velocity_ratio',
    'ratio',
    Math.round(ratio * 1000) / 1000,
    labels
  );
  appendMetric(metricsStore, 'sprint_defects_found', 'count', sprint.defects_found, labels);
  appendMetric(metricsStore, 'sprint_carry_over', 'count', sprint.tasks_carried_over, labels);

  if (doraReport) {
    appendMetric(metricsStore, 'dora_lead_time_hours', 'hours', doraReport.lead_time_hours, labels);
    appendMetric(
      metricsStore,
      'dora_deploy_frequency',
      'per_day',
      doraReport.deployment_frequency_per_day,
      labels
    );
    appendMetric(
      metricsStore,
      'dora_change_failure_rate',
      'pct',
      doraReport.change_failure_rate_pct,
      labels
    );
    appendMetric(metricsStore, 'dora_mttr_hours', 'hours', doraReport.mttr_hours, labels);
  }

  return metricsStore;
}
