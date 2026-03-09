# Sprint Plan — Recalibrated (Post-Reevaluation v1)

## Metadata
- **Agent:** Orchestrator (00)
- **Mode:** AUDIT
- **Based on:** Synthesis reports + Re-evaluation Report v1 (2026-03-08)
- **Date:** 2026-03-08
- **Total scope:** 9 sprints
- **Velocity:** ~10 SP per 2-week sprint (DEC-R4-001)
- **Primary success criterion:** Goal 1 — unattended full CREATE cycle execution (DEC-R4-004)

---

## Assumptions

- **Team composition:** Solo developer — Robert Agterhuis — ~10 hrs/week (DEC-R4-001, Q-04-002)
- **Sprint duration:** 2 weeks
- **Capacity per sprint:** ~10 SP (DEC-R4-001)
- **Technology stack:** Node.js monolith, vanilla HTTP server, file-based storage, Vitest, ESLint
- **Prerequisites:** Synthesis APPROVED, reevaluation decisions applied, GitHub Issues #2–#20 published
- **Timeline pressure:** NONE (DEC-R4-004: "no timeframe, not needed")

---

## Story Point Estimates (All Stories)

| Story ID | Title | Type | SP | Priority | GitHub Issue | Reevaluation Status |
|----------|-------|------|-----|----------|-------------|---------------------|
| TECH-01 | File locking for all JSON stores | CODE | 8 | P0 | #2 | UNCHANGED — critical path for Goal 1 |
| TECH-02 | server.js decomposition (extract route handlers) | CODE | 13 | P1 | #3 | UNCHANGED — maintainability |
| TECH-03 | Schema validators for 7 unvalidated stores | CODE | 8 | P1 | #4 | UNCHANGED — data integrity for Goal 1 |
| TECH-04 | Unify MCP/HTTP write paths (shared FileStore) | CODE | 5 | P1 | #5 | UNCHANGED — eliminates dual-write risk |
| TECH-05 | Persistent metrics + structured logging | CODE | 8 | P2 | #6 | REINFORCED by Q-01-006 (user wants speed insights) |
| TECH-06 | Fix ESLint complexity violations | CODE | 3 | P2 | #7 | UNCHANGED |
| TECH-07 | Add /health endpoint | CODE | 3 | P2 | #8 | ELEVATED — pre-GA requirement for Docker (DEC-R4-005) |
| TECH-08 | Docker deployment readiness | INFRA | 8 | P1 | NEW | NEW — pre-GA (DEC-R4-005). Dockerfile, docker-compose, env config. |
| UX-01 | ARIA landmark roles | CODE | 3 | P1 | #9 | UNCHANGED |
| UX-02 | Skip-to-content navigation | CODE | 2 | P1 | #10 | UNCHANGED |
| UX-03 | Visible focus indicators | CODE | 3 | P1 | #11 | UNCHANGED |
| UX-04 | Loading state pattern | CODE | 5 | P2 | #12 | UNCHANGED |
| UX-05 | First-run onboarding / empty state | CODE | 5 | P2 | #13 | UNCHANGED |
| UX-06 | Component inventory document | ANALYSIS | 3 | P3 | #14 | UNCHANGED |
| BIZ-01 | Product roadmap document | ANALYSIS | 3 | P1 | #15 | INFORMED — no timeline pressure (Q-34-002) |
| BIZ-02 | Domain glossary | CONTENT | 2 | P2 | #16 | DESCOPED — revenue analysis items removed (DEC-R4-002) |
| BIZ-03 | Unattended execution architecture spike | ANALYSIS | 5 | P1 | #17 | VALIDATED — directly targets Goal 1 (DEC-R4-004) |
| MKT-01 | Apply canonical product name | CODE | 3 | P2 | #18 | UNBLOCKED — "myAgentic-IT-Project-team" (DEC-R4-003) |
| MKT-02 | Deploy docs to GitHub Pages | INFRA | 5 | P3 | #19 | GREENLIT by Q-15-001. Promoted from SP-6. |
| MKT-03 | Add Open Graph meta tags | CODE | 2 | P3 | #20 | DESCOPED — no external marketing (DEC-R4-006). Minimal scope retained. |

