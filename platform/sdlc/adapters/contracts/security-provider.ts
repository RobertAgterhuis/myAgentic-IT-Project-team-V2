// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Security Provider Contract
 *
 * Formal interface for security scanning operations: SAST, dependency
 * audit, secret detection, license compliance.
 *
 * @module sdlc/adapters/contracts/security-provider
 */

// ─── Capability Flags ────────────────────────────────────────

export interface SecurityCapabilities {
  supportsSAST: boolean;
  supportsDependencyAudit: boolean;
  supportsSecretScan: boolean;
  supportsLicenseCheck: boolean;
}

// ─── Input / Output Types ────────────────────────────────────

export interface ScanInput {
  path?: string;
  cwd?: string;
}

export interface Finding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  rule: string;
  message: string;
  file?: string;
  line?: number;
}

export interface ScanReport {
  scanner: string;
  findings: Finding[];
  summary: { critical: number; high: number; medium: number; low: number; info: number };
  scanned_at: string;
}

export interface DependencyAuditResult {
  vulnerabilities: Array<{
    package: string;
    severity: string;
    title: string;
    url?: string;
  }>;
  total: number;
}

export interface SecretScanResult {
  secrets: Array<{
    file: string;
    line: number;
    type: string;
    match: string;
  }>;
  total: number;
}

export interface LicenseCheckResult {
  packages: Array<{
    name: string;
    license: string;
    compliant: boolean;
  }>;
  compliant: boolean;
}

// ─── Error Classification ────────────────────────────────────

export type SecurityErrorKind =
  | 'SCANNER_UNAVAILABLE'
  | 'PERMISSION_DENIED'
  | 'TIMEOUT'
  | 'INVALID_INPUT'
  | 'UNKNOWN';

export interface SecurityError {
  kind: SecurityErrorKind;
  message: string;
  detail?: string;
}

// ─── Provider Interface ──────────────────────────────────────

export interface SecurityProvider {
  readonly providerName: string;
  readonly capabilities: SecurityCapabilities;

  scan(input: ScanInput): Promise<ScanReport>;
  auditDependencies(): Promise<DependencyAuditResult>;
  scanSecrets(input: ScanInput): Promise<SecretScanResult>;
  checkLicenses(): Promise<LicenseCheckResult>;
}
