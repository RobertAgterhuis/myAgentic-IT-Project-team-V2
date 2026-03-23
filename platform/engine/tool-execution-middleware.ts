// Copyright (c) 2026 Robert Agterhuis. MIT License.

import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { ToolExecutionResult, ToolRequest } from './tool-executor.js';
import {
  evaluatePolicies,
  loadAllPolicyPacks,
  resolvePolicyInheritance,
  type Policy,
} from './policy-evaluator.js';

export type ToolExecutionRole = 'viewer' | 'operator' | 'admin';

export interface ToolExecutionPolicy {
  role?: ToolExecutionRole;
  profile?: string;
  agentId?: string;
  envScope?: 'dev' | 'test' | 'prod';
  traceId?: string;
  actor?: string;
  approvedActions?: unknown;
}

export interface LlmToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolExecutionAuditEvent {
  timestamp: string;
  traceId: string;
  toolCallId: string;
  toolId: string;
  role: ToolExecutionRole;
  profile: string;
  adapter?: string;
  operation?: string;
  paramsHash: string;
  resultHash?: string;
  success: boolean;
  errorCode?: string;
  error?: string;
  decisionRefs?: string[];
  fromCache?: boolean;
  durationMs?: number;
}

export interface ToolExecutionAuditSink {
  logToolExecution(event: ToolExecutionAuditEvent): void;
}

interface CanonicalTool {
  id: string;
  description?: string;
  capabilities?: { readOnly?: boolean };
  sideEffects?: string[];
  parameters?: Array<{ name?: string; type?: string; required?: boolean; description?: string }>;
}

interface ToolsCatalog {
  tools: CanonicalTool[];
}

interface ApprovalResolution {
  approved: boolean;
  decisionRefs: string[];
}

interface SideEffectPolicySpec {
  check: string;
  policyId: string;
}

interface RuntimeToolPermissionRecord {
  toolId: string;
  permissionLevel: 'N' | 'D' | 'R' | 'P' | 'W' | 'A' | 'X';
  approvalRequired: boolean;
  blocked: boolean;
}

interface RuntimeManifestRecord {
  agentId: string;
  generatedAt: string;
  servers: Array<{
    serverId: string;
    authStatus?: string;
    tools: RuntimeToolPermissionRecord[];
  }>;
}

const C3_POLICY_BY_TOOL: Record<string, SideEffectPolicySpec> = {
  'tool.files.write': {
    check: 'tool_files_write_policy_approved',
    policyId: 'POL-SEC-C3-001',
  },
  'tool.git.commit': {
    check: 'tool_git_commit_policy_approved',
    policyId: 'POL-SEC-C3-002',
  },
  'tool.github.issue': {
    check: 'tool_github_issue_policy_approved',
    policyId: 'POL-SEC-C3-003',
  },
};

const POLICY_STORE = {
  exists: existsSync,
  readFile: (filePath: string) => readFileSync(filePath, 'utf8'),
};

export class ToolAuthorizationError extends Error {
  readonly code = 'TOOL_UNAUTHORIZED';
  constructor(message: string) {
    super(message);
    this.name = 'ToolAuthorizationError';
  }
}

export class ToolValidationError extends Error {
  readonly code = 'TOOL_INVALID_REQUEST';
  constructor(message: string) {
    super(message);
    this.name = 'ToolValidationError';
  }
}

function hashValue(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(value) || '')
    .digest('hex');
}

function normalizeRole(role: unknown): ToolExecutionRole {
  if (role === 'admin' || role === 'operator' || role === 'viewer') {
    return role;
  }
  return 'viewer';
}

function roleLevel(role: ToolExecutionRole): number {
  if (role === 'admin') return 2;
  if (role === 'operator') return 1;
  return 0;
}

function normalizeProfile(profile: unknown): string {
  if (typeof profile !== 'string' || profile.trim() === '') {
    return 'local-dev';
  }
  return profile.trim();
}