**Grand total: 97 SP across 20 stories → 9 sprints at ~10.8 SP avg.**

---

## Sprint 1 — Critical Data Integrity ✅ COMPLETE

### Goal
Eliminate the #1 technical risk (file corruption during concurrent access) and establish the project roadmap for all subsequent sprints.

### Stories

| Story ID | Title | Type | Team | Acceptance Criteria | SP | Dependencies | Blocker |
|----------|-------|------|------|---------------------|-----|--------------|---------|
| TECH-01 | File locking for all JSON stores | CODE | Dev | Given concurrent write attempts to any JSON store, when two processes write simultaneously, then the second write waits for the first to complete without data corruption. All existing tests pass. New locking tests added. | 8 | NONE | NONE |
| BIZ-01 | Product roadmap document | ANALYSIS | Dev | Given synthesis findings and reevaluation decisions, when the roadmap is produced, then it contains: vision goals with priority ordering, sprint mapping aligned to Goal 1, and measurable milestones. | 3 | NONE | NONE |

### Parallel Tracks

| Track | Type | Stories | Start Condition |
|-------|------|---------|----------------|
| Track 1 (Code) | CODE | TECH-01 | Sprint start |
| Track 2 (Analysis) | ANALYSIS | BIZ-01 | Sprint start |

### Sprint KPIs

| KPI | Baseline | Target | Measurement |
|-----|----------|--------|-------------|
| File locking coverage | 0% (no locking) | 100% (all JSON stores) | Verify locking wrapper on all write operations |
| Tests passing | 576/576 | ≥576/576 (+ new lock tests) | `npm test` |

**Total: ~11 SP** (CODE: 8, ANALYSIS: 3)

---

## Sprint 2 — Execution Foundation ✅ COMPLETE

### Goal
Design the unattended execution architecture (Goal 1 blueprint) and eliminate dual-write inconsistencies between MCP and HTTP channels.

### Stories

| Story ID | Title | Type | Team | Acceptance Criteria | SP | Dependencies | Blocker |
|----------|-------|------|------|---------------------|-----|--------------|---------|
| TECH-04 | Unify MCP/HTTP write paths (shared FileStore) | CODE | Dev | Given a write operation via MCP or HTTP, when either channel writes to a data store, then both use the same FileStore abstraction with identical locking, validation, and backup behavior. No dual-write code paths remain. | 5 | TECH-01 (file locking) | NONE |
| BIZ-03 | Unattended execution architecture spike | ANALYSIS | Dev | Spike document produced: describes end-to-end flow for unattended CREATE cycle, identifies blocking gaps, proposes technical changes needed. Acceptance: document reviewed and findings actionable. | 5 | BIZ-01 (roadmap) | NONE |

### Parallel Tracks

| Track | Type | Stories | Start Condition |
|-------|------|---------|----------------|
| Track 1 (Code) | CODE | TECH-04 | TECH-01 merged |
| Track 2 (Analysis) | ANALYSIS | BIZ-03 | Sprint start |

**Total: ~10 SP** (CODE: 5, ANALYSIS: 5)

---

## Sprint 3 — Data Validation ✅ COMPLETE

### Goal
Achieve 100% schema validation coverage for all data stores, preventing silent data corruption during agent execution.

### Stories

| Story ID | Title | Type | Team | Acceptance Criteria | SP | Dependencies | Blocker |
|----------|-------|------|------|---------------------|-----|--------------|---------|
| TECH-03 | Schema validators for 7 unvalidated stores | CODE | Dev | Given any write to a data store, when the data is invalid against its schema, then the write is rejected with a descriptive error. All 9/9 stores validated. Schema test coverage ≥80%. | 8 | TECH-01 (locking), TECH-04 (unified writes) | NONE |
| TECH-06 | Fix ESLint complexity violations | CODE | Dev | Given `npx eslint .`, when run on the codebase, then 0 errors are reported (was 4). No functional regressions. | 3 | NONE | NONE |

