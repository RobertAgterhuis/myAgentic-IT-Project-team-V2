// Copyright (c) 2026 Robert Agterhuis. MIT License.

/* ── Job Worker Loop (M24-004) ────────────────────────────────── *
 * Continuous dequeue → execute → complete/fail loop.              *
 * Configurable worker count, graceful shutdown, health reporting. *
 * ─────────────────────────────────────────────────────────────── */

import type { Job, JobQueue, JobType } from './job-types';

/** Executor function — takes a job, returns a result or throws. */
export type JobExecutor = (job: Job) => Promise<unknown>;

/** Health snapshot exposed by the worker. */
export interface WorkerHealth {
  /** Number of jobs currently being processed. */
  activeJobs: number;
  /** Queue depth (queued jobs). */
  queueDepth: number;
  /** Total jobs processed since start. */
  totalProcessed: number;
  /** Total jobs that failed since start. */
  totalFailed: number;
  /** Whether the worker is shutting down. */
  shuttingDown: boolean;
  /** Uptime in milliseconds. */
  uptimeMs: number;
}

/** Configuration for the worker loop. */
export interface WorkerConfig {
  /** Number of concurrent worker loops (default: 1). */
  workerCount?: number;
  /** Poll interval when queue is empty, in ms (default: 1_000). */
  pollIntervalMs?: number;
  /** Job types this worker handles (default: all). */
  types?: JobType[];
  /** Callback fired on job lifecycle events. */
  onJobEvent?: (event: JobEvent) => void;
}

/** Job lifecycle event for SSE / metrics. */
export interface JobEvent {
  type: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  job: Job;
  timestamp: string;
}

const DEFAULT_CONFIG: Required<Omit<WorkerConfig, 'onJobEvent' | 'types'>> = {
  workerCount: 1,
  pollIntervalMs: 1_000,
};

/**
 * JobWorker — runs one or more continuous loops that pull jobs
 * from a JobQueue, execute them, and update their status.
 */
export class JobWorker {
  private _queue: JobQueue;
  private _executor: JobExecutor;
  private _config: Required<Omit<WorkerConfig, 'onJobEvent' | 'types'>>;
  private _types?: JobType[];
  private _onJobEvent?: (event: JobEvent) => void;

  private _running = false;
  private _shuttingDown = false;
  private _activeJobs = new Set<string>();
  private _workerLoops: Promise<void>[] = [];
  private _startedAt = 0;
  private _totalProcessed = 0;
  private _totalFailed = 0;

  constructor(queue: JobQueue, executor: JobExecutor, config?: WorkerConfig) {
    this._queue = queue;
    this._executor = executor;
    this._config = {
      workerCount: config?.workerCount ?? DEFAULT_CONFIG.workerCount,
      pollIntervalMs: config?.pollIntervalMs ?? DEFAULT_CONFIG.pollIntervalMs,
    };
    this._types = config?.types;
    this._onJobEvent = config?.onJobEvent;
  }

  /** Whether the worker is currently running. */
  get running(): boolean {
    return this._running;
  }

  /** Start the worker loop(s). */
  start(): void {
    if (this._running) return;
    this._running = true;
    this._shuttingDown = false;
    this._startedAt = Date.now();

    for (let i = 0; i < this._config.workerCount; i++) {
      this._workerLoops.push(this._loop());
    }
  }

  /**
   * Graceful shutdown: stop dequeuing new jobs, wait for in-flight
   * jobs to complete, then resolve.
   */
  async stop(): Promise<void> {
    this._shuttingDown = true;
    // Wait for all loops to finish their current iteration
    await Promise.all(this._workerLoops);
    this._running = false;
    this._workerLoops = [];
  }

  /** Get a health snapshot. */
  async health(): Promise<WorkerHealth> {
    const queueDepth = await this._queue.size('queued');
    return {
      activeJobs: this._activeJobs.size,
      queueDepth,
      totalProcessed: this._totalProcessed,
      totalFailed: this._totalFailed,
      shuttingDown: this._shuttingDown,
      uptimeMs: this._running ? Date.now() - this._startedAt : 0,
    };
  }

  // ── Internal ──────────────────────────────────────────────

  private async _loop(): Promise<void> {
    while (!this._shuttingDown) {
      const job = await this._queue.dequeue(this._types);

      if (!job) {
        // No work available — wait before polling again
        await this._sleep(this._config.pollIntervalMs);
        continue;
      }

      this._activeJobs.add(job.id);
      this._emitEvent('running', job);

      try {
        const result = await this._executor(job);
        await this._queue.complete(job.id, result);
        this._totalProcessed += 1;

        const updated = await this._queue.status(job.id);
        if (updated) this._emitEvent('completed', updated);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const severity = this._classifySeverity(message);
        await this._queue.fail(job.id, { message, severity });
        this._totalFailed += 1;

        const updated = await this._queue.status(job.id);
        if (updated) this._emitEvent(updated.status === 'queued' ? 'queued' : 'failed', updated);
      } finally {
        this._activeJobs.delete(job.id);
      }
    }
  }

  private _emitEvent(type: JobEvent['type'], job: Job): void {
    if (this._onJobEvent) {
      this._onJobEvent({ type, job, timestamp: new Date().toISOString() });
    }
  }

  /**
   * Basic severity classification matching dispatcher patterns.
   * Transient: timeout, network, rate limit. Fatal: auth, corruption.
   */
  private _classifySeverity(msg: string): 'transient' | 'recoverable' | 'fatal' {
    if (/auth|401|403|corrupt|contract.?violation/i.test(msg)) return 'fatal';
    if (/timeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED|rate.?limit|429|503|network/i.test(msg))
      return 'transient';
    return 'recoverable';
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
