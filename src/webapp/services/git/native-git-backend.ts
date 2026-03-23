import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type {
  GitBackend,
  GitBranchInfo,
  GitBranchOptions,
  GitBranchResult,
  GitCommitResult,
  GitDiffResult,
  GitFileState,
  GitLogEntry,
  GitLogOptions,
  GitLogResult,
  GitMutationResult,
  GitRemoteOp,
  GitRemoteResult,
  GitStatusEntry,
  GitStatusResult,
  ResultTuple,
} from './git-backend';

const execFileAsync = promisify(execFile);

export interface NativeGitBackendOptions {
  repositoryPath: string;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function normalizeRepoPath(repositoryPath: string, filePath: string): string {
  const absolutePath = path.resolve(repositoryPath, filePath);
  const relativePath = path.relative(repositoryPath, absolutePath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath) || relativePath.length === 0) {
    throw new Error(`File path must stay inside repository: ${filePath}`);
  }

  return relativePath.replace(/\\/g, '/');
}

function mapStatusChar(code: string): GitFileState {
  switch (code) {
    case '?':
      return 'untracked';
    case 'M':
      return 'modified';
    case 'A':
      return 'added';
    case 'D':
      return 'deleted';
    case 'R':
      return 'renamed';
    case 'C':
      return 'copied';
    default:
      return 'updated';
  }
}

function parseAheadBehind(header: string): { ahead: number; behind: number } {
  const aheadMatch = header.match(/ahead\s+(\d+)/i);
  const behindMatch = header.match(/behind\s+(\d+)/i);
  return {
    ahead: aheadMatch ? Number.parseInt(aheadMatch[1], 10) : 0,
    behind: behindMatch ? Number.parseInt(behindMatch[1], 10) : 0,
  };
}

