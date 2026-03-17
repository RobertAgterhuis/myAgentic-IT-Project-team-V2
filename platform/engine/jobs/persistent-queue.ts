// Copyright (c) 2026 Robert Agterhuis. MIT License.

/* ── Persistent Job Queue (M24-003) ───────────────────────────── *
 * StorageProvider-backed job queue that survives server restarts.  *
 * Running jobs are re-queued on recovery. Failed jobs that exhaust *
 * retries go to a dead letter queue for inspection.               *
 * ─────────────────────────────────────────────────────────────── */

import type { StorageProvider, Document } from '../persistence/storage-provider';
import type { Job, JobError, JobFilter, JobInput, JobQueue, JobStatus, JobType } from './job-types';

/** Collection names used in the StorageProvider. */
const COLLECTION = 'jobs';
const DLQ_COLLECTION = 'jobs-dlq';

/** Configuration for the persistent queue. */
export interface PersistentQueueConfig {
  /** Maximum number of concurrently running jobs (default: 3). */
  concurrency?: number;
  /** Default job timeout in milliseconds (default: 300_000 = 5 min). */
  defaultTimeoutMs?: number;
  /** Base delay for exponential backoff on retry (default: 2_000). */
  backoffBaseMs?: number;
  /** Maximum backoff delay (default: 30_000). */
  backoffCapMs?: number;
}

const DEFAULTS: Required<PersistentQueueConfig> = {
  concurrency: 3,
  defaultTimeoutMs: 300_000,
  backoffBaseMs: 2_000,
  backoffCapMs: 30_000,
};

let persistentJobCounter = 0;

function generateJobId(): string {
  persistentJobCounter += 1;
  return `pjob-${Date.now()}-${persistentJobCounter}`;
}

/** Convert a Job to a StorageProvider Document. */
function jobToDoc(job: Job): Document {
  return { ...job } as unknown as Document;
}

/** Convert a StorageProvider Document to a Job. */
function docToJob(doc: Document): Job {
  return doc as unknown as Job;
}

/**
 * PersistentQueue — StorageProvider-backed durable job queue.
 *
 * Jobs survive server restart. On recovery, any jobs that were
 * in 'running' status are re-queued for idempotent re-execution.
 */
export class PersistentQueue implements JobQueue {
  private _storage: StorageProvider;
  private _config: Required<PersistentQueueConfig>;
  private _timeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(storage: StorageProvider, config?: PersistentQueueConfig) {
    this._storage = storage;
    this._config = { ...DEFAULTS, ...config };
  }

  /** Current concurrency limit. */
  get concurrency(): number {
    return this._config.concurrency;
  }

  /**
   * Recover from a restart: re-queue any jobs that were running.
   * Call this once after starting the queue.
   */
  async recover(): Promise<number> {
    const runningDocs = await this._storage.list(COLLECTION, {
      where: { status: 'running' },
    });
    let recovered = 0;
    for (const doc of runningDocs) {
      const job = docToJob(doc);
      job.status = 'queued';
      job.startedAt = undefined;
      await this._storage.write(COLLECTION, job.id, jobToDoc(job));
      recovered += 1;
    }
    return recovered;
  }

  async enqueue(input: JobInput): Promise<Job> {
    const job: Job = {
      ...input,
      id: generateJobId(),
      status: 'queued',
      createdAt: new Date().toISOString(),
    };
    await this._storage.write(COLLECTION, job.id, jobToDoc(job));
    return { ...job };
  }

  async dequeue(types?: JobType[]): Promise<Job | null> {
    // Enforce concurrency limit
    const runningDocs = await this._storage.list(COLLECTION, {
      where: { status: 'running' },
    });
    if (runningDocs.length >= this._config.concurrency) return null;

    // Fetch all queued jobs
    const queuedDocs = await this._storage.list(COLLECTION, {
      where: { status: 'queued' },
    });

    let candidates = queuedDocs.map(docToJob);

    // Filter by types if provided
    if (types && types.length > 0) {
      candidates = candidates.filter((j) => types.includes(j.type));
    }

    if (candidates.length === 0) return null;

    // Sort by priority descending, then createdAt ascending (FIFO)
    candidates.sort((a, b) => b.priority - a.priority || a.createdAt.localeCompare(b.createdAt));

    const best = candidates[0];
    best.status = 'running';
    best.startedAt = new Date().toISOString();

    await this._storage.write(COLLECTION, best.id, jobToDoc(best));

    // Start timeout timer
    this._startTimeout(best.id);

    return { ...best };
  }

