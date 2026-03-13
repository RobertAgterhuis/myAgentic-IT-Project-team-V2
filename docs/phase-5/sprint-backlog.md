# Sprint Backlog

Items deferred from current sprint for future resolution.

---

## BACKLOG-S9G-001 — Fix Vitest + MSW interaction test infrastructure on Windows

| Field        | Value                                           |
| ------------ | ----------------------------------------------- |
| **Origin**   | S9G-36 (Issue #243) — Decisions page unit tests |
| **Priority** | MEDIUM                                          |
| **Points**   | 3                                               |
| **Type**     | Infrastructure / Test tooling                   |
| **Status**   | DEFERRED                                        |
| **Blocked**  | 5 skipped tests in `decisions-page.test.tsx`    |

### Problem

Tests that combine `userEvent` clicks (filter buttons, View buttons) with
MSW-intercepted fetch calls cause Vitest worker process failures on Windows:

- **`pool: 'forks'`**: All tests pass but the forked worker crashes during
  cleanup (`Worker exited unexpectedly`, exit code 1). The process hangs
  after test completion.
- **`pool: 'threads'`**: Worker deadlocks on the 9th test. MSW uses
  `@mswjs/interceptors` with process-level `http`/`https` module hooks that
  conflict with `worker_threads` sharing the same process.

The 8 render-only tests (no `userEvent` + fetch) pass reliably with `forks`.

### Root Cause

MSW 2.x (`@mswjs/interceptors` 0.41.x) patches Node.js `http`/`https`
modules at the process level. Vitest's `forks` pool spawns child processes
where these patches don't survive cleanup correctly on Windows. The
`threads` pool shares a single process where interceptor hooks deadlock
under concurrent access.

### Skipped Tests

File: `src/webapp/ui/src/pages/decisions/decisions-page.test.tsx`

1. `filters decisions by status when clicking filter buttons`
2. `clicking All filter shows all decisions`
3. `renders View buttons for each decision`
4. `opens detail dialog when clicking View on an open decision`
5. `opens detail dialog when clicking View on a decided decision`

### Acceptance Criteria

- [ ] All 5 skipped tests pass in the full unit test suite
- [ ] Vitest process exits cleanly (exit code 0) after test run
- [ ] No regression in other test files
- [ ] Remove `it.skip` markers and `BACKLOG-S9G-001` comments

### Investigation Leads

1. **`pool: 'vmThreads'`** — VM context isolation within a single thread;
   may avoid both fork crash and thread deadlock
2. **Upgrade MSW to latest** — check if newer `@mswjs/interceptors` has
   Windows fork cleanup fixes
3. **`pool: 'forks'` + `teardownTimeout`** — force cleanup with timeout
4. **`--no-file-parallelism`** — serialize test files to avoid concurrent
   interceptor access
5. **Move interaction tests to Playwright component tests** — run in real
   browser context where MSW works natively via Service Worker
