---
title: Quarterly Benchmark Report (Q1 2026)
parent: Operations
nav_order: 8
permalink: /quarterly-benchmark-report-q1-2026/
description: Quarterly benchmark snapshot for runtime performance and CI health baselines.
---

# Quarterly Benchmark Report (Q1 2026)

## Overview

This report summarizes the quarterly benchmark snapshot for runtime performance baselines and
operational health. The data is sourced from the current baseline artifacts and runtime metrics
snapshots produced in March 2026.

## Source Artifacts

- Runtime performance baseline: workspace-specific `BusinessDocs/metrics/performance-baseline-c4.json`
  (path varies per organization/workspace)
- Load scenario output: `tests/load/bounded-parallel-dispatch-results.json`
- Operational SLO targets and collection workflow: [Performance Targets (C4)](performance-targets-c4)
- CI review cadence and baseline indicators: [CI Health Review](ci-health-review)

## Snapshot Metadata

- Baseline generated at: 2026-03-20T08:41:46.1162294+01:00
- Scenario: Bounded parallel dispatch (PHASE_3, 30 iterations, 6 agents, max concurrency 3)
- Scenario injected fail ratio: 0.03

## Runtime Performance Benchmarks

### A. Bounded Parallel Dispatch

| Metric                   | Value                             |
| ------------------------ | --------------------------------- |
| Total runs               | 30                                |
| Failed runs              | 5                                 |
| Run failure rate         | 16.67%                            |
| Latency p50 / p95 / p99  | 156.55 ms / 186.47 ms / 188.29 ms |
| Queue wait p95           | 253 ms                            |
| Observed concurrency max | 3                                 |
| Throughput p50 / p95     | 37.99 / 47.96 invocations/sec     |

### B. API Runtime Summary

| Metric                        | Value                         |
| ----------------------------- | ----------------------------- |
| Request count                 | 10,613                        |
| Error count                   | 507                           |
| Error rate                    | 4.78%                         |
| Response time p50 / p95 / p99 | 0.73 ms / 25.76 ms / 38.92 ms |

## Operational Notes

- Benchmarks are captured from `performance-baseline-c4.json` to align with the current C4
  performance targets and baseline workflow.
- The bounded parallel dispatch scenario intentionally injects failures to validate resilience
  and retry logic.
- Quarterly updates should refresh baseline artifacts and re-run the bounded parallel dispatch
  scenario before publishing.

## Next Review

- Target cadence: quarterly (next update due Q2 2026)
- Update baseline artifacts and refresh this report with the latest values.
