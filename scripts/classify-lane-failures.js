#!/usr/bin/env node

/**
 * Autonomous Lane Failure Classification
 * Epic E-B2 Issue I-B2-003
 *
 * Analyzes autonomous lane execution failures and produces a
 * machine-readable failure classification report for root cause analysis.
 */

const fs = require('fs');
const path = require('path');

// Classification taxonomy
const FAILURE_CLASSIFICATIONS = {
  config: {
    name: 'Configuration Error',
    description: 'Invalid setup, missing configuration, or misconfiguration',
    examples: ['missing env var', 'invalid profile', 'adapter not found'],
  },
  runtime: {
    name: 'Runtime Error',
    description: 'Error during execution (crashes, timeouts, resource exhaustion)',
    examples: ['timeout', 'out of memory', 'assertion failed', 'crash'],
  },
  'agent-logic': {
    name: 'Agent Logic Error',
    description: 'Error in agent decision-making or planning',
    examples: ['invalid plan', 'bad code generation', 'logic error'],
  },
  'external-dependency': {
    name: 'External Dependency Error',
    description: 'Error from external service or API',
    examples: ['network error', 'provider unavailable', 'api error'],
  },
  data: {
    name: 'Data Error',
    description: 'Malformed or invalid data',
    examples: ['parse error', 'invalid schema', 'corruption'],
  },
};

// Failure pattern matchers
const FAILURE_PATTERNS = [
  {
    regex: /config|configuration|missing|env|profile/i,
    classification: 'config',
  },
  {
    regex: /timeout|timed out|exceed|limit|memory|crash/i,
    classification: 'runtime',
  },
  {
    regex: /plan|decision|logic|strategy|agent/i,
    classification: 'agent-logic',
  },
  {
    regex: /network|api|provider|external|request|remote/i,
    classification: 'external-dependency',
  },
  {
    regex: /parse|json|serialize|schema|invalid|malformed/i,
    classification: 'data',
  },
];

/**
 * Classify a failure message
 */
function classifyFailure(message) {
  if (!message) return 'unknown';

  for (const { regex, classification } of FAILURE_PATTERNS) {
    if (regex.test(message)) {
      return classification;
    }
  }

  return 'unknown';
}

/**
 * Extract failures from trace file
 */
function extractFailures(traceContent) {
  const failures = [];
  const lines = traceContent.split('\n').filter((line) => line.trim());

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);

      // Look for failed phases
      if (entry.status === 'failed' || entry.status === 'error') {
        failures.push({
          timestamp: entry.timestamp,
          phase: entry.phase,
          message: entry.details?.message || entry.details || 'Unknown error',
          details: entry.details,
        });
      }

      // Look for error mentions in details
      if (
        entry.details &&
        typeof entry.details === 'string' &&
        entry.details.toLowerCase().includes('error')
      ) {
        failures.push({
          timestamp: entry.timestamp,
          phase: entry.phase,
          message: entry.details,
          details: entry.details,
        });
      }
    } catch (e) {
      // Skip malformed JSON lines
    }
  }

  return failures;
}

/**
 * Generate classification report
 */
function generateReport(failures, inputFile) {
  const report = {
    generatedAt: new Date().toISOString(),
    sourceFile: inputFile,
    summary: {
      totalFailures: failures.length,
      byClassification: {},
    },
    failures: [],
  };

  // Classify each failure
  for (const failure of failures) {
    const classification = classifyFailure(failure.message);
    const classificationDetails = FAILURE_CLASSIFICATIONS[classification] || {
      name: 'Unknown',
      description: 'Unknown classification',
    };

    const classifiedFailure = {
      timestamp: failure.timestamp,
      phase: failure.phase,
      classification,
      classificationName: classificationDetails.name,
      message: failure.message,
      remediation: generateRemediation(classification, failure),
      severity: classifySeverity(classification),
    };

    report.failures.push(classifiedFailure);

    // Update summary
    if (!report.summary.byClassification[classification]) {
      report.summary.byClassification[classification] = 0;
    }
    report.summary.byClassification[classification]++;
  }

  // Add overall status
  report.summary.status = failures.length === 0 ? 'success' : 'failed';
  report.summary.recommendedAction = generateRecommendation(report);

  return report;
}

