# Product Roadmap — myAgentic-IT-Project-team

> **Version:** 1.0  
> **Date:** 2026-03-08  
> **Author:** Implementation Agent (BIZ-01)  
> **Sprint:** SP-1  
> **Status:** APPROVED  

---

## 1. Vision Statement

**myAgentic-IT-Project-team** is an open-source, multi-agent orchestration platform that creates complete, production-ready software solutions through 38 coordinated AI agents across four strategic phases.

**Primary Success Criterion (Goal 1):**  
> All 38 agents execute in sequence without manual intervention for a full CREATE cycle.

**Source:** DEC-R4-004 (questionnaire: Q-34-001)

---

## 2. Strategic Goals — Priority Ordering

| Priority | Goal | Description | Status |
|----------|------|-------------|--------|
| **P0** | Goal 1: Unattended Execution | All 38 agents complete a full CREATE cycle without human intervention | IN PROGRESS — sprint plan active |
| **P1** | Goal 2: State Consistency | Concurrent MCP + HTTP access never corrupts shared data | SP-1 through SP-3 |
| **P2** | Goal 3: Reproducible Workflows | Version-controlled session state, deterministic agent outputs | POST-GA |
| **P3** | Goal 4: Engineering Tooling | IDE integration (MCP server), developer experience | PARTIAL — MCP server exists |
| **P4** | Goal 5: Observability | Analytics, structured logging, metrics persistence | SP-6 |

---

## 3. Sprint Roadmap (9 Sprints × 2 Weeks × ~10 SP)

**Velocity:** ~10 story points per 2-week sprint (solo developer, ~10 hrs/week)  
**Total Scope:** 97 SP across 20 stories  
**Timeline Constraint:** None — quality-first, no deadline pressure (DEC-R4-001, Q-34-002)

### Sprint 1 — Critical Data Integrity (11 SP)
| Story | Type | SP | Description |
|-------|------|-----|-------------|
| TECH-01 | CODE | 8 | File locking for all JSON stores — shared `withFileLock` module |
| BIZ-01 | ANALYSIS | 3 | Product roadmap document (this document) |

**Milestone:** CRITICAL risk P2-R01 eliminated. Concurrent writes are safe.  
**Goal 1 Impact:** Removes the single-point-of-failure blocking all further Goal 1 work.

### Sprint 2 — Execution Foundation (10 SP)
| Story | Type | SP | Description |
|-------|------|-----|-------------|
| TECH-04 | CODE | 5 | Unified MCP/HTTP write paths through single FileStore abstraction |
| BIZ-03 | ANALYSIS | 5 | Unattended execution architecture spike — document end-to-end flow |

**Milestone:** Dual-write inconsistencies eliminated. Goal 1 architecture blueprint completed.  
**Dependency:** TECH-01 (file locking) → TECH-04 (unified writes)

### Sprint 3 — Data Validation (11 SP)
| Story | Type | SP | Description |
|-------|------|-----|-------------|
| TECH-03 | CODE | 8 | Schema validators for all 9 data stores (currently 2/9 = 22%) |
| TECH-06 | CODE | 3 | Fix ESLint violations — reduce cyclomatic complexity |

**Milestone:** 100% schema validation coverage. Silent data corruption prevented during Goal 1 operations.

### Sprint 4 — Server Decomposition (13 SP)
| Story | Type | SP | Description |
|-------|------|-----|-------------|
| TECH-02 | CODE | 13 | Decompose server.js (1210 LOC → <400 LOC per module) |

**Milestone:** God file eliminated. Codebase maintainable for future Goal 1 implementation.

### Sprint 5 — Accessibility & Brand (11 SP)
| Story | Type | SP | Description |
|-------|------|-----|-------------|
| UX-01 | CODE | 3 | ARIA landmark roles + skip navigation |
| UX-02 | CODE | 3 | Visible focus indicators (keyboard navigation) |
| UX-03 | CODE | 3 | Color contrast fixes for WCAG 2.1 AA |
| MKT-01 | CODE | 2 | Apply canonical product name across all surfaces |

**Milestone:** WCAG 2.1 AA compliance ≥90%. Brand identity consolidated (DEC-R4-003).

### Sprint 6 — Observability (11 SP)
| Story | Type | SP | Description |
|-------|------|-----|-------------|
| TECH-05 | CODE | 8 | Persistent metrics + structured logging (survive restarts) |
| TECH-07 | CODE | 3 | `/health` endpoint for container health checks |

**Milestone:** Performance insights available. Docker readiness prerequisites met.

### Sprint 7 — UX Polish (10 SP)
| Story | Type | SP | Description |
|-------|------|-----|-------------|
| UX-04 | CODE | 5 | Loading states + empty state patterns |
| UX-05 | CODE | 5 | First-run onboarding experience |

**Milestone:** User experience smooth for long-running agent operations.

### Sprint 8 — Documentation & Design System (10 SP)
| Story | Type | SP | Description |
|-------|------|-----|-------------|
| UX-06 | ANALYSIS | 3 | Component inventory documentation |
| MKT-02 | INFRA | 5 | Deploy docs to GitHub Pages |
| MKT-03 | CODE | 2 | Open Graph meta tags (minimal) |

**Milestone:** Design system documented. Documentation live at GitHub Pages URL.