function resolvePolicyApproval(toolId: string, approvedActions: unknown): ApprovalResolution {
  const decisionRefs = new Set<string>();

  if (!approvedActions) return { approved: false, decisionRefs: [] };

  const addDecisionRefs = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item.trim()) {
          decisionRefs.add(item.trim());
        }
      }
    } else if (typeof value === 'string' && value.trim()) {
      decisionRefs.add(value.trim());
    }
  };

  const matchToolId = (value: unknown): boolean => value === toolId || value === `tool:${toolId}`;

  let approved = false;

  if (Array.isArray(approvedActions)) {
    approved = approvedActions.some(matchToolId);
    return { approved, decisionRefs: [...decisionRefs] };
  }

  if (typeof approvedActions === 'object') {
    const record = approvedActions as Record<string, unknown>;

    if (record[toolId] === true || record[`tool:${toolId}`] === true) {
      approved = true;
    }

    const directRef = record[toolId];
    if (directRef && typeof directRef === 'object' && !Array.isArray(directRef)) {
      const directObj = directRef as Record<string, unknown>;
      if (directObj.approved === true) {
        approved = true;
      }
      addDecisionRefs(directObj.decisionRefs);
      addDecisionRefs(directObj.decisionIds);
      addDecisionRefs(directObj.decisionId);
    }

    const allow = record.allow;
    if (Array.isArray(allow)) {
      approved = approved || allow.some(matchToolId);
    }

    const approvedList = record.approved;
    if (Array.isArray(approvedList)) {
      approved = approved || approvedList.some(matchToolId);
    }

    const approvals = record.approvals;
    if (approvals && typeof approvals === 'object' && !Array.isArray(approvals)) {
      const perTool = approvals as Record<string, unknown>;
      if (perTool[toolId] === true || perTool[`tool:${toolId}`] === true) {
        approved = true;
      }
      const detail = perTool[toolId];
      if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
        const detailObj = detail as Record<string, unknown>;
        if (detailObj.approved === true) {
          approved = true;
        }
        addDecisionRefs(detailObj.decisionRefs);
        addDecisionRefs(detailObj.decisionIds);
        addDecisionRefs(detailObj.decisionId);
      }
    }

    const decisionRefsMap = record.decisionRefs;
    if (decisionRefsMap && typeof decisionRefsMap === 'object' && !Array.isArray(decisionRefsMap)) {
      const byTool = decisionRefsMap as Record<string, unknown>;
      addDecisionRefs(byTool[toolId]);
      addDecisionRefs(byTool[`tool:${toolId}`]);
    }

    addDecisionRefs(record.decisionRefs);
    addDecisionRefs(record.decisionIds);
    addDecisionRefs(record.decisionId);
  }

  return { approved, decisionRefs: [...decisionRefs] };
}

function resolveAnyPolicyApproval(toolIds: string[], approvedActions: unknown): ApprovalResolution {
  const refs = new Set<string>();
  let approved = false;
  for (const toolId of toolIds) {
    const resolution = resolvePolicyApproval(toolId, approvedActions);
    approved = approved || resolution.approved;
    for (const ref of resolution.decisionRefs) {
      refs.add(ref);
    }
  }
  return { approved, decisionRefs: [...refs] };
}

function requiresExplicitPolicyApproval(toolId: string): boolean {
  return (
    toolId === 'tool.files.write' || toolId === 'tool.git.commit' || toolId === 'tool.github.issue'
  );
}

function isProductionProfile(profile: string): boolean {
  return profile.startsWith('production-');
}

function deriveRequiredRole(tool: CanonicalTool, profile: string): ToolExecutionRole {
  const readOnly = !!tool.capabilities?.readOnly;
  if (readOnly) return 'viewer';

  // Production profiles require stricter privileges for mutating calls.
  if (isProductionProfile(profile)) {
    return 'admin';
  }

  return 'operator';
}

function deriveEnvScope(
  profile: string,
  requested?: ToolExecutionPolicy['envScope']
): 'dev' | 'test' | 'prod' {
  if (requested === 'dev' || requested === 'test' || requested === 'prod') {
    return requested;
  }
  if (profile.startsWith('production-')) return 'prod';
  if (profile.startsWith('test-')) return 'test';
  return 'dev';
}

function isMutationTool(tool: CanonicalTool): boolean {
  return !tool.capabilities?.readOnly;
}

function hasPermissionForOperation(
  level: RuntimeToolPermissionRecord['permissionLevel'],
  mutation: boolean
): boolean {
  if (level === 'N' || level === 'X') return false;
  if (!mutation)
    return level === 'D' || level === 'R' || level === 'P' || level === 'W' || level === 'A';
  return level === 'P' || level === 'W' || level === 'A';
}