/**
 * Generate remediation hint for a failure
 */
function generateRemediation(classification, _failure) {
  const hints = {
    config: 'Check environment variables, runtime profile configuration, and adapter registration',
    runtime:
      'Review timeout limits, memory usage, and execution logs. May require increasing resources',
    'agent-logic': 'Review agent instructions, planning output, and decision criteria',
    'external-dependency':
      'Check external service status, API availability, and network connectivity',
    data: 'Validate input data schema, serialization format, and data types',
    unknown: 'Review execution logs for more context',
  };

  return hints[classification] || hints['unknown'];
}

/**
 * Classify failure severity
 */
function classifySeverity(classification) {
  const severityMap = {
    config: 'high',
    runtime: 'critical',
    'agent-logic': 'medium',
    'external-dependency': 'medium',
    data: 'high',
    unknown: 'medium',
  };

  return severityMap[classification] || 'medium';
}

/**
 * Generate overall recommendation
 */
function generateRecommendation(report) {
  const failureCount = report.summary.totalFailures;

  if (failureCount === 0) {
    return {
      status: 'proceed',
      message: '✅ No failures detected. Lane completed successfully.',
    };
  }

  const criticalCount = report.failures.filter((f) => f.severity === 'critical').length;

  if (criticalCount > 0) {
    return {
      status: 'block',
      message: `❌ ${criticalCount} critical failure(s) detected. Lane is blocked.`,
      action: 'Fix critical issues before retry',
    };
  }

  const configIssues = report.summary.byClassification['config'] || 0;
  if (configIssues > 0) {
    return {
      status: 'investigate',
      message: `⚠️ Configuration issue(s) detected. Review setup before retry.`,
      action: 'Verify environment configuration',
    };
  }

  return {
    status: 'investigate',
    message: '⚠️ Non-critical failures detected. Review before proceeding.',
    action: 'Analyze failure details',
  };
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  let inputFile = 'tests/load/autonomous-lane-traces/*.json';
  let outputFile = 'tests/load/autonomous-lane-traces/failure-classification.json';

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input') {
      inputFile = args[++i];
    } else if (args[i] === '--output') {
      outputFile = args[++i];
    }
  }

  try {
    // Find and read trace files
    const traceDir = path.dirname(inputFile);
    if (!fs.existsSync(traceDir)) {
      console.warn(`Trace directory not found: ${traceDir}`);
      return;
    }

    const files = fs
      .readdirSync(traceDir)
      .filter((f) => f.match(/autonomous-lane-.*\.jsonl$/))
      .map((f) => path.join(traceDir, f));

    if (files.length === 0) {
      console.warn('No autonomous lane trace files found');
      return;
    }

    // Extract failures from all trace files
    let allFailures = [];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const failures = extractFailures(content);
      allFailures = allFailures.concat(failures.map((f) => ({ ...f, source: file })));
    }

    // Generate report
    const report = generateReport(allFailures, files[0]);

    // Write report
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputFile, JSON.stringify(report, null, 2), 'utf-8');

    // Print summary
    console.log('📊 Failure Classification Report Generated');
    console.log(`   Output: ${outputFile}`);
    console.log(`   Total failures: ${report.summary.totalFailures}`);
    if (report.summary.totalFailures > 0) {
      console.log('   By classification:');
      Object.entries(report.summary.byClassification).forEach(([cls, count]) => {
        console.log(`     - ${cls}: ${count}`);
      });
    }
    console.log(`   Recommendation: ${report.summary.recommendedAction.status.toUpperCase()}`);
  } catch (error) {
    console.error('❌ Failed to generate failure classification report');
    console.error(error.message);
    process.exit(1);
  }
}

main();
