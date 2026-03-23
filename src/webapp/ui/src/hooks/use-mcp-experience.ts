// Copyright (c) 2026 Robert Agterhuis. MIT License.
// M-INFRA-3c: MCP Experience Plane hooks

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

// ── Types ──────────────────────────────────────────────────────────

export type PermissionLevel = 'N' | 'D' | 'R' | 'P' | 'W' | 'A' | 'X';

export const PERMISSION_LEVEL_LABELS: Record<PermissionLevel, string> = {
  N: 'None',
  D: 'Discover',
  R: 'Read',
  P: 'Propose',
  W: 'Write',
  A: 'Admin',
  X: 'Execute',
};

export interface AgentEntry {
  id: string;
  category: string;
  controlPosture: string;
  requiresWorkloadIdentity: boolean;
  templateCategory: string;
}

export interface ServerEntry {
  id: string;
  endpoint: string;
  risk: 'low' | 'medium' | 'high';
  authType: string;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  tenantEnabled: boolean;
  consecutiveFailures: number;
}

export interface MatrixEntry {
  agentId: string;
  serverId: string;
  permissionLevel: PermissionLevel;
  envScope?: string;
}

export interface MatrixResponse {
  ok: boolean;
  agents: AgentEntry[];
  servers: ServerEntry[];
  matrix: MatrixEntry[];
}

export interface AgentPermission {
  server: ServerEntry;
  permissionLevel: PermissionLevel;
  envScope?: string;
  approvalRequired: boolean;
  blocked: boolean;
}

export interface AgentPermissionsResponse {
  ok: boolean;
  agent: AgentEntry;
  permissions: AgentPermission[];
}

export interface McpOverride {
  id: string;
  agentId: string;
  serverId: string;
  toolId?: string;
  permissionLevel: PermissionLevel;
  overrideReason: string;
  author: string;
  justification: string;
  expiry: string;
  createdAt: string;
  expiredAt?: string;
}

export interface OverridesResponse {
  ok: boolean;
  count: number;
  overrides: McpOverride[];
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

export interface DiagnosticsResponse {
  ok: boolean;
  unhealthyServers: ServerEntry[];
  authPendingCount: number;
  totalAgents: number;
  totalServers: number;
  recentReconcileRuns: ReconcileRun[];
}

export interface ReconcileRunsResponse {
  ok: boolean;
  count: number;
  runs: ReconcileRun[];
}

// ── Hooks ──────────────────────────────────────────────────────────

export function useMcpMatrix() {
  return useQuery({
    queryKey: queryKeys.mcp.matrix,
    queryFn: () => apiGet<MatrixResponse>('/v1/mcp/matrix'),
    refetchInterval: 30_000,
  });
}

export function useMcpAgentPermissions(agentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.mcp.agentPermissions(agentId ?? ''),
    queryFn: () =>
      apiGet<AgentPermissionsResponse>(
        `/v1/mcp/agents/${encodeURIComponent(agentId!)}/permissions`
      ),
    enabled: !!agentId,
    refetchInterval: 30_000,
  });
}

export function useMcpOverrides() {
  return useQuery({
    queryKey: queryKeys.mcp.overrides,
    queryFn: () => apiGet<OverridesResponse>('/v1/mcp/overrides'),
    refetchInterval: 15_000,
  });
}

export function useCreateMcpOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      agent_id: string;
      server_id: string;
      tool_id?: string;
      permission_level: PermissionLevel;
      override_reason: string;
      author?: string;
      justification?: string;
      expiry: string;
    }) => apiPost<{ ok: boolean; override: McpOverride }>('/v1/mcp/overrides', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.mcp.overrides }),
  });
}

export function useExpireMcpOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiDelete<{ ok: boolean; id: string; expired: boolean }>(
        `/v1/mcp/overrides/${encodeURIComponent(id)}`
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.mcp.overrides }),
  });
}

export function useMcpDiagnostics() {
  return useQuery({
    queryKey: queryKeys.mcp.diagnostics,
    queryFn: () => apiGet<DiagnosticsResponse>('/v1/mcp/diagnostics'),
    refetchInterval: 15_000,
  });
}

export function useMcpReconcileRuns() {
  return useQuery({
    queryKey: queryKeys.mcp.reconcileRuns,
    queryFn: () => apiGet<ReconcileRunsResponse>('/v1/mcp/reconcile-runs'),
    refetchInterval: 30_000,
  });
}
