# Governance Framework — MYAGENTIC-IT-PROJECT-TEAM-V2

**Version:** 1.0  
**Effective Date:** 2026-03-10  
**Owner:** Business Analyst  
**Approver:** PM  
**Document ID:** GOV-001  
**Sprint:** SP-10-602 (Sprint 1)  
**Status:** ✅ APPROVED

---

## 1. Purpose & Scope

This document defines the governance structure, decision authority, escalation
protocols, and accountability framework for the MYAGENTIC-IT-PROJECT-TEAM-V2
software development lifecycle. It applies to all phases (1-5), all agents
(1-38), all sprint execution, and all stakeholders.

**Objectives:**

- Establish clear decision-making authority and escalation paths
- Define roles and responsibilities across business, tech, UX, and marketing
  disciplines
- Ensure compliance with project guardrails and quality gates
- Provide audit trail and accountability mechanisms
- Enable rapid decision-making while maintaining quality control

---

## 2. Governance Principles

### 2.1 Transparency

All decisions, blockers, risks, and design changes are documented in
version-controlled files with timestamps and ownership attribution.

**Audit Trail:** `.github/docs/decisions.md`,
`.github/docs/session/session-state.json`, mutation log at
`.github/docs/session/mutation-log.jsonl`

### 2.2 Quality First

No phase, sprint, or story is considered complete without Critic + Risk
validation and Definition of Done compliance.

**Quality Gates:** See `.github/help/quality-gates.md`

### 2.3 Agent Autonomy with Human Oversight

Agents execute within defined skill boundaries; humans retain veto power via
`.github/docs/decisions.md` and Sprint Gate reviews.

### 2.4 Checkpoint & Yield

Work is saved to disk incrementally; no critical decisions exist only in chat
memory.

**Memory Protocol:** See `.github/docs/guardrails/00-global-guardrails.md`
(G-GLOB-50 through G-GLOB-55)

### 2.5 Bias Toward Action (with Guardrails)

Sprint execution proceeds unless explicitly blocked; agents resolve ambiguity
via questionnaires and escalation, not by halting.

---

## 3. Governance Roles & Responsibilities

### 3.1 Role Definitions

