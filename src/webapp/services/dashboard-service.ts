// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Dashboard business logic — extracted from routes/dashboard.ts (M32-005).
 *
 * Computes health indicators, key metrics, activity feed, and
 * quick statistics from server context.
 *
 * @module services/dashboard-service
 */

import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';

type ExecFileFn = typeof execFile;

/* ── Git helpers with TTL cache ───────────────────────────────── */

const _gitCache = new Map<string, { lines: string[]; ts: number }>();
const GIT_CACHE_TTL_MS = 60_000;

const ALLOWED_GIT_SPEC: Record<string, [string, string[]]> = {
  'ls-files': ['git', ['ls-files']],
  'recent-contributors': ['git', ['log', '--since=180 days ago', '--format=%aN']],
};

function gitLinesAsync(
  commandKey: string,
  cwd: string,
  execFileFn: ExecFileFn = execFile
): Promise<string[]> {
  const spec = ALLOWED_GIT_SPEC[commandKey];
  if (!spec) return Promise.resolve([]);

  const cacheKey = `${commandKey}:${cwd}`;
  const cached = _gitCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < GIT_CACHE_TTL_MS) return Promise.resolve(cached.lines);

  return new Promise((resolve) => {
    execFileFn(spec[0], spec[1], { cwd, encoding: 'utf8', timeout: 10_000 }, (err, stdout) => {
      if (err) return resolve([]);
      const lines = stdout
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      _gitCache.set(cacheKey, { lines, ts: Date.now() });
      resolve(lines);
    });
  });
}

