// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

/**
 * Metrics & Velocity Dashboard route — GET /api/metrics/dashboard.
 * Reads velocity-log.json and sprint KPI files to produce a unified
 * dashboard payload. FEAT-01.
 * @module routes/metrics-dashboard
 * @param {object} ctx - Shared server context.
 * @returns {object} Route map { 'METHOD /path': handler }.
 */

const path = require('path');
const { getStore } = require('../store');
const { json }     = require('../middleware');

const KPI_FILE_RE   = /^sprint-SP-\d+-kpi\.json$/;
const SPRINT_DIR_RE = /^sprint-SP-\d+$/;

/* ── Helpers ───────────────────────────────────────────────────── */

function sprintNum(id) {
  const m = id.match(/SP-(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function sortBySprint(a, b) { return sprintNum(a.sprint_id) - sprintNum(b.sprint_id); }

function safeReaddir(store, dir) {
  try { return store.exists(dir) ? store.readdir(dir) : []; }
  catch { return []; }
}

/** Scan .github/docs/metrics/ for sprint KPI files. */
function scanMetricsDir(store, githubDocs) {
  const dir = path.join(githubDocs, 'metrics');
  return safeReaddir(store, dir)
    .filter(e => KPI_FILE_RE.test(e))
    .map(e => ({ path: path.join(dir, e), source: 'metrics' }));
}

/** Scan .github/docs/phase-5/sprint-SP-N/ for sprint KPI files. */
function scanPhase5Dir(store, githubDocs) {
  const dir = path.join(githubDocs, 'phase-5');
  const results = [];
  for (const d of safeReaddir(store, dir).filter(e => SPRINT_DIR_RE.test(e))) {
    const fp = path.join(dir, d, `${d}-kpi.json`);
    if (store.exists(fp)) results.push({ path: fp, source: 'phase5' });
  }
  return results;
}

/** Normalise a "metrics" format KPI file. */
function normaliseMetrics(raw) {
  return {
    sprint_id: raw.sprint_id,
    date: raw.measured_on ? raw.measured_on.slice(0, 10) : null,
    summary: raw.summary || {},
    tests: null, quality: null, kpis: raw.kpis,
  };
}

/** Normalise a "phase5" format KPI file. */
function normalisePhase5(raw) {
  return {
    sprint_id: raw.sprint || raw.sprint_id,
    date: raw.date || null,
    summary: { on_track: null, at_risk: null, off_track: null },
    tests: raw.tests || null, quality: raw.quality || null, kpis: null,
  };
}

function normaliseKpi(raw, source) {
  if (source === 'metrics' && raw.sprint_id && Array.isArray(raw.kpis)) return normaliseMetrics(raw);
  if (source === 'phase5' && (raw.sprint || raw.sprint_id)) return normalisePhase5(raw);
  return null;
}

function mergeKpi(existing, norm) {
  if (norm.tests && !existing.tests) existing.tests = norm.tests;
  if (norm.quality && !existing.quality) existing.quality = norm.quality;
  if (norm.kpis && !existing.kpis) existing.kpis = norm.kpis;
}

function buildQualityTrend(kpis) {
  return kpis.filter(k => k.tests || k.quality).map(k => ({
    sprint_id: k.sprint_id,
    tests_total: k.tests ? k.tests.total : null,
    tests_passed: k.tests ? k.tests.passed : null,
    tests_failed: k.tests ? k.tests.failed : null,
    regressions: k.quality ? k.quality.regressions : null,
    security_findings: k.quality ? k.quality.security_findings : null,
  }));
}

/* ── Route factory ─────────────────────────────────────────────── */

module.exports = function createMetricsDashboardRoutes(ctx) {
  const { _cache, GITHUB_DOCS } = ctx;
  const VELOCITY_FILE = path.join(GITHUB_DOCS, 'retrospectives', 'velocity-log.json');

  function readVelocity(store) {
    if (!store.exists(VELOCITY_FILE)) return { sprints: [] };
    try { return JSON.parse(_cache.read(VELOCITY_FILE)); }
    catch { return { sprints: [] }; }
  }

  function collectKpis(store) {
    const files = [...scanMetricsDir(store, GITHUB_DOCS), ...scanPhase5Dir(store, GITHUB_DOCS)];
    const map = new Map();
    for (const { path: fp, source } of files) {
      try {
        const norm = normaliseKpi(JSON.parse(_cache.read(fp)), source);
        if (!norm) continue;
        const existing = map.get(norm.sprint_id);
        if (existing) mergeKpi(existing, norm); else map.set(norm.sprint_id, norm);
      } catch { /* skip unreadable */ }
    }
    return Array.from(map.values()).sort(sortBySprint);
  }

  async function apiGetDashboard(_req, res) {
    const store = getStore();
    const velocity = readVelocity(store);
    const kpis = collectKpis(store);

    const sorted = [...(velocity.sprints || [])].sort(sortBySprint);
    let cumulative = 0;
    const burnup = sorted.map(s => {
      cumulative += (s.realized_points || 0);
      return { sprint_id: s.sprint_id, cumulative, planned: s.planned_points || 0, realized: s.realized_points || 0 };
    });

    const estimation = sorted.map(s => ({
      sprint_id: s.sprint_id,
      planned: s.planned_points || 0,
      realized: s.realized_points || 0,
      ratio: s.velocity_ratio !== undefined && s.velocity_ratio !== null ? s.velocity_ratio : null,
    }));

    json(res, 200, {
      velocity: sorted, burnup, kpis,
      qualityTrend: buildQualityTrend(kpis),
      estimation,
      generated_at: new Date().toISOString(),
    });
  }

  return {
    'GET /api/metrics/dashboard': apiGetDashboard,
  };
};