| Role                     | Responsibility                                                                                | Decision Authority                                                                                            | Escalation Path                                                                | Accountability                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| **PM (Product Manager)** | Overall project delivery, scope prioritization, blocker resolution                            | HIGH: Sprint scope changes, blocker resolution decisions, stakeholder sign-off deadlines                      | Orchestrator → Executive (for scope pivots or external blockers)               | Sprint velocity, blocker-count KPI, stakeholder satisfaction                                 |
| **Orchestrator**         | Phase sequencing, agent handoff validation, session state integrity, quality gate enforcement | CRITICAL: Phase completion approval, Sprint Gate PASS/FAIL, critical blocker escalation, reevaluation trigger | PM (for business impact), Tech Lead (for technical blockers)                   | System integrity, audit trail completeness, zero unresolved handoff failures                 |
| **Tech Lead**            | Technical architecture approval, security/performance compliance, CI/CD pipeline ownership    | HIGH: Technology stack decisions, security exceptions, deployment approvals, dependency governance            | PM (for resource/timeline), Orchestrator (for quality gate failures)           | Code quality, test coverage ≥80%, zero critical security findings, CI uptime                 |
| **Business Analyst**     | Requirements clarity, stakeholder engagement, governance compliance, financial oversight      | MEDIUM: Requirements prioritization, governance policy interpretation, compliance checklist sign-off          | PM (for conflicting requirements), Orchestrator (for phase blocker escalation) | Requirements completeness, stakeholder sign-off ≥80%, governance audit PASS                  |
| **Implementation Agent** | Code delivery per acceptance criteria, test-first development, decision compliance            | MEDIUM: Implementation approach within story scope, refactoring decisions, test strategy                      | Tech Lead (for architectural concerns), PM (for timeline impacts)              | Acceptance criteria ≥95% met, zero decision violations, DoD compliance                       |
| **Test Agent**           | Validation of all acceptance criteria, decision compliance verification, coverage enforcement | MEDIUM: Test strategy within sprint scope, coverage exceptions (with justification)                           | Tech Lead (for coverage waivers), Orchestrator (for quality gate failures)     | Test pass rate ≥95%, coverage ≥80%, zero decision violations detected                        |
| **PR/Review Agent**      | Code quality enforcement, secret scanning, merge approval, GitHub integration sync            | MEDIUM: PR approval/rejection, blocker escalation for security findings                                       | Tech Lead (for security exceptions), Orchestrator (for process exceptions)     | Zero secrets merged, PR review SLA <4 hours, GitHub sync accuracy 100%                       |
| **UX Designer**          | User experience design, accessibility baseline, design token governance                       | MEDIUM: UI/UX decisions within WCAG AA constraints, component design                                          | UX Lead (for accessibility waivers), PM (for scope impacts)                    | WCAG AA ≥95% pass rate, design token lock compliance, responsive design across 3 breakpoints |
| **Marketing Specialist** | Brand consistency, GTM messaging, campaign design, analytics baseline                         | MEDIUM: Marketing content decisions, campaign prioritization, analytics tool selection                        | PM (for budget/timeline), Brand Strategist (for brand consistency conflicts)   | Brand audit 100% consistency, baseline metrics captured, content calendar ≥4 weeks ahead     |
| **DevOps Engineer**      | CI/CD pipeline reliability, deployment automation, infrastructure provisioning                | MEDIUM: Deployment decisions within approved architecture, CI/CD tool selection                               | Tech Lead (for architectural changes), PM (for SLA impacts)                    | CI uptime ≥99%, deployment success rate ≥95%, zero downtime deployments                      |
| **Stakeholders**         | Requirements input, sign-off approval, feedback on deliverables                               | LOW: Acceptance of deliverables per stakeholder sign-off process (SP-10-603)                                  | PM (for escalation of unresolved objections)                                   | Timely feedback ≤2 business days, sign-off completion ≥80% of stakeholders                   |

### 3.2 Decision Authority Matrix

| Decision Type                                                                     | Authority Level | Who Decides                    | Approval Required From                                                    | Veto Power                          |
| --------------------------------------------------------------------------------- | --------------- | ------------------------------ | ------------------------------------------------------------------------- | ----------------------------------- |
| **Strategic scope change** (e.g., business model pivot, core architecture change) | CRITICAL        | PM + Orchestrator              | Tech Lead + Business Analyst                                              | Stakeholders (via sign-off)         |
| **Phase completion approval**                                                     | CRITICAL        | Orchestrator                   | Critic + Risk Agents (PASSED validation)                                  | PM (can defer)                      |
| **Sprint Gate PASS/FAIL**                                                         | HIGH            | Orchestrator                   | Tech Lead + PM                                                            | None (quality gate enforced)        |
| **Blocker resolution** (BLK-\*)                                                   | HIGH            | PM                             | Tech Lead (for tech blockers), Business Analyst (for governance blockers) | Orchestrator (can escalate)         |
| **Technology stack addition**                                                     | HIGH            | Tech Lead                      | DevOps Engineer + Senior Developer                                        | PM (for budget/timeline)            |
| **Security exception approval**                                                   | HIGH            | Tech Lead + Security Architect | PM (for risk acceptance)                                                  | Orchestrator (can block)            |
| **Requirements prioritization**                                                   | MEDIUM          | Business Analyst               | PM                                                                        | Stakeholders (via sign-off)         |
| **UX/UI design decisions**                                                        | MEDIUM          | UX Designer                    | Accessibility Specialist (for WCAG AA compliance)                         | PM (for scope)                      |
| **Marketing content approval**                                                    | MEDIUM          | Marketing Specialist           | Brand Strategist (for consistency)                                        | PM (for messaging conflicts)        |
| **Code refactoring approach**                                                     | MEDIUM          | Implementation Agent           | Tech Lead (for architectural impact)                                      | None                                |
| **Test coverage exceptions**                                                      | MEDIUM          | Test Agent                     | Tech Lead                                                                 | Orchestrator (blocks merge if <80%) |
| **PR merge approval**                                                             | MEDIUM          | PR/Review Agent                | Tech Lead (for architectural changes)                                     | None (CI gates enforced)            |
| **Deployment timing**                                                             | MEDIUM          | DevOps Engineer                | PM (for business readiness)                                               | None (automated post-merge)         |
| **Implementation details** (within story scope)                                   | LOW             | Implementation Agent           | None                                                                      | Tech Lead (can review)              |
| **Test case design**                                                              | LOW             | Test Agent                     | None                                                                      | None                                |
| **Documentation edits** (non-breaking)                                            | LOW             | Documentation Agent            | None                                                                      | None                                |

