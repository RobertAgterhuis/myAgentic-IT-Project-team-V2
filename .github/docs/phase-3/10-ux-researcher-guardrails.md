# Guardrails – UX Research – 2026-03-10

## Metadata

- Agent: UX Researcher (10)
- Phase: 3 — Experience Design
- Input received from: `.github/docs/phase-3/10-ux-researcher-analysis.md` +
  `.github/docs/phase-3/10-ux-researcher-recommendations.md`
- Date: 2026-03-10
- Software under analysis: MYAGENTIC-IT-PROJECT-TEAM-V2
- Mode: CREATE

---

## Guardrail Index

| Guardrail ID | Title                                        | Source Risk/Gap                              | Enforcement Point                       | Violation Action                                         |
| ------------ | -------------------------------------------- | -------------------------------------------- | --------------------------------------- | -------------------------------------------------------- |
| GR-UX-001    | Persona Validation Gate                      | RISK-UX-001, GAP-UX-001                      | Sprint SP-3 Gate (pre-usability test)   | BLOCK sprint; UX-STORY-001 must complete                 |
| GR-UX-002    | Questionnaire Abandonment Threshold          | RISK-UX-005                                  | Post-usability test (Sprint SP-3)       | ESCALATE to UX Designer for UI simplification            |
| GR-UX-003    | Onboarding Completion Time Limit             | RISK-UX-002                                  | Usability test validation (Sprint SP-3) | REDESIGN onboarding flow; remove non-essential questions |
| GR-UX-004    | Accessibility Compliance Minimum             | GAP-UX-005, Analysis Section 3 (WCAG 2.1 AA) | Pre-deployment gate (every sprint)      | BLOCK deployment; remediate violations                   |
| GR-UX-005    | Questionnaire Consolidation Rate             | RISK-UX-005                                  | Questionnaire Agent execution (ongoing) | MANUAL_REVIEW if consolidation < 30%                     |
| GR-UX-006    | High-Priority Questionnaire Blocking         | RISK-UX-005, Analysis Section 8.2            | Sprint Gate (all sprints SP-3+)         | BLOCK sprint if HIGH-priority questions unanswered       |
| GR-UX-007    | Information Architecture Findability Minimum | GAP-UX-003                                   | Post-IA validation (Sprint SP-3)        | REDESIGN navigation if success rate < 80%                |

**Total Guardrails:** 7 (all critical/high risks and P1 gaps covered)

---

## Detailed Guardrails

### GR-UX-001: Persona Validation Gate

**Source:**

- **RISK-UX-001:** Persona assumptions invalid (BUSINESS, HIGH severity,
  POSSIBLE likelihood)
- **GAP-UX-001:** Persona validation data absent (Critical priority)
- **Analysis Reference:** Section 2 (Persona Creation), Section 8.1, Section 8.2

**Description:**  
All persona attributes (Alex + Jordan) are marked ASSUMPTION until validated via
user interviews. If assumptions are invalid, UX design will misalign with user
needs → low adoption, NPS < 50, < 3 users by Q4 2026.

**Guardrail Rule:**  
Sprint SP-3 (usability testing sprint) CANNOT start until **UX-STORY-001
(Conduct User Interviews to Validate Personas)** is COMPLETE and at least **58%
of persona attributes (7 of 12)** are VALIDATED.

**Enforcement Point:**

- **When:** Sprint SP-3 Gate (pre-sprint planning)
- **Who:** Orchestrator (automatic check via session-state.json)
- **How:** Check `.github/docs/phase-3/persona-validation-report.md` exists AND
  validation completion rate ≥ 58%

**Violation Action:**

1. **BLOCK Sprint SP-3 start**
2. **ESCALATE:** Orchestrator notifies UX Researcher (Agent 10) that persona
   validation is incomplete
3. **REMEDIATION:** UX Researcher completes UX-STORY-001 (conduct remaining
   interviews or extend sample size)
4. **GATE REOPENS:** After persona validation report shows ≥ 58% validation rate

**Verification Method:**

- **Automated:** Parse `.github/docs/phase-3/persona-validation-report.md` for
  validation count
  - Expected format: "Validated: 8 of 12 attributes (67%)"
  - Pass condition: validation percentage ≥ 58%
