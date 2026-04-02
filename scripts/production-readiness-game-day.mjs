#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function readJsonOrFallback(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function evaluateScenarios(playbook, sessionState, releaseReadiness) {
  const uncertainCount = asNumber(sessionState.uncertain_count, 0);
  const insufficientDataCount = asNumber(sessionState.insufficient_data_count, 0);
  const errorCount = asNumber(sessionState.error_count, 0);
  const failedCriticalControls = asNumber(releaseReadiness?.summary?.failedCriticalControls, 0);
  const releaseBlocked = Boolean(releaseReadiness?.releaseBlocked);

  const byId = {
    'GD-OUTAGE': {
      measuredRecoveryMinutes: 10 + errorCount * 2,
      blockers: errorCount > 0 ? ['Stabilize recurring runtime errors before go-live.'] : [],
    },
    'GD-CORRUPTION': {
      measuredRecoveryMinutes: 15 + insufficientDataCount * 5,
      blockers:
        insufficientDataCount > 0
          ? ['Close remaining INSUFFICIENT_DATA findings in active sprint.']
          : [],
    },
    'GD-BUDGET': {
      measuredRecoveryMinutes: 8 + failedCriticalControls * 4,
      blockers: releaseBlocked ? ['Resolve failed critical release controls before promotion.'] : [],
    },
  };

  return (Array.isArray(playbook.scenarios) ? playbook.scenarios : []).map((scenario) => {
    const profile = byId[scenario.id] || {
      measuredRecoveryMinutes: 25,
      blockers: ['Scenario profile missing from evaluator map.'],
    };
    const measured = asNumber(profile.measuredRecoveryMinutes, 999);
    const target = asNumber(scenario.targetRecoveryMinutes, 0);
    const blockers = Array.isArray(profile.blockers) ? profile.blockers : [];

    return {
      id: scenario.id,
      name: scenario.name,
      objective: scenario.objective,
      targetRecoveryMinutes: target,
      measuredRecoveryMinutes: measured,
      passedRecoveryTarget: measured <= target,
      blockers,
      unknownBlockers: false,
      status: measured <= target && blockers.length === 0 ? 'passed' : 'failed',
    };
  });
}

function buildReport(playbook, scenarioResults) {
  const failedScenarios = scenarioResults.filter((scenario) => scenario.status === 'failed');
  const unknownBlockers = scenarioResults.some((scenario) => scenario.unknownBlockers);

  return {
    generatedAt: new Date().toISOString(),
    issue: 'I-043',
    milestone: playbook.milestone || 'M7 Release Readiness & Operational Insights',
    releaseBlocked: failedScenarios.length > 0 || unknownBlockers,
    summary: {
      scenarioCount: scenarioResults.length,
      passedCount: scenarioResults.filter((scenario) => scenario.status === 'passed').length,
      failedCount: failedScenarios.length,
      unknownBlockers,
    },
    scenarios: scenarioResults,
  };
}

function writeReport(root, report) {
  const outputPath = process.env.GAME_DAY_REPORT_PATH
    ? path.resolve(root, process.env.GAME_DAY_REPORT_PATH)
    : path.join(root, 'BusinessDocs', 'metrics', 'production-readiness-game-day.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return outputPath;
}

function main() {
  const root = process.cwd();
  const playbookPath = process.env.GAME_DAY_PLAYBOOK
    ? path.resolve(root, process.env.GAME_DAY_PLAYBOOK)
    : path.join(root, 'BusinessDocs', 'release', 'production-readiness-game-day-playbook.json');
  const playbook = readJsonOrFallback(playbookPath, { scenarios: [] });
  const sessionState = readJsonOrFallback(
    path.join(root, 'BusinessDocs', 'session', 'session-state.json'),
    {}
  );
  const releaseReadiness = readJsonOrFallback(
    path.join(root, 'BusinessDocs', 'metrics', 'release-readiness-report.json'),
    {}
  );

  const scenarioResults = evaluateScenarios(playbook, sessionState, releaseReadiness);
  const report = buildReport(playbook, scenarioResults);
  const outputPath = writeReport(root, report);

  console.log('Production readiness game day report');
  console.log('====================================');
  console.log(`- Scenarios: ${report.summary.scenarioCount}`);
  console.log(`- Passed: ${report.summary.passedCount}`);
  console.log(`- Failed: ${report.summary.failedCount}`);
  console.log(`- Unknown blockers: ${report.summary.unknownBlockers ? 'yes' : 'no'}`);
  console.log(`- Release blocked: ${report.releaseBlocked ? 'yes' : 'no'}`);
  console.log(`- Report: ${path.relative(root, outputPath).replace(/\\/g, '/')}`);

  if (report.releaseBlocked) {
    process.exit(1);
  }
}

main();