function parseBranch(header: string): string {
  const branchMatch = header.match(/^##\s+([^.\s]+|HEAD)/);
  return branchMatch ? branchMatch[1] : 'HEAD';
}

export class NativeGitBackend implements GitBackend {
  private readonly repositoryPath: string;

  constructor(options: NativeGitBackendOptions) {
    this.repositoryPath = path.resolve(options.repositoryPath);
  }

  private async runGit(args: string[]): Promise<{ stdout: string; stderr: string }> {
    return execFileAsync('git', args, {
      cwd: this.repositoryPath,
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
    });
  }

  private async currentBranch(): Promise<string> {
    const { stdout } = await this.runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
    return stdout.trim() || 'HEAD';
  }

  private async listBranchInfo(): Promise<GitBranchInfo> {
    const [currentOutput, listOutput] = await Promise.all([
      this.runGit(['rev-parse', '--abbrev-ref', 'HEAD']),
      this.runGit(['branch', '--format=%(refname:short)']),
    ]);

    const current = currentOutput.stdout.trim() || 'HEAD';
    const branches = listOutput.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    return { current, branches };
  }

  async status(): Promise<ResultTuple<GitStatusResult>> {
    try {
      const { stdout } = await this.runGit(['status', '--porcelain=1', '-b']);
      const lines = stdout.split(/\r?\n/).filter(Boolean);
      const header = lines[0] || '## HEAD';

      const entries: GitStatusEntry[] = lines.slice(1).map((line) => {
        const indexCode = line[0] || ' ';
        const workTreeCode = line[1] || ' ';
        const rawPath = line.slice(3).trim();
        const pathPart = rawPath.includes(' -> ')
          ? rawPath.split(' -> ').pop() || rawPath
          : rawPath;
        return {
          path: pathPart,
          workingTree: workTreeCode === ' ' ? 'updated' : mapStatusChar(workTreeCode),
          index: indexCode === ' ' ? 'updated' : mapStatusChar(indexCode),
        };
      });

      const aheadBehind = parseAheadBehind(header);
      return [
        {
          branch: parseBranch(header),
          ahead: aheadBehind.ahead,
          behind: aheadBehind.behind,
          clean: entries.length === 0,
          entries,
        },
        null,
      ];
    } catch (error) {
      return [null, toError(error)];
    }
  }

  async add(files: readonly string[]): Promise<ResultTuple<GitMutationResult>> {
    try {
      const normalizedFiles = [
        ...new Set(files.map((filePath) => normalizeRepoPath(this.repositoryPath, filePath))),
      ];
      if (normalizedFiles.length === 0) {
        return [{ status: 'noop', affectedFiles: [] }, null];
      }

      await this.runGit(['add', '--', ...normalizedFiles]);
      return [{ status: 'ok', affectedFiles: normalizedFiles }, null];
    } catch (error) {
      return [null, toError(error)];
    }
  }

  async remove(files: readonly string[]): Promise<ResultTuple<GitMutationResult>> {
    try {
      const normalizedFiles = [
        ...new Set(files.map((filePath) => normalizeRepoPath(this.repositoryPath, filePath))),
      ];
      if (normalizedFiles.length === 0) {
        return [{ status: 'noop', affectedFiles: [] }, null];
      }

      await this.runGit(['rm', '--cached', '--', ...normalizedFiles]);
      return [{ status: 'ok', affectedFiles: normalizedFiles }, null];
    } catch {
      try {
        const normalizedFiles = [
          ...new Set(files.map((filePath) => normalizeRepoPath(this.repositoryPath, filePath))),
        ];
        await this.runGit(['rm', '--', ...normalizedFiles]);
        return [{ status: 'ok', affectedFiles: normalizedFiles }, null];
      } catch (error) {
        return [null, toError(error)];
      }
    }
  }

  async commit(message: string): Promise<ResultTuple<GitCommitResult>> {
    try {
      const summary = message.trim();
      if (!summary) {
        throw new Error('Commit message is required');
      }

      await this.runGit(['commit', '-m', summary]);
      const { stdout } = await this.runGit(['rev-parse', 'HEAD']);
      const commitHash = stdout.trim();

      return [
        {
          status: 'ok',
          commitHash,
          summary: summary.split('\n')[0],
        },
        null,
      ];
    } catch (error) {
      return [null, toError(error)];
    }
  }

  async diff(file?: string): Promise<ResultTuple<GitDiffResult>> {
    try {
      const args = ['diff', '--no-color'];
      if (file) {
        args.push('--', normalizeRepoPath(this.repositoryPath, file));
      }

      const { stdout } = await this.runGit(args);
      return [{ file, patch: stdout }, null];
    } catch (error) {
      return [null, toError(error)];
    }
  }

  async log(options: GitLogOptions = {}): Promise<ResultTuple<GitLogResult>> {
    try {
      const limit = options.maxCount ?? options.depth ?? 50;
      const args = [
        'log',
        `--max-count=${limit}`,
        `--skip=${options.skip ?? 0}`,
        '--date=iso-strict',
        '--format=%H%x1f%h%x1f%an%x1f%ae%x1f%aI%x1f%s%x1f%b%x1e',
      ];

      if (options.since) args.push(`--since=${options.since}`);
      if (options.until) args.push(`--until=${options.until}`);
      if (options.author) args.push(`--author=${options.author}`);
      if (options.branch) args.push(options.branch);

      const { stdout } = await this.runGit(args);

      const entries: GitLogEntry[] = stdout
        .split('\x1e')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
          const [hash, shortHash, authorName, authorEmail, date, subject, body] =
            entry.split('\x1f');
          const message = [subject || '', body || ''].filter(Boolean).join('\n\n').trim();
          return {
            hash,
            shortHash,
            author: `${authorName} <${authorEmail}>`,
            authorName,
            authorEmail,
            date,
            subject: subject || '',
            body: body || '',
            message,
          };
        });

      return [{ entries }, null];
    } catch (error) {
      return [null, toError(error)];
    }
  }

  async branch(options: GitBranchOptions): Promise<ResultTuple<GitBranchResult>> {
    try {
      switch (options.op) {
        case 'list':
          break;
        case 'create':
          if (!options.name) throw new Error('Branch name is required for create');
          await this.runGit([
            'branch',
            ...(options.force ? ['-f'] : []),
            options.name,
            ...(options.startPoint ? [options.startPoint] : []),
          ]);
          break;
        case 'checkout':
          if (!options.name) throw new Error('Branch name is required for checkout');
          await this.runGit(['checkout', ...(options.force ? ['-f'] : []), options.name]);
          break;
        case 'delete': {
          if (!options.name) throw new Error('Branch name is required for delete');
          const current = await this.currentBranch();
          if (current === options.name) {
            throw new Error('Cannot delete currently checked-out branch');
          }
          await this.runGit(['branch', options.force ? '-D' : '-d', options.name]);
          break;
        }
        default:
          throw new Error(`Unsupported branch operation: ${(options as { op: string }).op}`);
      }

      const info = await this.listBranchInfo();
      return [{ status: 'ok', info }, null];
    } catch (error) {
      return [null, toError(error)];
    }
  }

  async fetchPullPush(
    op: GitRemoteOp,
    remote: string,
    branch?: string
  ): Promise<ResultTuple<GitRemoteResult>> {
    try {
      const args = [op, remote, ...(branch ? [branch] : [])];
      const { stdout, stderr } = await this.runGit(args);
      const summary = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n');

      return [
        {
          status: 'ok',
          remote,
          branch,
          summary: summary || `${op} completed`,
        },
        null,
      ];
    } catch (error) {
      return [null, toError(error)];
    }
  }
}
