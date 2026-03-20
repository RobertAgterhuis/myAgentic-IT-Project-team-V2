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

  constructor(options: {
    toolExecutor: { execute<T = unknown>(request: ToolRequest): Promise<ToolExecutionResult<T>> };
    audit?: ToolExecutionAuditSink;
    catalogPath?: string;
  }) {
    this._toolExecutor = options.toolExecutor;
    this._audit = options.audit;
    this._catalog = readToolsCatalog(options.catalogPath);
    this._byId = new Map((this._catalog.tools || []).map((tool) => [tool.id, tool]));
    this._policies = resolvePolicyInheritance(loadAllPolicyPacks(POLICY_STORE));
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