function toToolDefinition(tool: CanonicalTool): {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
} {
  const props: Record<string, unknown> = {
    target: { type: 'string', description: 'Tool adapter name/category, e.g. git or GIT.' },
    operation: { type: 'string', description: 'Operation name supported by the target adapter.' },
    params: { type: 'object', description: 'Operation parameters to pass to the adapter.' },
    timeout: { type: 'number', description: 'Optional timeout override in milliseconds.' },
    skipCache: {
      type: 'boolean',
      description: 'Optional cache bypass for side-effect operations.',
    },
    sideEffect: {
      type: 'boolean',
      description: 'Optional side-effect override for cache semantics.',
    },
  };

  return {
    name: tool.id,
    description: tool.description || tool.id,
    parameters: {
      type: 'object',
      properties: props,
      required: ['target', 'operation'],
      additionalProperties: true,
    },
  };
}

function readToolsCatalog(catalogPath?: string): ToolsCatalog {
  const resolved = catalogPath || path.resolve(process.cwd(), 'platform', 'schema', 'tools.json');
  const raw = readFileSync(resolved, 'utf8');
  return JSON.parse(raw) as ToolsCatalog;
}

export class ToolExecutionMiddleware {
  private readonly _toolExecutor: {
    execute<T = unknown>(request: ToolRequest): Promise<ToolExecutionResult<T>>;
  };
  private readonly _audit?: ToolExecutionAuditSink;
  private readonly _catalog: ToolsCatalog;
  private readonly _byId: Map<string, CanonicalTool>;
  private readonly _policies: Policy[];
  private readonly _runtimeManifestDir: string;

  constructor(options: {
    toolExecutor: { execute<T = unknown>(request: ToolRequest): Promise<ToolExecutionResult<T>> };
    audit?: ToolExecutionAuditSink;
    catalogPath?: string;
    runtimeManifestDir?: string;
  }) {
    this._toolExecutor = options.toolExecutor;
    this._audit = options.audit;
    this._catalog = readToolsCatalog(options.catalogPath);
    this._byId = new Map((this._catalog.tools || []).map((tool) => [tool.id, tool]));
    this._policies = resolvePolicyInheritance(loadAllPolicyPacks(POLICY_STORE));
    this._runtimeManifestDir =
      options.runtimeManifestDir || path.resolve(process.cwd(), '.generated', 'runtime-manifests');
  }

  private _readRuntimeManifest(agentId: string): RuntimeManifestRecord | null {
    const filePath = path.join(this._runtimeManifestDir, `${agentId}.json`);
    if (!existsSync(filePath)) {
      return null;
    }
    try {
      return JSON.parse(readFileSync(filePath, 'utf8')) as RuntimeManifestRecord;
    } catch {
      return null;
    }
  }

  private _resolveRuntimePermission(
    agentId: string,
    serverId: string,
    operation: string
  ): RuntimeToolPermissionRecord | null {
    const manifest = this._readRuntimeManifest(agentId);
    if (!manifest) return null;
    const server = manifest.servers.find((entry) => entry.serverId === serverId);
    if (!server) return null;

    const toolId = `${serverId}.${operation}`;
    const specific = server.tools.find((tool) => tool.toolId === toolId);
    if (specific) return specific;

    const fallback = server.tools.find((tool) => tool.toolId === `${serverId}.default`);
    return fallback || null;
  }

  private _evaluateRuntimePermissionGate(options: {
    tool: CanonicalTool;
    toolId: string;
    target: string;
    operation: string;
    policy: ToolExecutionPolicy;
    profile: string;
  }): { allowed: boolean; message?: string; decisionRefs: string[] } {
    const envScope = deriveEnvScope(options.profile, options.policy.envScope);
    const agentId = options.policy.agentId;
    if (!agentId) {
      return { allowed: true, decisionRefs: [] };
    }

    const resolved = this._resolveRuntimePermission(agentId, options.target, options.operation);
    if (!resolved) {
      return { allowed: true, decisionRefs: [] };
    }

    if (resolved.blocked || resolved.permissionLevel === 'X' || resolved.permissionLevel === 'N') {
      return {
        allowed: false,
        message: `Tool '${options.toolId}' is blocked by resolved permissions for env_scope '${envScope}'.`,
        decisionRefs: [],
      };
    }

    const mutation = isMutationTool(options.tool);
    if (!hasPermissionForOperation(resolved.permissionLevel, mutation)) {
      return {
        allowed: false,
        message: `Tool '${options.toolId}' is not permitted by resolved permission level '${resolved.permissionLevel}' for env_scope '${envScope}'.`,
        decisionRefs: [],
      };
    }

    if (!resolved.approvalRequired) {
      return { allowed: true, decisionRefs: [] };
    }

    const approval = resolveAnyPolicyApproval(
      [options.toolId, `${options.target}.${options.operation}`],
      options.policy.approvedActions
    );
    if (!approval.approved) {
      return {
        allowed: false,
        message: `Tool '${options.toolId}' requires explicit policy approval for env_scope '${envScope}'.`,
        decisionRefs: approval.decisionRefs,
      };
    }

    return { allowed: true, decisionRefs: approval.decisionRefs };
  }