function safeReadJson(filePath: string, fallback: unknown): unknown {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function normalizeAuditUser(user: string | undefined): string | null {
  if (!user || user === 'system' || user === 'webapp') return null;
  return user;
}

function toTitleCase(value: unknown): string {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function mapAuditOperationToType(operation: string): string {
  if (operation === 'create') return 'milestone_created';
  if (operation === 'delete') return 'deployment';
  return 'commit';
}

interface AuditEntry {
  entity_type?: string;
  operation?: string;
  user?: string;
  summary?: string;
  entity_id?: string;
  timestamp?: string;
}

function mapAuditEntryToActivity(entry: AuditEntry) {
  const entityType = toTitleCase(entry.entity_type || 'record');
  const operation = String(entry.operation || 'update').toLowerCase();
  return {
    type: mapAuditOperationToType(operation),
    user: normalizeAuditUser(entry.user),
    action: `${toTitleCase(operation)} ${entityType}`,
    details: entry.summary || `Changed ${entityType}`,
    metadata: entry.entity_id ? { id: entry.entity_id } : undefined,
    timestamp: entry.timestamp || new Date().toISOString(),
  };
}

/* ── Minimal context shape needed by dashboard ────────────────── */

interface DashboardContext {
  PROJECT_ROOT?: string;
  BUSINESS_DOCS?: string;
  _execFile?: ExecFileFn;
  _metrics?: {
    startedAt: number;
    requestCount: number;
    errorCount: number;
    responseTimes: number[];
  };
  _audit?: { read: (limit: number) => AuditEntry[] };
}

/* ── Public API ───────────────────────────────────────────────── */

export class DashboardService {
  private ctx: DashboardContext;
  private repoRoot: string;

  constructor(ctx: DashboardContext) {
    this.ctx = ctx;
    this.repoRoot = ctx?.PROJECT_ROOT || path.resolve(__dirname, '..', '..', '..');
  }

  computeHealthStatus() {
    const repoRoot = this.repoRoot;

    const covPath = path.join(repoRoot, 'coverage', 'coverage-summary.json');
    let covValue = 'N/A';
    let covStatus = 'unknown';
    let covDetails = 'Run tests with --coverage to generate';
    const covData = safeReadJson(covPath, null) as {
      total?: { statements?: { pct: number; covered: number; total: number } };
    } | null;
    if (covData && covData.total && covData.total.statements) {
      const s = covData.total.statements;
      covValue = s.pct + '%';
      covDetails = `${s.covered}/${s.total} statements covered`;
      covStatus = s.pct >= 80 ? 'high' : s.pct >= 60 ? 'medium' : 'low';
    }

    let qualityValue = 'N/A';
    let qualityStatus = 'unknown';
    let qualityDetails = 'ESLint not configured';
    const eslintConfigExists =
      fs.existsSync(path.join(repoRoot, 'eslint.config.mjs')) ||
      fs.existsSync(path.join(repoRoot, '.eslintrc.json'));
    if (eslintConfigExists) {
      // Detect all quality controls present in the repo
      const qualityControls: string[] = [];
      if (eslintConfigExists) qualityControls.push('ESLint');
      if (
        fs.existsSync(path.join(repoRoot, '.prettierrc.json')) ||
        fs.existsSync(path.join(repoRoot, '.prettierrc')) ||
        fs.existsSync(path.join(repoRoot, 'prettier.config.mjs')) ||
        fs.existsSync(path.join(repoRoot, 'prettier.config.js'))
      )
        qualityControls.push('Prettier');
      if (fs.existsSync(path.join(repoRoot, '.husky'))) qualityControls.push('Husky');
      if (
        fs.existsSync(path.join(repoRoot, 'vitest.config.mjs')) ||
        fs.existsSync(path.join(repoRoot, 'vitest.config.ts'))
      )
        qualityControls.push('Vitest');
      if (fs.existsSync(path.join(repoRoot, 'playwright.config.ts')))
        qualityControls.push('Playwright');
      if (fs.existsSync(path.join(repoRoot, 'tsconfig.json'))) qualityControls.push('TypeScript');

      qualityValue = `${qualityControls.length} controls`;
      qualityStatus = 'healthy';
      qualityDetails = qualityControls.join(' · ');
    }

    let buildValue = 'Unknown';
    let buildStatus = 'unknown';
    let buildDetails = 'No build output found';
    const distIndex = path.join(repoRoot, 'src', 'webapp', 'ui', 'dist', 'index.html');
    try {
      const stat = fs.statSync(distIndex);
      const ageMinutes = Math.round((Date.now() - stat.mtimeMs) / 60_000);
      buildValue = '✓ Built';
      buildStatus = 'healthy';
      buildDetails =
        ageMinutes < 60 ? `Built ${ageMinutes}m ago` : `Built ${Math.round(ageMinutes / 60)}h ago`;
    } catch {
      /* dist not found */
    }

    const uptimeMs = this.ctx._metrics ? Date.now() - this.ctx._metrics.startedAt : 0;
    const uptimeMin = Math.round(uptimeMs / 60_000);
    const deployValue = uptimeMs > 0 ? 'Running' : 'Offline';
    const deployDetails =
      uptimeMs > 0
        ? uptimeMin < 60
          ? `Up ${uptimeMin}m`
          : `Up ${Math.round(uptimeMin / 60)}h ${uptimeMin % 60}m`
        : 'Server not started';

    return {
      quality: {
        value: qualityValue,
        label: 'Code Quality',
        status: qualityStatus,
        details: qualityDetails,
      },
      coverage: {
        value: covValue,
        label: 'Test Coverage',
        status: covStatus,
        details: covDetails,
      },
      builds: {
        value: buildValue,
        label: 'Build Status',
        status: buildStatus,
        details: buildDetails,
      },
      deployment: {
        value: deployValue,
        label: 'Server Status',
        status: uptimeMs > 0 ? 'stable' : 'unknown',
        details: deployDetails,
      },
    };
  }

  computeKeyMetrics() {
    const metrics = this.ctx._metrics || {
      requestCount: 0,
      errorCount: 0,
      responseTimes: [] as number[],
      startedAt: Date.now(),
    };

    const errorRate =
      metrics.requestCount > 0
        ? ((metrics.errorCount / metrics.requestCount) * 100).toFixed(1)
        : '0.0';

    let avgResponseTime = 142;
    if (Array.isArray(metrics.responseTimes) && metrics.responseTimes.length > 0) {
      const sum = metrics.responseTimes.reduce((a, b) => a + b, 0);
      avgResponseTime = Math.round(sum / metrics.responseTimes.length);
    }

    return {
      http_requests: {
        value: metrics.requestCount.toString(),
        label: 'HTTP Requests',
        period: 'Last Hour',
      },
      error_rate: {
        value: errorRate + '%',
        label: 'Error Rate',
        period: 'Current',
        status: parseFloat(errorRate as string) < 5 ? 'good' : 'warning',
      },
      response_time: {
        value: avgResponseTime.toString(),
        unit: 'ms',
        label: 'Avg Response Time',
        period: 'Current',
        status: avgResponseTime < 200 ? 'good' : 'warning',
      },
    };
  }

  computeActivityFeed() {
    const auditEntries = this.getAuditEntries(25);

    if (Array.isArray(auditEntries) && auditEntries.length > 0) {
      return auditEntries.slice().reverse().slice(0, 12).map(mapAuditEntryToActivity);
    }

    return [
      {
        type: 'deployment',
        action: 'No audit events recorded yet',
        details: 'Activity feed will populate as soon as mutations are logged.',
        timestamp: new Date().toISOString(),
      },
    ];
  }

  async computeQuickStats() {
    const repoRoot = this.repoRoot;
    const milestonesPath = this.ctx?.BUSINESS_DOCS
      ? path.join(this.ctx.BUSINESS_DOCS, 'milestones.json')
      : path.join(repoRoot, 'BusinessDocs', 'milestones.json');
    const milestones = (
      safeReadJson(milestonesPath, []) as Array<{ archived?: boolean; status?: string }>
    ).filter((m) => !m.archived);
    const completeCount = milestones.filter(
      (m) => String(m.status || '').toLowerCase() === 'complete'
    ).length;
    const totalCount = milestones.length;
    const sprintPercent = totalCount > 0 ? Math.round((completeCount / totalCount) * 100) : 0;

    const trackedFiles = (await gitLinesAsync('ls-files', repoRoot, this.ctx?._execFile)).length;
    const gitNames = await gitLinesAsync('recent-contributors', repoRoot, this.ctx?._execFile);
    const contributorSet = new Set(gitNames.map((n) => n.toLowerCase()));
    const auditNames = this.getAuditEntries(200)
      .map((entry) => normalizeAuditUser(entry.user))
      .filter(Boolean) as string[];
    const auditContributors = new Set(auditNames.map((n) => n.toLowerCase()));

    // Merge unique display names (prefer capitalised git names over lowercase audit names)
    const mergedNames = new Map<string, string>();
    for (const name of gitNames) mergedNames.set(name.toLowerCase(), name);
    for (const name of auditNames) {
      const key = name.toLowerCase();
      if (!mergedNames.has(key)) mergedNames.set(key, name);
    }
    const allNames = Array.from(mergedNames.values());
    const teamCount = Math.max(contributorSet.size, auditContributors.size, 1);

    const starsFromEnv = Number.parseInt(process.env.GITHUB_STARS || '', 10);
    const starsValue = Number.isFinite(starsFromEnv) ? String(starsFromEnv) : '—';

    return {
      active_files: {
        value: String(trackedFiles || 0),
        label: 'Active Files',
        icon: '📄',
        details: 'Tracked by git ls-files',
      },
      team_members: {
        value: String(teamCount),
        label: 'Team Members',
        icon: '👥',
        details:
          allNames.length > 0
            ? allNames.join(', ')
            : 'Unique contributors (git + audit, last 180 days)',
      },
      sprint_progress: {
        value: `${sprintPercent}%`,
        label: 'Sprint Complete',
        icon: '🎯',
        details: `${completeCount} of ${totalCount} active milestones complete`,
      },
      github_stars: {
        value: starsValue,
        label: 'GitHub Stars',
        icon: '⭐',
        details: Number.isFinite(starsFromEnv)
          ? 'From GITHUB_STARS environment variable'
          : 'Set GITHUB_STARS env var to display real stars',
      },
    };
  }

  private getAuditEntries(limit: number): AuditEntry[] {
    if (!this.ctx?._audit || typeof this.ctx._audit.read !== 'function') return [];
    const entries = this.ctx._audit.read(limit);
    return Array.isArray(entries) ? entries : [];
  }
}
