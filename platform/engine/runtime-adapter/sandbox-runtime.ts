import path from 'node:path';
import { existsSync, promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import type { AgentRuntimeAdapter, RuntimeAdapterResult } from '../agent-runtime-adapter.js';

const execFile = promisify(execFileCallback);

interface SandboxRuntimeAdapterConfig {
  outputDir?: string;
  sandboxRoot?: string;
  commandTimeoutMs?: number;
}

interface SandboxInvocationContext {
  sandboxSessionId?: string;
  sandboxStep?: 'plan' | 'code' | 'test' | 'pr';
  filePath?: string;
  fileContent?: string;
  command?: string[];
  prTitle?: string;
  policyApprovals?: unknown;
  rollbackOnFailure?: boolean;
}

interface SandboxStepArtifact {
  correlationId: string;
  step: 'plan' | 'code' | 'test' | 'pr';
  timestamp: string;
  branch: string;
  details: Record<string, unknown>;
}

const DEFAULT_OUTPUT_DIR = path.resolve(process.cwd(), 'BusinessDocs', 'session', 'agent-runs');

export class SandboxRuntimeAdapter implements AgentRuntimeAdapter {
  readonly name = 'sandbox-runtime';

  private readonly _sandboxRoot: string;
  private readonly _commandTimeoutMs: number;
  private readonly _outputDir: string;

  constructor(config: SandboxRuntimeAdapterConfig = {}) {
    this._sandboxRoot =
      config.sandboxRoot ||
      path.resolve(process.cwd(), 'tests', 'load', 'autonomous-lane-traces', 'sandbox-runs');
    this._commandTimeoutMs = config.commandTimeoutMs ?? 15_000;
    this._outputDir = config.outputDir || DEFAULT_OUTPUT_DIR;
  }

  async invoke(
    agent: { id: string; name: string },
    platform: string,
    context: Record<string, unknown>
  ): Promise<RuntimeAdapterResult> {
    const runtimeContext = context as SandboxInvocationContext;
    const requestedAt = new Date().toISOString();
    const requestId = createRequestId(agent.id);
    const sessionId = runtimeContext.sandboxSessionId || randomUUID();
    const correlationId = sessionId;
    const sessionDir = path.join(this._sandboxRoot, sessionId);
    const branchName = `sandbox/${sessionId.slice(0, 12)}`;
    const artifactsDir = path.join(sessionDir, 'artifacts');

    await this._ensureSandboxRepo(sessionDir, branchName);
    await fs.mkdir(artifactsDir, { recursive: true });

    const step = runtimeContext.sandboxStep || 'plan';
    const timelinePath = path.join(sessionDir, 'timeline.jsonl');
    const checkpointPath = path.join(sessionDir, 'approval-checkpoints.jsonl');

    let stepSummary = '';
    let stepDetails: Record<string, unknown> = {};
    const checkpoint = await this._recordApprovalCheckpoint(
      checkpointPath,
      step,
      correlationId,
      runtimeContext.policyApprovals
    );

    if (!checkpoint.approved) {
      throw new Error(
        `Sandbox step '${step}' blocked by approval checkpoint. Required one of: ${checkpoint.required.join(
          ', '
        )}`
      );
    }

    if (step === 'plan') {
      const planPath = path.join(sessionDir, 'plan.json');
      const plan = {
        issue: 'autonomous-lane-proof',
        steps: ['plan', 'code', 'test', 'pr'],
        branch: branchName,
        correlationId,
      };
      await fs.writeFile(planPath, JSON.stringify(plan, null, 2), 'utf8');
      stepSummary = `Planned autonomous lane workflow in ${planPath}`;
      stepDetails = { planPath };
    } else if (step === 'code') {
      const relativeTarget = sanitizeRelativePath(
        runtimeContext.filePath || 'src/sandbox-change.txt'
      );
      const targetPath = path.join(sessionDir, relativeTarget);
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      const content =
        runtimeContext.fileContent ||
        `sandbox change generated at ${new Date().toISOString()} for ${agent.id}\n`;
      await fs.writeFile(targetPath, content, 'utf8');

      await execFile('git', ['add', '.'], { cwd: sessionDir, timeout: this._commandTimeoutMs });
      await execFile('git', ['commit', '-m', `sandbox: ${agent.id} code update`], {
        cwd: sessionDir,
        timeout: this._commandTimeoutMs,
      });

      stepSummary = `Applied code change at ${relativeTarget} on ${branchName}`;
      stepDetails = { relativeTarget };
    } else if (step === 'test') {
      const command = normalizeSandboxCommand(runtimeContext.command);
      try {
        const { stdout, stderr } = await execFile(command[0], command.slice(1), {
          cwd: sessionDir,
          timeout: this._commandTimeoutMs,
        });
        stepSummary = [
          `Executed test command: ${command.join(' ')}`,
          stdout ? `stdout: ${truncate(stdout.trim(), 400)}` : null,
          stderr ? `stderr: ${truncate(stderr.trim(), 400)}` : null,
        ]
          .filter(Boolean)
          .join('\n');
        stepDetails = {
          command,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        };
      } catch (error) {
        const rollbackEnabled = runtimeContext.rollbackOnFailure !== false;
        if (rollbackEnabled) {
          await this._runRollbackHook(sessionDir, correlationId, step, error);
        }
        throw error;
      }
    } else {
      const title = runtimeContext.prTitle || `Sandbox proof for ${sessionId}`;
      const { stdout: diff } = await execFile('git', ['show', '--name-status', '--oneline', '-1'], {
        cwd: sessionDir,
        timeout: this._commandTimeoutMs,
      });
      const prDraft = {
        title,
        branch: branchName,
        sessionId,
        generatedAt: new Date().toISOString(),
        summary: diff.trim(),
      };
      const prPath = path.join(sessionDir, 'pull-request-draft.json');
      await fs.writeFile(prPath, JSON.stringify(prDraft, null, 2), 'utf8');
      stepSummary = `Generated PR draft at ${prPath}`;
      stepDetails = { prPath };
    }

    const artifact: SandboxStepArtifact = {
      correlationId,
      step,
      timestamp: new Date().toISOString(),
      branch: branchName,
      details: stepDetails,
    };
    const artifactPath = path.join(artifactsDir, `${step}.json`);
    await fs.writeFile(artifactPath, JSON.stringify(artifact, null, 2), 'utf8');

    const timelineEntry = {
      ts: new Date().toISOString(),
      correlationId,
      step,
      agentId: agent.id,
      branch: branchName,
      artifactPath: path.relative(sessionDir, artifactPath).replace(/\\/g, '/'),
      summary: stepSummary,
    };
    await fs.appendFile(timelinePath, `${JSON.stringify(timelineEntry)}\n`, 'utf8');

    await this._writeReplayBundle({
      sessionDir,
      correlationId,
      branchName,
      timelinePath,
      artifactsDir,
    });

    const completedAt = new Date().toISOString();
    const response = {
      version: '2026-03-19',
      requestId,
      adapter: this.name,
      provider: 'sandbox-local',
      model: 'deterministic-executor',
      status: 'success',
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      content: [
        `Sandbox step completed: ${step}`,
        `Agent: ${agent.id}`,
        `Platform: ${platform}`,
        `Session: ${sessionId}`,
        `Correlation ID: ${correlationId}`,
        `Branch: ${branchName}`,
        '',
        stepSummary,
      ].join('\n'),
      attempts: 1,
      requestedAt,
      completedAt,
    };

    const outputPath = await this._writeArtifact(agent, response);
    return { outputPath, response, usage: response.usage };
  }

  private async _writeArtifact(
    agent: { id: string; name: string },
    response: { completedAt: string; content: string }
  ): Promise<string> {
    await fs.mkdir(this._outputDir, { recursive: true });
    const fileName = `${response.completedAt.replace(/[:.]/g, '-')}-${agent.id}.md`;
    const filePath = path.join(this._outputDir, fileName);
    await fs.writeFile(filePath, response.content, 'utf8');
    return filePath;
  }

  private async _recordApprovalCheckpoint(
    checkpointPath: string,
    step: 'plan' | 'code' | 'test' | 'pr',
    correlationId: string,
    policyApprovals: unknown
  ): Promise<{ approved: boolean; required: string[] }> {
    const requiredByStep: Record<'plan' | 'code' | 'test' | 'pr', string[]> = {
      plan: ['sandbox:plan'],
      code: ['sandbox:code', 'tool.git.write'],
      test: ['sandbox:test', 'tool.testing.run'],
      pr: ['sandbox:pr', 'tool.github.pull_request.write'],
    };

    const required = requiredByStep[step];
    const allow = new Set<string>();

    if (policyApprovals && typeof policyApprovals === 'object') {
      const obj = policyApprovals as Record<string, unknown>;

      if (Array.isArray(obj.allow)) {
        for (const token of obj.allow) {
          if (typeof token === 'string' && token.trim()) allow.add(token.trim());
        }
      }

      if (obj.approvals && typeof obj.approvals === 'object') {
        for (const [key, value] of Object.entries(obj.approvals as Record<string, unknown>)) {
          if (value === true) allow.add(key);
        }
      }
    }

    const approved = step === 'plan' ? true : required.some((token) => allow.has(token));
    const entry = {
      ts: new Date().toISOString(),
      correlationId,
      step,
      required,
      approved,
      provided: [...allow],
    };
    await fs.appendFile(checkpointPath, `${JSON.stringify(entry)}\n`, 'utf8');

    return { approved, required };
  }

  private async _runRollbackHook(
    sessionDir: string,
    correlationId: string,
    step: 'plan' | 'code' | 'test' | 'pr',
    error: unknown
  ): Promise<void> {
    await execFile('git', ['reset', '--hard', 'HEAD~1'], {
      cwd: sessionDir,
      timeout: this._commandTimeoutMs,
    }).catch(async () => {
      await execFile('git', ['reset', '--hard', 'HEAD'], {
        cwd: sessionDir,
        timeout: this._commandTimeoutMs,
      }).catch(() => undefined);
    });

    await execFile('git', ['clean', '-fd'], {
      cwd: sessionDir,
      timeout: this._commandTimeoutMs,
    }).catch(() => undefined);

    const rollbackPath = path.join(sessionDir, 'rollback-hook.json');
    const payload = {
      ts: new Date().toISOString(),
      correlationId,
      triggeredByStep: step,
      status: 'applied',
      reason: error instanceof Error ? error.message : String(error),
    };
    await fs.writeFile(rollbackPath, JSON.stringify(payload, null, 2), 'utf8');
  }

  private async _writeReplayBundle(input: {
    sessionDir: string;
    correlationId: string;
    branchName: string;
    timelinePath: string;
    artifactsDir: string;
  }): Promise<void> {
    const timelineLines = existsSync(input.timelinePath)
      ? (await fs.readFile(input.timelinePath, 'utf8'))
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .map((line) => {
            try {
              return JSON.parse(line) as Record<string, unknown>;
            } catch {
              return { parseError: true, raw: line };
            }
          })
      : [];

    const artifacts = existsSync(input.artifactsDir)
      ? (await fs.readdir(input.artifactsDir)).filter((name) => name.endsWith('.json')).sort()
      : [];

    const { stdout: lastDiff } = await execFile(
      'git',
      ['show', '--name-status', '--oneline', '-1'],
      {
        cwd: input.sessionDir,
        timeout: this._commandTimeoutMs,
      }
    );

    const replayBundle = {
      correlationId: input.correlationId,
      sessionDir: input.sessionDir,
      branch: input.branchName,
      generatedAt: new Date().toISOString(),
      timeline: timelineLines,
      artifacts,
      latestDiff: lastDiff.trim(),
    };

    const replayBundlePath = path.join(input.sessionDir, 'replay-bundle.json');
    await fs.writeFile(replayBundlePath, JSON.stringify(replayBundle, null, 2), 'utf8');
  }

  private async _ensureSandboxRepo(sessionDir: string, branchName: string): Promise<void> {
    await fs.mkdir(sessionDir, { recursive: true });
    const gitDir = path.join(sessionDir, '.git');
    if (!existsSync(gitDir)) {
      await execFile('git', ['init'], { cwd: sessionDir, timeout: this._commandTimeoutMs });
      await execFile('git', ['config', 'user.email', 'sandbox@example.local'], {
        cwd: sessionDir,
        timeout: this._commandTimeoutMs,
      });
      await execFile('git', ['config', 'user.name', 'Sandbox Runtime'], {
        cwd: sessionDir,
        timeout: this._commandTimeoutMs,
      });
      await fs.writeFile(path.join(sessionDir, 'README.md'), '# Sandbox Runtime Session\n', 'utf8');
      await execFile('git', ['add', '.'], { cwd: sessionDir, timeout: this._commandTimeoutMs });
      await execFile('git', ['commit', '-m', 'sandbox: bootstrap repository'], {
        cwd: sessionDir,
        timeout: this._commandTimeoutMs,
      });
    }

    const { stdout } = await execFile('git', ['branch', '--list', branchName], {
      cwd: sessionDir,
      timeout: this._commandTimeoutMs,
    });
    const branchExists = stdout.trim().length > 0;
    if (!branchExists) {
      await execFile('git', ['checkout', '-b', branchName], {
        cwd: sessionDir,
        timeout: this._commandTimeoutMs,
      });
    } else {
      await execFile('git', ['checkout', branchName], {
        cwd: sessionDir,
        timeout: this._commandTimeoutMs,
      });
    }
  }
}

function sanitizeRelativePath(input: string): string {
  const normalized = input.replace(/\\/g, '/').replace(/^\/+/, '');
  const safe = normalized
    .split('/')
    .filter((segment) => segment && segment !== '.' && segment !== '..')
    .join('/');
  return safe || 'src/sandbox-change.txt';
}

function normalizeSandboxCommand(command: unknown): string[] {
  const fallback = ['node', '-e', 'console.log("sandbox-test-pass")'];
  if (!Array.isArray(command) || command.length === 0) return fallback;

  const normalized = command
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter((part) => part.length > 0);
  if (normalized.length === 0) return fallback;

  const [bin, ...args] = normalized;
  if (!['node', 'npm', 'git'].includes(bin)) {
    throw new Error(`Sandbox command '${bin}' is not allowed.`);
  }

  if (bin === 'npm' && !(args[0] === 'test' || (args[0] === 'run' && args[1] === 'test'))) {
    throw new Error('Sandbox npm command is restricted to test execution.');
  }

  const containsShellControl = normalized.some((part) => /[|;&><`]/.test(part));
  if (containsShellControl) {
    throw new Error('Sandbox command contains shell control characters and was rejected.');
  }

  return normalized;
}

function createRequestId(agentId: string): string {
  return `${agentId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}\n...[truncated]`;
}
