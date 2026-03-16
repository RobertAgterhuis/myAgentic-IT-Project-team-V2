// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * CI Provider Contract
 *
 * Formal interface for CI/CD pipeline operations: trigger builds,
 * query status, retrieve logs, cancel runs.
 *
 * @module sdlc/adapters/contracts/ci-provider
 */

// ─── Capability Flags ────────────────────────────────────────

export interface CICapabilities {
  supportsCancel: boolean;
  supportsLogs: boolean;
  supportsArtifacts: boolean;
  supportsMatrix: boolean;
}

// ─── Input / Output Types ────────────────────────────────────

export interface PipelineTriggerInput {
  workflow: string;
  ref?: string;
  inputs?: Record<string, string>;
}

export interface PipelineStatus {
  run_id: string;
  status: string;
  conclusion: string | null;
  url: string;
  created_at: string;
  updated_at: string;
}

export interface PipelineLogs {
  run_id: string;
  logs: string;
}

export interface WorkflowInfo {
  id: string | number;
  name: string;
  state: string;
  path: string;
}

// ─── Error Classification ────────────────────────────────────

export type CIErrorKind =
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMITED'
  | 'TRANSIENT'
  | 'INVALID_INPUT'
  | 'UNKNOWN';

export interface CIError {
  kind: CIErrorKind;
  message: string;
  detail?: string;
}

// ─── Provider Interface ──────────────────────────────────────

export interface CIProvider {
  readonly providerName: string;
  readonly capabilities: CICapabilities;

  triggerPipeline(input: PipelineTriggerInput): Promise<PipelineStatus>;
  getStatus(runId: string): Promise<PipelineStatus>;
  getLogs(runId: string): Promise<PipelineLogs>;
  cancel(runId: string): Promise<{ cancelled: boolean }>;
  listWorkflows(): Promise<WorkflowInfo[]>;
}
