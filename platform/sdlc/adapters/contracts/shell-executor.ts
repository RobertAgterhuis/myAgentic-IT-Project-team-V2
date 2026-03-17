// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Shell Executor Contract
 *
 * Formal interface for safe shell command execution with timeout
 * enforcement and structured output.
 *
 * @module sdlc/adapters/contracts/shell-executor
 */

// ─── Capability Flags ────────────────────────────────────────

export interface ShellCapabilities {
  supportsTimeout: boolean;
  supportsStreaming: boolean;
  supportsEnvOverride: boolean;
}

// ─── Input / Output Types ────────────────────────────────────

export interface ExecInput {
  binary: string;
  args: string[];
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
  maxBuffer?: number;
}

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration_ms: number;
  command: string;
  timedOut: boolean;
}

// ─── Error Classification ────────────────────────────────────

export type ShellErrorKind =
  | 'BINARY_NOT_FOUND'
  | 'TIMEOUT'
  | 'PERMISSION_DENIED'
  | 'CWD_NOT_FOUND'
  | 'UNKNOWN';

export interface ShellError {
  kind: ShellErrorKind;
  message: string;
  detail?: string;
}

// ─── Provider Interface ──────────────────────────────────────

export interface ShellExecutorProvider {
  readonly providerName: string;
  readonly capabilities: ShellCapabilities;

  exec(input: ExecInput): Promise<ExecResult>;
  isAvailable(binary: string): Promise<boolean>;
  stream(
    input: ExecInput,
    onStdout: (chunk: string) => void,
    onStderr: (chunk: string) => void
  ): Promise<ExecResult>;
}
