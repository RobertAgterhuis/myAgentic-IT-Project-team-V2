// Copyright (c) 2026 Robert Agterhuis. MIT License.

/* ── Job Observability Metrics (M24-007) ──────────────────────── *
 * Captures and exposes job execution metrics: queue depth,        *
 * processing duration, per-type counts, failure rates, retry      *
 * distribution, and dead letter queue size.                       *
 * Integrates with existing MetricsStore (platform/sdlc).         *
 * ─────────────────────────────────────────────────────────────── */

import type { JobQueue, JobStatus } from './job-types';
import type { WorkerHealth } from './worker';
import {
  type MetricsStore,
  createMetricsStore,
  appendMetric,
  serializeMetricsStore,
  deserializeMetricsStore,
} from '../../sdlc/observability';

const METRICS_STORE_PATH = 'BusinessDocs/metrics/job-metrics.json';

/** Snapshot of job-related metrics for the observability dashboard. */
export interface JobMetricsSnapshot {
  /** Current queue depth per status. */
  queueDepth: Record<JobStatus, number>;
  /** Job counts per type. */
  jobsByType: Record<string, number>;
  /** Failure rate (0-1) over all completed jobs. */
  failureRate: number;
  /** Processing duration stats in ms. */
  duration: { p50: number; p95: number; p99: number };
  /** Average retries per failed job. */
  avgRetries: number;
  /** Worker health (if available). */
  workerHealth?: WorkerHealth;
  /** Timestamp of this snapshot. */
  timestamp: string;
}

/**
 * Compute percentile from a sorted array of numbers.
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

/**
 * Collect a metrics snapshot from the job queue.
 */
export async function collectJobMetrics(
  queue: JobQueue,
  workerHealth?: WorkerHealth
): Promise<JobMetricsSnapshot> {
  const allJobs = await queue.list();
  const now = new Date().toISOString();

  // Queue depth per status
  const queueDepth: Record<string, number> = {
    queued: 0,
    running: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  };
  for (const job of allJobs) {
    queueDepth[job.status] = (queueDepth[job.status] || 0) + 1;
  }

  // Jobs per type
  const jobsByType: Record<string, number> = {};
  for (const job of allJobs) {
    jobsByType[job.type] = (jobsByType[job.type] || 0) + 1;
  }

  // Completed + failed for failure rate
  const terminal = allJobs.filter((j) => j.status === 'completed' || j.status === 'failed');
  const failedCount = terminal.filter((j) => j.status === 'failed').length;
  const failureRate = terminal.length > 0 ? failedCount / terminal.length : 0;

  // Duration stats from completed jobs
  const durations = allJobs
    .filter((j) => j.status === 'completed' && j.startedAt && j.completedAt)
    .map((j) => new Date(j.completedAt!).getTime() - new Date(j.startedAt!).getTime())
    .sort((a, b) => a - b);

  // Retry distribution
  const failedJobs = allJobs.filter((j) => j.status === 'failed');
  const avgRetries =
    failedJobs.length > 0
      ? failedJobs.reduce((sum, j) => sum + j.retryCount, 0) / failedJobs.length
      : 0;

  return {
    queueDepth: queueDepth as Record<JobStatus, number>,
    jobsByType,
    failureRate,
    duration: {
      p50: percentile(durations, 50),
      p95: percentile(durations, 95),
      p99: percentile(durations, 99),
    },
    avgRetries,
    workerHealth,
    timestamp: now,
  };
}

interface MetricsFileStore {
  exists(path: string): boolean;
  readFile(path: string): string;
  writeFile(path: string, data: string): void;
  mkdirp(path: string): void;
}

/**
 * Flush a job metrics snapshot to the time-series metrics store on disk.
 * Appends data points for each metric — never overwrites.
 */
export function flushJobMetrics(
  store: MetricsFileStore,
  snapshot: JobMetricsSnapshot,
  metricsPath?: string
): void {
  const filePath = metricsPath || METRICS_STORE_PATH;

  let metricsStore: MetricsStore;
  try {
    const dir = filePath.replace(/[/\\][^/\\]+$/, '');
    if (dir && !store.exists(dir)) store.mkdirp(dir);
    metricsStore = store.exists(filePath)
      ? deserializeMetricsStore(store.readFile(filePath))
      : createMetricsStore();
  } catch {
    metricsStore = createMetricsStore();
  }

  // Queue depth
  for (const [status, count] of Object.entries(snapshot.queueDepth)) {
    appendMetric(metricsStore, `job_queue_depth_${status}`, 'count', count);
  }

  // Per-type counts
  for (const [type, count] of Object.entries(snapshot.jobsByType)) {
    appendMetric(metricsStore, `job_type_${type}`, 'count', count);
  }

  // Failure rate
  appendMetric(metricsStore, 'job_failure_rate', 'ratio', snapshot.failureRate);

  // Duration percentiles
  appendMetric(metricsStore, 'job_duration_p50', 'ms', snapshot.duration.p50);
  appendMetric(metricsStore, 'job_duration_p95', 'ms', snapshot.duration.p95);
  appendMetric(metricsStore, 'job_duration_p99', 'ms', snapshot.duration.p99);

  // Retry distribution
  appendMetric(metricsStore, 'job_avg_retries', 'count', snapshot.avgRetries);

  try {
    store.writeFile(filePath, serializeMetricsStore(metricsStore));
  } catch {
    // Metrics persistence failure is non-fatal
  }
}
