import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';

import type { GitCredential, GitCredentialStore } from './credential-store';
import type {
  GitBackend,
  GitBranchInfo,
  GitBranchOptions,
  GitBranchResult,
  GitCommitResult,
  GitDiffResult,
  GitFileState,
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

export interface GitAuthorIdentity {
  name?: string;
  email?: string;
}

export interface IsomorphicGitBackendOptions {
  repositoryPath: string;
  author?: GitAuthorIdentity;
  workspaceId?: string;
  credentialStore?: Pick<GitCredentialStore, 'getCredential'>;
  httpClient?: git.HttpClient;
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

function isCleanStatus(
  head: git.HeadStatus,
  workdir: git.WorkdirStatus,
  stage: git.StageStatus
): boolean {
  return head === 1 && workdir === 1 && stage === 1;
}

function mapWorkingTreeState(head: git.HeadStatus, workdir: git.WorkdirStatus): GitFileState {
  if (head === 0 && workdir === 2) return 'untracked';
  if (workdir === 0) return 'deleted';
  if (workdir === 2) return 'modified';
  return 'updated';
}

function mapIndexState(head: git.HeadStatus, stage: git.StageStatus): GitFileState {
  if (head === 0 && stage !== 0) return 'added';
  if (stage === 0) return 'deleted';
  if (stage === 2 || stage === 3) return 'modified';
  return 'updated';
}

export class IsomorphicGitBackend implements GitBackend {
  private readonly repositoryPath: string;
  private readonly gitdir: string;
  private readonly author?: GitAuthorIdentity;
  private readonly workspaceId: string;
  private readonly credentialStore?: Pick<GitCredentialStore, 'getCredential'>;
  private readonly httpClient: git.HttpClient;

  constructor(options: IsomorphicGitBackendOptions) {
    this.repositoryPath = path.resolve(options.repositoryPath);
    this.gitdir = path.join(this.repositoryPath, '.git');
    this.author = options.author;
    this.workspaceId = options.workspaceId || this.repositoryPath;
    this.credentialStore = options.credentialStore;
    this.httpClient = options.httpClient || http;
  }

  private get fsClient(): git.FsClient {
    return fs;
  }

  private async currentBranch(): Promise<string> {
    const branch = await git.currentBranch({
      fs: this.fsClient,
      dir: this.repositoryPath,
      gitdir: this.gitdir,
      fullname: false,
      test: true,
    });

    return typeof branch === 'string' && branch.length > 0 ? branch : 'HEAD';
  }

  private async listBranchInfo(): Promise<GitBranchInfo> {
    const [current, branches] = await Promise.all([
      this.currentBranch(),
      git.listBranches({
        fs: this.fsClient,
        dir: this.repositoryPath,
        gitdir: this.gitdir,
      }),
    ]);

    return {
      current,
      branches,
    };
  }

  private async resolveAuthor(): Promise<Required<GitAuthorIdentity>> {
    const [configName, configEmail] = await Promise.all([
      git.getConfig({
        fs: this.fsClient,
        dir: this.repositoryPath,
        gitdir: this.gitdir,
        path: 'user.name',
      }),
      git.getConfig({
        fs: this.fsClient,
        dir: this.repositoryPath,
        gitdir: this.gitdir,
        path: 'user.email',
      }),
    ]);

    const name =
      this.author?.name || (typeof configName === 'string' ? configName : 'Agentic SDLC');
    const email =
      this.author?.email ||
      (typeof configEmail === 'string' ? configEmail : 'agentic@example.invalid');

    return { name, email };
  }

  private async getAheadBehind(): Promise<{ ahead: number; behind: number }> {
    try {
      const { stdout } = await execFileAsync(
        'git',
        ['rev-list', '--left-right', '--count', '@{upstream}...HEAD'],
        { cwd: this.repositoryPath }
      );
      const parts = stdout.trim().split(/\s+/);
      if (parts.length === 2) {
        return {
          behind: Number.parseInt(parts[0], 10) || 0,
          ahead: Number.parseInt(parts[1], 10) || 0,
        };
      }
    } catch {
      return { ahead: 0, behind: 0 };
    }

    return { ahead: 0, behind: 0 };
  }

  async status(): Promise<ResultTuple<GitStatusResult>> {
    try {
      const [branch, matrix, aheadBehind] = await Promise.all([
        this.currentBranch(),
        git.statusMatrix({
          fs: this.fsClient,
          dir: this.repositoryPath,
          gitdir: this.gitdir,
        }),
        this.getAheadBehind(),
      ]);

      const entries: GitStatusEntry[] = matrix
        .filter(([, head, workdir, stage]) => !isCleanStatus(head, workdir, stage))
        .map(([filePath, head, workdir, stage]) => ({
          path: filePath,
          workingTree: mapWorkingTreeState(head, workdir),
          index: mapIndexState(head, stage),
        }));

      return [
        {
          branch,
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

      await git.add({
        fs: this.fsClient,
        dir: this.repositoryPath,
        gitdir: this.gitdir,
        filepath: normalizedFiles,
      });

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

      for (const filePath of normalizedFiles) {
        try {
          await git.resetIndex({
            fs: this.fsClient,
            dir: this.repositoryPath,
            gitdir: this.gitdir,
            filepath: filePath,
            ref: 'HEAD',
          });
        } catch {
          await git.remove({
            fs: this.fsClient,
            dir: this.repositoryPath,
            gitdir: this.gitdir,
            filepath: filePath,
          });
        }
      }

      return [{ status: 'ok', affectedFiles: normalizedFiles }, null];
    } catch (error) {
      return [null, toError(error)];
    }
  }

  async commit(message: string): Promise<ResultTuple<GitCommitResult>> {
    try {
      const summary = message.trim();
      if (!summary) {
        throw new Error('Commit message is required');
      }

      const author = await this.resolveAuthor();
      const commitHash = await git.commit({
        fs: this.fsClient,
        dir: this.repositoryPath,
        gitdir: this.gitdir,
        message: summary,
        author,
        committer: author,
      });

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

      const { stdout } = await execFileAsync('git', args, { cwd: this.repositoryPath });

      return [
        {
          file,
          patch: stdout,
        },
        null,
      ];
    } catch (error) {
      return [null, toError(error)];
    }
  }

  async log(options: GitLogOptions = {}): Promise<ResultTuple<GitLogResult>> {
    try {
      const skip = options.skip ?? 0;
      const requestedDepth = options.depth ?? options.maxCount ?? 50;
      const depth = requestedDepth + skip;
      const commits = await git.log({
        fs: this.fsClient,
        dir: this.repositoryPath,
        gitdir: this.gitdir,
        ref: options.branch,
        depth,
        since: options.since ? new Date(options.since) : undefined,
      });

      const untilDate = options.until ? new Date(options.until) : null;
      const authorFilter = options.author?.toLowerCase().trim() || null;

      const filtered = commits.filter((entry) => {
        const commitDate = new Date(entry.commit.author.timestamp * 1000);
        if (untilDate && commitDate > untilDate) {
          return false;
        }

        if (authorFilter) {
          const authorName = entry.commit.author.name.toLowerCase();
          const authorEmail = entry.commit.author.email.toLowerCase();
          if (!authorName.includes(authorFilter) && !authorEmail.includes(authorFilter)) {
            return false;
          }
        }

        return true;
      });

      const entries = filtered
        .slice(skip, skip + (options.maxCount ?? options.depth ?? filtered.length))
        .map((entry) => {
          const message = entry.commit.message.replace(/\n+$/u, '');
          const [subject, ...bodyLines] = message.split('\n');
          return {
            hash: entry.oid,
            shortHash: entry.oid.slice(0, 7),
            author: `${entry.commit.author.name} <${entry.commit.author.email}>`,
            authorName: entry.commit.author.name,
            authorEmail: entry.commit.author.email,
            date: new Date(entry.commit.author.timestamp * 1000).toISOString(),
            subject,
            body: bodyLines.join('\n'),
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
          if (!options.name) throw new Error('Branch name is required');
          await git.branch({
            fs: this.fsClient,
            dir: this.repositoryPath,
            gitdir: this.gitdir,
            ref: options.name,
            object: options.startPoint,
            force: options.force,
          });
          break;
        case 'checkout':
          if (!options.name) throw new Error('Branch name is required');
          await git.checkout({
            fs: this.fsClient,
            dir: this.repositoryPath,
            gitdir: this.gitdir,
            ref: options.name,
            force: options.force,
          });
          break;
        case 'delete':
          if (!options.name) throw new Error('Branch name is required');
          if ((await this.currentBranch()) === options.name) {
            throw new Error(`Cannot delete the currently checked-out branch: ${options.name}`);
          }
          await git.deleteBranch({
            fs: this.fsClient,
            dir: this.repositoryPath,
            gitdir: this.gitdir,
            ref: options.name,
          });
          break;
        default:
          throw new Error(`Unsupported branch op: ${options.op}`);
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
      const credential: GitCredential | null = this.credentialStore
        ? this.credentialStore.getCredential(this.workspaceId, remote)
        : null;

      const onAuth = credential
        ? () => ({
            username: credential.username || 'oauth2',
            password: credential.password || credential.token || '',
          })
        : undefined;

      if (op === 'fetch') {
        await git.fetch({
          fs: this.fsClient,
          http: this.httpClient,
          dir: this.repositoryPath,
          gitdir: this.gitdir,
          remote,
          ref: branch,
          singleBranch: Boolean(branch),
          onAuth,
        });
      } else if (op === 'pull') {
        await git.pull({
          fs: this.fsClient,
          http: this.httpClient,
          dir: this.repositoryPath,
          gitdir: this.gitdir,
          remote,
          ref: branch,
          singleBranch: Boolean(branch),
          author: await this.resolveAuthor(),
          onAuth,
        });
      } else {
        await git.push({
          fs: this.fsClient,
          http: this.httpClient,
          dir: this.repositoryPath,
          gitdir: this.gitdir,
          remote,
          ref: branch,
          onAuth,
        });
      }

      return [
        {
          status: 'ok',
          remote,
          branch,
          summary: `${op} completed`,
        },
        null,
      ];
    } catch (error) {
      return [null, toError(error)];
    }
  }
}
