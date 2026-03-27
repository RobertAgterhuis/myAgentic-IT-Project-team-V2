// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * CI Adapter
 *
 * Adapter for CI/CD pipeline operations: trigger builds, query build status,
 * retrieve logs, and manage workflows. Supports GitHub Actions as the primary
 * target with an extensible operation map.
 *
 * Uses the GitHub REST API via shell-based curl calls to avoid a hard
 * dependency on octokit. The GITHUB_TOKEN environment variable must be set
 * for authenticated operations.
 *
 * @module sdlc/adapters/ci-adapter
 */

import {
  BaseAdapter,
  ADAPTER_CATEGORIES,
  HEALTH_STATUS,
  type HealthCheck,
} from './tool-adapter.js';
import { shellExec, withToolGuardrails } from './shell-executor.js';

export interface CiConfig {
  [key: string]: unknown;
  provider: 'github-actions' | 'azure-devops' | 'generic';
  repository?: string;
  token?: string;
  apiBase?: string;
}

// ─── Retry helper ────────────────────────────────────────────

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS * (attempt + 1));
    }
  }
  throw lastErr;
}

// ─── GitHub API helper ───────────────────────────────────────

interface GitHubResponse {
  status: number;
  body: unknown;
}

async function ghApi(
  method: string,
  url: string,
  token: string,
  body?: Record<string, unknown>,
  params?: Record<string, unknown>
): Promise<GitHubResponse> {
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

  const result = await shellExec('curl', args, withToolGuardrails({ timeout: 30_000 }, params));
  const lines = result.stdout.trimEnd().split('\n');
  const statusCode = parseInt(lines[lines.length - 1], 10) || 0;
  const jsonBody = lines.slice(0, -1).join('\n');

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonBody);
  } catch {
    parsed = { raw: jsonBody };
  }

  if (statusCode === 403 || statusCode === 429) {
    throw new Error(`GitHub API rate limited (HTTP ${statusCode})`);
  }

  return { status: statusCode, body: parsed };
}

// ─── CiAdapter ───────────────────────────────────────────────

export class CiAdapter extends BaseAdapter {
  readonly name = 'ci';
  readonly category = ADAPTER_CATEGORIES.CI;
  readonly version = '1.0.0';

  private _token(): string {
    return (this._config.token as string) || process.env.GITHUB_TOKEN || '';
  }

  private _apiBase(): string {
    return (this._config.apiBase as string) || 'https://api.github.com';
  }

  private _repo(): string {
    return (this._config.repository as string) || '';
  }

  constructor(config: CiConfig = { provider: 'github-actions' }) {
    super();
    this._config = config as Record<string, unknown>;

    // ── trigger-workflow ──────────────────────────────────
    this._operations.set('trigger-workflow', async (params) => {
      const repo = (params.repository as string) || this._repo();
      const workflow = params.workflow as string;
      const ref = (params.ref as string) || 'main';
      if (!repo) throw new Error('repository is required');
      if (!workflow) throw new Error('workflow is required');

      const url = `${this._apiBase()}/repos/${repo}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`;
      const resp = await withRetry(() => ghApi('POST', url, this._token(), { ref }, params));

      if (resp.status === 204 || resp.status === 200) {
        return { workflow, repository: repo, ref, status: 'triggered' };
      }
      throw new Error(`GitHub API returned HTTP ${resp.status}: ${JSON.stringify(resp.body)}`);
    });

    // ── get-build-status ─────────────────────────────────
    this._operations.set('get-build-status', async (params) => {
      const repo = (params.repository as string) || this._repo();
      const runId = params.run_id as string;
      if (!repo) throw new Error('repository is required');
      if (!runId) throw new Error('run_id is required');

      const url = `${this._apiBase()}/repos/${repo}/actions/runs/${encodeURIComponent(String(runId))}`;
      const resp = await withRetry(() => ghApi('GET', url, this._token(), undefined, params));

      if (resp.status === 200) {
        const data = resp.body as Record<string, unknown>;
        return {
          run_id: runId,
          status: data.status,
          conclusion: data.conclusion,
          html_url: data.html_url,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      }
      throw new Error(`GitHub API returned HTTP ${resp.status}`);
    });

    // ── list-workflows ───────────────────────────────────
    this._operations.set('list-workflows', async (params) => {
      const repo = (params.repository as string) || this._repo();
      if (!repo) throw new Error('repository is required');

      const url = `${this._apiBase()}/repos/${repo}/actions/workflows`;
      const resp = await withRetry(() => ghApi('GET', url, this._token(), undefined, params));

      if (resp.status === 200) {
        const data = resp.body as { workflows?: Array<Record<string, unknown>> };
        return {
          workflows: (data.workflows || []).map((w) => ({
            id: w.id,
            name: w.name,
            state: w.state,
            path: w.path,
          })),
        };
      }
      throw new Error(`GitHub API returned HTTP ${resp.status}`);
    });

    // ── get-logs ─────────────────────────────────────────
    this._operations.set('get-logs', async (params) => {
      const repo = (params.repository as string) || this._repo();
      const runId = params.run_id as string;
      if (!repo) throw new Error('repository is required');
      if (!runId) throw new Error('run_id is required');

      const url = `${this._apiBase()}/repos/${repo}/actions/runs/${encodeURIComponent(String(runId))}/logs`;
      const resp = await withRetry(() => ghApi('GET', url, this._token(), undefined, params));

      // GitHub redirects to a download URL; curl follows by default with -L
      return {
        run_id: runId,
        status: resp.status,
        logs: typeof resp.body === 'string' ? resp.body : JSON.stringify(resp.body),
      };
    });
  }

  async healthCheck(): Promise<HealthCheck> {
    const token = this._token();
    if (!token) {
      return {
        status: HEALTH_STATUS.UNCONFIGURED,
        adapter: this.name,
        category: this.category,
        message: 'GITHUB_TOKEN not set',
        checked_at: new Date().toISOString(),
      };
    }

    if (!this._config.provider) {
      return {
        status: HEALTH_STATUS.UNCONFIGURED,
        adapter: this.name,
        category: this.category,
        message: 'CI provider not configured',
        checked_at: new Date().toISOString(),
      };
    }

    return {
      status: HEALTH_STATUS.HEALTHY,
      adapter: this.name,
      category: this.category,
      message: `CI provider: ${this._config.provider}, token: present`,
      checked_at: new Date().toISOString(),
    };
  }

  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const validProviders = ['github-actions', 'azure-devops', 'generic'];
    if (!config.provider || !validProviders.includes(config.provider as string)) {
      errors.push(`provider must be one of: ${validProviders.join(', ')}`);
    }
    return { valid: errors.length === 0, errors };
  }
}