  private _evaluateWorkloadIdentityGate(
    agentId: string,
    serverId: string
  ): { allowed: boolean; message?: string; errorCode?: string } {
    const manifest = this._readRuntimeManifest(agentId);
    if (!manifest) return { allowed: true };

    const server = manifest.servers.find((s) => s.serverId === serverId);
    if (!server || !server.authStatus) return { allowed: true };

    const authStatus = server.authStatus;
    if (authStatus === 'consent_pending') {
      return {
        allowed: false,
        errorCode: 'CONSENT_PENDING',
        message: `Agent '${agentId}' cannot execute tools on server '${serverId}': consent not granted (CONSENT_PENDING).`,
      };
    }
    if (authStatus === 'identity_not_provisioned' || authStatus === 'not_configured') {
      // Both 'identity_not_provisioned' (SP created but not ready) and 'not_configured'
      // (no identity record at all) are treated as the same provisioning failure.
      return {
        allowed: false,
        errorCode: 'IDENTITY_NOT_PROVISIONED',
        message: `Agent '${agentId}' cannot execute tools on server '${serverId}': workload identity not provisioned (IDENTITY_NOT_PROVISIONED).`,
      };
    }
    if (authStatus === 'credential_policy_violation') {
      return {
        allowed: false,
        errorCode: 'CREDENTIAL_POLICY_VIOLATION',
        message: `Agent '${agentId}' cannot execute tools on server '${serverId}': credential policy violation (CREDENTIAL_POLICY_VIOLATION).`,
      };
    }
    return { allowed: true };
  }

  private _evaluateSideEffectPolicy(
    toolId: string,
    profile: string,
    approvedActions: unknown
  ): { allowed: boolean; message?: string; decisionRefs: string[] } {
    if (!requiresExplicitPolicyApproval(toolId)) {
      return { allowed: true, decisionRefs: [] };
    }

    const spec = C3_POLICY_BY_TOOL[toolId];
    const approval = resolvePolicyApproval(toolId, approvedActions);
    if (!spec) {
      return {
        allowed: approval.approved,
        message: approval.approved
          ? undefined
          : `Tool '${toolId}' requires explicit policy approval before side-effect execution.`,
        decisionRefs: approval.decisionRefs,
      };
    }

    const policyExists = this._policies.some((policy) => policy.id === spec.policyId);
    if (!policyExists) {
      return {
        allowed: approval.approved,
        message: approval.approved
          ? undefined
          : `Tool '${toolId}' requires explicit policy approval before side-effect execution.`,
        decisionRefs: approval.decisionRefs,
      };
    }

    const report = evaluatePolicies(this._policies, {
      type: 'gate',
      scope: profile.startsWith('production-') ? 'sprint' : 'repo',
      checks: {
        [spec.check]: approval.approved,
      },
    });
    const failedPolicy = report.failed.find((entry) => entry.policy_id === spec.policyId);
    if (failedPolicy) {
      return {
        allowed: false,
        message: failedPolicy.message,
        decisionRefs: approval.decisionRefs,
      };
    }

    return { allowed: true, decisionRefs: approval.decisionRefs };
  }