- **Manual Fallback:** If automated parsing fails, Orchestrator prompts user:
  "Has persona validation completed with ≥ 58% validation rate? (YES/NO)"

**Risk if Ignored:**

- **Impact:** HIGH — Designing for wrong user → complete UX rework after MVP
  launch → miss Q4 2026 target
- **Likelihood:** CERTAIN (if guardrail bypassed, design proceeds on unvalidated
  assumptions)

**Owner:** UX Researcher (Agent 10) + Orchestrator (enforcement)

**Related Stories:** UX-STORY-001

---

### GR-UX-002: Questionnaire Abandonment Threshold

**Source:**

- **RISK-UX-005:** Questionnaire fatigue (OPERATIONAL, MEDIUM severity, LIKELY
  likelihood)
- **Analysis Reference:** Section 4.1 (JTBD: Functional Job 3), Section 9 (KPI:
  questionnaire abandonment rate < 20%)

**Description:**  
If questionnaires are too complex or numerous, users abandon → agents blocked by
INSUFFICIENT_DATA → sprints delayed.

**Guardrail Rule:**  
Questionnaire abandonment rate MUST be **< 20%** (measured in Sprint SP-3
usability test and post-MVP analytics). If abandonment rate ≥ 20%, questionnaire
UI must be simplified.

**Enforcement Point:**

- **When:** Post-usability test analysis (Sprint SP-3) AND post-MVP Month 1
  analytics review
- **Who:** UX Researcher (manual analysis of usability test results) + KPI Agent
  (automated analytics check)
- **How:** Calculate abandonment rate = (questionnaire_started -
  questionnaire_completed) / questionnaire_started × 100

**Violation Action:**

1. **ESCALATE** to UX Designer (Agent 11) + UI Designer (Agent 12)
2. **ROOT CAUSE ANALYSIS:**
   - If abandonment happens on specific question types: simplify question
     wording or add contextual help
   - If abandonment happens after N questions: reduce total question count via
     consolidation (invoke Questionnaire Agent)
   - If abandonment happens due to UI confusion: redesign questionnaire
     interface (priority badge unclear, defer button not visible)
3. **REMEDIATION:**
   - Create rework story: "Simplify questionnaire UI to reduce abandonment"
   - Re-test with 5 new participants (abbreviated usability test)
   - Target: abandonment rate < 20% in retest

**Verification Method:**

- **Usability Test (Sprint SP-3):**
  - Measure: 5 participants attempt questionnaires; count how many complete vs
    abandon
  - Pass condition: ≤ 1 of 5 participants abandon (20% threshold)
- **Post-MVP Analytics (Month 1):**
  - GA4 or Mixpanel event tracking: `questionnaire_started` and
    `questionnaire_completed` events
  - Pass condition: (started - completed) / started × 100 < 20%

**Risk if Ignored:**

- **Impact:** MEDIUM — Users defer all questionnaires → HIGH-priority questions
  unanswered → Sprint Gate blocks sprints → velocity collapse
- **Likelihood:** LIKELY (Phase 2 generated 17 INSUFFICIENT_DATA items;
  extrapolate 50+ across Phase 1-4)

**Owner:** UX Researcher (analysis) + UX Designer (remediation)

**Related Stories:** UX-STORY-004 (Questionnaire UI design), UX-STORY-009
(Questionnaire consolidation)

---

### GR-UX-003: Onboarding Completion Time Limit

**Source:**

- **RISK-UX-002:** Onboarding flow too complex (OPERATIONAL, MEDIUM severity,
  LIKELY likelihood)
- **Analysis Reference:** Section 3.1 (Journey mapping: Onboarding stage success
  criterion < 10 minutes)

**Description:**  
If onboarding takes > 10 minutes, users abandon → 0% adoption → product failure.

**Guardrail Rule:**  
Onboarding completion time MUST be **< 10 minutes** for ≥ 80% of users (measured
in Sprint SP-3 usability test).

**Enforcement Point:**

- **When:** Sprint SP-3 usability test (5 participants)
- **Who:** UX Researcher (manual time tracking during usability test)
- **How:** Measure time from Command Center landing page access to
  `project_created` event (onboarding complete)

