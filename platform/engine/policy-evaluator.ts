/**
 * Policy Evaluator — Rule-based governance evaluation engine (M22-004).
 *
 * Loads policy packs, evaluates policies against a context, resolves
 * inheritance chains (global → org → team → repo → sprint), and
 * handles approved exceptions.
 *
 * @module engine/policy-evaluator
 */

import path from 'path';

// ─── Types ───────────────────────────────────────────────────

export type PolicyScope = 'global' | 'org' | 'team' | 'repo' | 'sprint';
export type PolicyCategory = 'security' | 'quality' | 'compliance' | 'process' | 'architecture';
export type PolicySeverity = 'blocking' | 'warning' | 'advisory';

export interface PolicyCondition {
  type: 'gate' | 'pr' | 'deploy' | 'artifact' | 'schedule';
  check: string;
  parameters?: Record<string, unknown>;
}

export interface PolicyAction {
  type: 'block' | 'warn' | 'notify' | 'log';
  message?: string;
  notify_roles?: string[];
}

export interface ExceptionRule {
  id: string;
  reason: string;
  approved_by: string;
  approved_at?: string;
  expires: string;
  scope_override?: string;
}

export interface PolicyMetadata {
  owner: string;
  created: string;
  updated?: string;
  expires?: string | null;
  evidence_required?: boolean;
  tags?: string[];
}

export interface Policy {
  id: string;
  name: string;
  description?: string;
  scope: PolicyScope;
  category: PolicyCategory;
  severity: PolicySeverity;
  condition: PolicyCondition;
  action: PolicyAction;
  exceptions: ExceptionRule[];
  metadata: PolicyMetadata;
}

export interface PolicyPack {
  pack_id?: string;
  pack_name?: string;
  version?: string;
  policies: Policy[];
}

export interface EvaluationContext {
  type: 'gate' | 'pr' | 'deploy' | 'artifact' | 'schedule';
  scope: PolicyScope;
  /** Map of check names to their boolean results (true = check passed). */
  checks: Record<string, boolean>;
  /** Additional context data for condition parameter matching. */
  data?: Record<string, unknown>;
}

export interface PolicyEvaluationResult {
  policy_id: string;
  policy_name: string;
  category: PolicyCategory;
  severity: PolicySeverity;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  message: string;
  exception_applied?: string;
}

export interface EvaluationReport {
  passed: PolicyEvaluationResult[];
  failed: PolicyEvaluationResult[];
  warnings: PolicyEvaluationResult[];
  skipped: PolicyEvaluationResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    skipped: number;
    blocking_failures: number;
    evaluated_at: string;
    context_type: string;
    context_scope: string;
  };
}

// ─── Store interface ─────────────────────────────────────────

interface PolicyStore {
  exists(path: string): boolean;
  readFile(path: string): string;
}

// ─── Scope hierarchy ─────────────────────────────────────────

/** Ordered from broadest to most specific. */
const SCOPE_HIERARCHY: PolicyScope[] = ['global', 'org', 'team', 'repo', 'sprint'];

/**
 * Returns true if `policyScope` applies to (is same or broader than) `contextScope`.
 */
function scopeApplies(policyScope: PolicyScope, contextScope: PolicyScope): boolean {
  const policyIdx = SCOPE_HIERARCHY.indexOf(policyScope);
  const contextIdx = SCOPE_HIERARCHY.indexOf(contextScope);
  return policyIdx <= contextIdx;
}

// ─── Exception handling ──────────────────────────────────────

/**
 * Check if a policy has a valid (non-expired) exception.
 */
function findValidException(policy: Policy, now: Date): ExceptionRule | null {
  for (const exc of policy.exceptions) {
    const expiry = new Date(exc.expires);
    if (expiry > now) {
      return exc;
    }
  }
  return null;
}

// ─── Policy loading ──────────────────────────────────────────

const DEFAULT_POLICIES_DIR = path.resolve(__dirname, '..', 'sdlc', 'policies');

/**
 * Load a policy pack from a JSON file.
 * Returns null if the file doesn't exist or is invalid.
 */
export function loadPolicyPack(store: PolicyStore, packPath: string): PolicyPack | null {
  if (!store.exists(packPath)) return null;

  try {
    const raw = store.readFile(packPath);
    const parsed = JSON.parse(raw);
    if (!parsed.policies || !Array.isArray(parsed.policies)) return null;
    return parsed as PolicyPack;
  } catch {
    return null;
  }
}

/**
 * Load all policy packs from the default directory or a custom path list.
 *
 * @param store - File store abstraction
 * @param packPaths - Override list of policy pack file paths
 */
export function loadAllPolicyPacks(store: PolicyStore, packPaths?: string[]): PolicyPack[] {
  const paths = packPaths || [
    path.join(DEFAULT_POLICIES_DIR, 'security-baseline.json'),
    path.join(DEFAULT_POLICIES_DIR, 'quality-baseline.json'),
  ];

  const packs: PolicyPack[] = [];
  for (const p of paths) {
    const pack = loadPolicyPack(store, p);
    if (pack) packs.push(pack);
  }
  return packs;
}

// ─── Inheritance resolution ──────────────────────────────────

/**
 * Resolve policy inheritance: when multiple policies share the same ID,
 * the most specific scope wins (sprint > repo > team > org > global).
 *
 * @param packs - All loaded policy packs
 * @returns Deduplicated array of policies, most-specific scope wins
 */
