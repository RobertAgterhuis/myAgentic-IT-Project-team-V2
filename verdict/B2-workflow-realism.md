# B2 — Workflow Realism

**Dimension:** SDLC Methodology — Real-World Executability  
**Score: 7 / 10**

---

## What Was Evaluated

Whether the SDLC workflow is actually executable end-to-end or aspirational documentation. Whether state is persisted durably, jobs queue correctly, and the pipeline survives failures. Whether the workflow produces meaningful real-world artifacts.

---

## Findings

### 1. State Persistence — Real, Durable

`platform/engine/state-persistence.ts` (89% coverage) persists all pipeline state between FSM transitions. Two backends:

- `file-provider.ts` (93% coverage) — JSON files on disk
- `sqlite-provider.ts` (90% coverage) — relational persistence with WAL mode

Both use a factory pattern (`persistence/factory.ts`, 100% coverage). The persistence layer enables the engine to survive server restarts mid-pipeline — a critical requirement for multi-hour SDLC cycles.

Source: `coverage-summary.json`.

### 2. Async Job Queue — BullMQ + Memory Fallback

`package.json` includes `bullmq ^5.52.3` and `ioredis ^5.5.0`. Three queue providers:

- `memory-queue.ts` (90% coverage) — in-memory queue for development
- `persistent-queue.ts` (95% coverage) — SQLite-backed for environments without Redis
- `bullmq-queue.ts` (76% coverage) — BullMQ for production high-throughput

`platform/engine/jobs/worker.ts` (92% coverage) processes jobs from the queue. BullMQ provides job retries, delayed execution, and priorities.

Source: `coverage-summary.json`, `package.json`.

**Gap:** `bullmq-queue.ts` at 76% coverage with only **42% branch coverage** — the production queue backend has the weakest test coverage of the three queues.

### 3. SSE Real-Time Progress — Real

`src/webapp/routes/` includes SSE event streams. Gate transitions, approval events, and agent progress are pushed to connected clients via Server-Sent Events. The frontend maintains SSE connections in AppLayout.

This is real real-time UX, not polling.

### 4. Git Commits at Gate Passage — Real

`platform/engine/engine.ts` (`PHASE_GATE_TRANSITION_MAP`) commits to git at every gate passage. Using `isomorphic-git`, each validated phase output is committed with metadata including agent IDs, gate results, and timestamps.

This means a completed SDLC run produces a proper git history of deliverables — not just documents in a folder.

### 5. DORA Metrics and Sprint Velocity — Real Calculations

`platform/sdlc/observability.ts` (236 lines, 61% coverage) computes all four DORA dimensions:

1. Lead Time for Changes (commit → production)
2. Deployment Frequency (deploys per day)
3. Change Failure Rate (% of deploys causing incidents)
4. Mean Time to Recovery (incident duration)

Plus sprint KPIs: cycle time, throughput, WIP, defect density, test coverage trends.

The sprint gate uses these metrics for velocity-based capacity planning. DORA classification levels (ELITE / HIGH / MEDIUM / LOW) are returned.

Source: `platform/sdlc/observability.ts` lines 1–80.

**Gap:** `observability.ts` at only **52% function coverage** — many DORA calculation paths are untested. Sprint gate velocity decisions may be based on partially-implemented calculations.

### 6. Traceability — Well-Tested

`platform/sdlc/traceability.ts` (115 lines, **99% line coverage**, 100% function coverage) — the best-covered file in the codebase. It provides:

- Full artifact lineage tracking
- Source-to-deliverable traceability
- Decision audit trail

This is a strong signal that artifact traceability is taken seriously as a production requirement.

### 7. Reality Check: What Happens on a Real Run

**Prerequisites for a real end-to-end run:**

1. At least one LLM provider configured: `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` in environment
2. `STORAGE_PROVIDER` configured (file or sqlite)
3. `AGENT_RUNTIME_ADAPTER` configured (copilot / claude / openai)
4. For BullMQ: `REDIS_URL` configured
5. A workspace (git repo) registered

**What the pipeline produces:**

- BusinessDocs written per phase (markdown deliverables per agent)
- Git commits at each gate passage (isomorphic-git)
- Approval center entries for human decisions
- Sprint plan (SYNTHESIS phase output)
- KPI/metrics timeseries written to `BusinessDocs/metrics/time-series-metrics.json`

**Execution path gap:** The dispatcher calls the LLM adapter which makes real HTTP calls to configured providers. If no LLM provider is configured, the run fails at the first agent invocation. There is no "dry run" mode that validates the pipeline structure without consuming LLM API credits.

### 8. Workflow Documentation — Good Coverage

`docs/` directory contains:

- Architecture documentation
- Getting-started guides
- Operations runbooks
- Security documentation
- API reference
- UX documentation

Source: `docs/` directory listing.

---

## Strengths

1. **State durability** — Restartable pipelines via file/SQLite persistence. A 4-hour SDLC run can survive a server restart.
2. **Three queue backends** — Memory for dev, SQLite for lightweight prod, BullMQ for scale. Correct progression of complexity.
3. **Git history as deliverable** — One of the strongest design choices. Every gate produces a git-committable record.
4. **Traceability at 99% coverage** — The artifact lineage system is the most reliable component in the stack.
5. **SSE real-time** — Progress is observable in real time without polling.

---

## Weaknesses

1. **No dry-run mode** — Cannot validate pipeline configuration without consuming LLM credits. First-time setup requires a live API key.
2. **observability.ts at 52% function coverage** — DORA calculations that drive sprint gate decisions are partially tested.
3. **bullmq-queue.ts at 42% branch coverage** — The production job queue backend has significant untested branches.
4. **No chaos/resumption tests** — There are no tests that simulate mid-pipeline failures (server crash after PHASE_2, Redis connection drop during job processing) and verify correct resumption.
5. **Agent deliverable quality is LLM-dependent** — The pipeline structure is sound, but the quality of BusinessDocs deliverables depends entirely on the LLM model and prompt quality. There is no programmatic evaluation of deliverable usefulness (only syntactic gate validation).
6. **External integration dependencies** — Canva (Agent 30), Storybook (Agent 31), analytics (Matomo, docker-compose.analytics.yml), Weblate (docker-compose.weblate.yml) are referenced but full integration is not confirmed from code analysis.

---

## Recommended Improvements

1. Add `--dry-run` CLI flag to `cli.ts` that validates all configuration, loads all skill files, checks all contracts/guardrails, and reports readiness without making LLM API calls.
2. Add chaos tests: simulate tool executor failure mid-run, verify idempotency cache prevents double-side-effects on retry.
3. Implement a deliverable quality scorer (using the LLM itself to rate its own outputs against the contract) and expose the score in the approval center.
4. Raise `observability.ts` function coverage to ≥80% — sprint velocity decisions depend on accurate DORA metrics.

---

## Source References

| File                                   | Lines Read            | Key Finding                            |
| -------------------------------------- | --------------------- | -------------------------------------- |
| `platform/engine/state-persistence.ts` | (coverage)            | 89% coverage, file/SQLite              |
| `platform/engine/jobs/`                | coverage summary      | memory 90%, persistent 95%, bullmq 76% |
| `platform/engine/jobs/worker.ts`       | (coverage)            | 92% coverage                           |
| `platform/sdlc/observability.ts`       | 1–80                  | DORA metrics, sprint KPIs              |
| `platform/sdlc/traceability.ts`        | (coverage)            | 99% coverage                           |
| `platform/engine/engine.ts`            | 1–100                 | Git commits at gate passage            |
| `coverage/coverage-summary.json`       | bullmq, observability | Coverage gaps                          |
