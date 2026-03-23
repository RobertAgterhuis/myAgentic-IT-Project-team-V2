// Copyright (c) 2026 Robert Agterhuis. MIT License.

import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import type { ApprovalMode, PermissionLevel } from './plugins/mcp-governance/types';
import type { GovernanceService } from './services';

interface RuntimeToolPermission {
  toolId: string;
  permissionLevel: PermissionLevel;
  approvalRequired: boolean;
  approvalMode?: ApprovalMode;
  blocked: boolean;
  degraded?: boolean;
  authStatus?: 'ready' | 'auth_pending';
}

interface RuntimeServerRecord {
  serverId: string;
  tools: RuntimeToolPermission[];
}

interface RuntimeManifestRecord {
  agentId: string;
  generatedAt: string;
  servers: RuntimeServerRecord[];
}

export interface ToolExecutionGuardInput {
  toolName: string;
  envScope: 'dev' | 'test' | 'prod';
  expectedEnvScope: 'dev' | 'test' | 'prod';
  params: Record<string, unknown>;
}

export interface ToolExecutionGuardResponse {
  blocked: boolean;
  reasonCode:
    | 'AGENT_IDENTITY_MISSING'
    | 'TOOL_NOT_VISIBLE'
    | 'TOOL_BLOCKED'
    | 'PERMISSION_INSUFFICIENT'
    | 'ENV_SCOPE_NOT_ALLOWED'
    | 'SERVER_DEGRADED'
    | 'SERVER_AUTH_PENDING'
    | 'APPROVAL_PENDING'
    | 'APPROVAL_REJECTED_OR_EXPIRED';
  reason: string;
  requiredApprovalMode: ApprovalMode;
  remediation: string;
  pending?: boolean;
  approvalId?: string;
}

function isWriteLikeTool(toolName: string): boolean {
  return /^(create_|save_|approve_|reject_|queue_|cancel_|add_)/.test(toolName);
}

function hasReadPermission(level: PermissionLevel): boolean {
  return level === 'D' || level === 'R' || level === 'P' || level === 'W' || level === 'A';
}

function hasWritePermission(level: PermissionLevel): boolean {
  return level === 'P' || level === 'W' || level === 'A';
}

export class ToolExecutionGuard {
  private readonly _manifestDir: string;
  private readonly _governanceSvc: GovernanceService;
  private readonly _defaultAgentId: string;
  private readonly _defaultServerId: string;

  constructor(options: {
    projectRoot: string;
    governanceService: GovernanceService;
    manifestDir?: string;
    defaultAgentId?: string;
    defaultServerId?: string;
  }) {
    this._manifestDir =
      options.manifestDir || path.join(options.projectRoot, '.generated', 'runtime-manifests');
    this._governanceSvc = options.governanceService;
    this._defaultAgentId = options.defaultAgentId || process.env.AGENT_ID || 'orchestrator';
    this._defaultServerId = options.defaultServerId || 'command-center';
  }

