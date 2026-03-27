// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Security Adapter
 *
 * Adapter for security scanning operations: SAST (via ESLint security rules),
 * dependency audit (via npm audit), secret scanning (regex-based), and
 * license compliance.
 *
 * All external commands use shellExec (no shell interpolation).
 *
 * @module sdlc/adapters/security-adapter
 */

import {
  BaseAdapter,
  ADAPTER_CATEGORIES,
  HEALTH_STATUS,
  type HealthCheck,
} from './tool-adapter.js';
import {
  shellExec,
  isBinaryAvailable,
  withToolGuardrails,
  type ShellOptions,
} from './shell-executor.js';

export interface SecurityConfig {
  [key: string]: unknown;
  tools: string[];
  policy_path?: string;
}

// ─── Finding types ───────────────────────────────────────────

export interface SecurityFinding {
  rule: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  message: string;
  file?: string;
  line?: number;
}

export interface AuditVulnerability {
  name: string;
  severity: string;
  title: string;
  url?: string;
  range?: string;
}

export interface AuditSummary {
  total: number;
  critical: number;
  high: number;
  moderate: number;
  low: number;
}

export interface SecretScanFinding {
  pattern_name: string;
  file: string;
  line: number;
  match: string;
}

interface ShellExecLike {
  (
    bin: string,
    args: string[],
    options?: ShellOptions
  ): Promise<{
    exitCode: number;
    stdout: string;
    stderr?: string;
    duration_ms?: number;
  }>;
}

// ─── Secret patterns ─────────────────────────────────────────

const SECRET_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: 'AWS Key', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'GitHub Token', pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/ },
  {
    name: 'Generic Secret',
    pattern: /(?:secret|password|token|apikey|api_key)\s*[:=]\s*['"][^'"]{8,}['"]/i,
  },
  { name: 'Private Key', pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/ },
  { name: 'Connection String', pattern: /(?:Server|Data Source|mongodb\+srv:\/\/)[^;\s]{10,}/i },
];

const EMPTY_AUDIT_SUMMARY: AuditSummary = {
  total: 0,
  critical: 0,
  high: 0,
  moderate: 0,
  low: 0,
};

const DISALLOWED_LICENSES = ['GPL-3.0', 'AGPL-3.0', 'SSPL-1.0'];

export function parseEslintFindings(stdout: string): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  try {
    const eslintOutput = JSON.parse(stdout) as Array<{
      filePath: string;
      messages: Array<{ ruleId: string; severity: number; message: string; line: number }>;
    }>;

    for (const file of eslintOutput) {
      for (const msg of file.messages) {
        if (!msg.ruleId) continue;
        findings.push({
          rule: msg.ruleId,
          severity: msg.severity === 2 ? 'high' : 'medium',
          message: msg.message,
          file: file.filePath,
          line: msg.line,
        });
      }
    }
  } catch {
    return [];
  }

  return findings;
}

export function parseAuditOutput(stdout: string): {
  vulnerabilities: AuditVulnerability[];
  summary: AuditSummary;
} {
  const vulnerabilities: AuditVulnerability[] = [];
  let summary: AuditSummary = { ...EMPTY_AUDIT_SUMMARY };

  try {
    const auditData = JSON.parse(stdout) as {
      vulnerabilities?: Record<
        string,
        { severity: string; name: string; title?: string; url?: string; range?: string }
      >;
      metadata?: { vulnerabilities?: Record<string, number> };
    };

    if (auditData.vulnerabilities) {
      for (const [name, vuln] of Object.entries(auditData.vulnerabilities)) {
        vulnerabilities.push({
          name,
          severity: vuln.severity,
          title: vuln.title || name,
          url: vuln.url,
          range: vuln.range,
        });
      }
    }

    if (auditData.metadata?.vulnerabilities) {
      const v = auditData.metadata.vulnerabilities;
      summary = {
        total: (v.total as number) || vulnerabilities.length,
        critical: (v.critical as number) || 0,
        high: (v.high as number) || 0,
        moderate: (v.moderate as number) || 0,
        low: (v.low as number) || 0,
      };
    }
  } catch {
    return { vulnerabilities: [], summary: { ...EMPTY_AUDIT_SUMMARY } };
  }

  return { vulnerabilities, summary };
}

export function parseSecretScanOutput(patternName: string, stdout: string): SecretScanFinding[] {
  if (!stdout.trim()) {
    return [];
  }

  const findings: SecretScanFinding[] = [];
  const lines = stdout.trim().split('\n');
  for (const line of lines.slice(0, 50)) {
    const colonIdx = line.indexOf(':');
    if (colonIdx <= 0) {
      continue;
    }

    const file = line.substring(0, colonIdx);
    const rest = line.substring(colonIdx + 1);
    const lineNum = parseInt(rest, 10) || 0;
    findings.push({
      pattern_name: patternName,
      file,
      line: lineNum,
      match: '[REDACTED]',
    });
  }

  return findings;
}

export function parseLicenseCheckerOutput(stdout: string): {
  packages: Array<{ name: string; license: string }>;
  violations: string[];
} {
  try {
    const data = JSON.parse(stdout) as Record<string, { licenses: string }>;
    const packages = Object.entries(data).map(([name, info]) => ({
      name,
      license: info.licenses || 'UNKNOWN',
    }));
    const violations = packages
      .filter((pkg) => DISALLOWED_LICENSES.some((disallowed) => pkg.license.includes(disallowed)))
      .map((pkg) => `${pkg.name}: ${pkg.license}`);

    return { packages, violations };
  } catch {
    return { packages: [], violations: [] };
  }
}