**Total: ~11 SP**

---

## Sprint 4 — Server Decomposition ✅ COMPLETE

### Goal
Reduce server.js from ~1210 LOC god file to modular route handler + middleware architecture, lowering cognitive load for all future changes.

### Stories

| Story ID | Title | Type | Team | Acceptance Criteria | SP | Dependencies | Blocker |
|----------|-------|------|------|---------------------|-----|--------------|---------|
| TECH-02 | server.js decomposition | CODE | Dev | server.js reduced to <400 LOC (coordinator only). Route handlers extracted to separate modules. Middleware extracted. All 576+ tests still pass. No API behavior changes. | 13 | TECH-01 (locking must be stable) | NONE |

**Total: ~13 SP** (single large story — cannot meaningfully split. Sprint may extend by 1-2 days.)

---

## Sprint 5 — Accessibility ✅ COMPLETE

### Goal
Raise WCAG 2.1 AA compliance from ~70% to ≥90% and consolidate brand naming across all user-facing references.

### Stories

| Story ID | Title | Type | Team | Acceptance Criteria | SP | Dependencies | Blocker |
|----------|-------|------|------|---------------------|-----|--------------|---------|
| UX-01 | ARIA landmark roles | CODE | Dev | index.html has banner, main, navigation, contentinfo roles. axe-core scan reports 0 landmark violations. | 3 | NONE | NONE |
| UX-02 | Skip-to-content navigation | CODE | Dev | A skip link is visible on keyboard focus, targets main content area. Tab-and-enter skips past navigation. | 2 | NONE | NONE |
| UX-03 | Visible focus indicators | CODE | Dev | All interactive elements (buttons, links, inputs, tabs) have visible focus indicators per WCAG 2.4.7. No focus indicator removed by CSS `outline: none` without replacement. | 3 | NONE | NONE |
| MKT-01 | Apply canonical product name | CODE | Dev | All user-facing references use "myAgentic-IT-Project-team" (DEC-R4-003). Updated: README.md, package.json name, index.html title, documentation headers. Repository name unchanged. | 3 | NONE | NONE |

**Total: ~11 SP**

---

## Sprint 6 — Observability

### Goal
Add persistent metrics and structured logging to enable performance analysis and operational monitoring.

### Stories

| Story ID | Title | Type | Team | Acceptance Criteria | SP | Dependencies | Blocker |
|----------|-------|------|------|---------------------|-----|--------------|---------|
| TECH-05 | Persistent metrics + structured logging | CODE | Dev | Metrics persisted to file (JSON). Structured JSON log format. Request timing captured. Metrics survive server restart. | 8 | TECH-02 (decomposed server for clean integration) | NONE |
| TECH-07 | /health endpoint | CODE | Dev | GET /health returns 200 with JSON: server uptime, version, store status. Responds within 100ms. Pre-GA Docker requirement (DEC-R4-005). | 3 | NONE | NONE |

**Total: ~11 SP**

---

## Sprint 7 — UX Polish

### Goal
Add loading and empty state patterns for better user experience during long operations and first-time use.

### Stories

| Story ID | Title | Type | Team | Acceptance Criteria | SP | Dependencies | Blocker |
|----------|-------|------|------|---------------------|-----|--------------|---------|
| UX-04 | Loading state pattern | CODE | Dev | All async operations show loading indicator. Buttons disabled during submission. Loading states accessible (ARIA live region). | 5 | NONE | NONE |
| UX-05 | First-run onboarding / empty state | CODE | Dev | When no session exists, show guided first-run experience. Empty states for all list views provide context and action guidance. | 5 | NONE | NONE |

**Total: ~10 SP**

---

## Sprint 8 — Documentation & Brand

