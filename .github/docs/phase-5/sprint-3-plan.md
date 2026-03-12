# Sprint 3 — Implementation Plan

**Sprint ID:** SP-3  
**Milestone:** [#25](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/milestone/25)  
**Period:** 2026-04-08 → 2026-04-21 (10 working days)  
**Branch:** `feature/sprint-3-implementation`  
**Base Commit:** `3ca89db` (Sprint 2 squash merge)  
**Velocity Target:** 80% (6-7 of 7 items)  
**Sprint Gate Verdict:** APPROVED

---

## Sprint Gate Validation

| Check | Result |
|-------|--------|
| Open HIGH-priority decisions | **PASS** — No OPEN HIGH questions in `decisions.md` |
| Reevaluate triggers | **PASS** — No pending `reevaluate-trigger.json` |
| Lessons injected | **PASS** — L12, L10, L7 injected (see below) |
| Retro actions mapped | **PASS** — All 8 Sprint 2 retro actions mapped |
| Definition of Ready | **PASS** — All items have AC, estimates, dependencies documented |
| Active decisions | DEC-112 (public icon library) — constraint injected |

---

## Top 3 Lessons Injected

### L12 — Broaden Stakeholder Pools
> Pilot recruitment failed with 3 candidates. Sprint 3 needs 5-6 candidates
> with explicit Day 2 confirmation deadlines and backup candidates per role.

**Applied to:** SP-3-201-P (#107) — expanded to 5-6 candidates, Day 2 deadline,
no-response fallback (internal self-test if < 3 by Day 3).

### L10 — Escalation Protocols for All Stakeholder Items
> Every stakeholder-dependent item should have a pre-defined trigger condition
> and decision gate documented before sprint start.

**Applied to:** SP-3-201-P (#107) — Escalation trigger: < 3 confirmed by Day 3
→ activate no-response fallback. SP-3-202 (#110) — Escalation: if pilot scope
not finalized by Day 4 → use draft rubric with internal self-test data.

### L7 — Map Retro Actions to Backlog Items
> Sprint 2 successfully mapped all 7 Sprint 1 retro actions to sprint items.

**Applied to:** All 8 Sprint 2 retro actions mapped below.

---

## Sprint 2 Retro Action → Sprint 3 Mapping

| # | Retro Action | Sprint 3 Item | How Applied |
|---|-------------|---------------|-------------|
| 1 | Pilot: 5-6 candidates, Day 2 deadline | SP-3-201-P (#107) | AC updated: 5-6 pool, Day 2 confirmation |
| 2 | "No-response fallback" for stakeholder items | SP-3-201-P (#107) | Fallback: internal self-test if < 3 by Day 3 |
| 3 | Split implementation vs operational execution | SP-3-DEVTO (#133), SP-3-GH-DISC (#134) | Operational items split as separate issues |
| 4 | Formalize sub-item velocity tracking | SP-3-VELOC (#135) | Dedicated process item |
| 5 | Content items 3-5 day estimates | SP-3-DEVTO (#133) | Estimated at 3 days (not 1-3) |
| 6 | Integration gap review Day 6 | Sprint process | Day 6 checkpoint scheduled |
| 7 | GitHub Discussions setup | SP-3-GH-DISC (#134) | Dedicated issue |
| 8 | Dev.to cross-posting | SP-3-DEVTO (#133) | Dedicated issue |

---

## Backlog (7 items)

| # | Sprint ID | Issue | Title | Priority | Track | Est. Days | Dependencies | Escalation Protocol |
|---|-----------|-------|-------|----------|-------|-----------|--------------|---------------------|
| 1 | SP-3-MAT-FIX | #131 | Matomo tracking fix (CORS + trusted_hosts + e2e) | P0 BLOCKER | TECH | 1-2 | None | — |
| 2 | SP-3-201-P | #107 | Internal pilot (5-6 candidates, Day 2 deadline) | P2 | BUSINESS | 5-6 | Blocked by #131 (analytics) | < 3 confirmed by Day 3 → internal self-test fallback |
| 3 | SP-3-202 | #110 | Pilot feedback rubric | P2 | BUSINESS | 2-3 | Depends on #107 (scope) | If pilot scope not final by Day 4 → draft rubric with self-test |
| 4 | SP-3-201-M | #115 | Landing experiment production deployment | P1 | MARKETING | 3-4 | Blocked by #131 (analytics) | — |
| 5 | SP-3-GH-DISC | #134 | GitHub Discussions setup | P2 | TECH/OPS | 1 | None | — |
| 6 | SP-3-DEVTO | #133 | Dev.to cross-posting | P2 | MARKETING | 3 | Soft dep on #131 | — |
| 7 | SP-3-VELOC | #135 | Sub-item velocity tracking | P3 | PROCESS | 1 | None | — |

**Total estimated effort:** 16-20 person-days across 10 working days  
**Parallel tracks:** TECH (Days 1-2) → BUSINESS + MARKETING + OPS (Days 2-10)

---

## Execution Schedule

### Day 1 (2026-04-08) — Blocker Resolution
- **SP-3-MAT-FIX** (#131): Fix `matomo-nginx.conf` CORS headers, verify `trusted_hosts`, fix noscript fallback, add e2e smoke test
- **SP-3-VELOC** (#135): Update KPI log schema with AC-per-day metric
- **SP-3-GH-DISC** (#134): Enable GitHub Discussions, configure categories

### Day 2 (2026-04-09) — Unblock + Pilot Launch
- **SP-3-MAT-FIX** (#131): End-to-end verification (pageview visible in Matomo)
- **SP-3-201-P** (#107): Pilot outreach to 5-6 candidates, set Day 2 confirmation deadline
- **SP-3-DEVTO** (#133): Dev.to account setup, canonical URL strategy

### Day 3 (2026-04-10) — Pilot Checkpoint
- **SP-3-201-P** (#107): Confirm ≥ 3 participants by end of day (L12 escalation trigger)
- **SP-3-201-M** (#115): Begin landing experiment framework (analytics confirmed working)
- **SP-3-DEVTO** (#133): First article cross-posted

### Day 4 (2026-04-11) — Checkpoint 1 (target 25-35%)
- **SP-3-202** (#110): Begin rubric creation based on pilot scope
- **SP-3-201-M** (#115): A/B testing infrastructure
- **SP-3-DEVTO** (#133): Second article cross-posted

### Day 5-6 (2026-04-14-15) — Parallel Execution
- **SP-3-201-P** (#107): Pilot execution (participants testing)
- **SP-3-201-M** (#115): Baseline measurement + experiment workflow documentation
- **SP-3-202** (#110): Rubric finalization
- **Day 6: Integration gap review** (per retro action #6)

### Day 7-8 (2026-04-16-17) — Checkpoint 2 (target 70-80%)
- **SP-3-201-P** (#107): Pilot feedback collection
- **SP-3-201-M** (#115): Statistical rigor guardrails
- **SP-3-202** (#110): Analysis framework establishment

### Day 9-10 (2026-04-18-21) — Close
- Remaining items wrap-up
- Test suite expansion verification
- Sprint 3 completion report preparation

---

## Active Constraints

| ID | Constraint | Source |
|----|-----------|--------|
| DEC-112 | Use public icon library (Lucide/Heroicons/Phosphor) for all UI icons | decisions.md |
| L12 | 5-6 pilot candidates with Day 2 confirmation deadline | lessons-learned.md |
| L10 | All stakeholder items have pre-defined escalation protocols | lessons-learned.md |
| L13 | Content items estimated at 3-5 days | lessons-learned.md |

---

## Checkpoints

| Checkpoint | Day | Date | Target | Items Expected |
|-----------|-----|------|--------|---------------|
| CP-1 | 4 | 2026-04-11 | 25-35% | SP-3-MAT-FIX, SP-3-GH-DISC, SP-3-VELOC complete (3/7 = 43%) |
| CP-2 | 8 | 2026-04-17 | 70-80% | + SP-3-DEVTO, SP-3-201-M (5/7 = 71%) |
| Close | 10 | 2026-04-21 | 80%+ | + SP-3-201-P, SP-3-202 (7/7 = 100% target) |

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Matomo fix more complex than CORS alone | LOW | HIGH | Day 1 investigation includes full DevTools verification; escalate if PHP-FPM or volume issue |
| Pilot < 3 participants by Day 3 | MEDIUM | HIGH | No-response fallback: internal self-test with rubric (L12) |
| Dev.to content formatting issues | LOW | LOW | Budget extra day for formatting (3-day estimate already accounts for this) |
| Landing experiment statistical rigor insufficient | MEDIUM | MEDIUM | CRO guardrails from Phase 4 enforced; minimum sample size gates |

---

*Sprint Gate: APPROVED | Implementation Agent | 2026-04-08*
