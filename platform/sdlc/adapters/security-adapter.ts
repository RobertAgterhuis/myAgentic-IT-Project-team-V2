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
import { shellExec, isBinaryAvailable } from './shell-executor.js';

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

// ─── SecurityAdapter ─────────────────────────────────────────

export class SecurityAdapter extends BaseAdapter {
  readonly name = 'security';
  readonly category = ADAPTER_CATEGORIES.SECURITY;
  readonly version = '1.0.0';

  constructor(config: SecurityConfig = { tools: [] }) {
    super();
    this._config = config as Record<string, unknown>;

    // ── sast-scan (ESLint security rules) ────────────────
    this._operations.set('sast-scan', async (params) => {
      const targetPath = (params.path as string) || '.';
      const eslintBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';

      const result = await shellExec(
        eslintBin,
        ['eslint', '--format', 'json', '--no-error-on-unmatched-pattern', targetPath],
        { timeout: 120_000, cwd: params.cwd as string }
      );

      const findings: SecurityFinding[] = [];
      try {
        const eslintOutput = JSON.parse(result.stdout) as Array<{
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
        // Non-JSON output — ESLint not configured or no files matched
      }

      return {
        path: targetPath,
        findings,
        finding_count: findings.length,
        exit_code: result.exitCode,
      };
    });

    // ── dependency-audit (npm audit) ─────────────────────
    this._operations.set('dependency-audit', async (params) => {
      const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';

      const result = await shellExec(npmBin, ['audit', '--json'], {
        timeout: 60_000,
        cwd: params.cwd as string,
      });

      const vulnerabilities: AuditVulnerability[] = [];
      let summary = { total: 0, critical: 0, high: 0, moderate: 0, low: 0 };

      try {
        const auditData = JSON.parse(result.stdout) as {
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
        // Non-JSON output — npm audit failed to parse
      }

      return { vulnerabilities, summary, exit_code: result.exitCode };
    });

    // ── secret-scan ──────────────────────────────────────
    this._operations.set('secret-scan', async (params) => {
      const targetPath = (params.path as string) || '.';
      // Use grep to search for secret patterns in files
      const grepBin = process.platform === 'win32' ? 'findstr' : 'grep';

      const allFindings: Array<{
        pattern_name: string;
        file: string;
        line: number;
        match: string;
      }> = [];

      for (const sp of SECRET_PATTERNS) {
        let result;
        if (process.platform === 'win32') {
          // findstr doesn't support full regex; use a simplified search
          result = await shellExec(
            grepBin,
            ['/S', '/N', '/R', sp.pattern.source.slice(0, 50), targetPath],
            { timeout: 30_000 }
          );
        } else {
          result = await shellExec(
            grepBin,
            [
              '-rn',
              '-E',
              sp.pattern.source,
              targetPath,
              '--include=*.{ts,js,json,yaml,yml,env,md}',
            ],
            { timeout: 30_000 }
          );
        }

        if (result.exitCode === 0 && result.stdout.trim()) {
          const lines = result.stdout.trim().split('\n');
          for (const line of lines.slice(0, 50)) {
            // cap at 50 matches per pattern
            const colonIdx = line.indexOf(':');
            if (colonIdx > 0) {
              const file = line.substring(0, colonIdx);
              const rest = line.substring(colonIdx + 1);
              const lineNum = parseInt(rest, 10) || 0;
              allFindings.push({
                pattern_name: sp.name,
                file,
                line: lineNum,
                match: '[REDACTED]',
              });
            }
          }
        }
      }

      return {
        path: targetPath,
        secrets_found: allFindings.length,
        findings: allFindings,
      };
    });

    // ── license-check ────────────────────────────────────
    this._operations.set('license-check', async (params) => {
      const npmBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';

      const result = await shellExec(npmBin, ['license-checker', '--json', '--production'], {
        timeout: 60_000,
        cwd: params.cwd as string,
      });

      let packages: Array<{ name: string; license: string }> = [];
      const violations: string[] = [];
      const disallowed = ['GPL-3.0', 'AGPL-3.0', 'SSPL-1.0'];

      try {
        const data = JSON.parse(result.stdout) as Record<string, { licenses: string }>;
        packages = Object.entries(data).map(([name, info]) => ({
          name,
          license: info.licenses || 'UNKNOWN',
        }));
        for (const pkg of packages) {
          if (disallowed.some((d) => pkg.license.includes(d))) {
            violations.push(`${pkg.name}: ${pkg.license}`);
          }
        }
      } catch {
        // license-checker not installed or failed
      }

      return { packages: packages.slice(0, 200), violations, exit_code: result.exitCode };
    });
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
