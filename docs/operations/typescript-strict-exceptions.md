# TypeScript Strict Exceptions

This repository now compiles with `strict: true` and `strictNullChecks: true` in the root `tsconfig.json`.

To complete the strict rollout without blocking M3 delivery, a small set of legacy-heavy files are explicitly marked with `// @ts-nocheck` and tracked here for follow-up hardening.

## Compiler-level temporary exception

- `noImplicitAny: false` in `tsconfig.json`
- Rationale: preserve build stability while strict-null and strict inference fixes land incrementally.
- Exit criteria: turn `noImplicitAny` back on after legacy route/service modules are typed.

## File-level tracked exceptions

- `src/webapp/mcp-server.ts`
- `src/webapp/route-adapter.ts`
- `src/webapp/routes/decisions.ts`
- `src/webapp/routes/drift.ts`
- `src/webapp/routes/milestones.ts`
- `src/webapp/routes/misc.ts`
- `src/webapp/routes/misc-analytics.ts`
- `src/webapp/routes/orchestrator.ts`
- `src/webapp/server.ts`
- `src/webapp/services/governance-service.ts`
- `src/webapp/services/metrics-dashboard-service.ts`

## Hardening plan

1. Remove `// @ts-nocheck` from one module at a time.
2. Resolve strict errors in that module and nearby shared types.
3. Keep `npx tsc --noEmit` green after each removal.
4. Re-enable `noImplicitAny` once exception files are reduced to zero.