  async complete(id: string, result: unknown): Promise<void> {
    const doc = await this._storage.read(COLLECTION, id);
    if (!doc) throw new Error(`Job not found: ${id}`);
    const job = docToJob(doc);
    if (job.status !== 'running') throw new Error(`Cannot complete job in status: ${job.status}`);

    this._clearTimeout(id);
    job.status = 'completed';
    job.completedAt = new Date().toISOString();
    job.result = result;

    await this._storage.write(COLLECTION, id, jobToDoc(job));
  }

  async fail(id: string, error: JobError): Promise<void> {
    const doc = await this._storage.read(COLLECTION, id);
    if (!doc) throw new Error(`Job not found: ${id}`);
    const job = docToJob(doc);
    if (job.status !== 'running') throw new Error(`Cannot fail job in status: ${job.status}`);

    this._clearTimeout(id);

    // Retry logic: transient errors retry with backoff if retries remain
    if (error.severity === 'transient' && job.retryCount < job.maxRetries) {
      job.retryCount += 1;
      job.error = error;
      job.status = 'queued';
      job.startedAt = undefined;
      await this._storage.write(COLLECTION, id, jobToDoc(job));
      return;
    }

    // Exhausted retries → send to dead letter queue
    job.status = 'failed';
    job.completedAt = new Date().toISOString();
    job.error = error;

    await this._storage.write(COLLECTION, id, jobToDoc(job));

    if (job.retryCount >= job.maxRetries) {
      await this._storage.write(DLQ_COLLECTION, id, jobToDoc(job));
    }
  }

  async cancel(id: string): Promise<void> {
    const doc = await this._storage.read(COLLECTION, id);
    if (!doc) throw new Error(`Job not found: ${id}`);
    const job = docToJob(doc);
    if (job.status !== 'queued' && job.status !== 'running') {
      throw new Error(`Cannot cancel job in status: ${job.status}`);
    }

    this._clearTimeout(id);
    job.status = 'cancelled';
    job.completedAt = new Date().toISOString();

    await this._storage.write(COLLECTION, id, jobToDoc(job));
  }

  async status(id: string): Promise<Job | null> {
    const doc = await this._storage.read(COLLECTION, id);
    return doc ? { ...docToJob(doc) } : null;
  }

  async list(filter?: JobFilter): Promise<Job[]> {
    const where: Record<string, unknown> = {};
    if (filter?.status) where.status = filter.status;
    if (filter?.type) where.type = filter.type;

    const docs = await this._storage.list(COLLECTION, {
      where: Object.keys(where).length > 0 ? where : undefined,
      limit: filter?.limit,
      offset: filter?.offset,
    });

    const jobs = docs.map(docToJob);

    // Sort by priority descending, then createdAt ascending
    jobs.sort((a, b) => b.priority - a.priority || a.createdAt.localeCompare(b.createdAt));

    return jobs.map((j) => ({ ...j }));
  }

  async size(status?: JobStatus): Promise<number> {
    if (!status) {
      const all = await this._storage.list(COLLECTION);
      return all.length;
    }
    const docs = await this._storage.list(COLLECTION, { where: { status } });
    return docs.length;
  }

  /** List jobs in the dead letter queue. */
  async deadLetterQueue(): Promise<Job[]> {
    const docs = await this._storage.list(DLQ_COLLECTION);
    return docs.map(docToJob);
  }

  /** Destroy all timers — for clean shutdown. */
  destroy(): void {
    for (const timer of this._timeouts.values()) {
      clearTimeout(timer);
    }
    this._timeouts.clear();
  }

  // ── Internal helpers ──────────────────────────────────────

  private _startTimeout(id: string): void {
    const timer = setTimeout(() => {
      this.fail(id, { message: 'Job timed out', severity: 'transient' });
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
