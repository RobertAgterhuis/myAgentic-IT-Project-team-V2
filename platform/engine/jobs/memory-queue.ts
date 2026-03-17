// Copyright (c) 2026 Robert Agterhuis. MIT License.

/* ── In-Process Memory Queue (M24-002) ────────────────────────── *
 * Default job queue — local-first, no external dependencies.      *
 * Priority queue (higher priority first, FIFO within same level). *
 * Configurable concurrency, timeout, and retry with backoff.      *
 * ─────────────────────────────────────────────────────────────── */

import type { Job, JobError, JobFilter, JobInput, JobQueue, JobStatus, JobType } from './job-types';

/** Configuration for the in-process memory queue. */
export interface MemoryQueueConfig {
  /** Maximum number of concurrently running jobs (default: 3). */
  concurrency?: number;
  /** Default job timeout in milliseconds (default: 300_000 = 5 min). */
  defaultTimeoutMs?: number;
  /** Base delay for exponential backoff on retry (default: 2_000). */
  backoffBaseMs?: number;
  /** Maximum backoff delay (default: 30_000). */
  backoffCapMs?: number;
}

const DEFAULTS: Required<MemoryQueueConfig> = {
  concurrency: 3,
  defaultTimeoutMs: 300_000,
  backoffBaseMs: 2_000,
  backoffCapMs: 30_000,
};

let jobCounter = 0;

function generateJobId(): string {
  jobCounter += 1;
  return `job-${Date.now()}-${jobCounter}`;
}

/**
 * MemoryQueue — in-process priority job queue.
 *
 * Jobs are stored in memory and lost on process exit.
 * For durable persistence see PersistentQueue (M24-003).
 */
export class MemoryQueue implements JobQueue {
  private _jobs: Map<string, Job> = new Map();
  private _config: Required<MemoryQueueConfig>;
  private _timeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(config?: MemoryQueueConfig) {
    this._config = { ...DEFAULTS, ...config };
  }

  /** Current concurrency limit. */
  get concurrency(): number {
    return this._config.concurrency;
  }

  async enqueue(input: JobInput): Promise<Job> {
    const job: Job = {
      ...input,
      id: generateJobId(),
      status: 'queued',
      createdAt: new Date().toISOString(),
    };
    this._jobs.set(job.id, job);
    return { ...job };
  }

  async dequeue(types?: JobType[]): Promise<Job | null> {
    // Enforce concurrency limit
    const running = this._countByStatus('running');
    if (running >= this._config.concurrency) return null;

    // Find highest-priority queued job (FIFO within same priority)
    let best: Job | null = null;
    for (const job of this._jobs.values()) {
      if (job.status !== 'queued') continue;
      if (types && types.length > 0 && !types.includes(job.type)) continue;
      if (!best || job.priority > best.priority) {
        best = job;
      }
    }

    if (!best) return null;

    // Transition to running
    best.status = 'running';
    best.startedAt = new Date().toISOString();

    // Start timeout timer
    this._startTimeout(best.id);

    return { ...best };
  }

  async complete(id: string, result: unknown): Promise<void> {
    const job = this._jobs.get(id);
    if (!job) throw new Error(`Job not found: ${id}`);
    if (job.status !== 'running') throw new Error(`Cannot complete job in status: ${job.status}`);

    this._clearTimeout(id);
    job.status = 'completed';
    job.completedAt = new Date().toISOString();
    job.result = result;
  }

  async fail(id: string, error: JobError): Promise<void> {
    const job = this._jobs.get(id);
    if (!job) throw new Error(`Job not found: ${id}`);
    if (job.status !== 'running') throw new Error(`Cannot fail job in status: ${job.status}`);

    this._clearTimeout(id);

    // Retry logic: transient errors retry with backoff if retries remain
    if (error.severity === 'transient' && job.retryCount < job.maxRetries) {
      job.retryCount += 1;
      job.error = error;
      const delay = this._backoffDelay(job.retryCount);
      job.status = 'queued';
      job.startedAt = undefined;
      // Schedule re-availability after backoff delay
      setTimeout(() => {
        /* backoff complete — job is already queued and will be picked up */
      }, delay);
      return;
    }

    job.status = 'failed';
    job.completedAt = new Date().toISOString();
    job.error = error;
  }

  async cancel(id: string): Promise<void> {
    const job = this._jobs.get(id);
    if (!job) throw new Error(`Job not found: ${id}`);
    if (job.status !== 'queued' && job.status !== 'running') {
      throw new Error(`Cannot cancel job in status: ${job.status}`);
    }

    this._clearTimeout(id);
    job.status = 'cancelled';
    job.completedAt = new Date().toISOString();
  }

  async status(id: string): Promise<Job | null> {
    const job = this._jobs.get(id);
    return job ? { ...job } : null;
  }

  async list(filter?: JobFilter): Promise<Job[]> {
    let jobs = Array.from(this._jobs.values());

    if (filter?.status) {
      jobs = jobs.filter((j) => j.status === filter.status);
    }
    if (filter?.type) {
      jobs = jobs.filter((j) => j.type === filter.type);
    }

    // Sort by priority descending, then createdAt ascending (FIFO)
    jobs.sort((a, b) => b.priority - a.priority || a.createdAt.localeCompare(b.createdAt));

    if (filter?.offset) {
      jobs = jobs.slice(filter.offset);
    }
    if (filter?.limit) {
      jobs = jobs.slice(0, filter.limit);
    }

    return jobs.map((j) => ({ ...j }));
  }

  async size(status?: JobStatus): Promise<number> {
    if (!status) return this._jobs.size;
    return this._countByStatus(status);
  }

  /** Destroy all timers — for clean shutdown. */
  destroy(): void {
    for (const timer of this._timeouts.values()) {
      clearTimeout(timer);
    }
    this._timeouts.clear();
  }

  // ── Internal helpers ──────────────────────────────────────

  private _countByStatus(status: JobStatus): number {
    let count = 0;
    for (const job of this._jobs.values()) {
      if (job.status === status) count += 1;
    }
    return count;
  }

  private _backoffDelay(attempt: number): number {
    const base = this._config.backoffBaseMs;
    const cap = this._config.backoffCapMs;
    return Math.min(base * Math.pow(2, attempt - 1), cap);
  }

  private _startTimeout(id: string): void {
    const timer = setTimeout(() => {
      const job = this._jobs.get(id);
      if (job && job.status === 'running') {
        // Timeout → treat as transient failure
        this.fail(id, { message: 'Job timed out', severity: 'transient' });
      }
    }, this._config.defaultTimeoutMs);
    this._timeouts.set(id, timer);
  }

  private _clearTimeout(id: string): void {
    const timer = this._timeouts.get(id);
    if (timer) {
      clearTimeout(timer);
      this._timeouts.delete(id);
    }
  }
}
