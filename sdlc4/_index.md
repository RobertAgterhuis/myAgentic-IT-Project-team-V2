# SDLC4 — Audit-Driven Milestone Index

> Generated from the external consultant audit (score: 7.8/10).
> All 10 audit areas validated as CONFIRMED against the actual codebase.
> 13 milestones, 78 issues total. Ordered by impact: LOW → MEDIUM → HIGH.

---

## Design Principles

1. **Non-blocking:** Milestones can be executed in any order within an impact
   tier. No milestone blocks another.
2. **No breaking changes:** Every milestone is additive. Current behavior is
   preserved as the default.
3. **Incremental value:** Each milestone delivers standalone value even if
   subsequent milestones are never executed.
4. **Local-first preserved:** High-impact milestones (persistence, auth, jobs)
   always include a zero-config local mode as default.

---

## Milestone Overview

| ID  | Name                                                                      | Impact | Issues | Audit Reference                      |
| --- | ------------------------------------------------------------------------- | ------ | ------ | ------------------------------------ |
| M15 | [Test Runner Unification](M15-test-runner-unification.md)                 | LOW    | 5      | Weakness #2: Jest+Vitest mix         |
| M16 | [CI Gate Enforcement](M16-ci-gate-enforcement.md)                         | LOW    | 6      | Weakness #3: Disabled CI gates       |
| M17 | [Server Decomposition](M17-server-decomposition.md)                       | LOW    | 6      | Weakness #4: Dense server.ts         |
| M18 | [Developer Onboarding & Documentation](M18-developer-onboarding-docs.md)  | LOW    | 5      | Weakness #2: Build script mismatch   |
| M19 | [Execution Adapter Formalization](M19-execution-adapter-formalization.md) | MEDIUM | 7      | Phase 4: Adapter stubs → providers   |
| M20 | [MCP as Canonical Platform API](M20-mcp-canonical-api.md)                 | MEDIUM | 6      | Phase 3: MCP as control surface      |
| M21 | [UI Coherence & Navigation](M21-ui-coherence-navigation.md)               | MEDIUM | 6      | Weakness #6, Phase 6: UX convergence |
| M22 | [Policy-as-Code Governance](M22-policy-as-code-governance.md)             | MEDIUM | 7      | Phase 5: Policy packs                |
| M23 | [Durable Persistence Layer](M23-durable-persistence-layer.md)             | HIGH   | 7      | Weakness #1, Phase 1: File → DB      |
| M24 | [Background Job Execution](M24-background-job-execution.md)               | HIGH   | 7      | Phase 1: Queue workers               |
| M25 | [Multi-Repo Workspace Awareness](M25-multi-repo-workspace.md)             | HIGH   | 7      | Phase 2: Workspace abstractions      |
| M26 | [Identity, RBAC & Multi-Tenancy](M26-identity-rbac-multitenancy.md)       | HIGH   | 7      | Phase 1: IAM/RBAC                    |
| M27 | [Operational Cockpit UI](M27-operational-cockpit-ui.md)                   | HIGH   | 7      | Phase 6: Advanced visualizations     |
|     | **Totals**                                                                |        | **83** |                                      |

---

## Dependency Graph (Advisory)

These are **advisory** dependencies — they enhance results when done in order,
but no milestone is blocked by another.

```
LOW IMPACT (can run in parallel)
├── M15: Test Runner Unification
├── M16: CI Gate Enforcement ··········· benefits from M15 (unified runner)
├── M17: Server Decomposition
└── M18: Developer Onboarding

MEDIUM IMPACT (can run in parallel)
├── M19: Execution Adapters
├── M20: MCP Canonical API ············· benefits from M17 (cleaner server)
├── M21: UI Coherence
└── M22: Policy-as-Code ··············· benefits from M19 (adapter contracts)

HIGH IMPACT (can run in parallel)
├── M23: Durable Persistence
├── M24: Background Jobs ·············· benefits from M23 (persistent queue)
├── M25: Multi-Repo Workspace ·········· benefits from M23 (persistence)
├── M26: Identity & RBAC ·············· benefits from M23 (user storage)
└── M27: Operational Cockpit ··········· benefits from M21 (navigation), M23 (queries)
```

---

## Audit Weakness → Milestone Mapping

| Audit Weakness                          | Score        | Milestones         |
| --------------------------------------- | ------------ | ------------------ |
| #1: Not a full platform operating model | 5.5/10 (ops) | M23, M24, M25, M26 |
| #2: Tooling consistency uneven          | —            | M15, M18           |
| #3: Quality gates not enforced in CI    | 6.5/10 (CI)  | M16                |
| #4: Control-plane concentration risk    | —            | M17                |
| #5: Dependency on human/IDE loop        | —            | M24                |
| #6: UI breadth exceeds UX convergence   | —            | M21, M27           |

## Audit Phase → Milestone Mapping

| Audit Phase | Description                         | Milestones    |
| ----------- | ----------------------------------- | ------------- |
| Phase 1     | Cross the local → platform boundary | M23, M24, M26 |
| Phase 2     | Multi-repo workspace awareness      | M25           |
| Phase 3     | MCP as canonical control surface    | M20           |
| Phase 4     | Execution adapter formalization     | M19           |
| Phase 5     | Policy-as-code governance           | M22           |
| Phase 6     | Operational cockpit UI              | M21, M27      |

---

## Issue Count by Impact

- **LOW:** 22 issues (M15: 5, M16: 6, M17: 6, M18: 5)
- **MEDIUM:** 26 issues (M19: 7, M20: 6, M21: 6, M22: 7)
- **HIGH:** 35 issues (M23: 7, M24: 7, M25: 7, M26: 7, M27: 7)

---

## Execution Notes

- Start with LOW impact milestones to build quality infrastructure (testing,
  CI, documentation) that supports all subsequent work.
- MEDIUM milestones formalize existing patterns and improve developer/user
  experience without changing infrastructure.
- HIGH milestones transform the architecture from local-first tool to team-scale
  platform. These are the "one major architectural step" the auditor identified.
- All milestones preserve the local-first philosophy: the default configuration
  always works without a database, without auth, and without external services.
