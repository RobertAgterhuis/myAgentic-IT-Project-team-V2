// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Cloud Provider Contract
 *
 * Formal interface for cloud deployment operations: deploy artifacts,
 * query status, retrieve logs, and rollback deployments.
 *
 * @module sdlc/adapters/contracts/cloud-provider
 */

// ─── Capability Flags ────────────────────────────────────────

export interface CloudCapabilities {
  supportsRollback: boolean;
  supportsLogs: boolean;
  supportsSlots: boolean;
  supportsScaling: boolean;
}

// ─── Input / Output Types ────────────────────────────────────

export interface DeployInput {
  environment: string;
  artifact: string;
  appName?: string;
}

export interface DeployResult {
  environment: string;
  status: string;
  url?: string;
  deployed_at: string;
}

export interface DeploymentStatus {
  environment: string;
  status: string;
  appName: string;
  url?: string;
}

export interface EnvironmentInfo {
  name: string;
  status: string;
  region?: string;
}

export interface RollbackResult {
  environment: string;
  rolledBack: boolean;
  version?: string;
}

// ─── Error Classification ────────────────────────────────────

export type CloudErrorKind =
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'QUOTA_EXCEEDED'
  | 'TRANSIENT'
  | 'INVALID_INPUT'
  | 'UNKNOWN';

export interface CloudError {
  kind: CloudErrorKind;
  message: string;
  detail?: string;
}

// ─── Provider Interface ──────────────────────────────────────

export interface CloudProvider {
  readonly providerName: string;
  readonly capabilities: CloudCapabilities;

  deploy(input: DeployInput): Promise<DeployResult>;
  getStatus(environment: string, appName?: string): Promise<DeploymentStatus>;
  listEnvironments(): Promise<EnvironmentInfo[]>;
  rollback(environment: string, version?: string): Promise<RollbackResult>;
  getLogs(environment: string, appName?: string): Promise<{ logs: string }>;
}
