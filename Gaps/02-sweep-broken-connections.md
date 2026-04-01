# Sweep 2 — Broken Connections & Dead Wiring

## Findings

[🔴 CRITICAL] DISCONNECTION: UI observability hook -> drift API (versioned path mismatch)
Source: src/webapp/ui/src/hooks/use-observability-contracts.ts:143 — `apiGet<DriftResponse>('/v1/drift')`
Target: src/webapp/routes/drift.ts:17 — only `/api/drift` exists (`/api/v1/drift` NOT FOUND)
Impact: Drift input for observability contracts is silently dropped; telemetry contract can degrade to fallback sample output.

[🟠 MAJOR] DISCONNECTION: Web vitals reporter -> backend endpoint
Source: src/webapp/ui/src/lib/web-vitals.ts:12,33 — posts to `/api/v1/metrics/vitals`
Target: NOT FOUND in src/webapp/routes/\*_/_.ts
Impact: Browser vitals are never persisted server-side despite client-side emission.

[🟡 MODERATE] DISCONNECTION: Task assembly APIs -> runtime consumers
Source: src/webapp/routes/task-assembly.ts:35,60,69,87 — `/api/m3/*` endpoints registered
Target: No consumer found in src/webapp/ui/src/\*_/_.{ts,tsx} for `m3/assemble-team`, `m3/team-configs`, `m3/validate-task`
Impact: Backend feature exists and is tested, but user-facing runtime wiring is absent; effectively hidden/orphan capability.

[🟡 MODERATE] DISCONNECTION: Auth config status semantics diverge from auth loader semantics
Source: src/webapp/routes/auth.ts:576 — `allConfigured: githubConfigured && entraConfigured`
Target: src/webapp/auth.ts:1546 — auth enabled when either provider is present (`if (!hasGitHub && !hasEntra) return null`)
Impact: UI/config checks can report "not configured" even when runtime auth is valid with a single provider.
