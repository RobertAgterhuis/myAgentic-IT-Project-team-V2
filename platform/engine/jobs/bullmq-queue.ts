// Copyright (c) 2026 Robert Agterhuis. MIT License.

/* ── BullMQ-backed Job Queue (M33-002) ────────────────────────── *
 * Implements JobQueue via BullMQ (Redis). Enables horizontal      *
 * scaling — multiple instances share a single Redis-backed queue. *
 * Falls back to MemoryQueue/PersistentQueue when Redis is absent. *
 * ─────────────────────────────────────────────────────────────── */

import { Queue, Job as BullJob, type ConnectionOptions } from 'bullmq';
import type { Job, JobError, JobFilter, JobInput, JobQueue, JobStatus, JobType } from './job-types';

/** Configuration for the BullMQ-backed queue. */
export interface BullMQQueueConfig {
  /** Redis connection options (url string or ioredis options). */
  connection: ConnectionOptions;
  /** Queue name prefix (default: 'agentic'). */
  prefix?: string;
  /** Maximum concurrent jobs per worker (default: 3). */
  concurrency?: number;
}

const QUEUE_NAME = 'jobs';

/** Map BullMQ job state → our JobStatus. */
function mapStatus(state: string): JobStatus {
  switch (state) {
    case 'waiting':
    case 'delayed':
    case 'prioritized':
      return 'queued';
    case 'active':
      return 'running';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    default:
      return 'queued';
  }
}

/**
 * BullMQQueue — Redis-backed job queue implementation.
 *
 * Uses BullMQ's built-in priority, retry, and concurrency features.
 * All instances sharing the same Redis connection share the same queue.
 */
export class BullMQQueue implements JobQueue {
  private _queue: Queue;
  private _prefix: string;
  private _connection: ConnectionOptions;

  constructor(config: BullMQQueueConfig) {
    this._prefix = config.prefix ?? 'agentic';
    this._connection = config.connection;
    this._queue = new Queue(QUEUE_NAME, {
      connection: this._connection,
      prefix: this._prefix,
    });
  }

  /** Expose connection options so a Worker can be created externally. */
  get connection(): ConnectionOptions {
    return this._connection;
  }

  /** Expose the prefix for Worker creation. */
  get prefix(): string {
    return this._prefix;
  }

  /** Expose the underlying BullMQ Queue for Worker binding. */
  get queueName(): string {
    return QUEUE_NAME;
  }

  async enqueue(input: JobInput): Promise<Job> {
    const now = new Date().toISOString();
    const jobData = {
      type: input.type,
      payload: input.payload,
      priority: input.priority,
      createdAt: now,
      maxRetries: input.maxRetries,
      retryCount: input.retryCount,
    };

    const bullJob = await this._queue.add(input.type, jobData, {
      priority: 10 - Math.min(Math.max(input.priority, 0), 10), // BullMQ: lower = higher priority
      attempts: input.maxRetries + 1,
      backoff: { type: 'exponential', delay: 2000 },
    });

    return {
      id: bullJob.id!,
      type: input.type,
      payload: input.payload,
      status: 'queued',
      priority: input.priority,
      createdAt: now,
      retryCount: 0,
      maxRetries: input.maxRetries,
    };
  }

  async dequeue(_types?: JobType[]): Promise<Job | null> {
    // BullMQ workers pull jobs automatically — manual dequeue is not
    // the primary usage pattern. Return null; the Worker handles dispatch.
    return null;
  }

  async complete(id: string, _result: unknown): Promise<void> {
    const bullJob = await BullJob.fromId(this._queue, id);
    if (!bullJob) throw new Error(`Job not found: ${id}`);
    await bullJob.updateData({
      ...bullJob.data,
      completedAt: new Date().toISOString(),
    });
    // The Worker's processor is responsible for returning the result.
    // This is a no-op marker — actual completion happens via the worker.
  }

  async fail(id: string, error: JobError): Promise<void> {
    const bullJob = await BullJob.fromId(this._queue, id);
    if (!bullJob) throw new Error(`Job not found: ${id}`);
    await bullJob.updateData({
      ...bullJob.data,
      error,
    });
  }

  async cancel(id: string): Promise<void> {
    const bullJob = await BullJob.fromId(this._queue, id);
    if (!bullJob) throw new Error(`Job not found: ${id}`);
    await bullJob.remove();
  }

  async status(id: string): Promise<Job | null> {
    const bullJob = await BullJob.fromId(this._queue, id);
    if (!bullJob) return null;
    const state = await bullJob.getState();
    const data = bullJob.data as Record<string, unknown>;
    return {
      id: bullJob.id!,
      type: data.type as JobType,
      payload: data.payload as Record<string, unknown>,
      status: mapStatus(state),
      priority: data.priority as number,
      createdAt: data.createdAt as string,
      startedAt: data.startedAt as string | undefined,
      completedAt: data.completedAt as string | undefined,
      result: bullJob.returnvalue,
      error: data.error as JobError | undefined,
      retryCount: bullJob.attemptsMade,
      maxRetries: data.maxRetries as number,
    };
  }

  async list(filter?: JobFilter): Promise<Job[]> {
    const types: string[] = [];
    if (filter?.status) {
      switch (filter.status) {
        case 'queued':
          types.push('waiting', 'delayed', 'prioritized');
          break;
        case 'running':
          types.push('active');
          break;
        case 'completed':
          types.push('completed');
          break;
        case 'failed':
          types.push('failed');
          break;
      }
    } else {
      types.push('waiting', 'active', 'completed', 'failed', 'delayed', 'prioritized');
    }

    const start = filter?.offset ?? 0;
    const end = filter?.limit ? start + filter.limit - 1 : start + 99;

    const jobs: Job[] = [];
    for (const t of types) {
      const bullJobs = await this._queue.getJobs(
        [t as 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'prioritized'],
        start,
        end
      );
      for (const bj of bullJobs) {
        if (!bj) continue;
        const state = await bj.getState();
        const data = bj.data as Record<string, unknown>;
        if (filter?.type && data.type !== filter.type) continue;
        jobs.push({
          id: bj.id!,
          type: data.type as JobType,
          payload: data.payload as Record<string, unknown>,
          status: mapStatus(state),
          priority: data.priority as number,
          createdAt: data.createdAt as string,
          startedAt: data.startedAt as string | undefined,
          completedAt: data.completedAt as string | undefined,
          result: bj.returnvalue,
          error: data.error as JobError | undefined,
          retryCount: bj.attemptsMade,
          maxRetries: data.maxRetries as number,
        });
      }
    }

    // Sort by priority desc, then createdAt asc
    jobs.sort((a, b) => b.priority - a.priority || a.createdAt.localeCompare(b.createdAt));

    return filter?.limit ? jobs.slice(0, filter.limit) : jobs;
  }

  async size(status?: JobStatus): Promise<number> {
    if (!status) {
      const counts = await this._queue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
        'prioritized'
      );
      return Object.values(counts).reduce((a, b) => a + b, 0);
    }
    switch (status) {
      case 'queued': {
        const c = await this._queue.getJobCounts('waiting', 'delayed', 'prioritized');
        return (c.waiting || 0) + (c.delayed || 0) + (c.prioritized || 0);
      }
      case 'running':
        return (await this._queue.getJobCounts('active')).active || 0;
      case 'completed':
        return (await this._queue.getJobCounts('completed')).completed || 0;
      case 'failed':
        return (await this._queue.getJobCounts('failed')).failed || 0;
      default:
        return 0;
    }
  }

  /** Graceful shutdown — close the queue connection. */
  async destroy(): Promise<void> {
    await this._queue.close();
  }
}
