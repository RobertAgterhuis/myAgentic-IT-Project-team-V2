#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const artifactPath = path.join(root, 'BusinessDocs', 'metrics', 'autonomy-benchmark-results.json');
const traceDir = path.join(root, 'tests', 'load', 'autonomous-lane-traces');
const requiredModes = ['CREATE', 'AUDIT', 'FEATURE'];
const failures = [];

if (!fs.existsSync(artifactPath)) {
  failures.push(`Missing autonomy benchmark artifact: ${path.relative(root, artifactPath)}`);
} else {
  const parsed = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const thresholds = parsed.thresholds || {};
  const latencyThresholds = thresholds.latencyMs || {};
  const maxP50 = Number(process.env.AUTONOMY_BENCHMARK_P50_MS || latencyThresholds.p50 || 2000);
  const maxP95 = Number(process.env.AUTONOMY_BENCHMARK_P95_MS || latencyThresholds.p95 || 5000);
  const maxErrorRate = Number(
    process.env.AUTONOMY_BENCHMARK_ERROR_RATE_PCT || thresholds.errorRatePct || 5
  );

  const scenarios = Array.isArray(parsed.scenarios) ? parsed.scenarios : [];
  for (const mode of requiredModes) {
    const scenario = scenarios.find((entry) => entry.mode === mode);
    if (!scenario) {
      failures.push(`Missing workload scenario '${mode}' in ${path.relative(root, artifactPath)}`);
      continue;
    }
    if ((scenario.latencyMs?.p50 ?? Number.POSITIVE_INFINITY) > maxP50) {
      failures.push(
        `${mode} p50 ${scenario.latencyMs?.p50 ?? 'n/a'}ms exceeds ${maxP50}ms (${path.relative(root, artifactPath)})`
      );
    }
    if ((scenario.latencyMs?.p95 ?? Number.POSITIVE_INFINITY) > maxP95) {
      failures.push(
        `${mode} p95 ${scenario.latencyMs?.p95 ?? 'n/a'}ms exceeds ${maxP95}ms (${path.relative(root, artifactPath)})`
      );
    }
    if ((scenario.errorRatePct ?? Number.POSITIVE_INFINITY) > maxErrorRate) {
      failures.push(
        `${mode} error rate ${scenario.errorRatePct ?? 'n/a'}% exceeds ${maxErrorRate}% (${path.relative(root, artifactPath)})`
      );
    }
  }
}

const traceFiles = fs.existsSync(traceDir)
  ? fs.readdirSync(traceDir).filter((file) => file.endsWith('.jsonl'))
  : [];
if (traceFiles.length === 0) {
  failures.push(`Missing autonomous lane trace evidence under ${path.relative(root, traceDir)}`);
}

if (failures.length > 0) {
  console.error('Autonomy readiness gate failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Autonomy readiness gate passed.');
console.log(`- Benchmark artifact: ${path.relative(root, artifactPath)}`);
if (traceFiles.length > 0) {
  const latestTrace = traceFiles.sort().at(-1);
  console.log(`- Autonomous trace: ${path.relative(root, path.join(traceDir, latestTrace))}`);
}
