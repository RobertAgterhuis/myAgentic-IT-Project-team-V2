#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const budget = {
  apiP95Ms: Number(process.env.PERF_GATE_API_P95_MS || 1200),
  frontendPerformance: Number(process.env.PERF_GATE_LIGHTHOUSE_SCORE || 0.8),
};

const artifactCandidates = {
  api: [
    path.join(root, 'test-output.json'),
    path.join(root, 'perf-report.json'),
    path.join(root, 'performance-report.json'),
    path.join(root, 'BusinessDocs', 'metrics', 'perf-report.json'),
    path.join(root, 'BusinessDocs', 'metrics', 'performance-report.json'),
  ],
  lighthouse: [
    path.join(root, 'lighthouse-report.json'),
    path.join(root, 'src', 'webapp', 'ui', 'lighthouse-report.json'),
    path.join(root, 'BusinessDocs', 'metrics', 'lighthouse-report.json'),
    path.join(root, 'playwright-report', 'lighthouse-report.json'),
  ],
};

const requireArtifacts = process.env.REQUIRE_PERF_ARTIFACTS === '1';
const failures = [];

const apiArtifact = resolveFirstExistingArtifact(artifactCandidates.api);
const apiMetric = apiArtifact ? readApiMetric(apiArtifact) : null;
if (apiMetric == null) {
  if (requireArtifacts)
    failures.push(
      `Missing API perf artifact. Checked: ${artifactCandidates.api.map((p) => path.relative(root, p)).join(', ')}`
    );
} else if (apiMetric > budget.apiP95Ms) {
  failures.push(
    `API p95 ${apiMetric}ms exceeds budget ${budget.apiP95Ms}ms (${path.relative(root, apiArtifact)})`
  );
}

const lighthouseArtifact = resolveFirstExistingArtifact(artifactCandidates.lighthouse);
const lighthouseScore = lighthouseArtifact ? readLighthouseScore(lighthouseArtifact) : null;
if (lighthouseScore == null) {
  if (requireArtifacts) {
    failures.push(
      `Missing Lighthouse artifact. Checked: ${artifactCandidates.lighthouse.map((p) => path.relative(root, p)).join(', ')}`
    );
  }
} else if (lighthouseScore < budget.frontendPerformance) {
  failures.push(
    `Lighthouse performance ${lighthouseScore.toFixed(2)} below budget ${budget.frontendPerformance.toFixed(2)} (${path.relative(root, lighthouseArtifact)})`
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
  console.log(
    `Performance regression gate passed. API: ${path.relative(root, apiArtifact)} | Lighthouse: ${path.relative(root, lighthouseArtifact)}`
  );
}

function resolveFirstExistingArtifact(candidates) {
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function readApiMetric(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const value =
      parsed?.performance?.api?.p95_ms ??
      parsed?.metrics?.api?.p95_ms ??
      parsed?.summary?.api?.p95_ms ??
      parsed?.results?.api?.p95_ms ??
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
      parsed?.summary?.performance?.score ??
      null;

    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}
