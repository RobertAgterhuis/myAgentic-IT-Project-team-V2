// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Git Provider Contract
 *
 * Formal interface for Git operations: repository info, branching,
 * commit management, PR lifecycle, and diff queries.
 *
 * @module sdlc/adapters/contracts/git-provider
 */

// ─── Capability Flags ────────────────────────────────────────

export interface GitCapabilities {
  supportsPR: boolean;
  supportsMerge: boolean;
  supportsBlame: boolean;
  supportsFileContents: boolean;
  supportsTags: boolean;
}

// ─── Input / Output Types ────────────────────────────────────

export interface BranchInfo {
  name: string;
  current: boolean;
}

export interface CommitInfo {
  hash: string;
  author: string;
  subject: string;
  date: string;
}

export interface DiffResult {
  from: string;
  to: string;
  diff: string;
}

export interface PullRequestInput {
  title: string;
  body?: string;
  head: string;
  base: string;
}

export interface PullRequestInfo {
  id: number | string;
  title: string;
  state: string;
  head: string;
  base: string;
  url: string;
}

export interface FileContents {
  path: string;
  content: string;
  encoding: string;
}

export interface BlameEntry {
  line: number;
  hash: string;
  author: string;
  date: string;
  content: string;
}

// ─── Error Classification ────────────────────────────────────

export type GitErrorKind =
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'CONFLICT'
  | 'TRANSIENT'
  | 'INVALID_INPUT'
  | 'UNKNOWN';

export interface GitError {
  kind: GitErrorKind;
  message: string;
  detail?: string;
}

// ─── Provider Interface ──────────────────────────────────────

export interface GitProvider {
  readonly providerName: string;
  readonly capabilities: GitCapabilities;

  listBranches(): Promise<BranchInfo[]>;
  createBranch(name: string, from?: string): Promise<{ branch: string; created: boolean }>;
  listCommits(limit?: number): Promise<CommitInfo[]>;
  getDiff(from?: string, to?: string): Promise<DiffResult>;
  getFileContents(path: string, ref?: string): Promise<FileContents>;
  blame(path: string): Promise<BlameEntry[]>;
  createPR(input: PullRequestInput): Promise<PullRequestInfo>;
  listPRs(state?: 'open' | 'closed' | 'all'): Promise<PullRequestInfo[]>;
  mergePR(id: number | string): Promise<{ merged: boolean }>;
}
