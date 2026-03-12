# Sprint 5 Plan — First Feature Sprint Post-GA

| Field               | Value                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| **Sprint**          | 5                                                                                                    |
| **Milestone**       | #27 — Sprint 5 — Orchestrator Foundation + Audit Closure                                             |
| **Branch**          | `feature/sprint-5-implementation`                                                                    |
| **Start**           | 2026-03-18                                                                                           |
| **Duration**        | 7 days                                                                                               |
| **Theme**           | Begin feature implementation (FEAT-05 orchestrator), close deferred GA findings, process improvements |
| **Velocity target** | 87% (6/7 items, based on 4-sprint average: 88%)                                                      |
| **Source**          | Sprint 4 deferred findings (F-06, F-09, F-11) + product backlog (FEAT-02, FEAT-03, FEAT-05)          |

---

## Sprint Goal

> **Transition from governance to feature delivery.** Begin building the
> code-based orchestrator (FEAT-05), lay cross-platform foundations (FEAT-03),
> close all deferred GA findings, and establish the design system foundation.

Sprint 4 closed the governance gap. Sprint 5 starts the feature pipeline with
the two P0 orchestrator items that the GA audit flagged as the highest-priority
backlog gap (F-06).

---

## Sprint Gate Validation

| Check                        | Result                                                                 |
| ---------------------------- | ---------------------------------------------------------------------- |
| Open HIGH-priority decisions | **PASS** — 0 OPEN HIGH questions in `decisions.md`                     |
| Reevaluate triggers          | **PASS** — No pending `reevaluate-trigger.json`                        |
| Lessons injected             | **PASS** — L19, L23, L21 injected (see below)                          |
| Retro actions mapped         | **PASS** — All 7 Sprint 4 retro actions mapped                         |
| Definition of Ready          | **PASS** — All items have ACs, estimates, dependencies documented      |
| Deferred GA findings         | **PASS** — F-06, F-09, F-11 scoped into sprint items                  |
| CI pipeline status           | **PASS** — 22 checks stable, no infra work needed (L21)               |

**Sprint Gate Verdict: APPROVED**

---

## Top 3 Lessons Injected

### L19 — Governance sprints achieve highest velocity

> Sprint 4 hit 100% on 8 items / 59 ACs. Sprint 5 mixes features + governance
> deferred items — expect 80-87% velocity.

**Applied to:** Velocity target set at 87% (7 items, expect 6 completed).
Each item has a clear DoD derived from audit findings or feature specs.

### L23 — Day 1 scope decisions unlock dependency chains

> Sprint 4's clean dependency chain was enabled by resolving the deployment
> profile decision on Day 1.

**Applied to:** Day 1 resolves architectural scope decisions (orchestrator
pattern, schema format) before implementation begins on Day 2.

### L21 — CI pipeline is now stable

> 22-check CI pipeline was hardened in Sprint 4. No further infra work needed.

**Applied to:** No CI items in Sprint 5. Pure feature-implementation focus.

---

## Sprint 4 Retro Action → Sprint 5 Mapping