export async function runSastScan(
  params: Record<string, unknown>,
  exec: ShellExecLike = shellExec,
  platform = process.platform
): Promise<{
  path: string;
  findings: SecurityFinding[];
  finding_count: number;
  exit_code: number;
}> {
  const targetPath = (params.path as string) || '.';
  const eslintBin = platform === 'win32' ? 'npx.cmd' : 'npx';

  const result = await exec(
    eslintBin,
    ['eslint', '--format', 'json', '--no-error-on-unmatched-pattern', targetPath],
    withToolGuardrails({ timeout: 120_000, cwd: params.cwd as string }, params)
  );

  const findings = parseEslintFindings(result.stdout);
  return {
    path: targetPath,
    findings,
    finding_count: findings.length,
    exit_code: result.exitCode,
  };
}

export async function runDependencyAudit(
  params: Record<string, unknown>,
  exec: ShellExecLike = shellExec,
  platform = process.platform
): Promise<{ vulnerabilities: AuditVulnerability[]; summary: AuditSummary; exit_code: number }> {
  const npmBin = platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = await exec(npmBin, ['audit', '--json'], {
    ...withToolGuardrails({ timeout: 60_000, cwd: params.cwd as string }, params),
  });

  const { vulnerabilities, summary } = parseAuditOutput(result.stdout);
  return { vulnerabilities, summary, exit_code: result.exitCode };
}

export async function runSecretScan(
  params: Record<string, unknown>,
  exec: ShellExecLike = shellExec,
  platform = process.platform
): Promise<{ path: string; secrets_found: number; findings: SecretScanFinding[] }> {
  const targetPath = (params.path as string) || '.';
  const grepBin = platform === 'win32' ? 'findstr' : 'grep';
  const allFindings: SecretScanFinding[] = [];

  for (const sp of SECRET_PATTERNS) {
    const args =
      platform === 'win32'
        ? ['/S', '/N', '/R', sp.pattern.source.slice(0, 50), targetPath]
        : ['-rn', '-E', sp.pattern.source, targetPath, '--include=*.{ts,js,json,yaml,yml,env,md}'];

    const result = await exec(grepBin, args, withToolGuardrails({ timeout: 30_000 }, params));
    if (result.exitCode === 0 && result.stdout.trim()) {
      allFindings.push(...parseSecretScanOutput(sp.name, result.stdout));
    }
  }

  return {
    path: targetPath,
    secrets_found: allFindings.length,
    findings: allFindings,
  };
}

export async function runLicenseCheck(
  params: Record<string, unknown>,
  exec: ShellExecLike = shellExec,
  platform = process.platform
): Promise<{
  packages: Array<{ name: string; license: string }>;
  violations: string[];
  exit_code: number;
}> {
  const npmBin = platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = await exec(npmBin, ['license-checker', '--json', '--production'], {
    ...withToolGuardrails({ timeout: 60_000, cwd: params.cwd as string }, params),
  });

  const { packages, violations } = parseLicenseCheckerOutput(result.stdout);
  return { packages: packages.slice(0, 200), violations, exit_code: result.exitCode };
}

// ─── SecurityAdapter ─────────────────────────────────────────

export class SecurityAdapter extends BaseAdapter {
  readonly name = 'security';
  readonly category = ADAPTER_CATEGORIES.SECURITY;
  readonly version = '1.0.0';

  constructor(config: SecurityConfig = { tools: [] }) {
    super();
    this._config = config as Record<string, unknown>;

    // ── sast-scan (ESLint security rules) ────────────────
    this._operations.set('sast-scan', (params) => runSastScan(params));

    // ── dependency-audit (npm audit) ─────────────────────
    this._operations.set('dependency-audit', (params) => runDependencyAudit(params));

    // ── secret-scan ──────────────────────────────────────
    this._operations.set('secret-scan', (params) => runSecretScan(params));

    // ── license-check ────────────────────────────────────
    this._operations.set('license-check', (params) => runLicenseCheck(params));
  }

  async healthCheck(): Promise<HealthCheck> {
    const eslintAvailable = await isBinaryAvailable('npx');
    const npmAvailable = await isBinaryAvailable('npm');

    if (!eslintAvailable && !npmAvailable) {
      return {
        status: HEALTH_STATUS.UNAVAILABLE,
        adapter: this.name,
        category: this.category,
        message: 'Neither npx nor npm found on PATH',
        checked_at: new Date().toISOString(),
      };
    }

    const tools = this._config.tools as string[] | undefined;
    if (!tools || tools.length === 0) {
      return {
        status: HEALTH_STATUS.DEGRADED,
        adapter: this.name,
        category: this.category,
        message: 'No security tools configured; using defaults (eslint, npm audit)',
        checked_at: new Date().toISOString(),
      };
    }

    return {
      status: HEALTH_STATUS.HEALTHY,
      adapter: this.name,
      category: this.category,
      message: `Security tools: ${tools.join(', ')}`,
      checked_at: new Date().toISOString(),
    };
  }

  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!Array.isArray(config.tools)) {
      errors.push('tools must be an array of tool names');
    }
    return { valid: errors.length === 0, errors };
  }
}
