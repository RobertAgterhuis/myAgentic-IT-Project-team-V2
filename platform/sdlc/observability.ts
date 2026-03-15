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
