// Copyright (c) 2026 Robert Agterhuis. MIT License.

export type AgentCategory =
  | 'orchestration'
  | 'product'
  | 'architecture'
  | 'engineering'
  | 'quality'
  | 'operations'
  | 'security'
  | 'data'
  | 'documentation'
  | 'reliability';

export type ControlPosture = 'strict' | 'balanced' | 'permissive';

export type TemplateCategory = 'phase' | 'governance' | 'runtime' | 'cross-functional';

export interface AgentType {
  id: string;
  category: AgentCategory;
  controlPosture: ControlPosture;
  requiresWorkloadIdentity: boolean;
  appRegistrationRef: string | null;
  templateCategory: TemplateCategory;
}

export type McpServerRisk = 'low' | 'medium' | 'high';

export type McpServerAuthType = 'entra' | 'oauth' | 'apikey' | 'none';

export type McpServerHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface McpServerRegistry {
  id: string;
  endpoint: string;
  risk: McpServerRisk;
  authType: McpServerAuthType;
  healthStatus: McpServerHealthStatus;
  tenantEnabled: boolean;
  workspaceEnabled: Record<string, boolean>;
  lastHealthCheck: string | null;
  consecutiveFailures: number;
}

export type PermissionLevel = 'N' | 'D' | 'R' | 'P' | 'W' | 'A' | 'X';

export type ApprovalMode = 'none' | 'approval_required' | 'two_step';

export type EnvironmentScope = 'dev' | 'test' | 'prod';

export interface AgentServerPolicy {
  agentId: string;
  serverId: string;
  permission: PermissionLevel;
  envScope?: EnvironmentScope | null;
}

export interface EnvironmentPolicy {
  env: EnvironmentScope;
  defaultPermission: PermissionLevel;
  writeRequiresApproval: boolean;
}

export type ToolOverrideMode = 'inherit' | 'set' | 'deny';

export interface AgentToolPolicy {
  agentId: string;
  serverId: string;
  toolId: string;
  overrideMode: ToolOverrideMode;
  permission?: PermissionLevel;
  approvalRequired?: boolean;
  blocked?: boolean;
  envScope?: EnvironmentScope | null;
}

export interface ResolvedServerPermission {
  agentId: string;
  serverId: string;
  environment: EnvironmentScope;
  permissionLevel: PermissionLevel;
  approvalRequired: boolean;
  requiredApprovalMode: ApprovalMode;
  blocked: boolean;
  source: 'server-policy' | 'environment-default' | 'implicit-deny';
}

export interface ResolvedToolPermission {
  agentId: string;
  serverId: string;
  toolId: string;
  environment: EnvironmentScope;
  permissionLevel: PermissionLevel;
  approvalRequired: boolean;
  requiredApprovalMode: ApprovalMode;
  blocked: boolean;
  source: 'server-policy' | 'environment-default' | 'tool-override' | 'implicit-deny';
}

export interface RuntimeToolPermission {
  toolId: string;
  permissionLevel: PermissionLevel;
  approvalRequired: boolean;
  approvalMode: ApprovalMode;
  blocked: boolean;
  degraded: boolean;
  authStatus:
    | 'ready'
    | 'auth_pending'
    | 'consent_pending'
    | 'identity_not_provisioned'
    | 'credential_policy_violation';
}

export interface RuntimeManifest {
  agentId: string;
  generatedAt: string;
  servers: Array<{
    serverId: string;
    endpoint: string;
    healthStatus: McpServerHealthStatus;
    authType: McpServerAuthType;
    tools: RuntimeToolPermission[];
  }>;
}

export interface McpSyncResult {
  added: number;
  updated: number;
  unchanged: number;
}

// ── M-INFRA-3c: Experience Plane & Reconcile Loop ─────────────────

export interface McpOverride {
  id: string;
  agentId: string;
  serverId: string;
  toolId?: string;
  permissionLevel: PermissionLevel;
  overrideReason: string;
  author: string;
  justification: string;
  expiry: string; // ISO-8601
  createdAt: string;
  expiredAt?: string;
}

export interface ReconcileRun {
  id: string;
  ranAt: string;
  ranBy: string;
  durationMs: number;
  changesApplied: { added: number; updated: number; removed: number };
  status: 'success' | 'failed' | 'dry_run';
  error?: string;
}

export interface DoctorCheckResult {
  name: string;
  ok: boolean;
  message: string;
}

export interface DoctorReport {
  checks: DoctorCheckResult[];
  healthy: boolean;
  summary: string;
}

export interface PermissionMatrixEntry {
  agentId: string;
  serverId: string;
  permissionLevel: PermissionLevel;
  envScope?: string;
}

export interface PermissionMatrix {
  agents: AgentType[];
  servers: McpServerRegistry[];
  matrix: PermissionMatrixEntry[];
}

export interface AgentPermissionView {
  agent: AgentType;
  permissions: Array<{
    server: McpServerRegistry;
    permissionLevel: PermissionLevel;
    envScope?: string;
    approvalRequired: boolean;
    blocked: boolean;
  }>;
}

export interface McpDiagnosticsReport {
  unhealthyServers: McpServerRegistry[];
  authPendingCount: number;
  totalAgents: number;
  totalServers: number;
  recentReconcileRuns: ReconcileRun[];
}
