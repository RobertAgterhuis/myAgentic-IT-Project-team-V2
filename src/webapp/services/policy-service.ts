// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Policy service — business logic for policy-as-code governance (M22-006).
 *
 * Consumed by: HTTP route (routes/policies.ts) and MCP tools (mcp-server.ts).
 * Dependencies are injected via ServiceContext.
 */

import path from 'path';
import type { ServiceContext } from './types';
import {
  loadAllPolicyPacks,
  resolvePolicyInheritance,
  evaluatePolicies,
  addPolicyException,
  type EvaluationContext,
  type EvaluationReport,
  type ExceptionRule,
} from '../../../platform/engine/policy-evaluator';

export interface PolicyListItem {
  id: string;
  name: string;
  scope: string;
  category: string;
  severity: string;
  condition_type: string;
  condition_check: string;
  exception_count: number;
  pack_id?: string;
}

export interface PolicyListResult {
  policies: PolicyListItem[];
  count: number;
}

export interface PolicyEvaluationResult {
  evaluation: EvaluationReport;
}

export interface ExceptionCreateInput {
  policy_id: string;
  reason: string;
  approved_by: string;
  expires: string;
  scope_override?: string;
}

export interface ExceptionCreateResult {
  ok: boolean;
  exception: ExceptionRule;
  policy_id: string;
}

export class PolicyService {
  private ctx: ServiceContext;
  private policiesDir: string;

  constructor(ctx: ServiceContext) {
    this.ctx = ctx;
    this.policiesDir = path.resolve(ctx.projectRoot, 'platform', 'sdlc', 'policies');
  }

  private getPackPaths(): string[] {
    return [
      path.join(this.policiesDir, 'security-baseline.json'),
      path.join(this.policiesDir, 'quality-baseline.json'),
    ];
  }

  /** List all active policies across all packs. */
  listPolicies(): PolicyListResult {
    const packs = loadAllPolicyPacks(this.ctx.store, this.getPackPaths());
    const policies: PolicyListItem[] = [];

    for (const pack of packs) {
      for (const p of pack.policies) {
        policies.push({
          id: p.id,
          name: p.name,
          scope: p.scope,
          category: p.category,
          severity: p.severity,
          condition_type: p.condition.type,
          condition_check: p.condition.check,
          exception_count: p.exceptions.length,
          pack_id: pack.pack_id,
        });
      }
    }

    return { policies, count: policies.length };
  }

  /** Evaluate all policies against a given context. */
  evaluatePolicies(context: EvaluationContext): PolicyEvaluationResult {
    const packs = loadAllPolicyPacks(this.ctx.store, this.getPackPaths());
    const policies = resolvePolicyInheritance(packs);
    const evaluation = evaluatePolicies(policies, context);

    this.ctx.audit.log({
      operation: 'policy_evaluation',
      entityType: 'policy',
      user: 'system',
      summary: `Evaluated ${evaluation.summary.total} policies: ${evaluation.summary.passed} passed, ${evaluation.summary.failed} failed, ${evaluation.summary.warnings} warnings`,
    });

    return { evaluation };
  }

  /** Create a policy exception (triggers approval workflow). */
  createException(input: ExceptionCreateInput): ExceptionCreateResult {
    if (!input.policy_id) throw new PolicyValidationError('policy_id is required');
    if (!input.reason) throw new PolicyValidationError('reason is required');
    if (!input.approved_by) throw new PolicyValidationError('approved_by is required');
    if (!input.expires) throw new PolicyValidationError('expires is required');

    const expiresDate = new Date(input.expires);
    if (isNaN(expiresDate.getTime()))
      throw new PolicyValidationError('expires must be a valid date');
    if (expiresDate <= new Date()) throw new PolicyValidationError('expires must be in the future');

    const exception: ExceptionRule = {
      id: `EXC-${Date.now()}`,
      reason: input.reason,
      approved_by: input.approved_by,
      approved_at: new Date().toISOString(),
      expires: expiresDate.toISOString(),
      scope_override: input.scope_override,
    };

    // Find which pack contains the policy
    let applied = false;
    for (const packPath of this.getPackPaths()) {
      const result = addPolicyException(
        this.ctx.store as unknown as {
          exists: (p: string) => boolean;
          readFile: (p: string) => string;
          writeFile: (p: string, d: string) => void;
        },
        packPath,
        input.policy_id,
        exception
      );
      if (result) {
        applied = true;
        break;
      }
    }

    if (!applied) throw new PolicyNotFoundError(`Policy ${input.policy_id} not found in any pack`);

    this.ctx.audit.log({
      operation: 'policy_exception_created',
      entityType: 'policy_exception',
      entityId: exception.id,
      user: input.approved_by,
      summary: `Exception ${exception.id} created for policy ${input.policy_id}: ${input.reason}`,
    });

    return { ok: true, exception, policy_id: input.policy_id };
  }
}

export class PolicyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PolicyValidationError';
  }
}

export class PolicyNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PolicyNotFoundError';
  }
}