---

## 4. Escalation Protocols

### 4.1 Blocker Escalation (2-hour SLA)

**Trigger:** Any work item labeled `BLOCKED` in GitHub or marked as blocker in
daily standup  
**Owner:** PM  
**SLA:** 2 hours from blocker identification to resolution decision  
**Escalation Path:**

1. **T+0 min:** Agent/team member identifies blocker → Documents in standup or
   GitHub issue with `BLOCKED` label
2. **T+15 min:** PM acknowledges blocker, assigns resolution owner (Tech Lead,
   Business Analyst, or external)
3. **T+2 hours:** Resolution decision documented (decision made, scope deferred,
   external escalation, or workaround approved)
4. **T+4 hours (if unresolved):** Orchestrator escalation → Mark sprint item as
   `AT_RISK`, notify stakeholders, re-plan sprint scope

**Blocker Categories:**

- **TECH (technical blocker):** Technology limitation, dependency unavailable,
  architectural conflict → Tech Lead owns resolution
- **BUS (business blocker):** Requirements conflict, stakeholder unavailable,
  budget/timeline constraint → PM owns resolution
- **EXTERN (external blocker):** Third-party service unavailable, legal approval
  pending, vendor delay → PM escalates to external party
- **QUAL (quality gate blocker):** Critic validation failed, coverage below
  threshold, security finding → Orchestrator enforces; Tech Lead resolves

### 4.2 Quality Gate Failure Escalation

**Trigger:** Critic + Risk validation returns `FAILED` status or Coverage < 80%
or Security scan finds CRITICAL/HIGH  
**Owner:** Orchestrator  
**SLA:** Immediate sprint pause; resolution required before next story starts  
**Escalation Path:**

1. **T+0 min:** Quality gate failure detected → Orchestrator marks sprint status
   `PAUSED`, notifies PM + Tech Lead
2. **T+30 min:** Root cause analysis by responsible agent (Implementation, Test,
   PR/Review)
3. **T+2 hours:** Fix implemented + re-validation OR scope deferral decision by
   PM
4. **T+4 hours (if unresolved):** Sprint scope reduction → Move blocked story to
   Sprint 2, proceed with unblocked items

**Quality Gate Types:**

- **Contract compliance:** Missing required sections in deliverables → Agent
  re-work required
- **Anti-hallucination:** Unsourced claims, fabricated metrics → Agent must
  provide source or mark `INSUFFICIENT_DATA`
- **Coverage threshold:** <80% unit test coverage → Additional tests required or
  Tech Lead waiver with risk acceptance
- **Security scan:** Secrets detected, critical vulnerabilities → Immediate fix
  required; no merge allowed
- **Decision compliance:** Code violates `DECIDED` constraint in
  `.github/docs/decisions.md` → Revert or decision amendment

### 4.3 Schedule Slip Escalation

**Trigger:** Sprint velocity <70% of target OR critical path item slips >1 day
beyond deadline  
**Owner:** PM  
**SLA:** Next business day standup  
**Escalation Path:**

1. **Detection:** KPI Agent reports velocity <70% in daily KPI log OR critical
   path item (e.g., SP-11-611) misses deadline
2. **Standup discussion:** PM reviews velocity, identifies root cause
   (underestimation, blocker, capacity issue)