export function resolvePolicyInheritance(packs: PolicyPack[]): Policy[] {
  const policyMap = new Map<string, Policy>();

  // Flatten all policies
  const allPolicies: Policy[] = [];
  for (const pack of packs) {
    allPolicies.push(...pack.policies);
  }

  // Sort by scope breadth (global first, sprint last) so more-specific overwrites
  allPolicies.sort((a, b) => SCOPE_HIERARCHY.indexOf(a.scope) - SCOPE_HIERARCHY.indexOf(b.scope));

  for (const policy of allPolicies) {
    policyMap.set(policy.id, policy);
  }

  return Array.from(policyMap.values());
}

// ─── Core evaluation ─────────────────────────────────────────

/**
 * Evaluate a single policy against a context.
 */
function evaluatePolicy(
  policy: Policy,
  context: EvaluationContext,
  now: Date
): PolicyEvaluationResult {
  // Check if the policy's condition type matches the evaluation context
  if (policy.condition.type !== context.type) {
    return {
      policy_id: policy.id,
      policy_name: policy.name,
      category: policy.category,
      severity: policy.severity,
      status: 'skipped',
      message: `Policy condition type '${policy.condition.type}' does not match context '${context.type}'`,
    };
  }

  // Check if policy scope applies
  if (!scopeApplies(policy.scope, context.scope)) {
    return {
      policy_id: policy.id,
      policy_name: policy.name,
      category: policy.category,
      severity: policy.severity,
      status: 'skipped',
      message: `Policy scope '${policy.scope}' does not apply to context scope '${context.scope}'`,
    };
  }

  // Check for expired policy
  if (policy.metadata.expires) {
    const expiry = new Date(policy.metadata.expires);
    if (expiry <= now) {
      return {
        policy_id: policy.id,
        policy_name: policy.name,
        category: policy.category,
        severity: policy.severity,
        status: 'skipped',
        message: 'Policy has expired',
      };
    }
  }

  // Check for valid exception
  const exception = findValidException(policy, now);
  if (exception) {
    return {
      policy_id: policy.id,
      policy_name: policy.name,
      category: policy.category,
      severity: policy.severity,
      status: 'skipped',
      message: `Exception ${exception.id} applied: ${exception.reason}`,
      exception_applied: exception.id,
    };
  }

  // Evaluate the check
  const checkResult = context.checks[policy.condition.check];
  const passed = checkResult === true;

  if (passed) {
    return {
      policy_id: policy.id,
      policy_name: policy.name,
      category: policy.category,
      severity: policy.severity,
      status: 'passed',
      message: `Check '${policy.condition.check}' passed`,
    };
  }

  // Policy failed — determine status based on severity
  const status = policy.severity === 'blocking' ? 'failed' : 'warning';
  const message = policy.action.message || `Check '${policy.condition.check}' did not pass`;

  return {
    policy_id: policy.id,
    policy_name: policy.name,
    category: policy.category,
    severity: policy.severity,
    status,
    message,
  };
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Evaluate all applicable policies against a context.
 *
 * @param policies - Resolved list of policies (after inheritance)
 * @param context - Evaluation context with check results
 * @returns Full evaluation report
 */
export function evaluatePolicies(policies: Policy[], context: EvaluationContext): EvaluationReport {
  const now = new Date();

  const passed: PolicyEvaluationResult[] = [];
  const failed: PolicyEvaluationResult[] = [];
  const warnings: PolicyEvaluationResult[] = [];
  const skipped: PolicyEvaluationResult[] = [];

  for (const policy of policies) {
    const result = evaluatePolicy(policy, context, now);
    switch (result.status) {
      case 'passed':
        passed.push(result);
        break;
      case 'failed':
        failed.push(result);
        break;
      case 'warning':
        warnings.push(result);
        break;
      case 'skipped':
        skipped.push(result);
        break;
    }
  }

  return {
    passed,
    failed,
    warnings,
    skipped,
    summary: {
      total: policies.length,
      passed: passed.length,
      failed: failed.length,
      warnings: warnings.length,
      skipped: skipped.length,
      blocking_failures: failed.filter((f) => f.severity === 'blocking').length,
      evaluated_at: now.toISOString(),
      context_type: context.type,
      context_scope: context.scope,
    },
  };
}

/**
 * High-level: load packs, resolve inheritance, evaluate.
 *
 * @param store - File store
 * @param context - Evaluation context
 * @param packPaths - Optional override for policy pack file paths
 * @returns Evaluation report, or null if no packs loaded
 */
export function runPolicyEvaluation(
  store: PolicyStore,
  context: EvaluationContext,
  packPaths?: string[]
): EvaluationReport | null {
  const packs = loadAllPolicyPacks(store, packPaths);
  if (packs.length === 0) return null;

  const policies = resolvePolicyInheritance(packs);
  return evaluatePolicies(policies, context);
}

/**
 * Add an exception to a policy within a policy pack file.
 *
 * @param store - File store with writeFile
 * @param packPath - Path to the policy pack JSON
 * @param policyId - The policy to add the exception to
 * @param exception - The exception rule to add
 * @returns true if successful, false if policy not found
 */
export function addPolicyException(
  store: PolicyStore & { writeFile(path: string, data: string): void },
  packPath: string,
  policyId: string,
  exception: ExceptionRule
): boolean {
  const pack = loadPolicyPack(store, packPath);
  if (!pack) return false;

  const policy = pack.policies.find((p) => p.id === policyId);
  if (!policy) return false;

  policy.exceptions.push(exception);
  store.writeFile(packPath, JSON.stringify(pack, null, 2));
  return true;
}