**Violation Action:**

1. **If ≥ 2 of 5 participants exceed 10 minutes:**
   - **REDESIGN** onboarding flow (UX Designer + Senior Developer)
   - **ROOT CAUSE:**
     - Too many required questions? → Reduce to 5 required fields (REC-UX-006
       progressive disclosure)
     - Questions unclear? → Simplify wording + add inline help text
     - UI slow/unresponsive? → Optimize frontend performance (Senior Developer
       task)
2. **REMEDIATION:**
   - Create rework story: "Optimize onboarding flow to meet < 10 min target"
   - Re-test with 3 new participants
   - Target: ≥ 2 of 3 complete in < 10 minutes

**Verification Method:**

- **Usability Test (Sprint SP-3):**
  - Measure: Time each participant from landing on Command Center to completing
    onboarding
  - Pass condition: ≥ 4 of 5 participants complete in < 10 minutes (80%
    threshold)
- **Post-MVP Analytics (Month 1):**
  - Calculate: Median time between Command Center access and `project_created`
    event
  - Pass condition: Median < 10 minutes

**Risk if Ignored:**

- **Impact:** HIGH — Onboarding abandonment = 0 active users → complete product
  failure
- **Likelihood:** LIKELY (questionnaire length unknown; conservative estimate
  is > 10 min without optimization)

**Owner:** UX Researcher (measurement) + UX Designer (remediation)

**Related Stories:** UX-STORY-006 (Onboarding flow optimization)

---

### GR-UX-004: Accessibility Compliance Minimum (WCAG 2.1 AA)

**Source:**

- **GAP-UX-005:** No accessibility baseline established (High priority)
- **Analysis Reference:** Section 3 (Journey mapping: WCAG 2.1 AA requirement),
  Section 7.1 (Technical feasibility)
- **Phase 1 Value Proposition:** "WCAG 2.1 AA compliant" (from Business Analyst
  analysis)

**Description:**  
WCAG 2.1 AA compliance is non-negotiable per Phase 1 value proposition.
Accessibility issues discovered late → significant rework, delayed MVP, legal
risk (ADA non-compliance if deployed to external users in future).

**Guardrail Rule:**  
Command Center UI MUST achieve **Lighthouse accessibility score > 90** AND
**zero Level A or AA violations** (per Axe DevTools or WAVE scan) before
deployment to any sprint.

**Enforcement Point:**

- **When:** Pre-deployment gate (every sprint, before merging UI changes to main
  branch)
- **Who:** Automated CI/CD pipeline + Accessibility Specialist (manual review
  for complex issues)
- **How:** Run Lighthouse accessibility audit + Axe DevTools scan in CI/CD

**Violation Action:**

1. **BLOCK PR merge** if Lighthouse score ≤ 90 OR any Level A/AA violations
   detected
2. **REMEDIATION:**
   - Developer fixes accessibility violations (common fixes: add ARIA labels,
     increase color contrast, add keyboard navigation)
   - Re-run Lighthouse + Axe scan
   - Pass condition: Lighthouse > 90 AND zero A/AA violations
3. **ESCALATE** to Accessibility Specialist (Agent 13) if violations are complex
   or unclear
   - Example: Custom component with unclear ARIA role requirements

**Verification Method:**

- **Automated (CI/CD):**
  - Run Lighthouse CLI:
    `lighthouse http://127.0.0.1:3000 --only-categories=accessibility --chrome-flags="--headless"`
  - Parse JSON output: extract accessibility score
  - Pass condition: score > 90
- **Automated (Axe DevTools):**
  - Run Axe Core CLI: `axe http://127.0.0.1:3000 --tags wcag2a,wcag2aa`
  - Parse JSON output: count violations with impact "critical" or "serious"
  - Pass condition: 0 violations
- **Manual Fallback (Sprint Review):**
  - Accessibility Specialist reviews UI manually
  - Checks: keyboard navigation, screen reader compatibility, color contrast
  - Approval required for sprint completion

**Risk if Ignored:**

- **Impact:** CRITICAL — ADA/WCAG non-compliance → legal risk, reputational
  damage, excludes users with disabilities (contradicts Phase 1 value
  proposition)