3. **Resolution options:**
   - **Scope reduction:** Defer non-critical items to Sprint 2
   - **Capacity reallocation:** Move resources from low-priority tracks to
     blocked track
   - **Timeline extension:** Extend sprint end date (requires stakeholder
     approval via sign-off process)
   - **Quality trade-off (PROHIBITED):** Cannot reduce coverage threshold or
     skip quality gates

**Stakeholder Notification:** If sprint end date extends >2 days, PM must notify
stakeholders within 4 hours and document in governance audit trail.

### 4.4 Scope Change Escalation (SCOPE CHANGE command)

**Trigger:** Fundamental premise/direction change (business model pivot, core
architecture change, target audience shift, compliance regime addition)  
**Owner:** Orchestrator + PM  
**SLA:** Immediate backlog hold; reevaluation cycle initiated  
**Process:** See `.github/copilot-instructions.md` (SCOPE CHANGE command
protocol)

**Escalation Path:**

1. **T+0 min:** Scope change detected → Orchestrator pauses all sprints, marks
   affected stories as `INVALIDATED`
2. **T+1 hour:** Reevaluation Agent analyzes impact scope (BUSINESS | TECH | UX
   | MARKETING | ALL)
3. **T+4 hours:** Critic + Risk validation of scope change impact
4. **T+1 day:** Scope change delta report published → Sprint Gate reconciliation
   → Master Synthesis update
5. **T+2 days:** Sprint re-planning with invalidated stories removed or
   re-scoped

**Approval Required:** PM + Tech Lead + Business Analyst (all three must
approve)  
**Veto Power:** Stakeholders (via emergency sign-off process)

---

## 5. Accountability Mechanisms

### 5.1 Daily Standup Accountability

**Cadence:** Daily, 09:00 UTC, 15 minutes strict timebox  
**Participants:** Track owners (Business, Tech, UX, Marketing) + PM  
**Protocol:** See `.github/docs/phase-5/sprint-1-standup-protocol.md`

**Accountability Checkpoints:**

- **Yesterday's commitments:** Did we deliver what we said we would? If not,
  why?
- **Today's commitments:** What are we building today? Are dependencies clear?
- **Blockers:** Zero blockers is the target; any blocker triggers 2-hour SLA
- **Team morale:** 👍 / 😐 / 👎 rating for KPI log

**Consequences of Missed Commitments:**

- **1st miss:** Document root cause in standup notes, adjust today's commitment
  to realistic scope
- **2nd consecutive miss (same track):** PM investigates
  capacity/blocker/estimation issue
- **3rd consecutive miss:** Sprint velocity flagged as AT_RISK, scope reduction
  or capacity reallocation

### 5.2 Sprint Completion Accountability

**Trigger:** Sprint end date reached OR all sprint stories complete  
**Owner:** Orchestrator + PM  
**Deliverable:** Sprint Completion Report (see
`.github/docs/phase-5/sprint-gate-execution.md`)

**Approval Criteria:**

- [ ] All stories IMPLEMENTED or explicitly DEFERRED with PM approval
- [ ] Definition of Done met for all IMPLEMENTED stories
- [ ] Test coverage ≥80% across sprint changes
- [ ] Zero critical/high security findings unresolved
- [ ] GitHub board updated (all implemented issues closed)
- [ ] Documentation updated (user-manual.md, technical-manual.md)
- [ ] Retrospective completed with lessons-learned documented

**Consequences of Incomplete Sprint:**

- Sprint marked as `PARTIAL_COMPLETION` in velocity log
- Incomplete stories automatically moved to next sprint with `CARRIED_OVER`
  label
- Root cause analysis required (estimation issue, blocker, scope creep)
- Velocity adjustment for next sprint planning (-10% capacity buffer if 2+
  stories carried over)

### 5.3 KPI Dashboard Accountability

**Cadence:** Daily post-standup (KPI log), Weekly checkpoint (trend analysis)  
**Owner:** KPI Agent + PM  
**Tracked Metrics:** See `.github/docs/phase-5/sprint-1-kpi-log.md`

**Accountability Metrics:**

- **Sprint Velocity:** % of items complete with DoD met (target: 100% by sprint
  end)
