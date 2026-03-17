// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * GitHub Provider
 *
 * Concrete implementation of the GitProvider contract using the GitHub
 * REST API via curl. Supports both PAT and GitHub App token auth.
 *
 * Features:
 * - Rate limit handling with exponential backoff on 429/403
 * - Error classification (NOT_FOUND, PERMISSION_DENIED, TRANSIENT, etc.)
 * - No external SDK dependency — uses curl via shell executor
 *
 * @module sdlc/adapters/providers/github
 */

import { shellExec, isBinaryAvailable } from '../shell-executor.js';
import type {
  GitProvider,
  GitCapabilities,
  GitErrorKind,
  BranchInfo,
  CommitInfo,
  DiffResult,
  PullRequestInput,
  PullRequestInfo,
  FileContents,
  BlameEntry,
} from '../contracts/git-provider.js';

// ─── Configuration ───────────────────────────────────────────

export interface GitHubProviderConfig {
  owner: string;
  repo: string;
  token?: string;
  apiBase?: string;
  timeout?: number;
}

// ─── Error helpers ───────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function classifyHttpError(status: number, _body: unknown): GitErrorKind {
  if (status === 404) return 'NOT_FOUND';
  if (status === 403) return 'PERMISSION_DENIED';
  if (status === 429) return 'TRANSIENT';
  if (status === 422) return 'INVALID_INPUT';
  if (status >= 500) return 'TRANSIENT';
  return 'UNKNOWN';
}

class GitHubApiError extends Error {
  constructor(
    public readonly kind: GitErrorKind,
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'GitHubApiError';
  }
}

// ─── GitHub API helper ───────────────────────────────────────

interface ApiResponse {
  status: number;
  body: unknown;
}

async function ghApi(
  method: string,
  url: string,
  token: string,
  body?: Record<string, unknown>,
  timeout = 30_000,
  exec: typeof shellExec = shellExec
): Promise<ApiResponse> {
  const args = [
    '-s',
    '-w',
    '\n%{http_code}',
    '-X',
    method,
    '-H',
    'Accept: application/vnd.github+json',
    '-H',
    `Authorization: Bearer ${token}`,
    '-H',
    'X-GitHub-Api-Version: 2022-11-28',
  ];
  if (body) {
    args.push('-H', 'Content-Type: application/json');
    args.push('-d', JSON.stringify(body));
  }
  args.push(url);

  const result = await exec('curl', args, { timeout });
  const lines = result.stdout.trimEnd().split('\n');
  const statusCode = parseInt(lines[lines.length - 1], 10) || 0;
  const jsonBody = lines.slice(0, -1).join('\n');

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonBody);
  } catch {
    parsed = { raw: jsonBody };
  }

  return { status: statusCode, body: parsed };
}

async function ghApiWithRetry(
  method: string,
  url: string,
  token: string,
  body?: Record<string, unknown>,
  timeout = 30_000,
  exec: typeof shellExec = shellExec
): Promise<ApiResponse> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await ghApi(method, url, token, body, timeout, exec);
      if (resp.status === 429 || (resp.status === 403 && attempt < MAX_RETRIES)) {
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
        continue;
      }
      return resp;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
    }
  }
  throw lastErr;
}

// ─── GitHub Provider ─────────────────────────────────────────

export class GitHubProvider implements GitProvider {
  readonly providerName = 'github';
  readonly capabilities: GitCapabilities = {
    supportsPR: true,
    supportsMerge: true,
    supportsBlame: false, // Blame requires git CLI, not REST API
    supportsFileContents: true,
    supportsTags: true,
  };

  private _config: GitHubProviderConfig;
  /** @internal — test-only override */
  _exec: typeof shellExec = shellExec;
  /** @internal — test-only override */
  _isAvail: typeof isBinaryAvailable = isBinaryAvailable;

  constructor(config: GitHubProviderConfig) {
    this._config = config;
  }

  private _token(): string {
    return this._config.token || process.env.GITHUB_TOKEN || '';
  }

  private _base(): string {
    return this._config.apiBase || 'https://api.github.com';
  }

  private _repoUrl(): string {
    return `${this._base()}/repos/${this._config.owner}/${this._config.repo}`;
  }

  private _timeout(): number {
    return this._config.timeout ?? 30_000;
  }

  private _ensureSuccess(resp: ApiResponse, operation: string): void {
    if (resp.status >= 400) {
      const kind = classifyHttpError(resp.status, resp.body);
      const msg =
        typeof resp.body === 'object' && resp.body !== null
          ? (resp.body as Record<string, unknown>).message || JSON.stringify(resp.body)
          : String(resp.body);
      throw new GitHubApiError(
        kind,
        `${operation} failed (HTTP ${resp.status}): ${msg}`,
        resp.status
      );
    }
  }

  async listBranches(): Promise<BranchInfo[]> {
    const resp = await ghApiWithRetry(
      'GET',
      `${this._repoUrl()}/branches?per_page=100`,
      this._token(),
      undefined,
      this._timeout(),
      this._exec
    );
    this._ensureSuccess(resp, 'listBranches');

    const data = resp.body as Array<{ name: string; protected: boolean }>;
    const defaultBranch = await this._getDefaultBranch();
    return data.map((b) => ({ name: b.name, current: b.name === defaultBranch }));
  }