- **Likelihood:** CERTAIN (if guardrail bypassed, accessibility violations will
  exist)

**Owner:** Accessibility Specialist (Agent 13) + DevOps Engineer (CI/CD
automation)

**Related Stories:** UX-STORY-005 (Accessibility baseline and guidelines)

---

### GR-UX-005: Questionnaire Consolidation Rate Minimum

**Source:**

- **RISK-UX-005:** Questionnaire fatigue (OPERATIONAL, MEDIUM severity, LIKELY
  likelihood)
- **Analysis Reference:** Section 8.2 (RISK-UX-005), REC-UX-009 (target: 30%
  consolidation rate)

**Description:**  
If Questionnaire Agent does not consolidate duplicates effectively, users face
50+ questions instead of 30–35 → abandonment → agents blocked.

**Guardrail Rule:**  
Questionnaire consolidation MUST reduce total question count by **≥ 30%**
(measured after Questionnaire Agent consolidation pass).

**Enforcement Point:**

- **When:** After Questionnaire Agent (36) generates consolidated questionnaires
  (per phase or per sprint)
- **Who:** Questionnaire Agent (self-check) + Orchestrator (validation)
- **How:** Compare pre-consolidation count (sum of all INSUFFICIENT_DATA items
  from agents) vs post-consolidation count (final questionnaire count)

**Violation Action:**

1. **If consolidation rate < 30%:**
   - **MANUAL_REVIEW** by Questionnaire Agent (36) or UX Researcher (10)
   - **ROOT CAUSE:**
     - Duplicate detection algorithm too conservative (similarity threshold >
       80%)?
     - Questions genuinely unique (no duplicates to consolidate)?
   - **REMEDIATION:**
     - If algorithm issue: Lower similarity threshold to 70% and re-run
       consolidation
     - If questions genuinely unique: Proceed with current count BUT escalate to
       UX Designer to simplify question wording
2. **ESCALATE** to Product Owner if total question count > 50 even after
   consolidation
   - Decision: Defer MEDIUM/LOW-priority questions to post-MVP?

**Verification Method:**

- **Automated:**
  - Questionnaire Agent outputs consolidation report:
    `consolidation-report.json`
  - Schema:
    ```json
    {
      "pre_consolidation_count": 50,
      "post_consolidation_count": 35,
      "consolidation_rate": 30,
      "consolidated_questions": [
        {
          "original_ids": ["P2-A05-Q1", "P2-A07-Q3"],
          "merged_id": "P2-MERGED-Q1"
        }
      ]
    }
    ```
  - Pass condition: `consolidation_rate >= 30`
- **Manual Fallback:**
  - UX Researcher reviews consolidated questionnaire manually
  - Approval required if automated check unavailable

**Risk if Ignored:**

- **Impact:** MEDIUM — Questionnaire fatigue → abandonment → agents blocked →
  sprint delays
- **Likelihood:** LIKELY (without consolidation, Phase 1-4 could generate 100+
  questions)

**Owner:** Questionnaire Agent (36) + UX Researcher (10)

**Related Stories:** UX-STORY-009 (Questionnaire consolidation logic)

---

### GR-UX-006: High-Priority Questionnaire Blocking Policy

**Source:**

- **RISK-UX-005:** Questionnaire fatigue (OPERATIONAL, MEDIUM severity, LIKELY
  likelihood)
- **Analysis Reference:** Section 8.2 (RISK-UX-005), REC-UX-009 (Sprint Gate
  blocking policy)

**Description:**  
Without clear blocking policy, users defer all questionnaires (including
HIGH-priority ones) → agents blocked by INSUFFICIENT_DATA → critical sprints
cannot start.

**Guardrail Rule:**  
**HIGH-priority questionnaires MUST be answered before Sprint Gate** for sprints
that depend on those answers. MEDIUM/LOW-priority questionnaires NEVER block
Sprint Gate.

**Enforcement Point:**

- **When:** Sprint Gate (all sprints SP-3 and later)
- **Who:** Orchestrator (automatic check via session-state.json +
  questionnaire-index.md)
- **How:** Check if any HIGH-priority questions are UNANSWERED for current
  sprint

