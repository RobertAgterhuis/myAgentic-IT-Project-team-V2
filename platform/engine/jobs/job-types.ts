// Copyright (c) 2026 Robert Agterhuis. MIT License.

/* ── Job Execution Types (M24-001) ────────────────────────────── *
 * Core type definitions for the background job execution model.   *
 * Covers all current engine operations as job types with support  *
 * for priority, retry, cancellation, and error classification.    *
 * ─────────────────────────────────────────────────────────────── */

/** All operation types that can be enqueued as background jobs. */
export type JobType =
  | 'agent-invocation'
  | 'gate-validation'
  | 'artifact-registration'
  | 'sprint-gate'
  | 'policy-evaluation';

/** Lifecycle status of a job. */
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

/** Error severity — aligns with dispatcher's ErrorSeverity classification. */
export type JobErrorSeverity = 'transient' | 'recoverable' | 'fatal';

/** Structured error attached to a failed job. */
export interface JobError {
  message: string;
  severity: JobErrorSeverity;
}

/** A single unit of work in the job queue. */
export interface Job {
  id: string;
  type: JobType;
  payload: Record<string, unknown>;
  status: JobStatus;
  priority: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: unknown;
  error?: JobError;
  retryCount: number;
  maxRetries: number;
}

/** Fields for filtering job listings. */
export interface JobFilter {
  status?: JobStatus;
  type?: JobType;
  limit?: number;
  offset?: number;
}

/** Input for enqueue — id, status, and createdAt are auto-assigned. */
export type JobInput = Omit<Job, 'id' | 'status' | 'createdAt'>;

/**
 * JobQueue — the pluggable queue interface.
 *
 * Implementations: MemoryQueue (in-process), PersistentQueue (StorageProvider-backed).
 * All methods are async to support both local and persistent modes.
 */
export interface JobQueue {
  /** Add a job to the queue. Returns the created job with generated id/status/timestamp. */
  enqueue(input: JobInput): Promise<Job>;

  /** Remove the next highest-priority job from the queue. Optionally filter by type. */
  dequeue(types?: JobType[]): Promise<Job | null>;

  /** Mark a job as completed with a result. */
  complete(id: string, result: unknown): Promise<void>;

  /** Mark a job as failed with a structured error. */
  fail(id: string, error: JobError): Promise<void>;

  /** Cancel a queued or running job. */
  cancel(id: string): Promise<void>;

  /** Get the current status of a job by id. Returns null if not found. */
  status(id: string): Promise<Job | null>;

  /** List jobs with optional filtering. */
  list(filter?: JobFilter): Promise<Job[]>;

  /** Return the number of jobs in a given status (or total if no status specified). */
  size(status?: JobStatus): Promise<number>;
}
