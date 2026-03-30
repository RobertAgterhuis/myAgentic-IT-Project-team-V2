/* eslint-disable no-console */

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Dispatcher } from '../../platform/engine/dispatcher';
import { PHASE_AGENTS } from '../../platform/engine/agent-phase-map';
import { createStateMachine } from '../../platform/engine/state-machine';

type BenchmarkMode = 'CREATE' | 'AUDIT' | 'FEATURE';

interface ScenarioSummary {
  mode: BenchmarkMode;
  states: string[];
  iterations: number;
  totalRuns: number;
  failedRuns: number;
  errorRatePct: number;
  latencyMs: {
    p50: number;
    p95: number;
    avg: number;
    max: number;
  };
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

function summarize(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.reduce((acc, value) => acc + value, 0);
  return {
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    avg: sorted.length > 0 ? Number((total / sorted.length).toFixed(2)) : 0,
    max: sorted.length > 0 ? sorted[sorted.length - 1] : 0,
  };
}

function seededValue(seed: number, min: number, max: number): number {
  const next = (seed * 9301 + 49297) % 233280;
  return min + (next % (max - min + 1));
}

function benchmarkStatesForMode(mode: BenchmarkMode): string[] {
  const machine = createStateMachine(mode);
  const states: string[] = [];

  while (machine.nextState) {
    const next = machine.nextState;
    if (next && (PHASE_AGENTS[next]?.length ?? 0) > 0) {
      states.push(next);
    }
    machine.advance();
    if (machine.state === 'COMPLETED') break;
  }

  return Array.from(new Set(states));
}

function buildPhaseAgents(state: string) {
  const agents = PHASE_AGENTS[state] || [];
  return agents.map((agent) => ({ id: agent.id, name: agent.name }));
}

async function runScenario(mode: BenchmarkMode): Promise<ScenarioSummary> {
  const iterations = parsePositiveInt(process.env.AUTONOMY_BENCHMARK_ITERATIONS, 4);
  const maxConcurrency = parsePositiveInt(process.env.AUTONOMY_BENCHMARK_MAX_CONCURRENCY, 3);
  const minDelayMs = parsePositiveInt(process.env.AUTONOMY_BENCHMARK_MIN_DELAY_MS, 10);
  const maxDelayMs = parsePositiveInt(process.env.AUTONOMY_BENCHMARK_MAX_DELAY_MS, 35);
  const failEvery = parsePositiveInt(process.env.AUTONOMY_BENCHMARK_FAIL_EVERY, 0);
  const states = benchmarkStatesForMode(mode);
  const durations: number[] = [];
  let failedRuns = 0;
  let totalRuns = 0;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (const state of states) {
      totalRuns += 1;
      const phaseAgents = { [state]: buildPhaseAgents(state) };
      let invocationCounter = 0;

      const dispatcher = new Dispatcher({
        store: { exists: () => false, read: () => '' },
        phaseAgents,
        config: { maxRetries: 0 },
        invoker: async () => {
          invocationCounter += 1;
          const seed = iteration * 100 + invocationCounter * 13 + state.length + mode.length;
          const delay = seededValue(seed, minDelayMs, maxDelayMs);
          await new Promise((resolve) => setTimeout(resolve, delay));
          if (failEvery > 0 && invocationCounter % failEvery === 0) {
            throw new Error(`Synthetic benchmark failure (${mode}/${state})`);
          }
          return { outputPath: `/tmp/${mode.toLowerCase()}-${state.toLowerCase()}.md` };
        },
      });

      const started = performance.now();
      const result = await dispatcher.dispatchStateParallel(
        state,
        {},
        {},
        {
          maxConcurrency,
          onFailure: 'continue',
        }
      );
      const elapsed = Number((performance.now() - started).toFixed(2));
      durations.push(elapsed);
      if (result.failed.length > 0) {
        failedRuns += 1;
      }
    }
  }

  return {
    mode,
    states,
    iterations,
    totalRuns,
    failedRuns,
    errorRatePct: totalRuns > 0 ? Number(((failedRuns / totalRuns) * 100).toFixed(2)) : 0,
    latencyMs: summarize(durations),
  };
}

async function main(): Promise<void> {
  const modes: BenchmarkMode[] = ['CREATE', 'AUDIT', 'FEATURE'];
  const scenarios: ScenarioSummary[] = [];

  for (const mode of modes) {
    console.log(`Running autonomy benchmark for ${mode}...`);
    scenarios.push(await runScenario(mode));
  }

  const payload = {
    generated_at: new Date().toISOString(),
    suite: 'autonomy-benchmark-suite',
    thresholds: {
      latencyMs: {
        p50: parsePositiveInt(process.env.AUTONOMY_BENCHMARK_P50_MS, 2000),
        p95: parsePositiveInt(process.env.AUTONOMY_BENCHMARK_P95_MS, 5000),
      },
      errorRatePct: Number(process.env.AUTONOMY_BENCHMARK_ERROR_RATE_PCT || 5),
    },
    scenarios,
  };

  const outputPath = path.resolve(
    process.cwd(),
    'BusinessDocs',
    'metrics',
    'autonomy-benchmark-results.json'
  );
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log(outputPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
