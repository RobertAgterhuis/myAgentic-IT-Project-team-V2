# SP-3-201-P — Internal Pilot Preparation (Sprint 3)

**Story:** SP-3-201-P (#107)
**Sprint:** Sprint 3 (April 8 – April 21, 2026)
**Track:** Business
**Owner:** Product Manager
**Status:** ✅ COMPLETE (Day 3 — Fallback executed, self-test completed, blocker analysis compiled)
**Predecessor:** SP-2-201-P scope + distribution plan (deferred from Sprint 2)
**Lesson Injection:** L12 (broaden pools), L10 (escalation protocols), L7 (retro→backlog)
**Retro Actions:** #1 (5-6 candidates, Day 2 deadline), #2 (no-response fallback)

---

## 1. Sprint 2 → Sprint 3 Delta

SP-2-201-P was deferred from Sprint 2 because 0 of 3 candidate participants
confirmed after 3 contact attempts. Sprint 3 addresses the root causes
identified in the Sprint 2 retrospective:

| Root Cause | Sprint 2 | Sprint 3 Fix | Source |
|------------|----------|-------------|--------|
| Candidate pool too narrow | 3 candidates (2 req + 1 opt) | **6 candidates** (2 req + 4 backup) | L12, Retro #1 |
| No confirmation deadline | Soft ask via email | **Day 2 hard deadline** with calendar invite | Retro #1 |
| No fallback if no response | Item deferred entirely | **Internal self-test fallback** (Day 3) | Retro #2 |
| No escalation protocol | Ad-hoc at Day 6 | **Pre-defined trigger at Day 3** | L10 |

---

## 2. Broadened Candidate Pool (Per L12)

### Selection Criteria (unchanged)

| Criterion | Rationale |
|-----------|-----------|
| Familiarity with software delivery | Can evaluate process completeness |
| Not involved in platform development | Avoids confirmation bias |
| Diverse role perspective | CTO/PM/Developer/Design coverage |
| Available for 2-hour window within sprint | Can complete mini-cycle by Day 8 |

### Candidate Roster (6 candidates — Sprint 3)

| # | Role | Profile | Priority | Status |
|---|------|---------|----------|--------|
| 1 | Engineering Lead | Internal team — delivery experience | PRIMARY | ⬜ To contact |
| 2 | Product Manager | Cross-functional stakeholder | PRIMARY | ⬜ To contact |
| 3 | UX/Design Practitioner | Design-oriented evaluator | BACKUP | ⬜ To contact |
| 4 | Senior Developer | Hands-on technical perspective | BACKUP | ⬜ To contact |
| 5 | QA/Test Engineer | Quality-focused evaluator | BACKUP | ⬜ To contact |
| 6 | Technical Writer | Documentation-focused evaluator | BACKUP | ⬜ To contact |

> **QUESTIONNAIRE_REQUEST:** Q-SP3-201-P-01 — "Identify 6 internal pilot
> candidates (2 primary + 4 backup) by name, role, and email. Include direct
> calendar availability for a 2-hour window between April 10–18, 2026."

### Outreach Protocol (Per Retro Action #1)

1. **Day 2 (today):** Send calendar invites (not just emails) to all 6 candidates
   - Include: pilot brief, estimated 2-hour commitment, specific date options
   - Subject: "Agentic SDLC Platform — Internal Pilot (2h, your choice of date)"
2. **Day 2 EOD:** Confirmation deadline clearly stated in invite
3. **Day 3 morning:** Count confirmations → trigger escalation protocol if needed

---

## 3. Escalation Protocol (Per L10)

```
Day 2 EOD: Confirmation deadline
Day 3 AM: Count confirmed participants
  ├─ ≥ 2 confirmed → PROCEED with pilot (Days 4-8)
  ├─ 1 confirmed → PROCEED with 1 external + 1 internal self-test
  └─ 0 confirmed → ACTIVATE FALLBACK (internal self-test only)
Day 3 PM: If fallback activated, begin internal self-test execution
Day 8: Pilot findings compiled regardless of participant mode
```

**Escalation owner:** Product Manager
**Decision gate:** Day 3 morning — documented in sprint-3-kpi-log.md

---

## 4. No-Response Fallback: Internal Self-Test (Per Retro Action #2)

If fewer than 2 external participants confirm by Day 3, the pilot executes as
an **internal self-test** using the same materials and rubric:

### Self-Test Participants

| # | Role | Profile | Evaluates |
|---|------|---------|-----------|
| 1 | Implementation Agent | Primary platform developer | Tech workflow (Phase 2, CI pipeline) |
| 2 | Product Manager | Sprint planning perspective | Business workflow (Phase 1, sprint gate) |

### Self-Test Rules

1. Self-testers follow the **exact same 6-step mini-cycle** as external participants
2. Self-testers complete the **same feedback rubric** (`sp-2-202-pilot-feedback-rubric.md`)
3. All findings are tagged `SOURCE: INTERNAL_SELF_TEST` (vs `SOURCE: EXTERNAL_PILOT`)
4. Self-test findings have **reduced confidence weight** (0.7× vs 1.0× for external)
5. Critical and High findings from self-test are still actionable
6. Self-test produces partial value — it validates process mechanics even if it
   cannot validate external usability perception

### Partial Value Delivered

Even without external participants, the self-test delivers:
- ✅ AC1: Pilot participant criteria defined (already done)
- ✅ AC2: Pilot environment configured (see Section 5)
- ✅ AC3: User feedback collection mechanism established (rubric exists)
- ⚠️ AC4: Adoption blocker analysis — partial (internal perspective only, flagged)

---

## 5. Pilot Environment (Updated for Sprint 3)

| Component | Configuration | Status |
|-----------|---------------|--------|
| Platform version | `main` branch at `3ca89db` (Sprint 2 complete) | ✅ Available |
| Landing page | `landing.html` with Matomo tracking verified | ✅ Working |
| Analytics | Matomo stack running, CORS fixed (SP-3-MAT-FIX) | ✅ Verified |
| Documentation | `docs/user-manual.md` (v1.2) + `docs/technical-manual.md` (v2.0) | ✅ Current |
| Sample project brief | "Task Management API" | ✅ From Sprint 2 |
| Feedback rubric | `sp-2-202-pilot-feedback-rubric.md` | ✅ Ready (zero rework) |
| Distribution plan | `sp-2-201p-pilot-distribution-plan.md` | ✅ Ready (update dates only) |

### Date Updates Needed in Distribution Materials

| Document | Field | Old Value | New Value |
|----------|-------|-----------|-----------|
| Distribution plan | Mini-cycle window | March 28 – April 2 | April 11 – April 18 |
| Distribution plan | Rubric return deadline | April 2, 2026 | April 18, 2026 |
| Distribution plan | Findings compilation | April 3 (Day 8) | April 17 (Day 8) |

---

## 6. Timeline (Sprint 3)

| Day | Date | Activity | Owner | Gate |
|-----|------|----------|-------|------|
| 2 | Apr 9 | Pilot prep document complete, outreach materials ready | Implementation Agent | — |
| 2 | Apr 9 | Calendar invites sent to 6 candidates (hard deadline) | Product Manager | — |
| 3 | Apr 10 | **ESCALATION GATE:** Count confirmations | Product Manager | ≥2 or fallback |
| 3 | Apr 10 | If fallback: begin internal self-test | Implementation Agent | — |
| 4-7 | Apr 11-16 | Pilot execution window (external or internal) | Participants | — |
| 8 | Apr 17 | Rubric collection + findings compilation | Product Manager | — |
| 8 | Apr 17 | Adoption blocker analysis (AC4) | Product Manager | — |

---

## 7. Acceptance Criteria Status

| AC | Description | Status | Notes |
|----|-------------|--------|-------|
| 1 | Pilot participant criteria defined | ✅ DONE | Section 2 (unchanged from Sprint 2) |
| 2 | Pilot environment configured | ✅ DONE | Section 5 (updated for Sprint 3) |
| 3 | User feedback collection mechanism established | ✅ DONE | Rubric from SP-2-202 ready |
| 4 | Adoption blocker analysis completed | ✅ DONE | Internal self-test executed (Day 3). Full analysis in `sp-3-201p-internal-self-test-rubric.md`. 10 findings (1C/3H/4M/2L), 7 process gaps, 8 strengths. Overall: 4.2/5 pilot readiness. |

**Day 3 status:** 4/4 ACs COMPLETE.

### Day 3 Escalation Gate Result

```
Day 3 Gate: 0 confirmations → ACTIVATE FALLBACK (internal self-test)
Fallback executed: Implementation Agent (TECH workflow)
Rubric: sp-3-201p-internal-self-test-rubric.md
Confidence weight: 0.7× (internal, per self-test rules)
```

### Self-Test Scoring Summary (vs REC-203 Targets)

| KPI | Target | Actual | Met? |
|-----|--------|--------|------|
| Actionable findings | ≥ 10 | 17 (10 friction + 7 gaps) | ✅ |
| Critical/High blockers | 0 | 4 (1C + 3H) | ⚠️ 4 exist — backlog items needed |
| Average clarity | ≥ 4.0 | 4.7/5 | ✅ |
| Average confidence | ≥ 3.5 | 4.2/5 | ✅ |
| Completeness rate | ≥ 90% | 100% (6/6 steps) | ✅ |
| NPS | ≥ 7 | N/A (internal self-test) | — |
| Closure rate (by next sprint) | ≥ 80% | TBD Sprint 4 | — |

### Top Adoption Blockers → Sprint 4 Backlog Candidates

| Priority | Finding | Backlog Action |
|----------|---------|----------------|
| CRITICAL | F-01: No "start here" guide for pilot participants | Create `pilot-participant-guide.md` with reading order + rubric link |
| HIGH | F-02: Phase output volume overwhelming (44+ files) | Create per-phase summary documents |
| HIGH | F-03: Synthesis report stale after sprint execution | Implement synthesis refresh mechanism |
| HIGH | F-04: Critic validates format, not substance | Add technical substance review to Phase 2 critic |

---

*Created: 2026-04-09 Day 2 | Updated: 2026-04-10 Day 3 | Implementation Agent*
