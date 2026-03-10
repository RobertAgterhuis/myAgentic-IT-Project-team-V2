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
const { json } = require('../middleware');

const KPI_FILE_RE = /^sprint-SP-\d+-kpi\.json$/;
const SPRINT_DIR_RE = /^sprint-SP-\d+$/;

/* ── Helpers ───────────────────────────────────────────────────── */

function sprintNum(id) {
  const m = id.match(/SP-(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function sortBySprint(a, b) {
  return sprintNum(a.sprint_id) - sprintNum(b.sprint_id);
}

function safeReaddir(store, dir) {
  try {
    return store.exists(dir) ? store.readdir(dir) : [];
  } catch {
    return [];
  }
}

/** Scan .github/docs/metrics/ for sprint KPI files. */
function scanMetricsDir(store, githubDocs) {
  const dir = path.join(githubDocs, 'metrics');
  return safeReaddir(store, dir)
    .filter((e) => KPI_FILE_RE.test(e))
    .map((e) => ({ path: path.join(dir, e), source: 'metrics' }));
}

/** Scan .github/docs/phase-5/sprint-SP-N/ for sprint KPI files. */
function scanPhase5Dir(store, githubDocs) {
  const dir = path.join(githubDocs, 'phase-5');
  const results = [];
  for (const d of safeReaddir(store, dir).filter((e) => SPRINT_DIR_RE.test(e))) {
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
    tests: null,
    quality: null,
    kpis: raw.kpis,
  };
}

/** Normalise a "phase5" format KPI file. */
function normalisePhase5(raw) {
  return {
    sprint_id: raw.sprint || raw.sprint_id,
    date: raw.date || null,
    summary: { on_track: null, at_risk: null, off_track: null },
    tests: raw.tests || null,
    quality: raw.quality || null,
    kpis: null,
  };
}

function normaliseKpi(raw, source) {
  if (source === 'metrics' && raw.sprint_id && Array.isArray(raw.kpis))
    return normaliseMetrics(raw);
  if (source === 'phase5' && (raw.sprint || raw.sprint_id)) return normalisePhase5(raw);
  return null;
}

function mergeKpi(existing, norm) {
  if (norm.tests && !existing.tests) existing.tests = norm.tests;
  if (norm.quality && !existing.quality) existing.quality = norm.quality;
  if (norm.kpis && !existing.kpis) existing.kpis = norm.kpis;
}

function computeSkipped(tests) {
  if (!tests) return null;
  if (tests.total === null || tests.total === undefined) return null;
  if (tests.passed === null || tests.passed === undefined) return null;
  if (tests.failed === null || tests.failed === undefined) return null;
  return tests.total - tests.passed - tests.failed;
}

function mapKpiToQuality(k) {
  return {
    sprint_id: k.sprint_id,
    tests_total: k.tests ? k.tests.total : null,
    tests_passed: k.tests ? k.tests.passed : null,
    tests_failed: k.tests ? k.tests.failed : null,
    tests_skipped: computeSkipped(k.tests),
    regressions: k.quality ? k.quality.regressions : null,
    security_findings: k.quality ? k.quality.security_findings : null,
  };
}

function buildQualityTrend(kpis) {
  return kpis.filter((k) => k.tests || k.quality).map(mapKpiToQuality);
}

/* ── FEAT-01-F: Rolling averages (3-sprint moving average) ───── */
function buildRollingAverages(velocity, windowSize) {
  const w = windowSize || 3;
  return velocity.map((s, i) => {
    const start = Math.max(0, i - w + 1);
    const window = velocity.slice(start, i + 1);
    const avgPlanned = window.reduce((a, v) => a + (v.planned_points || 0), 0) / window.length;
    const avgRealized = window.reduce((a, v) => a + (v.realized_points || 0), 0) / window.length;
    return {
      sprint_id: s.sprint_id,
      avg_planned: +avgPlanned.toFixed(1),
      avg_realized: +avgRealized.toFixed(1),
      window: window.length,
    };
  });
}

/* ── FEAT-01-E: Sprint health scorecard (RAG status) ─────────── */
function resolveRatio(s) {
  if (s.velocity_ratio !== null && s.velocity_ratio !== undefined) return s.velocity_ratio;
  return s.planned_points ? s.realized_points / s.planned_points : null;
}

function rateVelocity(ratio) {
  if (ratio === null || ratio === undefined) return 'grey';
  if (ratio >= 0.9) return 'green';
  return ratio >= 0.7 ? 'amber' : 'red';
}

function rateQuality(kpi) {
  if (!kpi || !kpi.tests) return 'grey';
  const failRate = kpi.tests.total ? (kpi.tests.failed || 0) / kpi.tests.total : 0;
  if (failRate === 0) return 'green';
  return failRate <= 0.05 ? 'amber' : 'red';
}

function hasValidSummary(kpi) {
  if (!kpi) return false;
  if (!kpi.summary) return false;
  return kpi.summary.on_track !== null && kpi.summary.on_track !== undefined;
}

function rateKpis(kpi) {
  if (!hasValidSummary(kpi)) return 'grey';
  const total = summaryTotal(kpi.summary);
  if (total <= 0) return 'grey';
  const offPct = (kpi.summary.off_track || 0) / total;
  const riskPct = (kpi.summary.at_risk || 0) / total;
  return offPct > 0.2 ? 'red' : riskPct > 0.3 ? 'amber' : 'green';
}

function overallRAG(rags) {
  if (rags.includes('red')) return 'red';
  if (rags.includes('amber')) return 'amber';
  return rags.every((r) => r === 'green') ? 'green' : 'grey';
}

function buildHealthScorecard(velocity, kpis) {
  const kpiMap = new Map(kpis.map((k) => [k.sprint_id, k]));
  return velocity.map((s) => {
    const kpi = kpiMap.get(s.sprint_id);
    const velocityRAG = rateVelocity(resolveRatio(s));
    const qualityRAG = rateQuality(kpi);
    const kpiRAG = rateKpis(kpi);
    return {
      sprint_id: s.sprint_id,
      velocity: velocityRAG,
      quality: qualityRAG,
      kpis: kpiRAG,
      overall: overallRAG([velocityRAG, qualityRAG, kpiRAG]),
    };
  });
}

/* ── FEAT-01-Q: Sprint-over-sprint delta ─────────────────────── */
function buildDeltas(velocity) {
  return velocity.map((s, i) => {
    if (i === 0)
      return { sprint_id: s.sprint_id, planned_delta: 0, realized_delta: 0, ratio_delta: 0 };
    const prev = velocity[i - 1];
    return {
      sprint_id: s.sprint_id,
      planned_delta: (s.planned_points || 0) - (prev.planned_points || 0),
      realized_delta: (s.realized_points || 0) - (prev.realized_points || 0),
      ratio_delta: +((s.velocity_ratio || 0) - (prev.velocity_ratio || 0)).toFixed(2),
    };
  });
}

/* ── FEAT-01-O: Velocity forecast ────────────────────────────── */
function buildForecast(velocity, totalScope) {
  if (!velocity.length)
    return {
      avg_velocity: 0,
      remaining_points: totalScope || 0,
      sprints_remaining: null,
      projected_date: null,
    };
  const avg = velocity.reduce((a, v) => a + (v.realized_points || 0), 0) / velocity.length;
  const delivered = velocity.reduce((a, v) => a + (v.realized_points || 0), 0);
  const remaining = Math.max(0, (totalScope || delivered) - delivered);
  const sprintsLeft = avg > 0 ? Math.ceil(remaining / avg) : null;
  return {
    avg_velocity: +avg.toFixed(1),
    total_delivered: delivered,
    remaining_points: remaining,
    sprints_remaining: sprintsLeft,
  };
}

/* ── FEAT-01-K: Ideal burnup line for deviation bands ────────── */
function buildIdealBurnup(velocity, totalScope) {
  if (!velocity.length) return [];
  const total = totalScope || velocity.reduce((a, v) => a + (v.realized_points || 0), 0);
  const perSprint = total / velocity.length;
  let cum = 0;
  return velocity.map((s) => {
    cum += perSprint;
    return { sprint_id: s.sprint_id, ideal: +cum.toFixed(1) };
  });
}

/* ── FEAT-01-I: Defect density — regressions + findings per SP ─ */
function computeDefectDensity(regressions, findings, sp) {
  if (regressions === null || regressions === undefined) return null;
  return +((regressions + (findings || 0)) / sp).toFixed(2);
}

function mapSprintDefects(s, kpiMap) {
  const kpi = kpiMap.get(s.sprint_id);
  const regressions = kpi && kpi.quality ? kpi.quality.regressions || 0 : null;
  const findings = kpi && kpi.quality ? kpi.quality.security_findings || 0 : null;
  const sp = s.realized_points || 1;
  return {
    sprint_id: s.sprint_id,
    regressions,
    security_findings: findings,
    defects_per_sp: computeDefectDensity(regressions, findings, sp),
  };
}

function buildDefectDensity(velocity, kpis) {
  const kpiMap = new Map(kpis.map((k) => [k.sprint_id, k]));
  return velocity.map((s) => mapSprintDefects(s, kpiMap));
}

/* ── FEAT-01-G: Scope creep — mid-sprint additions ───────────── */
function buildScopeCreep(velocity) {
  return velocity.map((s) => ({
    sprint_id: s.sprint_id,
    scope_change_points: s.scope_change_excluded_points || 0,
    implemented: s.implemented || 0,
    blocked: s.blocked || 0,
  }));
}

/* ── FEAT-01-R: Estimation accuracy histogram ────────────────── */
function buildEstimationHistogram(velocity) {
  const buckets = { under: 0, on_target: 0, over: 0 };
  velocity.forEach((s) => {
    const ratio = resolveRatio(s);
    if (ratio === null || ratio === undefined) return;
    if (ratio < 0.95) buckets.under++;
    else if (ratio <= 1.05) buckets.on_target++;
    else buckets.over++;
  });
  return buckets;
}

/* ── FEAT-01-P: Risk trend arrows ────────────────────────────── */
function summaryTotal(summary) {
  if (!summary) return 0;
  return (summary.on_track || 0) + (summary.at_risk || 0) + (summary.off_track || 0);
}

function riskDirection(curPct, prevPct) {
  if (curPct < prevPct) return 'improving';
  return curPct > prevPct ? 'worsening' : 'stable';
}

function safeOffTrack(summary) {
  return summary ? summary.off_track || 0 : 0;
}

function safeAtRisk(summary) {
  return summary ? summary.at_risk || 0 : 0;
}

function safePct(value, total) {
  return total ? value / total : 0;
}

function mapRiskEntry(k, prev) {
  const prevSummary = prev ? prev.summary : null;
  const curOff = safeOffTrack(k.summary);
  const prevOff = safeOffTrack(prevSummary);
  const curTotal = summaryTotal(k.summary);
  const prevTotal = summaryTotal(prevSummary);
  return {
    sprint_id: k.sprint_id,
    direction: riskDirection(safePct(curOff, curTotal), safePct(prevOff, prevTotal)),
    off_track: curOff,
    at_risk: safeAtRisk(k.summary),
  };
}

function buildRiskTrend(kpis) {
  return kpis.map((k, i) => mapRiskEntry(k, i > 0 ? kpis[i - 1] : null));
}

/* ── FEAT-01-M: Heatmap data (sprint × metric matrix) ────────── */
function safeFixed(val, digits) {
  if (val === null || val === undefined) return null;
  return +val.toFixed(digits);
}

function extractPassRate(kpi) {
  if (!kpi) return null;
  if (!kpi.tests) return null;
  return kpi.tests.total ? kpi.tests.passed / kpi.tests.total : null;
}

function extractRegressions(kpi) {
  if (!kpi) return null;
  return kpi.quality ? kpi.quality.regressions || 0 : null;
}

function extractOffTrackPct(kpi) {
  if (!kpi) return null;
  if (!kpi.summary) return null;
  const total = summaryTotal(kpi.summary);
  return total ? (kpi.summary.off_track || 0) / total : null;
}

function nullSafe(val) {
  return val !== null && val !== undefined ? val : null;
}

function mapHeatmapEntry(s, kpi) {
  return {
    sprint_id: s.sprint_id,
    velocity_ratio: safeFixed(nullSafe(s.velocity_ratio), 2),
    test_pass_rate: safeFixed(extractPassRate(kpi), 3),
    regressions: extractRegressions(kpi),
    off_track_pct: safeFixed(extractOffTrackPct(kpi), 2),
  };
}

function buildHeatmapData(velocity, kpis) {
  const kpiMap = new Map(kpis.map((k) => [k.sprint_id, k]));
  return velocity.map((s) => mapHeatmapEntry(s, kpiMap.get(s.sprint_id)));
}

/* ── Route factory ─────────────────────────────────────────────── */

module.exports = function createMetricsDashboardRoutes(ctx) {
  const { _cache, GITHUB_DOCS } = ctx;
  const VELOCITY_FILE = path.join(GITHUB_DOCS, 'retrospectives', 'velocity-log.json');

  function readVelocity(store) {
    if (!store.exists(VELOCITY_FILE)) return { sprints: [] };
    try {
      return JSON.parse(_cache.read(VELOCITY_FILE));
    } catch {
      return { sprints: [] };
    }
  }

  function collectKpis(store) {
    const files = [...scanMetricsDir(store, GITHUB_DOCS), ...scanPhase5Dir(store, GITHUB_DOCS)];
    const map = new Map();
    for (const { path: fp, source } of files) {
      try {
        const norm = normaliseKpi(JSON.parse(_cache.read(fp)), source);
        if (!norm) continue;
        const existing = map.get(norm.sprint_id);
        if (existing) mergeKpi(existing, norm);
        else map.set(norm.sprint_id, norm);
      } catch {
        /* skip unreadable */
      }
    }
    return Array.from(map.values()).sort(sortBySprint);
  }

  function sliceLast(arr, n) {
    return n > 0 && n < arr.length ? arr.slice(-n) : arr;
  }

  function buildBurnup(sorted) {
    let cumulative = 0;
    return sorted.map((s) => {
      cumulative += s.realized_points || 0;
      return {
        sprint_id: s.sprint_id,
        cumulative,
        planned: s.planned_points || 0,
        realized: s.realized_points || 0,
      };
    });
  }

  function buildEstimation(filtered) {
    return filtered.map((s) => ({
      sprint_id: s.sprint_id,
      planned: s.planned_points || 0,
      realized: s.realized_points || 0,
      ratio: s.velocity_ratio !== undefined && s.velocity_ratio !== null ? s.velocity_ratio : null,
    }));
  }

  function computeAllMetrics(sorted, kpis) {
    return {
      idealBurnup: buildIdealBurnup(sorted),
      qualityTrend: buildQualityTrend(kpis),
      rollingAverages: buildRollingAverages(sorted),
      healthScorecard: buildHealthScorecard(sorted, kpis),
      deltas: buildDeltas(sorted),
      forecast: buildForecast(sorted),
      defectDensity: buildDefectDensity(sorted, kpis),
      scopeCreep: buildScopeCreep(sorted),
      estimationHistogram: buildEstimationHistogram(sorted),
      riskTrend: buildRiskTrend(kpis),
      heatmapData: buildHeatmapData(sorted, kpis),
    };
  }

  async function apiGetDashboard(req, res) {
    const store = getStore();
    const velocity = readVelocity(store);
    const kpis = collectKpis(store);
    const sorted = [...(velocity.sprints || [])].sort(sortBySprint);

    /* FEAT-01-U: Configurable date range — filter last N sprints */
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const lastN = parseInt(url.searchParams.get('lastN'), 10);
    const filtered = sliceLast(sorted, lastN);
    const burnup = buildBurnup(sorted);
    const m = computeAllMetrics(sorted, kpis);

    json(res, 200, {
      velocity: filtered,
      burnup: sliceLast(burnup, lastN),
      idealBurnup: sliceLast(m.idealBurnup, lastN),
      kpis,
      qualityTrend: m.qualityTrend,
      estimation: buildEstimation(filtered),
      rollingAverages: sliceLast(m.rollingAverages, lastN),
      healthScorecard: m.healthScorecard,
      deltas: sliceLast(m.deltas, lastN),
      forecast: m.forecast,
      defectDensity: m.defectDensity,
      scopeCreep: m.scopeCreep,
      estimationHistogram: m.estimationHistogram,
      riskTrend: m.riskTrend,
      heatmapData: m.heatmapData,
      generated_at: new Date().toISOString(),
    });
  }

  return {
    'GET /api/metrics/dashboard': apiGetDashboard,
  };
};
