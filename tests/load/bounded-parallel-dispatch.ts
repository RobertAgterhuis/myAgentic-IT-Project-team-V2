// Copyright (c) 2026 Robert Agterhuis. MIT License.

/* eslint-disable no-console */

/**
 * Bounded parallel dispatch load scenario (Epic E-C4 / I-C4-002).
 *
 * Executes repeated dispatchStateParallel runs against a synthetic state with
 * configurable concurrency, agent count, delay profile, and failure ratio.
 * Produces p50/p95/p99 latency plus failure-rate evidence in JSON.
 *
 * Usage:
 *   npx tsx tests/load/bounded-parallel-dispatch.ts
 *   npx tsx tests/load/bounded-parallel-dispatch.ts --iterations 40 --agents 16 --maxConcurrency 4
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { Dispatcher } from '../../platform/engine/dispatcher';

interface Args {
  iterations: number;
  agents: number;
  maxConcurrency: number;
  minDelayMs: number;
  maxDelayMs: number;
  failRatio: number;
}

interface ScenarioResult {
  totalRuns: number;
  failedRuns: number;
  runFailureRatePct: number;
  latencyMs: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
    max: number;
  };
  queueWaitMs: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
    max: number;
  };
  observedConcurrency: {
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
}

function parseArgs(argv: string[]): Args {
  const parsed: Args = {
    iterations: 30,
    agents: 12,
    maxConcurrency: 3,
    minDelayMs: 20,
    maxDelayMs: 90,
    failRatio: 0.03,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith('--') || !value) continue;

    const num = Number(value);
    switch (key) {
      case '--iterations':
        parsed.iterations = Number.isFinite(num) ? Math.max(1, Math.floor(num)) : parsed.iterations;
        i += 1;
        break;
      case '--agents':
        parsed.agents = Number.isFinite(num) ? Math.max(1, Math.floor(num)) : parsed.agents;
        i += 1;
        break;
      case '--maxConcurrency':
        parsed.maxConcurrency = Number.isFinite(num)
          ? Math.max(1, Math.floor(num))
          : parsed.maxConcurrency;
        i += 1;
        break;
      case '--minDelayMs':
        parsed.minDelayMs = Number.isFinite(num) ? Math.max(1, Math.floor(num)) : parsed.minDelayMs;
        i += 1;
        break;
      case '--maxDelayMs':
        parsed.maxDelayMs = Number.isFinite(num) ? Math.max(1, Math.floor(num)) : parsed.maxDelayMs;
        i += 1;
        break;
      case '--failRatio':
        parsed.failRatio = Number.isFinite(num) ? Math.max(0, Math.min(1, num)) : parsed.failRatio;
        i += 1;
        break;
      default:
        break;
    }
  }

  if (parsed.maxDelayMs < parsed.minDelayMs) {
    parsed.maxDelayMs = parsed.minDelayMs;
  }

  return parsed;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

function summary(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.reduce((acc, value) => acc + value, 0);
  return {
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    avg: sorted.length > 0 ? Number((total / sorted.length).toFixed(2)) : 0,
    max: sorted.length > 0 ? sorted[sorted.length - 1] : 0,
  };
}

function randomBetween(min: number, max: number): number {
  if (max <= min) return min;
  return Math.floor(min + Math.random() * (max - min + 1));
}

async function runScenario(config: Args): Promise<ScenarioResult> {
  const phaseAgents = {
    LOAD_TEST_STATE: Array.from({ length: config.agents }, (_unused, index) => ({
      id: `LT-${String(index + 1).padStart(2, '0')}`,
      name: `Load Test Agent ${index + 1}`,
    })),
  };

  const runDurations: number[] = [];
  const waits: number[] = [];
  const concurrencies: number[] = [];
  let failedRuns = 0;

  for (let run = 0; run < config.iterations; run += 1) {
    const dispatcher = new Dispatcher({
      store: { exists: () => false, read: () => '' },
      phaseAgents,
      config: { maxRetries: 0 },
      invoker: async () => {
        const delay = randomBetween(config.minDelayMs, config.maxDelayMs);
        await new Promise((resolve) => setTimeout(resolve, delay));
        if (Math.random() < config.failRatio) {
          throw new Error('Synthetic load failure');
        }
        return { outputPath: '/tmp/load-test-output.md' };
      },
    });

    const started = performance.now();
    const result = await dispatcher.dispatchStateParallel(
      'LOAD_TEST_STATE',
      {},
      {},
      { maxConcurrency: config.maxConcurrency, onFailure: 'continue' }
    );
    const duration = performance.now() - started;

    runDurations.push(Number(duration.toFixed(2)));
    waits.push(Number(result.totalWaitMs.toFixed(2)));
    concurrencies.push(result.concurrencyHighWaterMark);

    if (result.failed.length > 0) {
      failedRuns += 1;
    }
  }

  const latencySummary = summary(runDurations);
  const waitSummary = summary(waits);
  const sortedConcurrency = [...concurrencies].sort((a, b) => a - b);

  return {
    totalRuns: config.iterations,
    failedRuns,
    runFailureRatePct: Number(((failedRuns / config.iterations) * 100).toFixed(2)),
    latencyMs: latencySummary,
    queueWaitMs: waitSummary,
    observedConcurrency: {
      p50: percentile(sortedConcurrency, 50),
      p95: percentile(sortedConcurrency, 95),
      p99: percentile(sortedConcurrency, 99),
      max: sortedConcurrency[sortedConcurrency.length - 1] || 0,
    },
  };
}

async function main(): Promise<void> {
  const config = parseArgs(process.argv.slice(2));
  console.log('Running bounded parallel dispatch load scenario...');
  console.log(config);

  const result = await runScenario(config);
  const payload = {
    generated_at: new Date().toISOString(),
    scenario: 'bounded-parallel-dispatch',
    config,
    result,
  };

  const outputPath = path.resolve(
    process.cwd(),
    'tests/load/bounded-parallel-dispatch-results.json'
  );
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log('Load scenario results written to:');
  console.log(outputPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
