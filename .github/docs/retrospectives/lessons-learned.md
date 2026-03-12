# Lessons Learned — Cumulative Log

**Project:** Agentic SDLC Platform  
**Last Updated:** 2026-04-01 (Sprint 2 Close)

---

## Sprint 1 Lessons

| ID  | Lesson                                                              | Type      | Applies To                  | Sprint 2 Status                                                    |
| --- | ------------------------------------------------------------------- | --------- | --------------------------- | ------------------------------------------------------------------ |
| L1  | Pre-sprint blocker resolution eliminates in-sprint disruption       | Process   | All sprints                 | ✅ Applied — Sprint Gate resolved all blockers before start        |
| L2  | Parallel track independence requires minimal cross-dependencies     | Planning  | Sprint planning             | ✅ Applied — 4 tracks ran independently                            |
| L3  | Sequential test infrastructure build is more reliable than parallel | Technical | Test sprints                | ✅ Applied — tests added per item, not batch                       |
| L4  | Batch quality review for documentation items is efficient           | Process   | Documentation-heavy sprints | ✅ Applied — SP-2-DOC batch close Day 6                            |
| L5  | Items with external dependencies post-sprint-end should defer       | Planning  | Sprint planning             | ✅ Applied — Sprint Gate validated all prerequisites               |
| L6  | Two-checkpoint cadence provides early trajectory confirmation       | Process   | All sprints                 | ✅ Applied — Checkpoint 1 (Day 4: 40%) + Checkpoint 2 (Day 8: 80%) |

---

## Sprint 2 Lessons

| ID  | Lesson                                                                              | Type      | Applies To             | Sprint 3 Action                                                  |
| --- | ----------------------------------------------------------------------------------- | --------- | ---------------------- | ---------------------------------------------------------------- |
| L7  | Retro actions mapped to sprint backlog items ensure follow-through                  | Process   | All sprints            | Map Sprint 2 retro actions to Sprint 3 items                     |
| L8  | Embedding tests per implementation item beats separate test phases                  | Technical | All sprints            | Continue pattern: tests are part of DoD per item                 |
| L9  | Docker Compose multi-file (base+prod) keeps dev fast and prod auditable             | Technical | Infrastructure         | Continue pattern                                                 |
| L10 | Pre-defined escalation protocols with trigger conditions eliminate ad-hoc responses | Process   | Risk management        | Ensure all stakeholder-dependent items have escalation protocols |
| L11 | Batch integration gap review mid-sprint is efficient                                | Process   | Implementation sprints | Schedule Day 6 integration review                                |
| L12 | 3-person stakeholder pool with no backups is insufficient                           | Planning  | Stakeholder items      | Target 5-6 candidates with Day 2 confirmation deadline           |
| L13 | Content creation items need 3-5 day estimates, not 1-3                              | Planning  | Marketing items        | Adjust Sprint 3 content item estimates                           |

---

## Top 3 Lessons for Sprint 3 Injection

1. **L12 — Broaden stakeholder pools:** Pilot recruitment failed with 3
   candidates. Sprint 3 needs 5-6 candidates with explicit Day 2 confirmation
   deadlines and backup candidates per role.

2. **L10 — Escalation protocols for all stakeholder items:** The SP-2-201-P
   escalation protocol worked exactly as designed. Every stakeholder-dependent
   item in Sprint 3 should have a pre-defined trigger condition and decision
   gate documented before sprint start.

3. **L7 — Map retro actions to backlog items:** Sprint 2 successfully mapped all
   7 Sprint 1 retro actions to sprint items. Sprint 3 should do the same with
   the 8 Sprint 2 retro actions.

---

_Updated: 2026-04-01 | Retrospective Agent | Sprint 2 Close_

---

## Sprint 3 Lessons

| ID  | Lesson                                                                             | Type      | Applies To             | Sprint 4 Action                                                    |
| --- | ---------------------------------------------------------------------------------- | --------- | ---------------------- | ------------------------------------------------------------------ |
| L14 | No-response fallback for stakeholder items unblocks sprints on Day 3               | Process   | Stakeholder items      | ✅ Applied — Sprint 4 had no stakeholder items (governance sprint) |
| L15 | Highest single-day velocity possible when all dependencies resolved early          | Planning  | Sprint planning        | ✅ Applied — dependency chain Day 1→2→3→4→5 in Sprint 4            |
| L16 | Dual-metric velocity (item + AC) captures last-mile effort better than items alone | Process   | All sprints            | ✅ Applied — 59 ACs tracked per item in Sprint 4                   |
| L17 | Self-test findings produce actionable backlog items when pilot recruitment fails   | Process   | Pilot/feedback sprints | N/A — Sprint 4 was governance-only                                 |
| L18 | Vitest suite alongside Jest requires separate config roots and CI steps            | Technical | Test infrastructure    | ✅ Applied — dual test runner pipeline in Sprint 4 CI              |