**Violation Action:**

1. **BLOCK Sprint Gate** if HIGH-priority questions unanswered
2. **NOTIFY** user via Command Center alert:
   - "Sprint SP-N blocked: 3 HIGH-priority questionnaires unanswered. Please
     answer in Questionnaires tab before proceeding."
3. **ESCALATE** if HIGH-priority questions remain unanswered for > 5 business
   days:
   - Orchestrator creates DECIDED item in `decisions.md`: "Question [Q-ID]
     unanswered after 5 days; proceeding with ASSUMPTION: [default value]. RISK:
     [impact if assumption wrong]."
   - Sprint unblocked with documented risk

**Verification Method:**

- **Automated (Sprint Gate):**
  - Parse `BusinessDocs/questionnaire-index.md`:
    - Filter questions with `priority: HIGH` AND `sprint_blocker: SP-N` (current
      sprint)
    - Count unanswered questions (status ≠ ANSWERED)
  - Pass condition: 0 unanswered HIGH-priority questions for current sprint
- **Manual Fallback:**
  - Orchestrator prompts user: "Are all HIGH-priority questionnaires for Sprint
    SP-N answered? (YES/NO)"

**Risk if Ignored:**

- **Impact:** HIGH — Sprint proceeds without critical context → poor quality
  outputs → rework in later sprints
- **Example:** Sprint SP-3 implements data classification UI, but
  "classification matrix" (RISK-P2-002) unanswered → UI cannot be designed
  correctly → complete rework in SP-4

**Owner:** Orchestrator + Questionnaire Agent (36)

**Related Stories:** UX-STORY-009 (Questionnaire prioritization policy)

---

### GR-UX-007: Information Architecture Findability Minimum

**Source:**

- **GAP-UX-003:** Command Center IA not validated (MEDIUM priority)
- **Analysis Reference:** Section 3 (Journey mapping), REC-UX-003 (IA
  validation)

**Description:**  
If Command Center tab structure is not intuitive, users cannot find features →
high friction, low SUS score, poor "best user experience" perception.

**Guardrail Rule:**  
Information architecture (tab structure) MUST achieve **≥ 80% tree testing
success rate** in Sprint SP-3 IA validation. If success rate < 80%, navigation
structure must be redesigned.

**Enforcement Point:**

- **When:** Post-IA validation (Sprint SP-3, after UX-STORY-003 completes)
- **Who:** UX Researcher (manual analysis of tree testing results)
- **How:** Calculate success rate = (successful tree test tasks / total tasks) ×
  100

**Violation Action:**

1. **If success rate < 80%:**
   - **REDESIGN** navigation structure (UX Designer + UI Designer)
   - **ROOT CAUSE ANALYSIS:**
     - Which tabs caused most failures? (e.g., users expected "Questionnaires"
       under "Progress" instead of separate tab)
     - Rename confusing tabs? (e.g., "Synthesis" → "Reports")
     - Merge tabs? (e.g., combine "Decisions" and "Questionnaires" into "Input"
       tab)
   - **REMEDIATION:**
     - UX Designer creates revised wireframes
     - Re-run tree testing with 5 new participants
     - Target: ≥ 80% success rate in retest
2. **No Sprint SP-4 deployment** until IA validation passes (blocks subsequent
   UI implementation)

**Verification Method:**

- **IA Validation Test (Sprint SP-3):**
  - Tree testing tasks: 6 tasks × 8 participants = 48 total attempts
  - Measure: Count successful first-attempt findability
  - Pass condition: ≥ 38 of 48 successful (79.2% rounds to 80%)
- **Report:** `.github/docs/phase-3/ia-validation-report.md` documents success
  rate

**Risk if Ignored:**

- **Impact:** MEDIUM — Navigation friction → users spend > 15 min/day on Command
  Center instead of < 15 min → fatigue, poor SUS score
- **Likelihood:** POSSIBLE (IA is designer assumption; may align with user
  mental models or may not)

**Owner:** UX Researcher (validation) + UX Designer (remediation)

**Related Stories:** UX-STORY-003 (IA validation via card sorting/tree testing)

---

## Traceability Matrix: Risks/Gaps → Guardrails

