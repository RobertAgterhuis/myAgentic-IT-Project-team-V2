# SP-2-201-P Internal Pilot Scoping

**Story:** SP-2-201-P (#107)  
**Sprint:** Sprint 2 (March 25 – April 7, 2026)  
**Track:** Business  
**Owner:** Product Manager  
**Status:** 🔄 IN PROGRESS (Day 4 — 85%)  
**Predecessor:** Phase 1 Domain Expert (REC-203, RISK-203)  
**Estimated Days:** 1-3  
**Target Completion:** March 27, 2026  
**Successor:** SP-2-202 (#110) — Pilot Feedback Rubric

---

## 1. Pilot Objective

Validate the Agentic SDLC platform's end-to-end process with 2-3 internal
participants to identify adoption blockers before broader release. Source:
Phase 1 Domain Expert recommendation (REC-203).

### Success Criteria (from Sprint Plan)

> "Given pilot participants, when mini-cycle completes, then findings are logged
> with severity and owners." — SP-2-201 acceptance criteria

---

## 2. Pilot Participants

### Selection Criteria

| Criterion | Rationale |
|-----------|-----------|
| Familiarity with software delivery | Can evaluate process completeness |
| Not involved in platform development | Avoids confirmation bias |
| Diverse role perspective | CTO/PM/Developer coverage |
| Available within sprint window | Can complete mini-cycle by April 4 |

### Participant Roster

| # | Role | Profile | Selection Rationale | Status |
|---|------|---------|---------------------|--------|
| 1 | Engineering Lead | Internal team member with delivery experience | Validates tech workflow (Phase 2 outputs, CI pipeline) | ⬜ To be confirmed |
| 2 | Product Manager | Cross-functional stakeholder | Validates business workflow (Phase 1 outputs, sprint planning) | ⬜ To be confirmed |
| 3 | UX/Design Practitioner | Design-oriented evaluator | Validates experience design workflow (Phase 3 outputs, accessibility) | ⬜ Optional, if available |

**Source:** Phase 1 Domain Expert (line 126): "Identify two additional internal
pilot users." Product Manager (line 267): "Name 2 internal pilot participants."

**INSUFFICIENT_DATA:** Specific participant names pending confirmation from
project stakeholder. QUESTIONNAIRE_REQUEST: Q-SP2-201-P-01 "Identify 2-3
internal pilot participants by name and role."

---

## 3. Pilot Scope — Mini-Cycle Definition

### What Participants Will Execute

A compressed mini-cycle covering one discipline end-to-end:

| Step | Activity | Duration | Output |
|------|----------|----------|--------|
| 1 | Review onboarding output | 15 min | Onboarding comprehension rating |
| 2 | Execute Phase 1 (Business only) for a sample project | 45 min | Phase 1 deliverables |
| 3 | Review Critic + Risk validation output | 15 min | Quality gate comprehension rating |
| 4 | Review Synthesis Report structure | 15 min | Cross-team dependency understanding |
| 5 | Review Sprint Plan + Sprint Gate | 15 min | Sprint readiness assessment |
| 6 | Complete feedback rubric (SP-2-202) | 15 min | Structured feedback data |

**Total estimated time:** 2 hours per participant

### Sample Project Brief

A simplified project brief will be provided to participants:
- **Project:** "Task Management API" (small scope, well-understood domain)
- **Constraint:** Single-discipline (Business only) to keep mini-cycle manageable
- **Goal:** Evaluate process clarity, output quality, and usability — not output
  correctness

---

## 4. Pilot Environment

| Component | Configuration | Status |
|-----------|---------------|--------|
| Platform version | Current `main` branch (post SP-2-CI7 merge) | ⬜ Pending CI7 |
| Documentation | docs/user-manual.md + docs/technical-manual.md (v1.7) | ✅ Available |
| Sample data | Pre-populated onboarding output for "Task Management API" | ⬜ To create |
| Feedback mechanism | SP-2-202 rubric (structured Google Form or Markdown) | ⬜ Depends on SP-2-202 |

---

## 5. Feedback Collection Framework

### Dimensions (from Phase 1 Domain Expert Rec)

| Dimension | What to Measure | Scale |
|-----------|-----------------|-------|
| **Friction Points** | Steps where participant got stuck or confused | Free text + severity (Low/Med/High) |
| **Clarity** | How well each phase output communicates its intent | 1-5 Likert scale per phase |
| **Confidence** | Participant's confidence that the output is correct/complete | 1-5 Likert scale per phase |
| **Completeness** | Whether the process covered all expected aspects | Yes/No per section + gaps identified |
| **Time-to-complete** | How long each step actually takes vs estimate | Minutes (measured) |

### Severity Classification for Findings

| Severity | Definition | Example | SLA |
|----------|------------|---------|-----|
| **Critical** | Prevents completion of mini-cycle | Process step produces no output | Fix before Sprint 3 |
| **High** | Significant friction, workaround needed | Output missing key section | Fix in Sprint 3 |
| **Medium** | Noticeable friction, still completable | Unclear terminology | Backlog, next sprint |
| **Low** | Minor suggestion | Formatting improvement | Backlog |

---

## 6. Timeline

| Date | Activity | Owner |
|------|----------|-------|
| Mar 25 (Day 1) | Pilot scoping complete, participant outreach begins | Product Manager |
| Mar 26 (Day 2) | Sample project brief created, environment validated | Product Manager |
| Mar 27 (Day 3) | SP-2-202 feedback rubric ready, pilot can begin | Product Manager |
| Mar 28-Apr 2 | Participants execute mini-cycle (async, self-paced) | Participants |
| Apr 3 (Day 8) | Feedback collected, findings logged with severity | Product Manager |
| Apr 4 (Day 9) | Pilot report compiled, adoption blockers classified | Product Manager |

---

## 7. Acceptance Criteria

- [ ] Pilot scope defined (mini-cycle: 6 steps, ~2 hours)
- [ ] 2-3 pilot participants identified (roles, selection rationale)
- [ ] Sample project brief created ("Task Management API")
- [ ] Feedback dimensions defined (5 dimensions, 4 severity levels)
- [ ] Timeline aligned with Sprint 2 checkpoints
- [ ] Findings logged with severity and owners (post-pilot, Day 8-9)
- [ ] Successor SP-2-202 (feedback rubric) unblocked

---

## Day 1 Progress

- ✅ Pilot objective and success criteria defined (§1)
- ✅ Participant selection criteria and roster template (§2)
- ✅ Mini-cycle scope designed — 6 steps, ~2 hours (§3)
- ✅ Feedback framework with severity classification (§5)
- ✅ Timeline aligned with Sprint 2 cadence (§6)
- ⬜ Participant confirmation (INSUFFICIENT_DATA: awaiting stakeholder input)
- ⬜ Sample project brief creation (Day 2)
- ⬜ SP-2-202 rubric design (dependent, Days 3-4)
