// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Metrics & Velocity Dashboard service — extracted from routes/metrics-dashboard.ts (M32-005).
 *
 * Reads velocity-log.json and sprint KPI files to produce a unified
 * dashboard payload including burnup, forecasts, health scorecards, etc.
 *
 * @module services/metrics-dashboard-service
 */

import path from 'path';
import { getStore } from '../store';

const KPI_FILE_RE = /^sprint-SP-\d+-kpi\.json$/;
const SPRINT_DIR_RE = /^sprint-SP-\d+$/;

/* ── Pure helpers ──────────────────────────────────────────────── */

function sprintNum(id: string): number {
  const m = id.match(/SP-(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function sortBySprint(a: { sprint_id: string }, b: { sprint_id: string }): number {
  return sprintNum(a.sprint_id) - sprintNum(b.sprint_id);
}

function safeReaddir(store, dir: string): string[] {
  try {
    return store.exists(dir) ? store.readdir(dir) : [];
  } catch {
    return [];
  }
}

function scanMetricsDir(store, githubDocs: string) {
  const dir = path.join(githubDocs, 'metrics');
  return safeReaddir(store, dir)
    .filter((e) => KPI_FILE_RE.test(e))
    .map((e) => ({ path: path.join(dir, e), source: 'metrics' }));
}

function scanPhase5Dir(store, githubDocs: string) {
  const dir = path.join(githubDocs, 'phase-5');
  const results: { path: string; source: string }[] = [];
  for (const d of safeReaddir(store, dir).filter((e) => SPRINT_DIR_RE.test(e))) {
    const fp = path.join(dir, d, `${d}-kpi.json`);
    if (store.exists(fp)) results.push({ path: fp, source: 'phase5' });
  }
  return results;
}

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

function normaliseKpi(raw, source: string) {
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

function buildRollingAverages(velocity, windowSize?: number) {
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

function summaryTotal(summary) {
  if (!summary) return 0;
  return (summary.on_track || 0) + (summary.at_risk || 0) + (summary.off_track || 0);
}

function rateKpis(kpi) {
  if (!hasValidSummary(kpi)) return 'grey';
  const total = summaryTotal(kpi.summary);
  if (total <= 0) return 'grey';
  const offPct = (kpi.summary.off_track || 0) / total;
  const riskPct = (kpi.summary.at_risk || 0) / total;
  return offPct > 0.2 ? 'red' : riskPct > 0.3 ? 'amber' : 'green';
}

function overallRAG(rags: string[]) {
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

function buildForecast(velocity, totalScope?: number) {
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

function buildIdealBurnup(velocity, totalScope?: number) {
  if (!velocity.length) return [];
  const total = totalScope || velocity.reduce((a, v) => a + (v.realized_points || 0), 0);
  const perSprint = total / velocity.length;
  let cum = 0;
  return velocity.map((s) => {
    cum += perSprint;
    return { sprint_id: s.sprint_id, ideal: +cum.toFixed(1) };
  });
}

function computeDefectDensity(regressions, findings, sp: number) {
  if (regressions === null || regressions === undefined) return null;
  return +((regressions + (findings || 0)) / sp).toFixed(2);
}

function mapSprintDefects(s, kpiMap: Map<string, unknown>) {
  const kpi = kpiMap.get(s.sprint_id) as
    | { quality?: { regressions?: number; security_findings?: number } }
    | undefined;
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

function buildScopeCreep(velocity) {
  return velocity.map((s) => ({
    sprint_id: s.sprint_id,
    scope_change_points: s.scope_change_excluded_points || 0,
    implemented: s.implemented || 0,
    blocked: s.blocked || 0,
  }));
}

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

function safeOffTrack(summary) {
  return summary ? summary.off_track || 0 : 0;
}

function safeAtRisk(summary) {
  return summary ? summary.at_risk || 0 : 0;
}

function safePct(value: number, total: number) {
  return total ? value / total : 0;
}

function riskDirection(curPct: number, prevPct: number) {
  if (curPct < prevPct) return 'improving';
  return curPct > prevPct ? 'worsening' : 'stable';
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

function safeFixed(val, digits: number) {
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

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function sliceLast<T>(arr: T[], n: number): T[] {
  return n > 0 && n < arr.length ? arr.slice(-n) : arr;
}

/* ── Service class ─────────────────────────────────────────────── */

export class MetricsDashboardService {
  private _cache;
  private businessDocs: string;
  private getStorageProvider;

  constructor(ctx: Record<string, unknown>) {
    this._cache = ctx._cache;
    this.businessDocs = ctx.BUSINESS_DOCS as string;
    this.getStorageProvider = ctx.getStorageProvider as (() => unknown) | undefined;
  }

  private readVelocity(store) {
    const velocityFile = path.join(this.businessDocs, 'retrospectives', 'velocity-log.json');
    if (!store.exists(velocityFile)) return { sprints: [] };
    try {
      return JSON.parse(this._cache.read(velocityFile));
    } catch {
      return { sprints: [] };
    }
  }

  private collectKpis(store) {
    const files = [
      ...scanMetricsDir(store, this.businessDocs),
      ...scanPhase5Dir(store, this.businessDocs),
    ];
    const map = new Map();
    for (const { path: fp, source } of files) {
      try {
        const norm = normaliseKpi(JSON.parse(this._cache.read(fp)), source);
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

  private buildStorageMetrics() {
    const sp = typeof this.getStorageProvider === 'function' ? this.getStorageProvider() : null;
    if (!sp) return null;
    try {
      const m = (
        sp as {
          name: string;
          metrics: () => {
            reads: number;
            writes: number;
            deletes: number;
            errors: number;
            readLatencies: number[];
            writeLatencies: number[];
          };
        }
      ).metrics();
      const readSorted = [...m.readLatencies].sort((a, b) => a - b);
      const writeSorted = [...m.writeLatencies].sort((a, b) => a - b);
      return {
        provider: (sp as { name: string }).name,
        operations: { reads: m.reads, writes: m.writes, deletes: m.deletes, errors: m.errors },
        latency: {
          read: {
            p50: percentile(readSorted, 50),
            p95: percentile(readSorted, 95),
            samples: readSorted.length,
          },
          write: {
            p50: percentile(writeSorted, 50),
            p95: percentile(writeSorted, 95),
            samples: writeSorted.length,
          },
        },
      };
    } catch {
      return { provider: (sp as { name: string }).name, error: 'metrics_unavailable' };
    }
  }

  computeDashboard(lastN?: number) {
    const store = getStore();
    const velocity = this.readVelocity(store);
    const kpis = this.collectKpis(store);
    const sorted = [...(velocity.sprints || [])].sort(sortBySprint);

    const filtered = lastN && lastN > 0 ? sliceLast(sorted, lastN) : sorted;
    const burnup = this.buildBurnup(sorted);

    const storageMetrics = this.buildStorageMetrics();

    return {
      velocity: filtered,
      burnup: lastN && lastN > 0 ? sliceLast(burnup, lastN) : burnup,
      idealBurnup:
        lastN && lastN > 0 ? sliceLast(buildIdealBurnup(sorted), lastN) : buildIdealBurnup(sorted),
      kpis,
      qualityTrend: buildQualityTrend(kpis),
      estimation: this.buildEstimation(filtered),
      rollingAverages:
        lastN && lastN > 0
          ? sliceLast(buildRollingAverages(sorted), lastN)
          : buildRollingAverages(sorted),
      healthScorecard: buildHealthScorecard(sorted, kpis),
      deltas: lastN && lastN > 0 ? sliceLast(buildDeltas(sorted), lastN) : buildDeltas(sorted),
      forecast: buildForecast(sorted),
      defectDensity: buildDefectDensity(sorted, kpis),
      scopeCreep: buildScopeCreep(sorted),
      estimationHistogram: buildEstimationHistogram(sorted),
      riskTrend: buildRiskTrend(kpis),
      heatmapData: buildHeatmapData(sorted, kpis),
      ...(storageMetrics ? { storage: storageMetrics } : {}),
      generated_at: new Date().toISOString(),
    };
  }

  private buildBurnup(sorted) {
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

  private buildEstimation(filtered) {
    return filtered.map((s) => ({
      sprint_id: s.sprint_id,
      planned: s.planned_points || 0,
      realized: s.realized_points || 0,
      ratio: s.velocity_ratio !== undefined && s.velocity_ratio !== null ? s.velocity_ratio : null,
    }));
  }
}
