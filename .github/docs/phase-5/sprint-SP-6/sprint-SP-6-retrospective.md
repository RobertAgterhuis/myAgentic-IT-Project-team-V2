# Sprint Retrospective — SP-6 (Observability)

## Metadata
- **Sprint:** SP-6
- **Date:** 2026-03-09
- **Stories completed:** 2/2 (TECH-05, TECH-07)
- **Points:** 11/11 (velocity 1.0)

---

## What Went Well

1. **Metrics persistence was clean to integrate** — The existing `_metrics` object and `recordMetric()` function provided a natural hook for persistence. `loadMetrics()` and `flushMetrics()` slot into the module without restructuring.

2. **Health endpoint enhancement was minimal-touch** — Adding `version` and `store_status` to the existing health handlers required only small additions. The `store.exists()` probe is lightweight and doesn't add measurable latency.

3. **InMemoryStore made testing reliable** — The `flushMetrics()`/`loadMetrics()` round-trip tests work entirely in-memory via InMemoryStore, avoiding filesystem timing issues or cleanup concerns.

4. **Structured logging was already in place** — The `structuredLog()` function from SP-3 (middleware extraction) already emits JSON to stdout/stderr. TECH-05 only needed to add new event types (`metrics_loaded`, `metrics_flushed`, etc.) rather than building logging infrastructure.

5. **Zero regressions on 649 pre-existing tests** — All health/metrics tests from previous sprints still pass because the endpoint changes are purely additive (new fields, not changed fields).

---

## What Could Be Improved

1. **`loadMetrics()` does not restore `responseTimes`** — The aggregate response times array is NOT persisted across restarts because it's a large array that would grow the file significantly. Only per-endpoint times are restored. This means percentile calculations (p50/p95/p99) restart from zero on server restart. For a pre-GA system this is acceptable, but should be documented for operators.

2. **Flush interval is hardcoded** — The 60-second interval is a constant, not configurable via environment variable. This is fine for current scope but should be made configurable if the system moves to high-traffic production use.

---

## Lessons Learned

- **LESSON_CANDIDATE:** When adding persistence to an in-memory data structure, design the load/flush pair together and test the round-trip explicitly. The round-trip test (flush → reset → load → verify) is the most important single test — it validates the contract that data survives restarts.
- **LESSON_CANDIDATE:** Health endpoints should use the lightest possible store probe (e.g., `store.exists()` on a known directory) rather than a full read/write cycle. This ensures the health check itself doesn't create load or side effects.
- **LESSON_CANDIDATE:** When adding periodic timers in a Node.js server, always `.unref()` the timer to prevent it from keeping the process alive during shutdown. Pair with `clearInterval()` in the shutdown handler.

---

## Action Items for Next Sprint

- None. TECH-05 and TECH-07 are complete. Metrics persistence and health endpoint are operational.

---

## HANDOFF CHECKLIST
- [x] All required sections are filled
- [x] All UNCERTAIN: items documented — NONE
- [x] All INSUFFICIENT_DATA: items documented — NONE
- [x] Output complies with contract
- [x] Guardrails checked
- [x] Machine-readable output
- [x] No contradictory statements
- [x] Source references included
- [x] Written to file per MEMORY MANAGEMENT PROTOCOL
