// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Policy service — business logic for policy-as-code governance (M22-006).
 *
 * Consumed by: HTTP route (routes/policies.ts) and MCP tools (mcp-server.ts).
 * Dependencies are injected via ServiceContext.
 */

import fs from 'fs';
import path from 'path';
import type { ServiceContext } from './types';
import {
  listPolicyPackPaths,
  loadAllPolicyPacks,
  resolvePolicyInheritance,
  evaluatePolicies,
  addPolicyException,
  updatePolicyInPack,
  type EvaluationContext,
  type EvaluationReport,
  type ExceptionRule,
  type Policy,
  type PolicyUpdateInput as EnginePolicyUpdateInput,
} from '../../../platform/engine/policy-evaluator';

export interface PolicyListItem {
  id: string;
  name: string;
  description?: string;
  scope: string;
  category: string;
  severity: string;
  condition_type: string;
  condition_check: string;
  action_message?: string;
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

export interface PolicyUpdateInput extends EnginePolicyUpdateInput {
  policy_id: string;
}

export interface PolicyUpdateResult {
  ok: boolean;
  policy: PolicyListItem;
}

export interface PolicyPackSummary {
  pack_id: string;
  pack_name: string;
  version?: string;
  policy_count: number;
  categories: string[];
  severities: string[];
}

export interface PolicyPacksResult {
  packs: PolicyPackSummary[];
  count: number;
}

export interface PolicySignal {
  check: string;
  passed: boolean;
  source: string;
  details?: string;
  measured_at?: string | null;
}

export interface PolicySignalsResult {
  checks: Record<string, boolean>;
  signals: PolicySignal[];
  missing: string[];
  generated_at: string;
}

export class PolicyService {
  private ctx: ServiceContext;
  private policiesDir: string;

  constructor(ctx: ServiceContext) {
    this.ctx = ctx;
    this.policiesDir = path.resolve(ctx.projectRoot, 'platform', 'sdlc', 'policies');
  }

  private safeReadJson(filePath: string): unknown | null {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
    } catch {
      return null;
    }
  }

  private safeStatTimestamp(filePath: string): string | null {
    try {
      return fs.statSync(filePath).mtime.toISOString();
    } catch {
      return null;
    }
  }

  private getPackPaths(): string[] {
    const discovered = listPolicyPackPaths(this.policiesDir);
    if (discovered.length > 0) return discovered;

    if (!fs.existsSync(this.policiesDir)) return [];

    return fs
      .readdirSync(this.policiesDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
      .map((entry) => path.join(this.policiesDir, entry.name))
      .sort((left, right) => left.localeCompare(right));
  }

  private collectPackSummaries(): PolicyPackSummary[] {
    const packs = loadAllPolicyPacks(this.ctx.store, this.getPackPaths());
    return packs.map((pack) => {
      const categories = Array.from(new Set(pack.policies.map((p) => p.category))).sort();
      const severities = Array.from(new Set(pack.policies.map((p) => p.severity))).sort();
      return {
        pack_id: pack.pack_id || 'unknown-pack',
        pack_name: pack.pack_name || pack.pack_id || 'Unnamed pack',
        version: pack.version,
        policy_count: pack.policies.length,
        categories,
        severities,
      };
    });
  }

  private resolveCoverageSignal(): PolicySignal | null {
    const coveragePath = path.join(this.ctx.projectRoot, 'coverage', 'coverage-summary.json');
    const raw = this.safeReadJson(coveragePath) as {
      total?: { statements?: { pct?: number } };
    } | null;
    const pct = raw?.total?.statements?.pct;
    if (typeof pct !== 'number') return null;
    const threshold = 60;
    return {
      check: 'coverage_threshold',
      passed: pct >= threshold,
      source: 'coverage-summary.json',
      details: `Statements coverage ${pct}% (threshold ${threshold}%)`,
      measured_at: this.safeStatTimestamp(coveragePath),
    };
  }

  private resolveTestRunSignal(): PolicySignal[] {
    const lastRunPath = path.join(this.ctx.projectRoot, 'test-results', '.last-run.json');
    const raw = this.safeReadJson(lastRunPath) as {
      status?: string;
      failedTests?: unknown[];
    } | null;
    if (!raw || !raw.status) return [];
    const failedCount = Array.isArray(raw.failedTests) ? raw.failedTests.length : 0;
    const passed = String(raw.status).toLowerCase() === 'passed';
    const details = passed
      ? 'Latest test run passed'
      : `Latest test run failed (${failedCount} failing tests)`;
    const measuredAt = this.safeStatTimestamp(lastRunPath);

    return [
      {
        check: 'e2e_tests_passed',
        passed,
        source: 'test-results/.last-run.json',
        details,
        measured_at: measuredAt,
      },
      {
        check: 'critical_path_tests_passed',
        passed,
        source: 'test-results/.last-run.json',
        details,
        measured_at: measuredAt,
      },
    ];
  }

  private resolveSecretScanSignal(): PolicySignal | null {
    const logPath = path.join(this.ctx.projectRoot, 'test-output.json');
    if (!fs.existsSync(logPath)) return null;
    const raw = fs.readFileSync(logPath, 'utf8');
    const lines = raw.split(/\r?\n/).filter(Boolean);
    let hasSecretWarning = false;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as { message?: string };
        const msg = entry.message || '';
        if (msg.includes('secret_pattern')) {
          hasSecretWarning = true;
          break;
        }
      } catch {
        continue;
      }
    }

