// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Git backend interface contract (GIT-1.1.1).
 *
 * All methods return a typed result tuple:
 *  - success: [value, null]
 *  - failure: [null, error]
 */

export type ResultTuple<T, E extends Error = Error> =
  | readonly [value: T, error: null]
  | readonly [value: null, error: E];

export type GitOperationStatus = 'ok' | 'noop';

export interface GitMutationResult {
  status: GitOperationStatus;
  affectedFiles: string[];
}

export type GitFileState =
  | 'untracked'
  | 'modified'
  | 'added'
  | 'deleted'
  | 'renamed'
  | 'copied'
  | 'updated';

export interface GitStatusEntry {
  path: string;
  workingTree: GitFileState;
  index: GitFileState;
}

export interface GitStatusResult {
  branch: string;
  ahead: number;
  behind: number;
  clean: boolean;
  entries: GitStatusEntry[];
}

export interface GitCommitResult {
  status: GitOperationStatus;
  commitHash: string;
  summary: string;
}

export interface GitDiffResult {
  file?: string;
  patch: string;
}

export interface GitLogOptions {
  branch?: string;
  maxCount?: number;
  skip?: number;
  depth?: number;
  since?: string;
  until?: string;
  author?: string;
}

export interface GitLogEntry {
  hash: string;
  shortHash: string;
  author: string;
  authorName: string;
  authorEmail: string;
  date: string;
  subject: string;
  body: string;
  message: string;
}

export interface GitLogResult {
  entries: GitLogEntry[];
}

export type GitBranchOp = 'list' | 'create' | 'checkout' | 'delete';

export interface GitBranchOptions {
  op: GitBranchOp;
  name?: string;
  startPoint?: string;
  force?: boolean;
}

export interface GitBranchInfo {
  current: string;
  branches: string[];
}

export interface GitBranchResult {
  status: GitOperationStatus;
  info: GitBranchInfo;
}

export type GitRemoteOp = 'fetch' | 'pull' | 'push';

export interface GitRemoteResult {
  status: GitOperationStatus;
  remote: string;
  branch?: string;
  summary: string;
}

export interface GitBackend {
  status(): Promise<ResultTuple<GitStatusResult>>;
  add(files: readonly string[]): Promise<ResultTuple<GitMutationResult>>;
  remove(files: readonly string[]): Promise<ResultTuple<GitMutationResult>>;
  commit(message: string): Promise<ResultTuple<GitCommitResult>>;
  diff(file?: string): Promise<ResultTuple<GitDiffResult>>;
  log(opts?: GitLogOptions): Promise<ResultTuple<GitLogResult>>;
  branch(opts: GitBranchOptions): Promise<ResultTuple<GitBranchResult>>;
  fetchPullPush(
    op: GitRemoteOp,
    remote: string,
    branch?: string
  ): Promise<ResultTuple<GitRemoteResult>>;
}
