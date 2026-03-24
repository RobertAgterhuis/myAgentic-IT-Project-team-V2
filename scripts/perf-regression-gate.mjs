#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const budget = {
  apiP95Ms: Number(process.env.PERF_GATE_API_P95_MS || 1200),
  frontendPerformance: Number(process.env.PERF_GATE_LIGHTHOUSE_SCORE || 0.8),
};

const artifacts = {
  api: path.join(root, 'test-output.json'),
  lighthouse: path.join(root, 'src', 'webapp', 'ui', 'lighthouse-report.json'),
};

const requireArtifacts = process.env.REQUIRE_PERF_ARTIFACTS === '1';
const failures = [];

const apiMetric = readApiMetric(artifacts.api);
if (apiMetric == null) {
  if (requireArtifacts)
    failures.push(`Missing API perf artifact: ${path.relative(root, artifacts.api)}`);
} else if (apiMetric > budget.apiP95Ms) {
  failures.push(`API p95 ${apiMetric}ms exceeds budget ${budget.apiP95Ms}ms`);
}

const lighthouseScore = readLighthouseScore(artifacts.lighthouse);
if (lighthouseScore == null) {
  if (requireArtifacts) {
    failures.push(`Missing Lighthouse artifact: ${path.relative(root, artifacts.lighthouse)}`);
  }
} else if (lighthouseScore < budget.frontendPerformance) {
  failures.push(
    `Lighthouse performance ${lighthouseScore.toFixed(2)} below budget ${budget.frontendPerformance.toFixed(2)}`
  );
}

if (failures.length > 0) {
  console.error('Performance regression gate failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

if (apiMetric == null || lighthouseScore == null) {
  console.warn(
    'Performance gate passed with missing optional artifacts (set REQUIRE_PERF_ARTIFACTS=1 in CI to enforce).'
  );
} else {
  console.log('Performance regression gate passed.');
}

function readApiMetric(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const value =
      parsed?.performance?.api?.p95_ms ??
      parsed?.metrics?.api?.p95_ms ??
      parsed?.api?.p95_ms ??
      null;

    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function readLighthouseScore(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const value =
      parsed?.categories?.performance?.score ??
      parsed?.lighthouseResult?.categories?.performance?.score ??
      null;

    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}