### Goal
Create component inventory for design system governance and deploy documentation to GitHub Pages.

### Stories

| Story ID | Title | Type | Team | Acceptance Criteria | SP | Dependencies | Blocker |
|----------|-------|------|------|---------------------|-----|--------------|---------|
| UX-06 | Component inventory document | ANALYSIS | Dev | Document lists all reusable UI components in index.html with props, states, and accessibility contracts. Saved to .github/docs/storybook/component-inventory.md. | 3 | UX-01..UX-05 complete | NONE |
| MKT-02 | Deploy docs to GitHub Pages | INFRA | Dev | GitHub Pages enabled. Jekyll _config.yml configured. Navigation structure. SEO metadata (title, description). Site accessible at repository GitHub Pages URL. | 5 | BIZ-01 (roadmap doc) | NONE |
| MKT-03 | Add Open Graph meta tags | CODE | Dev | index.html has og:title, og:description, og:type meta tags. Descoped from external marketing — minimal tags only. | 2 | NONE | NONE |

**Total: ~10 SP**

---

## Sprint 9 — Pre-GA Readiness

### Goal
Complete Docker deployment readiness and finalize domain documentation for GA release.

### Stories

| Story ID | Title | Type | Team | Acceptance Criteria | SP | Dependencies | Blocker |
|----------|-------|------|------|---------------------|-----|--------------|---------|
| TECH-08 | Docker deployment readiness | INFRA | Dev | Dockerfile builds and runs the application. docker-compose.yml with health check. .dockerignore present. Environment variable configuration documented. Container starts and serves /health within 10s. | 8 | TECH-07 (/health endpoint) | NONE |
| BIZ-02 | Domain glossary | CONTENT | Dev | Domain glossary document with all key terms defined. Descoped from revenue analysis (DEC-R4-002). Aligned with data-dictionary.md. | 2 | NONE | NONE |

**Total: ~10 SP**

---

## Summary

| Sprint | Focus | SP | Key Stories |
|--------|-------|----|-------------|
| SP-1 | Critical Data Integrity | 11 | TECH-01, BIZ-01 |
| SP-2 | Execution Foundation | 10 | TECH-04, BIZ-03 |
| SP-3 | Data Validation | 11 | TECH-03, TECH-06 |
| SP-4 | Server Decomposition | 13 | TECH-02 |
| SP-5 | Accessibility | 11 | UX-01, UX-02, UX-03, MKT-01 |
| SP-6 | Observability | 11 | TECH-05, TECH-07 |
| SP-7 | UX Polish | 10 | UX-04, UX-05 |
| SP-8 | Documentation & Brand | 10 | UX-06, MKT-02, MKT-03 |
| SP-9 | Pre-GA Readiness | 10 | TECH-08, BIZ-02 |
| **Total** | | **97** | **20 stories** |

**Timeline:** 9 sprints × 2 weeks = 18 weeks (~4.5 months). No deadline pressure (DEC-R4-004).

---

## Decisions Applied

| Decision | Impact on Sprint Plan |
|----------|----------------------|
| DEC-R4-001 | Velocity recalibrated from 30 SP to ~10 SP/sprint. Sprints increased from 6 to 9. |
| DEC-R4-002 | BIZ-02 descoped: revenue analysis items removed, reduced to 2 SP domain glossary. |
| DEC-R4-003 | MKT-01 unblocked: canonical name "myAgentic-IT-Project-team" decided. |
| DEC-R4-004 | Stories prioritized against Goal 1. BIZ-03 elevated to SP-2. |
| DEC-R4-005 | TECH-07 elevated (pre-GA Docker). TECH-08 added as new pre-GA story. |
| DEC-R4-006 | MKT-03 descoped: no external marketing. Minimal OG tags retained. |
| DEC-R2-001 | All localhost-only scope validated. Network security findings ADVISORY. |
| DEC-R2-004 | No localization work. English only. |
| DEC-R2-006 | File-based storage only. No database migration. |