    return {
      check: 'secret_scan_passed',
      passed: !hasSecretWarning,
      source: 'test-output.json',
      details: hasSecretWarning
        ? 'Secret pattern warnings detected in logs'
        : 'No secret pattern warnings detected in logs',
      measured_at: this.safeStatTimestamp(logPath),
    };
  }

  private resolveSastSignalFromEslint(): PolicySignal | null {
    const reportPath = path.join(this.ctx.projectRoot, 'eslint-output.json');
    const raw = this.safeReadJson(reportPath) as Array<{
      errorCount?: number;
      fatalErrorCount?: number;
      warningCount?: number;
    }> | null;
    if (!Array.isArray(raw)) return null;

    const errorCount = raw.reduce((sum, item) => sum + (item.errorCount || 0), 0);
    const fatalCount = raw.reduce((sum, item) => sum + (item.fatalErrorCount || 0), 0);
    const warningCount = raw.reduce((sum, item) => sum + (item.warningCount || 0), 0);

    return {
      check: 'sast_scan_passed',
      passed: errorCount === 0 && fatalCount === 0,
      source: 'eslint-output.json',
      details: `ESLint: ${errorCount} errors, ${fatalCount} fatals, ${warningCount} warnings`,
      measured_at: this.safeStatTimestamp(reportPath),
    };
  }

  private resolveDependencyScanSignal(): PolicySignal | null {
    const candidates = [
      'npm-audit.json',
      'dependency-scan.json',
      'sca-report.json',
      path.join('BusinessDocs', 'metrics', 'npm-audit.json'),
      path.join('BusinessDocs', 'metrics', 'dependency-scan.json'),
    ];

    for (const candidate of candidates) {
      const reportPath = path.join(this.ctx.projectRoot, candidate);
      const raw = this.safeReadJson(reportPath) as Record<string, unknown> | null;
      if (!raw) continue;

      const metadata = raw.metadata as { vulnerabilities?: Record<string, number> } | undefined;
      const vulnCounts = metadata?.vulnerabilities || null;

      if (vulnCounts && typeof vulnCounts === 'object') {
        const critical = Number((vulnCounts as Record<string, number>).critical || 0);
        const high = Number((vulnCounts as Record<string, number>).high || 0);
        return {
          check: 'dependency_scan_passed',
          passed: critical === 0 && high === 0,
          source: candidate,
          details: `npm audit: ${critical} critical, ${high} high`,
          measured_at: this.safeStatTimestamp(reportPath),
        };
      }

      const summary = raw.summary as Record<string, unknown> | undefined;
      if (summary) {
        const critical = Number(summary.critical || 0);
        const high = Number(summary.high || 0);
        return {
          check: 'dependency_scan_passed',
          passed: critical === 0 && high === 0,
          source: candidate,
          details: `Scan summary: ${critical} critical, ${high} high`,
          measured_at: this.safeStatTimestamp(reportPath),
        };
      }
    }

    return null;
  }

  private resolveContainerScanSignal(): PolicySignal | null {
    const candidates = [
      'trivy-report.json',
      'grype-report.json',
      'container-scan.json',
      path.join('BusinessDocs', 'metrics', 'container-scan.json'),
    ];

    for (const candidate of candidates) {
      const reportPath = path.join(this.ctx.projectRoot, candidate);
      const raw = this.safeReadJson(reportPath) as Record<string, unknown> | null;
      if (!raw) continue;

      const trivyResults = raw.Results as Array<{ Vulnerabilities?: Array<{ Severity?: string }> }>;
      if (Array.isArray(trivyResults)) {
        let critical = 0;
        let high = 0;
        for (const result of trivyResults) {
          for (const vuln of result.Vulnerabilities || []) {
            const severity = String(vuln.Severity || '').toUpperCase();
            if (severity === 'CRITICAL') critical += 1;
            if (severity === 'HIGH') high += 1;
          }
        }
        return {
          check: 'container_scan_passed',
          passed: critical === 0 && high === 0,
          source: candidate,
          details: `Container scan: ${critical} critical, ${high} high`,
          measured_at: this.safeStatTimestamp(reportPath),
        };
      }

      const matches = raw.matches as Array<{ vulnerability?: { severity?: string } }>;
      if (Array.isArray(matches)) {
        let critical = 0;
        let high = 0;
        for (const match of matches) {
          const severity = String(match.vulnerability?.severity || '').toUpperCase();
          if (severity === 'CRITICAL') critical += 1;
          if (severity === 'HIGH') high += 1;
        }
        return {
          check: 'container_scan_passed',
          passed: critical === 0 && high === 0,
          source: candidate,
          details: `Container scan: ${critical} critical, ${high} high`,
          measured_at: this.safeStatTimestamp(reportPath),
        };
      }
    }

    return null;
  }

  private resolveAccessibilitySignal(): PolicySignal | null {
    const candidates = [
      'a11y-report.json',
      'axe-report.json',
      'lighthouse-report.json',
      path.join('BusinessDocs', 'metrics', 'a11y-report.json'),
    ];

    for (const candidate of candidates) {
      const reportPath = path.join(this.ctx.projectRoot, candidate);
      const raw = this.safeReadJson(reportPath) as Record<string, unknown> | null;
      if (!raw) continue;

      const violations = raw.violations as Array<unknown> | undefined;
      if (Array.isArray(violations)) {
        const count = violations.length;
        return {
          check: 'accessibility_score',
          passed: count === 0,
          source: candidate,
          details: count === 0 ? 'No accessibility violations detected' : `${count} violations`,
          measured_at: this.safeStatTimestamp(reportPath),
        };
      }

      const categories = raw.categories as { accessibility?: { score?: number } } | undefined;
      const score = categories?.accessibility?.score;
      if (typeof score === 'number') {
        const pct = Math.round(score * 100);
        return {
          check: 'accessibility_score',
          passed: pct >= 90,
          source: candidate,
          details: `Accessibility score ${pct}`,
          measured_at: this.safeStatTimestamp(reportPath),
        };
      }
    }

    return null;
  }

  private resolvePolicySignalsFile(): PolicySignalsResult | null {
    const candidates = [
      path.join(this.ctx.projectRoot, 'policy-signals.json'),
      path.join(this.ctx.projectRoot, 'BusinessDocs', 'metrics', 'policy-signals.json'),
    ];

    for (const filePath of candidates) {
      const raw = this.safeReadJson(filePath) as {
        checks?: Record<string, boolean>;
        signals?: Array<PolicySignal>;
        generated_at?: string;
      } | null;

      if (!raw) continue;

      const checks = raw.checks && typeof raw.checks === 'object' ? raw.checks : {};
      const providedSignals = Array.isArray(raw.signals) ? raw.signals : [];
      const signals: PolicySignal[] = providedSignals.map((signal) => ({
        check: signal.check,
        passed: signal.passed,
        source: signal.source || 'policy-signals.json',
        details: signal.details,
        measured_at: signal.measured_at,
      }));

      for (const [check, passed] of Object.entries(checks)) {
        if (signals.some((signal) => signal.check === check)) continue;
        signals.push({
          check,
          passed: Boolean(passed),
          source: path.basename(filePath),
        });
      }

      return {
        checks,
        signals,
        missing: [],
        generated_at:
          raw.generated_at || this.safeStatTimestamp(filePath) || new Date().toISOString(),
      } as PolicySignalsResult;
    }

    return null;
  }

  private resolvePolicySignals(): PolicySignalsResult {
    const policyChecks = new Set<string>();
    const packs = loadAllPolicyPacks(this.ctx.store, this.getPackPaths());

    for (const pack of packs) {
      for (const policy of pack.policies) {
        policyChecks.add(policy.condition.check);
      }
    }

    const signals: PolicySignal[] = [];
    const explicit = this.resolvePolicySignalsFile();

    if (explicit) {
      signals.push(...explicit.signals);
    }

    const coverageSignal = this.resolveCoverageSignal();
    if (coverageSignal && !signals.some((signal) => signal.check === coverageSignal.check)) {
      signals.push(coverageSignal);
    }

    for (const signal of this.resolveTestRunSignal()) {
      if (!signals.some((existing) => existing.check === signal.check)) {
        signals.push(signal);
      }
    }

    const secretSignal = this.resolveSecretScanSignal();
    if (secretSignal && !signals.some((signal) => signal.check === secretSignal.check)) {
      signals.push(secretSignal);
    }

    const sastSignal = this.resolveSastSignalFromEslint();
    if (sastSignal && !signals.some((signal) => signal.check === sastSignal.check)) {
      signals.push(sastSignal);
    }

    const dependencySignal = this.resolveDependencyScanSignal();
    if (dependencySignal && !signals.some((signal) => signal.check === dependencySignal.check)) {
      signals.push(dependencySignal);
    }

    const containerSignal = this.resolveContainerScanSignal();
    if (containerSignal && !signals.some((signal) => signal.check === containerSignal.check)) {
      signals.push(containerSignal);
    }

    const accessibilitySignal = this.resolveAccessibilitySignal();
    if (
      accessibilitySignal &&
      !signals.some((signal) => signal.check === accessibilitySignal.check)
    ) {
      signals.push(accessibilitySignal);
    }

    const checks: Record<string, boolean> = {};
    for (const signal of signals) {
      checks[signal.check] = signal.passed;
    }

    const missing = Array.from(policyChecks).filter((check) => !(check in checks));

    return {
      checks,
      signals,
      missing,
      generated_at: new Date().toISOString(),
    };
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
          description: p.description,
          scope: p.scope,
          category: p.category,
          severity: p.severity,
          condition_type: p.condition.type,
          condition_check: p.condition.check,
          action_message: p.action.message,
          exception_count: p.exceptions.length,
          pack_id: pack.pack_id,
        });
      }
    }

    return { policies, count: policies.length };
  }

  listPolicyPacks(): PolicyPacksResult {
    const packs = this.collectPackSummaries();
    return { packs, count: packs.length };
  }

  listPolicySignals(): PolicySignalsResult {
    return this.resolvePolicySignals();
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

  updatePolicy(input: PolicyUpdateInput): PolicyUpdateResult {
    if (!input.policy_id) throw new PolicyValidationError('policy_id is required');

    const updates: EnginePolicyUpdateInput = {
      name: input.name,
      description: input.description,
      scope: input.scope,
      category: input.category,
      severity: input.severity,
      condition_type: input.condition_type,
      condition_check: input.condition_check,
      action_message: input.action_message,
    };

    const hasUpdates = Object.values(updates).some((value) => value !== undefined);
    if (!hasUpdates) throw new PolicyValidationError('at least one policy field must be provided');

    let updatedPolicy: Policy | null = null;
    let updatedPackId: string | undefined;

    for (const packPath of this.getPackPaths()) {
      const result = updatePolicyInPack(
        this.ctx.store as unknown as {
          exists: (p: string) => boolean;
          readFile: (p: string) => string;
          writeFile: (p: string, d: string) => void;
        },
        packPath,
        input.policy_id,
        updates
      );
      if (result) {
        updatedPolicy = result;
        updatedPackId = path.basename(packPath, '.json');
        break;
      }
    }

    if (!updatedPolicy) {
      throw new PolicyNotFoundError(`Policy ${input.policy_id} not found in any pack`);
    }

    this.ctx.audit.log({
      operation: 'policy_updated',
      entityType: 'policy',
      entityId: updatedPolicy.id,
      user: 'webapp',
      summary: `Policy ${updatedPolicy.id} updated`,
    });

    return {
      ok: true,
      policy: {
        id: updatedPolicy.id,
        name: updatedPolicy.name,
        description: updatedPolicy.description,
        scope: updatedPolicy.scope,
        category: updatedPolicy.category,
        severity: updatedPolicy.severity,
        condition_type: updatedPolicy.condition.type,
        condition_check: updatedPolicy.condition.check,
        action_message: updatedPolicy.action.message,
        exception_count: updatedPolicy.exceptions.length,
        pack_id: updatedPackId,
      },
    };
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
