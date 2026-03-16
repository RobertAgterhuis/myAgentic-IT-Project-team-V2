// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Testing Provider Contract
 *
 * Formal interface for test execution operations: run tests, parse results,
 * collect coverage, generate reports.
 *
 * @module sdlc/adapters/contracts/testing-provider
 */

// ─── Capability Flags ────────────────────────────────────────

export interface TestingCapabilities {
  supportsPatternFilter: boolean;
  supportsCoverage: boolean;
  supportsWatch: boolean;
  supportsParallel: boolean;
}

// ─── Input / Output Types ────────────────────────────────────

export interface TestRunInput {
  pattern?: string;
  files?: string[];
  timeout?: number;
}

export interface TestSummary {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration_ms: number;
  files: string[];
}

export interface TestRunResult {
  exitCode: number;
  success: boolean;
  summary: TestSummary;
  stdout: string;
  stderr: string;
  duration_ms: number;
}

export interface CoverageResult {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
  exitCode: number;
  duration_ms: number;
}

export interface TestReport {
  framework: string;
  results: TestRunResult;
  coverage?: CoverageResult;
  generated_at: string;
}

// ─── Error Classification ────────────────────────────────────

export type TestingErrorKind =
  | 'FRAMEWORK_UNAVAILABLE'
  | 'CONFIG_ERROR'
  | 'TIMEOUT'
  | 'INVALID_INPUT'
  | 'UNKNOWN';

export interface TestingError {
  kind: TestingErrorKind;
  message: string;
  detail?: string;
}

// ─── Provider Interface ──────────────────────────────────────

export interface TestingProvider {
  readonly providerName: string;
  readonly capabilities: TestingCapabilities;

  runTests(input: TestRunInput): Promise<TestRunResult>;
  runIntegration(input: TestRunInput): Promise<TestRunResult>;
  getCoverage(): Promise<CoverageResult>;
  getReport(): Promise<TestReport>;
}