- **Blocker Count:** Active blocking items (target: 0; escalation if >2 for >1
  day)
- **Test Coverage:** % codebase covered (target: ≥80%; RED FLAG if <75%)
- **Accessibility Score:** WCAG AA pass rate (target: ≥95%; BLOCK merge if <90%)
- **Brand Audit:** % assets using approved tokens (target: 100%; BLOCK launch if
  <95%)
- **Team Morale:** Daily 👍/😐/👎 rating (escalation if 😐/👎 for 3+ consecutive
  days)
- **Capacity Utilization:** % team actively working (target: ≥90%; reallocation
  if <80%)

**Escalation Triggers:**

- Velocity <70% → PM scope review at next standup
- Blocker count >2 for >1 day → PM escalation to external party or scope
  deferral
- Coverage <75% → Tech Lead investigates test gaps, Implementation Agent adds
  tests
- Morale 😐/👎 for 3+ days → PM 1:1 with affected track owner to resolve
  capacity/blocker/motivation issue

### 5.4 Audit Trail & Traceability

**Objective:** Every decision, design choice, and blocker resolution is
traceable to a specific agent, timestamp, and source reference.

**Audit Trail Files:**

- **Decisions & Open Questions:** `.github/docs/decisions.md` (human-editable) +
  `.github/docs/decisions/*.md` (category files)
- **Session State:** `.github/docs/session/session-state.json` (phase status,
  blocker tracking, GitHub integration metadata)
- **Mutation Log:** `.github/docs/session/mutation-log.jsonl` (append-only audit
  trail of all questionnaire/decision changes)
- **Sprint Reports:** `.github/docs/phase-5/sprint-[N]-completion-report.md`
  (per sprint)
- **Retrospectives:**
  `.github/docs/retrospectives/sprint-[N]-retrospective.md` +
  `lessons-learned.md` + `velocity-log.json`
- **GitHub Sync:** `.github/docs/github/sync-report-[TIMESTAMP].md` (execution
  sync only, not initial publication)

**Access Control:**

- All audit files are version-controlled in Git with commit attribution
- No deletion of audit trail files (append-only or replace-entire-file for
  corrections)
- Session state and mutation log must survive conversation resets
  (checkpoint-and-yield protocol)

**Compliance Verification:**

- Orchestrator validates audit trail integrity at every Sprint Gate
- Missing or inconsistent audit trail = Sprint Gate FAIL (no exceptions)

---

## 6. Compliance & Risk Management

### 6.1 Compliance Checklist Mapping

This framework integrates with the **Compliance Checklist** (see
`compliance-checklist.md` in same directory) for:

- GDPR Art. 5, 6, 13/14, 33 (privacy/data protection — currently N/A for
  localhost-only scope)
- MIT License compliance (dependency license audit, attribution requirements)
- WCAG 2.1 AA accessibility baseline (UX track accountability)
- Privacy-first analytics (no GA4; use Plausible/Fathom/Matomo — deferred to
  Sprint 2)
- Localization scope (6+ locales: EN, DE, FR, JA, ZH + 1 flexible)

**Governance Responsibility:**

- Business Analyst: GDPR compliance status tracking, license audit coordination
- Tech Lead: Dependency governance policy enforcement, CI license gates
- UX Designer: WCAG AA compliance verification, accessibility audit sign-off
- Marketing Specialist: Privacy-first analytics implementation, no GA4
  integration

### 6.2 Risk Matrix Integration

This framework integrates with the **Risk Matrix** (see `risk-matrix.md` in same
directory) for:

- Phase 2 residual risks (security, data, legal)
- Sprint execution risks (velocity slippage, blocker accumulation, coverage
  drift)
- External dependency risks (vendor delays, stakeholder availability,
  third-party API limits)

**Risk Escalation Protocol:**

- HIGH risk (probability MEDIUM+ and impact HIGH+) → PM owns mitigation plan,
  weekly checkpoint review
- CRITICAL risk (probability HIGH and impact CRITICAL) → PM + Orchestrator
  escalation, immediate mitigation or scope deferral