| Risk/Gap ID | Type | Severity/Priority | Guardrail ID                    | Enforcement Point             |
| ----------- | ---- | ----------------- | ------------------------------- | ----------------------------- |
| RISK-UX-001 | RISK | HIGH              | GR-UX-001                       | Sprint SP-3 Gate              |
| GAP-UX-001  | GAP  | Critical          | GR-UX-001                       | Sprint SP-3 Gate              |
| RISK-UX-002 | RISK | MEDIUM            | GR-UX-003                       | Usability test (SP-3)         |
| GAP-UX-003  | GAP  | Medium            | GR-UX-007                       | Post-IA validation (SP-3)     |
| GAP-UX-005  | GAP  | High              | GR-UX-004                       | Pre-deployment (every sprint) |
| RISK-UX-005 | RISK | MEDIUM            | GR-UX-002, GR-UX-005, GR-UX-006 | Multiple enforcement points   |

**Verification:** All CRITICAL/HIGH risks and HIGH-priority gaps have guardrails
(6 risks/gaps → 7 guardrails)

**Note:** LOW-priority risks (RISK-UX-003, RISK-UX-004, RISK-UX-006) do not
require guardrails per skill file guidance ("only CRITICAL/HIGH risks require
preventive guardrails").

---

## Enforcement Automation Plan

| Guardrail ID | Automation Feasibility                      | Implementation Owner     | Target Sprint           |
| ------------ | ------------------------------------------- | ------------------------ | ----------------------- |
| GR-UX-001    | ✓ HIGH (file existence check + parsing)     | Orchestrator             | SP-2 (before SP-3 gate) |
| GR-UX-002    | ✓ MEDIUM (GA4/Mixpanel integration)         | KPI Agent (29)           | Post-MVP Month 1        |
| GR-UX-003    | ✗ MANUAL (usability test observation)       | UX Researcher (10)       | SP-3                    |
| GR-UX-004    | ✓ HIGH (CI/CD Lighthouse + Axe integration) | DevOps Engineer (07)     | SP-1                    |
| GR-UX-005    | ✓ HIGH (JSON report parsing)                | Questionnaire Agent (36) | SP-1                    |
| GR-UX-006    | ✓ HIGH (questionnaire-index.md parsing)     | Orchestrator             | SP-3+                   |
| GR-UX-007    | ✗ MANUAL (tree testing analysis)            | UX Researcher (10)       | SP-3                    |

**Automation Coverage:** 5 of 7 guardrails (71%) can be automated; 2 require
manual UX research validation

---

## Self-Check

- [x] Every CRITICAL or HIGH risk has a guardrail (RISK-UX-001 → GR-UX-001;
      RISK-UX-002 → GR-UX-003; RISK-UX-005 → GR-UX-002, GR-UX-005, GR-UX-006)
- [x] Every HIGH-priority gap has a guardrail (GAP-UX-001 → GR-UX-001;
      GAP-UX-005 → GR-UX-004)
- [x] Every guardrail has a violation action (7 guardrails → 7 violation actions
      documented)
- [x] Every guardrail has a verification method (7 guardrails → 7 verification
      methods: automated or manual)
- [x] Every guardrail references an analysis finding (GAP-NNN or RISK-NNN ID)
      (all 7 guardrails traced)
- [x] No guardrail without violation action (all 7 have BLOCK, ESCALATE, or
      REDESIGN actions)
- [x] No guardrail without verification method (all 7 have automated or manual
      verification)
- [x] Traceability matrix complete (6 risks/gaps → 7 guardrails)

---

## HANDOFF CHECKLIST – UX Researcher Guardrails

- [x] Every CRITICAL/HIGH risk has a preventive guardrail
- [x] Every HIGH-priority gap has a guardrail
- [x] Every guardrail has a violation action
- [x] Every guardrail has a verification method
- [x] Every guardrail references an analysis finding (GAP/RISK ID)
- [x] Traceability matrix present and complete
- [x] Self-check performed

**STATUS:** UX RESEARCHER COMPLETE — All 4 deliverables ready for handoff to UX
Designer (Agent 11)

---

**End of UX Researcher Guardrails**
