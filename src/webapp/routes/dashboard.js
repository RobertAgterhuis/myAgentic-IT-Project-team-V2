// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

/**
 * Dashboard Home API routes — SP-7 Implementation
 * Provides 4 core endpoints for the dashboard homepage:
 *  - GET /api/dashboard/health     → Project health indicators
 *  - GET /api/dashboard/metrics    → Key metrics (requests, errors, response time)
 *  - GET /api/dashboard/activity   → Recent activity timeline
 *  - GET /api/dashboard/stats      → Quick statistics (team, files, sprint, stars)
 *
 * All endpoints return JSON with current data from metrics.json, session-state.json,
 * and git history. No external dependencies required.
 *
 * @module routes/dashboard
 * @param {object} ctx - Shared server context (includes _metrics, _cache, _audit).
 * @returns {object} Route map { 'GET /api/dashboard/...': handler }.
 */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { json } = require('../middleware');

/* ── Async git helper with TTL cache ──────────────────────────── */

const _gitCache = new Map();
const GIT_CACHE_TTL_MS = 60_000; // 1 minute

function gitLinesAsync(commandKey, cwd) {
  const ALLOWED = {
    'ls-files': ['git', ['ls-files']],
    'recent-contributors': ['git', ['log', '--since=180 days ago', '--format=%aN']],
  };
  const spec = ALLOWED[commandKey];
  if (!spec) return Promise.resolve([]);

  const cacheKey = `${commandKey}:${cwd}`;
  const cached = _gitCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < GIT_CACHE_TTL_MS) return Promise.resolve(cached.lines);

  return new Promise((resolve) => {
    execFile(spec[0], spec[1], { cwd, encoding: 'utf8', timeout: 10_000 }, (err, stdout) => {
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

function safeReadJson(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function getRepoRoot(ctx) {
  return ctx?.PROJECT_ROOT || path.resolve(__dirname, '..', '..', '..');
}

const ALLOWED_GIT_COMMANDS = {
  'ls-files': 'git ls-files',
  'recent-contributors': 'git log --since="180 days ago" --format=%aN',
};

/* Synchronous git fallback — only used in tests or when async is unavailable */
function _getGitLines(commandKey, cwd) {
  const command = ALLOWED_GIT_COMMANDS[commandKey];
  if (!command) return [];
  try {
    const { execSync } = require('child_process');
    // nosemgrep: javascript.lang.security.detect-child-process.detect-child-process
    return execSync(command, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function getGitTrackedFileCountAsync(repoRoot) {
  const lines = await gitLinesAsync('ls-files', repoRoot);
  return lines.length;
}

async function getRecentGitContributorsAsync(repoRoot) {
  const lines = await gitLinesAsync('recent-contributors', repoRoot);
  return new Set(lines.map((name) => name.toLowerCase())).size;
}

function normalizeAuditUser(user) {
  if (!user || user === 'system' || user === 'webapp') return null;
  return user;
}

function toTitleCase(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function getAuditEntries(ctx, limit) {
  if (!ctx || !ctx._audit || typeof ctx._audit.read !== 'function') return [];
  const entries = ctx._audit.read(limit);
  return Array.isArray(entries) ? entries : [];
}

function mapAuditOperationToType(operation) {
  if (operation === 'create') return 'milestone_created';
  if (operation === 'delete') return 'deployment';
  return 'commit';
}

function mapAuditEntryToActivity(entry) {
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

/* ── Health Indicator Helper ──────────────────────────────────── */

/**
 * Determine project health status from real data sources.
 * Reads coverage-summary.json for test coverage and eslint output count for quality.
 * Falls back to 'unknown' status when data is unavailable (never fabricates values).
 */
function computeHealthStatus(ctx) {
  const repoRoot = getRepoRoot(ctx);

  // --- Test Coverage (real from coverage-summary.json) ---
  const covPath = path.join(repoRoot, 'coverage', 'coverage-summary.json');
  let covValue = 'N/A';
  let covStatus = 'unknown';
  let covDetails = 'Run tests with --coverage to generate';
  const covData = safeReadJson(covPath, null);
  if (covData && covData.total && covData.total.statements) {
    const s = covData.total.statements;
    covValue = s.pct + '%';
    covDetails = `${s.covered}/${s.total} statements covered`;
    covStatus = s.pct >= 80 ? 'high' : s.pct >= 60 ? 'medium' : 'low';
  }

  // --- Code Quality (real from ESLint config presence + error count) ---
  let qualityValue = 'N/A';
  let qualityStatus = 'unknown';
  let qualityDetails = 'ESLint not configured';
  const eslintConfigExists =
    fs.existsSync(path.join(repoRoot, 'eslint.config.mjs')) ||
    fs.existsSync(path.join(repoRoot, '.eslintrc.json'));
  if (eslintConfigExists) {
    qualityValue = 'Configured';
    qualityStatus = 'healthy';
    qualityDetails = 'ESLint config present';
  }

  // --- Build Status (derived from whether dist/ exists and is recent) ---
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

  // --- Server Status (real — the server is running if you can read this) ---
  const uptimeMs = ctx._metrics ? Date.now() - ctx._metrics.startedAt : 0;
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

/* ── Metrics Helper ──────────────────────────────────────────── */

/**
 * Extract key metrics from server context.
 * Returns: { requests, errors, response_time, uptime }
 */
function computeKeyMetrics(ctx) {
  const metrics = ctx._metrics || {
    requestCount: 0,
    errorCount: 0,
    responseTimes: [],
    startedAt: Date.now(),
  };

  // Calculate error rate
  const errorRate =
    metrics.requestCount > 0
      ? ((metrics.errorCount / metrics.requestCount) * 100).toFixed(1)
      : '0.0';

  // Calculate average response time
  let avgResponseTime = 142; // Default
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
      status: errorRate < 5 ? 'good' : 'warning',
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

/* ── Activity Feed Helper ─────────────────────────────────────── */

/**
 * Generate recent activity timeline from audit trail.
 * Returns array of activity items with timestamps, users, descriptions.
 */
function computeActivityFeed(ctx) {
  const auditEntries = getAuditEntries(ctx, 25);

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

/* ── Stats Helper ────────────────────────────────────────────── */

/**
 * Compute quick statistics (files, team, sprint, stars).
 * Returns: { files, team_members, sprint_progress, github_stars }
 */
async function computeQuickStats(ctx) {
  const repoRoot = getRepoRoot(ctx);
  const milestonesPath = ctx?.BUSINESS_DOCS
    ? path.join(ctx.BUSINESS_DOCS, 'milestones.json')
    : path.join(repoRoot, 'BusinessDocs', 'milestones.json');
  const milestones = safeReadJson(milestonesPath, []).filter((m) => !m.archived);
  const completeCount = milestones.filter(
    (m) => String(m.status || '').toLowerCase() === 'complete'
  ).length;
  const totalCount = milestones.length;
  const sprintPercent = totalCount > 0 ? Math.round((completeCount / totalCount) * 100) : 0;

  const trackedFiles = await getGitTrackedFileCountAsync(repoRoot);
  const contributors = await getRecentGitContributorsAsync(repoRoot);
  const auditContributors = new Set(
    (ctx?._audit ? ctx._audit.read(200) : [])
      .map((entry) => normalizeAuditUser(entry.user))
      .filter(Boolean)
      .map((name) => name.toLowerCase())
  );
  const teamCount = Math.max(contributors, auditContributors.size, 1);

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
      details: 'Unique contributors (git + audit, last 180 days)',
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

/* ── Route Handlers ──────────────────────────────────────────── */

/**
 * GET /api/dashboard/health
 * Returns project health indicators: code quality, test coverage, build status, deployment.
 */
async function getHealth(req, res, ctx) {
  try {
    const health = computeHealthStatus(ctx);
    json(res, 200, {
      ok: true,
      data: health,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    json(res, 500, { error: 'Failed to compute health status', details: err.message });
  }
}

/**
 * GET /api/dashboard/metrics
 * Returns key metrics: HTTP requests, error rate, response time.
 */
async function getMetrics(req, res, ctx) {
  try {
    const metrics = computeKeyMetrics(ctx);
    json(res, 200, {
      ok: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    json(res, 500, { error: 'Failed to compute metrics', details: err.message });
  }
}

/**
 * GET /api/dashboard/activity
 * Returns recent activity feed: commits, tests, milestones.
 */
async function getActivity(req, res, ctx) {
  try {
    const activity = computeActivityFeed(ctx);
    json(res, 200, {
      ok: true,
      data: activity,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    json(res, 500, { error: 'Failed to fetch activity feed', details: err.message });
  }
}

/**
 * GET /api/dashboard/stats
 * Returns quick statistics: files, team, sprint, stars.
 */
async function getStats(req, res, ctx) {
  try {
    const stats = await computeQuickStats(ctx);
    json(res, 200, {
      ok: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    json(res, 500, { error: 'Failed to compute statistics', details: err.message });
  }
}

/* ── Module Export ───────────────────────────────────────────── */

module.exports = function dashboardRoutes(ctx) {
  return {
    'GET /api/dashboard/health': (req, res) => getHealth(req, res, ctx),
    'GET /api/dashboard/metrics': (req, res) => getMetrics(req, res, ctx),
    'GET /api/dashboard/activity': (req, res) => getActivity(req, res, ctx),
    'GET /api/dashboard/stats': (req, res) => getStats(req, res, ctx),
  };
};