  listToolDefinitions(): Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }> {
    return (this._catalog.tools || []).map(toToolDefinition);
  }

  async execute(call: LlmToolCall, policy: ToolExecutionPolicy = {}): Promise<ToolExecutionResult> {
    const traceId = policy.traceId || randomUUID();
    const role = normalizeRole(policy.role);
    const profile = normalizeProfile(policy.profile);
    const toolId = call.name;
    const paramsHash = hashValue(call.arguments || {});

    const tool = this._byId.get(toolId);
    if (!tool) {
      const event: ToolExecutionAuditEvent = {
        timestamp: new Date().toISOString(),
        traceId,
        toolCallId: call.id,
        toolId,
        role,
        profile,
        paramsHash,
        success: false,
        errorCode: 'TOOL_NOT_FOUND',
        error: `Unknown canonical tool ID '${toolId}'.`,
      };
      this._audit?.logToolExecution(event);
      throw new ToolValidationError(event.error || 'Unknown tool');
    }

    const requiredRole = deriveRequiredRole(tool, profile);
    if (roleLevel(role) < roleLevel(requiredRole)) {
      const event: ToolExecutionAuditEvent = {
        timestamp: new Date().toISOString(),
        traceId,
        toolCallId: call.id,
        toolId,
        role,
        profile,
        paramsHash,
        success: false,
        errorCode: 'TOOL_UNAUTHORIZED',
        error: `Role '${role}' is not allowed to execute '${toolId}' in profile '${profile}'. Required role: '${requiredRole}'.`,
      };
      this._audit?.logToolExecution(event);
      throw new ToolAuthorizationError(event.error || 'Unauthorized tool operation');
    }

    const sideEffectPolicy = this._evaluateSideEffectPolicy(
      toolId,
      profile,
      policy.approvedActions
    );
    if (!sideEffectPolicy.allowed) {
      const event: ToolExecutionAuditEvent = {
        timestamp: new Date().toISOString(),
        traceId,
        toolCallId: call.id,
        toolId,
        role,
        profile,
        paramsHash,
        success: false,
        errorCode: 'TOOL_POLICY_BLOCKED',
        decisionRefs: sideEffectPolicy.decisionRefs,
        error: sideEffectPolicy.message,
      };
      this._audit?.logToolExecution(event);
      throw new ToolAuthorizationError(event.error || 'Policy gate blocked tool operation');
    }

    const target = call.arguments?.target;
    const operation = call.arguments?.operation;
    const params = (call.arguments?.params || {}) as Record<string, unknown>;

    if (typeof target !== 'string' || typeof operation !== 'string') {
      throw new ToolValidationError(
        `Tool call '${toolId}' must include string arguments 'target' and 'operation'.`
      );
    }

    if (policy.agentId) {
      const identityGate = this._evaluateWorkloadIdentityGate(policy.agentId, target);
      if (!identityGate.allowed) {
        const event: ToolExecutionAuditEvent = {
          timestamp: new Date().toISOString(),
          traceId,
          toolCallId: call.id,
          toolId,
          role,
          profile,
          paramsHash,
          success: false,
          errorCode: identityGate.errorCode || 'TOOL_UNAUTHORIZED',
          error: identityGate.message,
        };
        this._audit?.logToolExecution(event);
        throw new ToolAuthorizationError(
          event.error || 'Workload identity gate blocked tool operation'
        );
      }
    }

    const runtimePermissionGate = this._evaluateRuntimePermissionGate({
      tool,
      toolId,
      target,
      operation,
      policy,
      profile,
    });
    if (!runtimePermissionGate.allowed) {
      const event: ToolExecutionAuditEvent = {
        timestamp: new Date().toISOString(),
        traceId,
        toolCallId: call.id,
        toolId,
        role,
        profile,
        paramsHash,
        success: false,
        errorCode: 'TOOL_POLICY_BLOCKED',
        decisionRefs: runtimePermissionGate.decisionRefs,
        error: runtimePermissionGate.message,
      };
      this._audit?.logToolExecution(event);
      throw new ToolAuthorizationError(
        event.error || 'Resolved permission gate blocked tool operation'
      );
    }

    const request: ToolRequest = {
      target,
      operation,
      params,
      timeout:
        typeof call.arguments?.timeout === 'number'
          ? (call.arguments.timeout as number)
          : undefined,
      skipCache: call.arguments?.skipCache === true,
      sideEffect: call.arguments?.sideEffect === true ? true : undefined,
    };

    const result = await this._toolExecutor.execute(request);
    const auditEvent: ToolExecutionAuditEvent = {
      timestamp: new Date().toISOString(),
      traceId,
      toolCallId: call.id,
      toolId,
      role,
      profile,
      adapter: result.adapter,
      operation: result.operation,
      paramsHash,
      resultHash: hashValue({ success: result.success, data: result.data, error: result.error }),
      success: result.success,
      errorCode: result.success ? undefined : 'TOOL_EXECUTION_FAILED',
      error: result.error || undefined,
      decisionRefs: sideEffectPolicy.decisionRefs,
      fromCache: result.fromCache,
      durationMs: result.duration_ms,
    };
    this._audit?.logToolExecution(auditEvent);
    return result;
  }
}
