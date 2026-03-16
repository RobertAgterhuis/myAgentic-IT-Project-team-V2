// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Shell Execution Framework
 *
 * Safe child_process wrapper for executing external CLI tools (git, vitest,
 * playwright, npm, etc.) with timeout enforcement, result parsing, and
 * structured error reporting.
 *
 * Security:
 * - No shell interpolation (uses execFile / spawn with argument arrays)
 * - Timeout enforcement kills long-running processes
 * - Working directory is validated before execution
 *
 * @module sdlc/adapters/shell-executor
 */

import { execFile, type ExecFileOptions } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// ─── Types ──────────────────────────────────────────────────

export interface ShellResult {
  /** Exit code (0 = success) */
  exitCode: number;
  /** Combined stdout */
  stdout: string;
  /** Combined stderr */
  stderr: string;
  /** Execution time in milliseconds */
  duration_ms: number;
  /** The command that was executed */
  command: string;
  /** Whether the process was killed due to timeout */
  timedOut: boolean;
}

export interface ShellOptions {
  /** Working directory for the command (default: process.cwd()) */
  cwd?: string;
  /** Timeout in milliseconds (default: 30000, 0 = no timeout) */
  timeout?: number;
  /** Environment variables to merge with process.env */
  env?: Record<string, string>;
  /** Maximum stdout+stderr buffer size in bytes (default: 10MB) */
  maxBuffer?: number;
}

// ─── Constants ──────────────────────────────────────────────

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024; // 10 MB

// ─── Shell Executor ─────────────────────────────────────────

/**
 * Execute an external command safely using execFile (no shell interpolation).
 *
 * @param bin - The binary to execute (e.g. 'git', 'npx')
 * @param args - Array of arguments (never interpolated into a shell string)
 * @param options - Execution options (cwd, timeout, env)
 * @returns Structured result with exit code, stdout, stderr, duration
 */
export function shellExec(
  bin: string,
  args: string[],
  options: ShellOptions = {}
): Promise<ShellResult> {
  const cwd = options.cwd ? resolve(options.cwd) : process.cwd();
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const maxBuffer = options.maxBuffer ?? DEFAULT_MAX_BUFFER;

  if (!existsSync(cwd)) {
    return Promise.resolve({
      exitCode: 1,
      stdout: '',
      stderr: `Working directory does not exist: ${cwd}`,
      duration_ms: 0,
      command: `${bin} ${args.join(' ')}`,
      timedOut: false,
    });
  }

  const execOpts: ExecFileOptions = {
    cwd,
    timeout: timeout || undefined,
    maxBuffer,
    env: options.env ? { ...process.env, ...options.env } : process.env,
    windowsHide: true,
  };

  const start = Date.now();

  return new Promise<ShellResult>((res) => {
    execFile(bin, args, execOpts, (error, stdout, stderr) => {
      const duration_ms = Date.now() - start;
      const timedOut = !!(error && 'killed' in error && error.killed);
      const exitCode = error
        ? (error as NodeJS.ErrnoException & { code?: string | number }).code === 'ENOENT'
          ? 127
          : ((error as { status?: number }).status ?? 1)
        : 0;

      res({
        exitCode: typeof exitCode === 'number' ? exitCode : 1,
        stdout: (stdout || '').toString(),
        stderr: (stderr || '').toString(),
        duration_ms,
        command: `${bin} ${args.join(' ')}`,
        timedOut,
      });
    });
  });
}

/**
 * Check whether a binary is available on the system PATH.
 *
 * @param bin - Binary name (e.g. 'git', 'npx')
 * @returns true if the binary is found
 */
export async function isBinaryAvailable(bin: string): Promise<boolean> {
  const cmd = process.platform === 'win32' ? 'where' : 'which';
  const result = await shellExec(cmd, [bin], { timeout: 5000 });
  return result.exitCode === 0;
}
