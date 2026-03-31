/**
 * Shell Executor — Unit Tests
 *
 * Tests the safe child_process wrapper for executing external CLI tools.
 */

import * as __req_0 from '../../platform/sdlc/adapters/shell-executor';
const { shellExec, isBinaryAvailable } = __req_0;

describe('shellExec', () => {
  it('executes a simple command and returns stdout', async () => {
    const result = await shellExec('node', ['--version']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/^v\d+/);
    expect(result.stderr).toBe('');
    expect(result.timedOut).toBe(false);
    expect(result.duration_ms).toBeGreaterThanOrEqual(0);
    expect(result.command).toBe('node --version');
  });

  it('returns exit code 1 for failing commands', async () => {
    const result = await shellExec('node', ['-e', 'process.exit(1)']);
    expect(result.exitCode).toBe(1);
    expect(result.timedOut).toBe(false);
  });

  it('returns exit code 127 for unknown binaries', async () => {
    const result = await shellExec('nonexistent_binary_xyz_abc_123', []);
    expect(result.exitCode).toBe(127);
    expect(result.timedOut).toBe(false);
  });

  it('returns error for non-existent working directory', async () => {
    const result = await shellExec('node', ['--version'], {
      cwd: '/non/existent/path/xyz',
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('does not exist');
    expect(result.duration_ms).toBe(0);
  });

  it('captures stderr output', async () => {
    const result = await shellExec('node', ['-e', 'console.error("oops")']);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('oops');
  });

  it('respects custom environment variables', async () => {
    const result = await shellExec('node', ['-e', 'console.log(process.env.TEST_SHELL_VAR)'], {
      env: { TEST_SHELL_VAR: 'hello_test' },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('hello_test');
  });

  it('times out long-running commands', async () => {
    const result = await shellExec('node', ['-e', 'setTimeout(() => {}, 30000)'], {
      timeout: 500,
    });
    // The process should be killed — either timedOut flag or non-zero exit
    expect(result.duration_ms).toBeGreaterThanOrEqual(400);
    expect(result.exitCode !== 0 || result.timedOut).toBe(true);
  });

  it('rejects execution outside workspace when workspace guardrail is enabled', async () => {
    const result = await shellExec('node', ['--version'], {
      cwd: process.platform === 'win32' ? 'C:\\Windows' : '/tmp',
      guardrails: {
        workspaceRoot: process.cwd(),
        requireWorkspaceCwd: true,
      },
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Workspace-bound execution rejected');
  });
});

describe('isBinaryAvailable', () => {
  it('returns true for node', async () => {
    const available = await isBinaryAvailable('node');
    expect(available).toBe(true);
  });

  it('returns true for git', async () => {
    const available = await isBinaryAvailable('git');
    expect(available).toBe(true);
  });

  it('returns false for non-existent binary', async () => {
    const available = await isBinaryAvailable('nonexistent_binary_xyz_abc_123');
    expect(available).toBe(false);
  });
});