| #   | Retro Action                                        | Sprint 5 Item                 | How Applied                                        |
| --- | --------------------------------------------------- | ----------------------------- | -------------------------------------------------- |
| 1   | Completion report immediately after PR merge        | Sprint process                | Built into Day 7 schedule                          |
| 2   | Budget 1 day for CI stabilization                   | N/A — CI stable (L21)        | No CI items in sprint; budget Day 7 if needed      |
| 3   | Create KPI log on Day 1 and update daily            | SP-5-KPI (#NEW)               | KPI log created Day 1, updated daily               |
| 4   | Document validation tests for governance artifacts  | SP-5-KPI (#NEW)               | Schema validation tests for ga-definition, etc.    |
| 5   | Map Sprint 4 retro actions to Sprint 5 items        | This mapping                  | ✅ Applied                                         |
| 6   | Resolve deferred GA findings F-06, F-09, F-11       | SP-5-ORCH-A, SP-5-ORCH-B, SP-5-CAT, SP-5-SCHEMA | Deferred items mapped to sprint items |
| 7   | Close or defer SP-3-DEVTO with reason               | SP-5-DEVTO (#133)             | Completing remaining 4 ACs                         |

---

## Item Summary

| #   | Item ID      | Issue  | Source     | Priority | ACs | Days  |
| --- | ------------ | ------ | ---------- | -------- | --- | ----- |
| 1   | SP-5-ORCH-A  | #80    | F-06 / P0  | P0       | 8   | 2-3   |
| 2   | SP-5-ORCH-B  | #81    | F-06 / P0  | P0       | 7   | 3-4   |
| 3   | SP-5-SCHEMA  | #68    | F-09       | P1       | 6   | 4-5   |
| 4   | SP-5-DESIGN  | #36    | Backlog    | P1       | 7   | 5-6   |
| 5   | SP-5-CAT     | #146   | F-11       | P1       | 5   | 1     |
| 6   | SP-5-DEVTO   | #133   | Carryover  | P2       | 4   | 6     |
| 7   | SP-5-KPI     | #147   | Retro #3,4 | P2       | 4   | 1,7   |

**Total: 7 items, ~41 ACs**

---

## Dependency Chain

```
Day 1:  SP-5-CAT (F-11 decisions)     SP-5-KPI (KPI log + schema)
          │                               │
          ▼                               ▼ (updated daily)
Day 2:  SP-5-ORCH-A (#80 State Machine)
          │
          ▼
Day 3:  SP-5-ORCH-A continues → SP-5-ORCH-B (#81 Dispatcher) starts
          │
          ▼
Day 4:  SP-5-ORCH-B continues → SP-5-SCHEMA (#68 Agent Schema) starts
          │
          ▼
Day 5:  SP-5-SCHEMA continues  +  SP-5-DESIGN (#36 Design System) starts
          │                          │
          ▼                          ▼
Day 6:  SP-5-DESIGN continues  +  SP-5-DEVTO (#133 Dev.to)
          │
          ▼
Day 7:  Sprint completion + reports + PR
```

---

## Day-by-Day Schedule

### Day 1 — Scope Decisions + Governance Closure + KPI Setup

**Theme:** Resolve architectural scope decisions, close F-11, set up sprint tracking.

| Item      | Issue | ACs | Deliverables                                          |
| --------- | ----- | --- | ----------------------------------------------------- |
| SP-5-CAT  | #NEW  | 5   | Decision category files for CAT-01 through CAT-09     |
| SP-5-KPI  | #NEW  | 2   | `sprint-5-kpi-log.md`, governance doc validation tests |

**SP-5-CAT (F-11) work:**

- Populate CAT-01 through CAT-09 decision categories with decisions from
  `decisions.md` that reference each technology
- Link categories to governance framework from ga-definition.md (F-01)
- Mark each CAT issue as resolved with the populated content

**SP-5-KPI (Retro #3, #4) work:**

- Create `sprint-5-kpi-log.md` with standard KPI schema
- Add governance document schema validation tests (Vitest):
  - ga-definition.md structure validation
  - data-inventory.md structure validation
  - security-design.md structure validation

**Day 1 Definition of Done:**

- [ ] All 9 CAT decision categories populated
- [ ] KPI log created with Day 1 entry
- [ ] Validation tests for governance docs passing

---

### Day 2-3 — Orchestrator State Machine (P0)

**Theme:** Build the core state machine engine that drives the orchestrator.

| Item        | Issue | ACs | Deliverables                              |
| ----------- | ----- | --- | ----------------------------------------- |
| SP-5-ORCH-A | #80   | 8   | `src/orchestrator/state-machine.js` + tests |

**FEAT-05-A work (from architecture spec):**

- State machine engine with states: IDLE, ONBOARDING, PHASE_1-4, CRITIC_RISK,
  SYNTHESIS, SPRINT_GATE, IMPLEMENTING, COMPLETED
- Transition validation: only valid state transitions allowed
- Event-driven: transitions triggered by agent completion events
- Persistence: state serialized to session-state.json
- Tests: unit tests for all state transitions, invalid transition rejection,
  serialization/deserialization

**Day 2-3 Definition of Done:**

- [ ] State machine engine implemented with all states
- [ ] Transition validation tests passing
- [ ] Persistence to session-state.json working
- [ ] All 8 ACs for #80 checked off

---

### Day 3-4 — Agent Invocation Dispatcher (P0)

**Theme:** Build the dispatcher that executes agents based on state machine transitions.

| Item        | Issue | ACs | Deliverables                             |
| ----------- | ----- | --- | ---------------------------------------- |
| SP-5-ORCH-B | #81   | 7   | `src/orchestrator/dispatcher.js` + tests  |

**FEAT-05-B work (from architecture spec):**

- Agent dispatcher: maps states to agent skill files
- Invocation protocol: load agent context → execute → validate output → trigger
  state transition
- Agent registry: maps agent names to skill file paths
- Context injection: prepends questionnaire answers + lessons learned
- Error handling: agent failure → BLOCKED state + escalation
- Tests: dispatcher invocation mocks, context injection, error paths

**Day 3-4 Definition of Done:**

- [ ] Dispatcher implemented with agent registry
- [ ] Context injection working (questionnaire + lessons)
- [ ] Error handling with BLOCKED state
- [ ] All 7 ACs for #81 checked off

---

### Day 4-5 — Canonical Agent Schema (F-09 Foundation)

**Theme:** Define the cross-platform agent schema that enables multi-LLM support.

| Item       | Issue | ACs | Deliverables                                         |
| ---------- | ----- | --- | ---------------------------------------------------- |
| SP-5-SCHEMA | #68   | 6   | `src/schemas/agent-schema.json`, validation, tests    |

**FEAT-03-A work (from architecture spec):**

- JSON Schema for canonical agent definition: name, role, skills, tools,
  guardrails, contract, output format
- Schema validation function: validate any agent definition against schema
- Migration from current ad-hoc agent definitions to schema
- JSON Schema draft-07 compliant
- Tests: valid/invalid schema examples, edge cases

**Day 4-5 Definition of Done:**

- [ ] Agent schema JSON defined
- [ ] Validation function implemented
- [ ] At least 3 existing agents migrated to schema format
- [ ] All 6 ACs for #68 checked off

---

### Day 5-6 — Design System Foundation

**Theme:** Establish the design token system and component architecture.

| Item       | Issue | ACs | Deliverables                               |
| ---------- | ----- | --- | ------------------------------------------ |
| SP-5-DESIGN | #36   | 7   | Design tokens, component architecture docs  |

**FEAT-02-A work (from UX/UI specs):**

- Design token system: colors, typography, spacing, breakpoints
  (extends existing `design-tokens.json`)
- CSS custom properties generated from design tokens
- Component architecture document: atomic design principles, naming conventions
- Storybook-compatible component structure
- Accessibility baseline: WCAG 2.1 AA color contrast verification
- Tests: token generation, contrast validation

**Day 5-6 Definition of Done:**

- [ ] Design tokens extended with full color/typography/spacing system
- [ ] CSS custom properties generation working
- [ ] Component architecture document committed
- [ ] Contrast validation tests passing
- [ ] All 7 ACs for #36 checked off

---

### Day 6 — Dev.to Cross-Posting (Carryover)

**Theme:** Close the Sprint 3 carryover item.

| Item      | Issue | ACs | Deliverables                            |
| --------- | ----- | --- | --------------------------------------- |
| SP-5-DEVTO | #133  | 4   | Dev.to articles cross-posted, canonical URLs |

**Remaining work (4/6 ACs):**

- Dev.to account setup (if not yet done)
- Canonical URL configuration for cross-posted articles
- First article cross-posted with canonical URL
- Second article cross-posted

**Day 6 Definition of Done:**

- [ ] Dev.to account configured
- [ ] Canonical URLs implemented
- [ ] Two articles cross-posted
- [ ] All 6 ACs for #133 checked off (including 2 already done)

---

### Day 7 — Sprint Completion

**Theme:** Close the sprint, write reports, create PR.

**Sprint completion activities:**

- Run full test suite (Jest + Vitest)
- Run linting (ESLint both configs)
- Update KPI log with final metrics (SP-5-KPI remaining 2 ACs)
- Update `session-state.json` and `velocity-log.json`
- Create Sprint 5 PR using PR template
- Write sprint-5-completion-report.md
- Write sprint-5-retrospective.md

---

## Audit Findings Closure Status

| Finding | Severity | Sprint 4        | Sprint 5                    | Status        |
| ------- | -------- | ---------------- | --------------------------- | ------------- |
| F-06    | HIGH     | Deferred         | SP-5-ORCH-A + SP-5-ORCH-B  | 🟡 IN SPRINT |
| F-09    | MEDIUM   | Deferred         | SP-5-SCHEMA (foundation)    | 🟡 STARTED   |
| F-11    | MEDIUM   | Deferred         | SP-5-CAT                    | 🟡 IN SPRINT |

---

## Risk Register

| Risk                                          | Likelihood | Impact | Mitigation                                                     |
| --------------------------------------------- | ---------- | ------ | -------------------------------------------------------------- |
| Orchestrator scope creep (state machine)      | Medium     | High   | Strict AC scoping; only states in session-state.json           |
| FEAT-05-A → FEAT-05-B dependency blocks Day 4 | Medium     | Medium | State machine API frozen end of Day 2; dispatcher can mock     |
| Design token system complexity                | Low        | Medium | Build on existing design-tokens.json; don't redesign           |
| Dev.to account setup requires manual steps    | Medium     | Low    | Can defer to Sprint 6 if blocked; not on critical path         |

---

## Carry-Over from Sprint 4

| Item | Issue | Status | Sprint 5 Action |
| ---- | ----- | ------ | --------------- |
| None | —     | —      | —               |

## Persistent Carryover

| Item       | Issue | Status            | Sprint 5 Action             |
| ---------- | ----- | ----------------- | --------------------------- |
| SP-3-DEVTO | #133  | BACKLOG (2/6 ACs) | SP-5-DEVTO — complete item  |

---

## Success Criteria

Sprint 5 is COMPLETE when:

1. Orchestrator state machine engine (#80) is implemented with all transitions
2. Agent dispatcher (#81) is implemented with invocation protocol
3. Canonical agent schema (#68) is defined with validation
4. Design system foundation (#36) is established with tokens
5. All deferred GA findings (F-06, F-09, F-11) have sprint items addressing them
6. All tests pass (both Jest and Vitest suites)
7. Sprint 5 PR is created using PR template
8. Sprint completion report and retrospective written

**Target velocity:** ≥87% (6/7 items, based on 4-sprint average: 88%)

---

## Predecessor Context

| Sprint | Items | Completed | Velocity | Theme                     |
| ------ | ----- | --------- | -------- | ------------------------- |
| SP-1   | 15    | 13        | 87%      | Foundation + platform     |
| SP-2   | 10    | 8         | 80%      | UX + localization         |
| SP-3   | 7     | 6         | 86%      | Pilot + operations        |
| SP-4   | 8     | 8         | 100%     | GA governance (audit)     |
| **SP-5** | **7** | **TBD**  | **87% target** | **Feature foundation** |

---

_Generated: 2026-03-17 | Sprint Gate + Implementation Agent | Sprint 5 Planning_