  async evaluate(input: ToolExecutionGuardInput): Promise<ToolExecutionGuardResponse | null> {
    const agentId = this._resolveAgentId(input.params);
    if (!agentId) {
      return {
        blocked: true,
        reasonCode: 'AGENT_IDENTITY_MISSING',
        reason: 'Missing agent identity for guarded tool execution.',
        requiredApprovalMode: 'none',
        remediation: "Provide 'agent_id' or set AGENT_ID in the process environment.",
      };
    }

    const manifest = this._readManifest(agentId);
    if (!manifest) {
      // Fail open when runtime manifests are not available to avoid regressing existing flows.
      return null;
    }

    const managedServer = (manifest.servers || []).find(
      (server) => server.serverId === this._defaultServerId
    );
    if (!managedServer) {
      // The manifest exists but does not manage this MCP server yet.
      return null;
    }

    const permission = this._resolveToolPermission(managedServer, input.toolName);
    if (!permission) {
      return {
        blocked: true,
        reasonCode: 'TOOL_NOT_VISIBLE',
        reason: `Tool '${input.toolName}' is not visible for agent '${agentId}'.`,
        requiredApprovalMode: 'none',
        remediation: 'Rebuild runtime manifests and review agent tool policy visibility.',
      };
    }

    if (
      permission.blocked ||
      permission.permissionLevel === 'X' ||
      permission.permissionLevel === 'N'
    ) {
      return {
        blocked: true,
        reasonCode: 'TOOL_BLOCKED',
        reason: `Tool '${input.toolName}' is explicitly blocked by runtime policy.`,
        requiredApprovalMode: permission.approvalMode || 'none',
        remediation: 'Adjust tool override policy or request a scoped exception.',
      };
    }

    if (permission.degraded === true) {
      return {
        blocked: true,
        reasonCode: 'SERVER_DEGRADED',
        reason: `Tool '${input.toolName}' is blocked because the backing server is degraded.`,
        requiredApprovalMode: permission.approvalMode || 'none',
        remediation: 'Restore server health and rerun runtime manifest generation.',
      };
    }

    if (permission.authStatus === 'auth_pending') {
      return {
        blocked: true,
        reasonCode: 'SERVER_AUTH_PENDING',
        reason: `Tool '${input.toolName}' is blocked because authentication is pending.`,
        requiredApprovalMode: permission.approvalMode || 'none',
        remediation: 'Complete consent/auth setup for the backing server, then retry.',
      };
    }

    const writeLike = isWriteLikeTool(input.toolName);
    const permitted = writeLike
      ? hasWritePermission(permission.permissionLevel)
      : hasReadPermission(permission.permissionLevel);

    if (!permitted) {
      return {
        blocked: true,
        reasonCode: 'PERMISSION_INSUFFICIENT',
        reason: `Permission level '${permission.permissionLevel}' is insufficient for tool '${input.toolName}'.`,
        requiredApprovalMode: permission.approvalMode || 'none',
        remediation: 'Request higher permission level or execute via an authorized agent.',
      };
    }

    if (writeLike && input.expectedEnvScope === 'prod' && input.envScope !== 'prod') {
      return {
        blocked: true,
        reasonCode: 'ENV_SCOPE_NOT_ALLOWED',
        reason: `Tool '${input.toolName}' must run with env_scope 'prod' in this deployment context.`,
        requiredApprovalMode: permission.approvalMode || 'none',
        remediation: "Use env_scope 'prod' for production execution.",
      };
    }

    const requiredApprovalMode = permission.approvalMode || 'none';
    const approvalRequired = permission.approvalRequired || requiredApprovalMode !== 'none';
    if (!approvalRequired) {
      return null;
    }

    const approvalEntity = `mcp:${agentId}:${input.envScope}:${input.toolName}`;
    const current = this._governanceSvc.getToolExecutionApprovalStatus(approvalEntity);
    if (current.approved) {
      return null;
    }

    if (current.pending && current.approvalId) {
      return {
        blocked: true,
        pending: true,
        approvalId: current.approvalId,
        reasonCode: 'APPROVAL_PENDING',
        reason: `Tool '${input.toolName}' is waiting for governance approval.`,
        requiredApprovalMode,
        remediation: `Approve request '${current.approvalId}' via approve_request and retry the call.`,
      };
    }

    if (current.status === 'REJECTED' || current.status === 'EXPIRED') {
      return {
        blocked: true,
        reasonCode: 'APPROVAL_REJECTED_OR_EXPIRED',
        reason: `Previous approval for '${input.toolName}' was ${current.status?.toLowerCase()}.`,
        requiredApprovalMode,
        remediation: 'Submit a new request with updated justification.',
      };
    }

    const requested = this._governanceSvc.requestToolExecutionApproval({
      entityId: approvalEntity,
      requestedBy: agentId,
    });

    return {
      blocked: true,
      pending: true,
      approvalId: requested.approvalId,
      reasonCode: 'APPROVAL_PENDING',
      reason: `Tool '${input.toolName}' requires governance approval before execution.`,
      requiredApprovalMode,
      remediation: `Approval '${requested.approvalId}' created. Approve it and retry the call.`,
    };
  }

  private _resolveAgentId(params: Record<string, unknown>): string {
    const raw = params.agent_id;
    if (typeof raw === 'string' && raw.trim() !== '') {
      return raw.trim();
    }
    return this._defaultAgentId;
  }

  private _readManifest(agentId: string): RuntimeManifestRecord | null {
    const filePath = path.join(this._manifestDir, `${agentId}.json`);
    if (!existsSync(filePath)) {
      return null;
    }

    try {
      return JSON.parse(readFileSync(filePath, 'utf8')) as RuntimeManifestRecord;
    } catch {
      return null;
    }
  }

  private _resolveToolPermission(
    server: RuntimeServerRecord,
    toolName: string
  ): RuntimeToolPermission | null {
    const scopedToolId = `${this._defaultServerId}.${toolName}`;
    const exact = server.tools.find(
      (tool) => tool.toolId === scopedToolId || tool.toolId === toolName
    );
    if (exact) {
      return exact;
    }

    const fallback = server.tools.find(
      (tool) => tool.toolId === `${this._defaultServerId}.default`
    );
    return fallback || null;
  }
}