  async createBranch(name: string, from?: string): Promise<{ branch: string; created: boolean }> {
    const sha = from || (await this._getHeadSha());
    const resp = await ghApiWithRetry(
      'POST',
      `${this._repoUrl()}/git/refs`,
      this._token(),
      { ref: `refs/heads/${name}`, sha },
      this._timeout(),
      this._exec
    );
    this._ensureSuccess(resp, 'createBranch');
    return { branch: name, created: true };
  }

  async listCommits(limit = 10): Promise<CommitInfo[]> {
    const resp = await ghApiWithRetry(
      'GET',
      `${this._repoUrl()}/commits?per_page=${limit}`,
      this._token(),
      undefined,
      this._timeout(),
      this._exec
    );
    this._ensureSuccess(resp, 'listCommits');

    const data = resp.body as Array<{
      sha: string;
      commit: { author: { name: string; date: string }; message: string };
    }>;
    return data.map((c) => ({
      hash: c.sha,
      author: c.commit.author.name,
      subject: c.commit.message.split('\n')[0],
      date: c.commit.author.date,
    }));
  }

  async getDiff(from?: string, to?: string): Promise<DiffResult> {
    const base = from || 'HEAD~1';
    const head = to || 'HEAD';
    const resp = await ghApiWithRetry(
      'GET',
      `${this._repoUrl()}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`,
      this._token(),
      undefined,
      this._timeout(),
      this._exec
    );
    this._ensureSuccess(resp, 'getDiff');

    const data = resp.body as {
      diff_url?: string;
      files?: Array<{ filename: string; status: string; changes: number }>;
    };
    const diffSummary = (data.files || [])
      .map((f) => `${f.status} ${f.filename} (+${f.changes})`)
      .join('\n');
    return { from: base, to: head, diff: diffSummary };
  }

  async getFileContents(path: string, ref?: string): Promise<FileContents> {
    const qs = ref ? `?ref=${encodeURIComponent(ref)}` : '';
    const resp = await ghApiWithRetry(
      'GET',
      `${this._repoUrl()}/contents/${encodeURIComponent(path)}${qs}`,
      this._token(),
      undefined,
      this._timeout(),
      this._exec
    );
    this._ensureSuccess(resp, 'getFileContents');

    const data = resp.body as { content?: string; encoding?: string };
    const content =
      data.encoding === 'base64' && data.content
        ? Buffer.from(data.content, 'base64').toString('utf-8')
        : data.content || '';
    return { path, content, encoding: 'utf-8' };
  }

  async blame(_path: string): Promise<BlameEntry[]> {
    // GitHub REST API does not have a blame endpoint; this requires git CLI
    throw new GitHubApiError('UNKNOWN', 'blame is not supported via GitHub REST API');
  }

  async createPR(input: PullRequestInput): Promise<PullRequestInfo> {
    const resp = await ghApiWithRetry(
      'POST',
      `${this._repoUrl()}/pulls`,
      this._token(),
      { title: input.title, body: input.body || '', head: input.head, base: input.base },
      this._timeout(),
      this._exec
    );
    this._ensureSuccess(resp, 'createPR');

    const data = resp.body as {
      number: number;
      title: string;
      state: string;
      html_url: string;
      head: { ref: string };
      base: { ref: string };
    };
    return {
      id: data.number,
      title: data.title,
      state: data.state,
      head: data.head.ref,
      base: data.base.ref,
      url: data.html_url,
    };
  }

  async listPRs(state: 'open' | 'closed' | 'all' = 'open'): Promise<PullRequestInfo[]> {
    const resp = await ghApiWithRetry(
      'GET',
      `${this._repoUrl()}/pulls?state=${state}&per_page=30`,
      this._token(),
      undefined,
      this._timeout(),
      this._exec
    );
    this._ensureSuccess(resp, 'listPRs');

    const data = resp.body as Array<{
      number: number;
      title: string;
      state: string;
      html_url: string;
      head: { ref: string };
      base: { ref: string };
    }>;
    return data.map((pr) => ({
      id: pr.number,
      title: pr.title,
      state: pr.state,
      head: pr.head.ref,
      base: pr.base.ref,
      url: pr.html_url,
    }));
  }

  async mergePR(id: number | string): Promise<{ merged: boolean }> {
    const resp = await ghApiWithRetry(
      'PUT',
      `${this._repoUrl()}/pulls/${id}/merge`,
      this._token(),
      { merge_method: 'squash' },
      this._timeout(),
      this._exec
    );
    this._ensureSuccess(resp, 'mergePR');
    return { merged: true };
  }

  // ─── Private helpers ─────────────────────────────────────

  private async _getDefaultBranch(): Promise<string> {
    const resp = await ghApiWithRetry(
      'GET',
      this._repoUrl(),
      this._token(),
      undefined,
      this._timeout(),
      this._exec
    );
    if (resp.status >= 400) return 'main';
    const data = resp.body as { default_branch?: string };
    return data.default_branch || 'main';
  }

  private async _getHeadSha(): Promise<string> {
    const defaultBranch = await this._getDefaultBranch();
    const resp = await ghApiWithRetry(
      'GET',
      `${this._repoUrl()}/git/ref/heads/${encodeURIComponent(defaultBranch)}`,
      this._token(),
      undefined,
      this._timeout(),
      this._exec
    );
    if (resp.status >= 400) throw new GitHubApiError('NOT_FOUND', 'Could not resolve HEAD SHA');
    const data = resp.body as { object?: { sha?: string } };
    return data.object?.sha || '';
  }
}
