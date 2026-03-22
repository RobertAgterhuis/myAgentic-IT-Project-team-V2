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

export interface AgentServerPolicy {
  agentId: string;
  serverId: string;
  permission: PermissionLevel;
}

export interface EnvironmentPolicy {
  env: 'dev' | 'test' | 'prod';
  defaultPermission: PermissionLevel;
  writeRequiresApproval: boolean;
}

export interface RuntimeToolPermission {
  toolId: string;
  permissionLevel: PermissionLevel;
  approvalRequired: boolean;
  blocked: boolean;
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