### Sprint 9 — Pre-GA Readiness (10 SP)
| Story | Type | SP | Description |
|-------|------|-----|-------------|
| TECH-08 | INFRA | 8 | Docker deployment (Dockerfile, compose, health checks) |
| BIZ-02 | ANALYSIS | 2 | Domain glossary (descoped from revenue analysis per DEC-R4-002) |

**Milestone:** GA release criteria met. Application runs in Docker container with monitoring.

---

## 4. Goal 1 Critical Path

The dependency chain for achieving unattended execution:

```
SP-1: TECH-01 File Locking ✅ (IMPLEMENTED)
  ↓
SP-2: TECH-04 Unified Write Paths → BIZ-03 Architecture Spike
  ↓
SP-3: TECH-03 Schema Validation (100% coverage)
  ↓
SP-4: TECH-02 Server Decomposition
  ↓
SP-6: TECH-05 Observability (monitor unattended execution)
  ↓
POST-SP-9: Unattended Execution Implementation (not yet planned — informed by BIZ-03 spike)
```

**Key Insight:** The actual implementation of unattended execution code is POST-GA scope. Sprints 1–9 build the technical foundation that makes it achievable. The BIZ-03 architecture spike (SP-2) will identify what additional work is needed beyond this roadmap.

---

## 5. Key Milestones

| Target Sprint | Milestone | Measurable Criterion |
|---------------|-----------|---------------------|
| SP-1 | Data integrity foundation | File locking operational; 580+ tests passing |
| SP-2 | Unified architecture | Single write path for MCP + HTTP; architecture spike document approved |
| SP-3 | Data validation complete | 9/9 stores have schema validators; 100% coverage |
| SP-4 | Maintainable codebase | No module >400 LOC; ESLint clean |
| SP-5 | Accessibility baseline | WCAG 2.1 AA score ≥90%; brand name consolidated |
| SP-6 | Observable system | Metrics persist across restarts; /health endpoint responds |
| SP-8 | Documentation live | GitHub Pages deployed; component inventory published |
| SP-9 | GA-ready | Docker deployment tested; zero CRITICAL/HIGH unresolved risks |

---

## 6. Risk Matrix (Roadmap Impact)

### CRITICAL — Require Immediate Mitigation
| Risk ID | Description | Mitigation | Sprint |
|---------|-------------|-----------|--------|
| P2-R01 | No file locking — concurrent writes corrupt JSON | TECH-01: shared `withFileLock` module | SP-1 ✅ |
| P1-R04 | Solo developer, bus factor = 1, ~10 hrs/week | Velocity recalibrated 30→10 SP. No deadline. | All |

### HIGH — Addressed in Roadmap
| Risk ID | Description | Sprint |
|---------|-------------|--------|
| P2-R02 | God file (server.js ~1210 LOC) | SP-4 |
| P2-R04 | Schema coverage 22% | SP-3 |
| P3-R01 | WCAG 2.1 AA ~70% | SP-5 |
| P1-R02 | No data integrity verification | SP-1, SP-3 |
| P2-R03 | Observability 2/5 | SP-6 |

### Accepted Risk (No In-Scope Mitigation)
| Risk ID | Description | Rationale |
|---------|-------------|-----------|
| P1-R01 | Complete LLM dependency | Architectural constraint — agents require AI provider by design |

---

## 7. Architectural Decisions Informing This Roadmap

| Decision | Impact | Source |
|----------|--------|--------|
| DEC-R4-004: Goal 1 is the acceptance criterion | All priorities align to unattended execution | Q-34-001 |
| DEC-R4-001: 10 hrs/week = ~10 SP/sprint | 9-sprint timeline (was 6 at 30 SP/sprint) | Q-04-002 |
| DEC-R4-005: Docker required at GA | TECH-08 added to SP-9 | Q-05-001 |
| DEC-R4-002: Free OSS forever, no revenue model | Revenue analysis descoped | Q-01-001 |
| DEC-R4-003: Product name = "myAgentic-IT-Project-team" | MKT-01 unblocked | Q-14-001 |
| DEC-R4-006: No external marketing | MKT-03 descoped to minimal OG tags | Q-14-002 |
| DEC-R2-006: File-based storage only | No database migration; all scaling via file locking + schema validation | Synthesis |
| DEC-R2-001: Localhost only (until GA) | No cloud deployment stories in roadmap | Synthesis |

---

## 8. Out of Scope (Deferred)

| Item | Rationale | Decision |
|------|-----------|----------|
| Internationalization (i18n) | Solo developer, English-only audience | DEC-R2-004 |
| Multi-user concurrent access | Localhost single-user mode until GA | DEC-R2-001 |
| Storybook component library | No frontend framework (vanilla JS) | SKIPPED |
| Revenue model / monetization | Free OSS forever | DEC-R4-002 |
| Social media / external marketing | No community growth plan yet | DEC-R4-006 |
| Unattended execution implementation | Requires BIZ-03 spike findings | POST-GA |

---

## HANDOFF CHECKLIST
- [x] All required sections are filled (not empty, not placeholder)
- [x] All UNCERTAIN: items are documented and escalated — N/A (none)
- [x] All INSUFFICIENT_DATA: items are documented and escalated — N/A (none)
- [x] Output complies with the contract in /.github/docs/contracts/
- [x] Guardrails from /.github/docs/guardrails/ have been checked
- [x] Output is machine-readable and ready as input for the next agent
- [x] No contradictory statements in this document
- [x] All findings include a source reference
- [x] Deliverable written to file (not only in chat) per MEMORY MANAGEMENT PROTOCOL
