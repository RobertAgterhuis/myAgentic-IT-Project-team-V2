# Deep Sweep Synthesis

## Gap Count by Severity

| Severity     | Count  |
| ------------ | ------ |
| 🔴 CRITICAL  | 2      |
| 🟠 MAJOR     | 4      |
| 🟡 MODERATE  | 7      |
| 🔵 MINOR     | 1      |
| ⚪ DEAD CODE | 2      |
| **TOTAL**    | **16** |

## Top 10 Most Critical Gaps

| Rank | Severity     | File(s)                                                                                       | Description                                                                                  | User Impact                                                                 |
| ---- | ------------ | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1    | 🔴 CRITICAL  | src/webapp/ui/src/hooks/use-observability-contracts.ts:143,153; src/webapp/routes/drift.ts:17 | Drift API path mismatch (`/v1/drift` vs `/api/drift`) combined with static fallback contract | Observability UI can show fabricated telemetry instead of real system state |
| 2    | 🔴 CRITICAL  | src/webapp/ui/src/lib/web-vitals.ts:12,33                                                     | Web vitals are emitted to a route that does not exist                                        | Performance telemetry pipeline is effectively dead                          |
| 3    | 🟠 MAJOR     | src/webapp/ui/src/hooks/use-audit-evidence.ts:153-158                                         | Any fetch failure returns static sample audit aggregation                                    | Operators can trust false evidence during outages                           |
| 4    | 🟠 MAJOR     | src/webapp/auth.ts:899                                                                        | GitHub refresh token flow throws not-implemented error                                       | Session continuity breaks on refresh-required paths                         |
| 5    | 🟠 MAJOR     | src/webapp/routes/auth.ts:576; src/webapp/auth.ts:1546                                        | Config validation requires both providers while runtime needs one                            | Setup diagnostics are misleading and can block rollout decisions            |
| 6    | 🟠 MAJOR     | src/webapp/routes/subscribe.ts:21,182                                                         | Newsletter upstream URL + timeout hardcoded                                                  | Operational flexibility and reliability suffer across environments          |
| 7    | 🟡 MODERATE  | src/webapp/routes/task-assembly.ts:35,60,69,87                                                | M3 task-assembly endpoints have no runtime UI consumer                                       | Feature exists in backend/tests but is effectively undiscoverable to users  |
| 8    | 🟡 MODERATE  | src/webapp/routes/chat.ts:72-83                                                               | Chat grounding/LLM controls rely on magic defaults                                           | Tuning consistency and explainability are weak                              |
| 9    | ⚪ DEAD CODE | src/webapp/auth.ts:49,902,1131                                                                | revokeToken contract/implementations are never called                                        | Token revocation path is non-operational in practice                        |
| 10   | ⚪ DEAD CODE | src/webapp/auth.ts:48,898,1070                                                                | refreshToken contract path has no integrated callers                                         | Refresh design is incomplete and provider behavior diverges                 |

## Code Health Verdict

1. Completion estimate
   68%

2. Biggest lie
   The biggest delivery gap is observability trust: the UI can fall back to synthetic contracts while appearing healthy, especially due the drift endpoint mismatch and sample fallback behavior.

3. Deepest rabbit hole
   Trace started at `use-observability-contracts` requesting `/v1/drift` (UI) -> route not found because backend only exposes `/api/drift` -> Promise path marks drift as null -> if other feeds fail, hook returns `sampleObservabilityTelemetryContract` -> operator sees plausible telemetry that is not real.

4. Ticking time bombs
5. Synthetic fallback contracts masking real backend failure (observability and audit evidence).
6. Missing backend receiver for emitted web vitals.
7. GitHub token refresh unimplemented while refresh interface exists.

8. Honest build estimate (CRITICAL + MAJOR only)
   4-6 developer-weeks, assuming 2 competent developers and focused integration/testing cycles.

## File Index

- 01-sweep-stub-placeholder.md
- 02-sweep-broken-connections.md
- 03-sweep-logic-gaps.md
- 04-sweep-data-flow-integrity.md
- 05-sweep-hardcoded-assumptions.md
- 06-sweep-feature-claims-vs-reality.md
- synthesis.md