---

## Sprint 4 Lessons

| ID  | Lesson                                                                    | Type      | Applies To           | Sprint 5 Action                                                       |
| --- | ------------------------------------------------------------------------- | --------- | -------------------- | --------------------------------------------------------------------- |
| L19 | Governance-only sprints (no feature work) achieve highest velocity (100%) | Planning  | Sprint planning      | Sprint 5 will mix features + deferred items; expect 80-87% velocity   |
| L20 | External audit findings drive clear, scoped, testable sprint items        | Process   | Audit-driven sprints | Use audit deferred items (F-06, F-09, F-11) as Sprint 5 inputs        |
| L21 | CI pipeline hardening should be done once thoroughly, not incrementally   | Technical | Infrastructure       | CI pipeline now stable (22 checks); no further hardening needed       |
| L22 | PR template dogfooding within the sprint ensures template quality         | Process   | Process sprints      | Continue dogfooding new processes within the sprint that creates them |
| L23 | Day 1 scope decisions (deployment profile) create clean dependency chains | Planning  | Architecture sprints | Sprint 5 Day 1 should resolve scope decisions before implementation   |

---

## Top 3 Lessons for Sprint 5 Injection

1. **L19 — Governance sprints achieve highest velocity:** Sprint 4 hit 100% on 8 items / 59 ACs
   because every item had a clear audit finding as source. Sprint 5 should ensure each item
   has a clear definition of done derived from audit findings or feature specs.

2. **L23 — Day 1 scope decisions unlock dependency chains:** Sprint 4's clean dependency
   chain (F-01 → F-02/F-03 → F-04/F-07 → F-05/F-08 → F-12) was enabled by resolving the
   deployment profile decision on Day 1. Sprint 5 feature items should resolve architectural
   decisions before implementation begins.

3. **L21 — CI pipeline is now stable:** The 22-check CI pipeline was hardened in Sprint 4.
   Sprint 5 should not need CI infrastructure work — focus on feature implementation.

---

_Updated: 2026-03-17 | Retrospective Agent | Sprint 4 Close_

---

## Sprint 5 Lessons

- **L24** (Planning, Sprint planning): Feature sprints with clear audit-derived scope execute faster than estimated. Action: Re-calibrate estimates for feature items based on Sprint 5 actuals.
- **L25** (Planning, Backlog management): External platform dependencies should be triaged as separate operational tasks, not sprint ACs. Action: Separate Dev.to operational tasks from sprint delivery scope.
- **L26** (Technical, Implementation): Complexity refactoring during implementation prevents tech debt accumulation. Action: Continue pattern: refactor complexity as part of implementation DoD.
- **L27** (Technical, Test infrastructure): Dual test runner (Vitest + Jest) requires careful command-path awareness per workspace. Action: Document workspace-specific test commands in operating handbook.
- **L28** (Technical, Implementation): Schema validation with Ajv needs explicit draft compatibility configuration. Action: Pin Ajv draft config in shared validator module.

---

## Top 3 Lessons for Sprint 6 Injection

1. **L24 — Re-calibrate feature estimates:** Sprint 5 completed 6 items in 3
   effective days on a 7-day budget. Feature items with clear audit-derived
   scope were significantly faster than estimated. Sprint 6 should adjust
   estimates downward for well-scoped feature items.

2. **L25 — Separate external dependencies from sprint ACs:** Dev.to cross-posting
   has been deferred for 3 consecutive sprints because external platform
   actions cannot be executed in-repo. Sprint 6 should either execute the
   external actions as an operational task or close the item as wontfix.

3. **L26 — Complexity refactoring as implementation DoD:** Sprint 5 refactored
   state machine, dispatcher, and subscribe route during implementation. This
   prevented complexity debt before it accumulated. Continue this pattern.

---

Updated: 2026-03-20 | Retrospective Agent | Sprint 5 Close
