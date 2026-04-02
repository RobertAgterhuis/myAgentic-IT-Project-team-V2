#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);

function readJsonOrNull(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function readChecklist(root) {
  const checklistPath = process.env.RELEASE_GATE_CHECKLIST
    ? path.resolve(root, process.env.RELEASE_GATE_CHECKLIST)
    : path.join(root, 'BusinessDocs', 'release', 'go-live-checklist.json');

  const checklist = readJsonOrNull(checklistPath);
  if (!checklist || !Array.isArray(checklist.controls)) {
    throw new Error(`Invalid or missing release checklist: ${path.relative(root, checklistPath)}`);
  }

  return { checklistPath, checklist };
}

function resolveMetrics(root) {
  const benchmarkPath = process.env.AUTONOMY_BENCHMARK_ARTIFACT
    ? path.resolve(root, process.env.AUTONOMY_BENCHMARK_ARTIFACT)
    : path.join(root, 'BusinessDocs', 'metrics', 'autonomy-benchmark-results.json');

  const trustPath = process.env.AUTONOMOUS_TRUST_DASHBOARD_ARTIFACT
    ? path.resolve(root, process.env.AUTONOMOUS_TRUST_DASHBOARD_ARTIFACT)
    : path.join(root, 'tests', 'load', 'autonomous-lane-traces', 'trust-dashboard.json');

  const benchmark = readJsonOrNull(benchmarkPath);
  const trust = readJsonOrNull(trustPath);

  const scenarios = Array.isArray(benchmark?.scenarios) ? benchmark.scenarios : [];
  const maxP95Ms = scenarios.reduce((max, scenario) => {
    const value = Number(scenario?.latencyMs?.p95);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
  const maxErrorRatePct = scenarios.reduce((max, scenario) => {
    const value = Number(scenario?.errorRatePct);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);

  const autonomousSplit = trust?.split?.autonomous || {};
  const autonomousSuccessRatePct = Number(Number(autonomousSplit.successRate || 0) * 100);
  const autonomousFailedCount = Number(autonomousSplit.failedCount || 0);

  return {
    benchmarkPath,
    trustPath,
    metricValues: {
      'autonomy.maxP95Ms': maxP95Ms,
      'autonomy.maxErrorRatePct': maxErrorRatePct,
      'trust.autonomousSuccessRatePct': Number(autonomousSuccessRatePct.toFixed(2)),
      'trust.autonomousFailedCount': autonomousFailedCount,
      'artifact.milestoneTraceabilityPresent': Number(
        fs.existsSync(path.join(root, 'docs', 'ops', 'executive-release-dashboard.md')) &&
          fs.existsSync(path.join(root, 'BusinessDocs', 'release', 'go-live-checklist.md'))
      ),
      'artifact.securitySynthesisPresent': Number(
        fs.existsSync(path.join(root, 'SECURITY.md')) &&
          fs.existsSync(path.join(root, 'BusinessDocs', 'decisions', 'security.md'))
      ),
    },
  };
}

function evaluateComparison(actual, operator, expected) {
  if (!Number.isFinite(actual)) {
    return false;
  }

  switch (operator) {
    case '<=':
      return actual <= expected;
    case '>=':
      return actual >= expected;
    case '==':
      return actual === expected;
    default:
      return false;
  }
}

function evaluateControls(controls, metricValues) {
  return controls.map((control) => {
    const actual = Number(metricValues[control.metric]);
    const expected = Number(control.threshold);
    const passed = evaluateComparison(actual, control.operator, expected);

    return {
      id: control.id,
      domain: control.domain,
      critical: Boolean(control.critical),
      description: control.description,
      metric: control.metric,
      operator: control.operator,
      threshold: expected,
      actual: Number.isFinite(actual) ? actual : null,
      passed,
      evidence: Array.isArray(control.evidence) ? control.evidence : [],
    };
  });
}

function buildReport(root, metadata) {
  const failedCritical = metadata.controlResults.filter((entry) => entry.critical && !entry.passed);
  const failedAdvisory = metadata.controlResults.filter(
    (entry) => !entry.critical && !entry.passed
  );

  return {
    generatedAt: new Date().toISOString(),
    issue: 'I-041',
    releaseBlocked: failedCritical.length > 0,
    summary: {
      totalControls: metadata.controlResults.length,
      passedControls: metadata.controlResults.filter((entry) => entry.passed).length,
      failedCriticalControls: failedCritical.length,
      failedAdvisoryControls: failedAdvisory.length,
    },
    artifacts: {
      checklist: path.relative(root, metadata.checklistPath).replace(/\\/g, '/'),
      autonomyBenchmark: path.relative(root, metadata.benchmarkPath).replace(/\\/g, '/'),
      trustDashboard: path.relative(root, metadata.trustPath).replace(/\\/g, '/'),
    },
    controls: metadata.controlResults,
  };
}

function writeReport(root, report) {
  const outputPath = process.env.RELEASE_GATE_REPORT_PATH
    ? path.resolve(root, process.env.RELEASE_GATE_REPORT_PATH)
    : path.join(root, 'BusinessDocs', 'metrics', 'release-readiness-report.json');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  return outputPath;
}

export function runReleaseReadinessGate(root = process.cwd()) {
  const { checklistPath, checklist } = readChecklist(root);
  const { benchmarkPath, trustPath, metricValues } = resolveMetrics(root);
  const controlResults = evaluateControls(checklist.controls, metricValues);
  const report = buildReport(root, {
    checklistPath,
    benchmarkPath,
    trustPath,
    controlResults,
  });
  const outputPath = writeReport(root, report);

  return { report, outputPath };
}

export function main() {
  try {
    const root = process.cwd();
    const { report, outputPath } = runReleaseReadinessGate(root);

    console.log('Release readiness gate report');
    console.log('============================');
    console.log(`- Blocked: ${report.releaseBlocked ? 'yes' : 'no'}`);
    console.log(`- Total controls: ${report.summary.totalControls}`);
    console.log(`- Failed critical controls: ${report.summary.failedCriticalControls}`);
    console.log(`- Failed advisory controls: ${report.summary.failedAdvisoryControls}`);
    console.log(`- Report: ${path.relative(root, outputPath).replace(/\\/g, '/')}`);

    if (report.releaseBlocked) {
      console.error(
        'Release readiness gate failed because one or more critical controls are below threshold.'
      );
      process.exit(1);
    }
  } catch (error) {
    console.error(
      `Release readiness gate failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main();
}