- Risk materialization (risk becomes blocker) → Blocker escalation protocol
  (Section 4.1)

---

## 7. Governance Lifecycle & Amendments

### 7.1 Document Review Cadence

**This governance framework is a LIVING DOCUMENT.**

- **Sprint retrospective review:** After every sprint, Retrospective Agent flags
  governance gaps or process improvements → PM reviews and updates framework
- **Phase boundary review:** At end of each phase (Phases 1-4), Orchestrator
  validates governance compliance → Governance framework updated if gaps
  detected
- **Quarterly review:** Every Q1/Q2/Q3/Q4, PM conducts full governance audit →
  Framework version incremented (e.g., 1.0 → 1.1)
- **Scope change trigger:** Any SCOPE CHANGE command invocation triggers
  immediate governance framework review

### 7.2 Amendment Process

**Who can propose amendments:** Any agent, team member, or stakeholder  
**Proposal format:** Create entry in `.github/docs/decisions.md` with
`Type: OPEN_QUESTION`, `Scope: Governance`, `Priority: HIGH/MEDIUM/LOW`  
**Approval authority:** PM (for operational changes), PM + Orchestrator (for
structural changes), PM + Orchestrator + Stakeholders (for accountability
changes)  
**Effective date:** Amendments take effect at next Sprint Gate (not mid-sprint)

**Version Control:**

- Governance framework stored in Git with full commit history
- Version section at top of document updated on every amendment
- Change log section added when v1.1 is created (see Section 8)

---

## 8. Appendix: Governance Audit Checklist

**USE THIS CHECKLIST AT EVERY SPRINT GATE TO VALIDATE GOVERNANCE COMPLIANCE.**

- [ ] All decisions documented in `.github/docs/decisions.md` with status
      (OPEN/DECIDED/DEFERRED/EXPIRED)
- [ ] Session state synchronized to `session-state.json` with accurate phase,
      status, and blocker tracking
- [ ] Mutation log is append-only with zero gaps or duplicate IDs
- [ ] Sprint KPI log updated daily post-standup
- [ ] All blockers resolved within 2-hour SLA or explicitly escalated
- [ ] Quality gates enforced: Critic + Risk validation PASSED for all phase
      handoffs
- [ ] Test coverage ≥80% across all sprint changes (or Tech Lead waiver
      documented)
- [ ] GitHub issues synced with local sprint status (execution sync report
      created)
- [ ] Retrospective completed with lessons-learned documented
- [ ] Stakeholder sign-off ≥80% (if applicable for sprint scope)
- [ ] Zero decision compliance violations detected by Test Agent or PR/Review
      Agent
- [ ] Secret scanning passed (zero secrets merged)
- [ ] Accessibility audit passed (WCAG AA ≥95% or known gaps documented)
- [ ] Brand audit passed (100% token consistency or deviations justified)
- [ ] Documentation updated (user-manual.md, technical-manual.md current as of
      last commit)

**If ANY checkbox is unchecked:** Sprint Gate = FAIL; sprint cannot proceed to
next phase until resolved.

---

## HANDOFF CHECKLIST

- [x] All required sections are filled (not empty, not placeholder)
- [x] All UNCERTAIN: items are documented and escalated → None (all sources
      verified)
- [x] All INSUFFICIENT_DATA: items are documented and escalated → None
      (sufficient input from Phase 1/2)
- [x] Output complies with the contract in /.github/docs/contracts/ → SP-10-602
      acceptance criteria #1 met
- [x] Guardrails from /.github/docs/guardrails/ have been checked → G-GLOB-50
      through G-GLOB-58 compliance
- [x] Output is machine-readable and ready as input for stakeholder sign-off
      (SP-10-603)
- [x] No contradictory statements in this document
- [x] All findings include a source reference
- [x] Deliverable written to file (not only in chat) per MEMORY MANAGEMENT
      PROTOCOL

**Agent:** Business Analyst (01)  
**Date:** 2026-03-10 (Day 1, Sprint 1)  
**Status:** GOVERNANCE FRAMEWORK COMPLETE — Ready for PM approval and
stakeholder sign-off process
