# Sweep 4 — Data Flow Integrity

## FLOW: Browser Web Vitals -> Backend Metrics

Step 1: src/webapp/ui/src/main.tsx:38 — `initWebVitals()` called after app mount ✅ works
Step 2: src/webapp/ui/src/lib/web-vitals.ts:12,33 — posts metrics to `/api/v1/metrics/vitals` ✅ works (client emission)
Step 3: src/webapp/routes/\*_/_.ts — endpoint `/api/v1/metrics/vitals` 🔴 broken (NOT FOUND)
BREAK POINT: Step 3 — No receiving route exists.
USER IMPACT: Product telemetry is silently lost; performance regressions are harder to detect and correlate.

## FLOW: Observability Contract (Drift + Trends + RAG) -> UI

Step 1: src/webapp/ui/src/hooks/use-observability-contracts.ts:143 — requests `/v1/drift` 🔴 broken
Step 2: src/webapp/routes/drift.ts:17 — only `/api/drift` exists ✅ works but different path
Step 3: src/webapp/ui/src/hooks/use-observability-contracts.ts:153 — fallback to sample contract 🟡 partial
BREAK POINT: Step 1/2 contract mismatch; then synthetic fallback masks failure.
USER IMPACT: UI can present plausible but fabricated observability state.

## FLOW: Auth Provider Configuration -> Setup Validation -> Runtime Auth

Step 1: src/webapp/auth.ts:1544-1546 — runtime accepts either GitHub or Entra ✅ works
Step 2: src/webapp/routes/auth.ts:576 — validation requires both providers 🟡 partial
BREAK POINT: Step 2 semantic mismatch.
USER IMPACT: Setup wizard/ops checks can block or mislead despite a valid runtime auth posture.

## FLOW: Audit Evidence Aggregation -> Operator UI

Step 1: src/webapp/ui/src/hooks/use-audit-evidence.ts:153-156 — fetches artifacts + approvals ✅ works on happy path
Step 2: src/webapp/ui/src/hooks/use-audit-evidence.ts:158 — returns static sample on failure 🟡 partial
BREAK POINT: Error path collapses to synthetic dataset.
USER IMPACT: Operational confidence and audit readiness can be overstated during backend outages.
