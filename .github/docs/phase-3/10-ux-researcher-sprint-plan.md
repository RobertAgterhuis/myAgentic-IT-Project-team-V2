# Sprint Plan – UX Research – 2026-03-10

## Metadata

- Agent: UX Researcher (10)
- Phase: 3 — Experience Design
- Input received from:
  `.github/docs/phase-3/10-ux-researcher-recommendations.md`
- Date: 2026-03-10
- Software under analysis: MYAGENTIC-IT-PROJECT-TEAM-V2
- Mode: CREATE

---

## Sprint Planning Constraints

### Teams and Capacity

- **UX Team:** 1 person (UX Researcher = ongoing role across sprints for
  validation)
- **Design Team:** 2 people (UX Designer + UI Designer from Phase 3 agents)
- **Development Team:** From Phase 2 capacity assumptions (to be confirmed with
  Phase 2 Senior Developer IND-201)
- **Capacity per sprint:** INSUFFICIENT_DATA (not specified in Phase 2) →
  **ASSUMPTION:** 2 weeks per sprint, 40 hours/week capacity per team member

### Sprint Duration

- **Standard sprint:** 2 weeks (10 business days)
- **Source:** Industry standard for agile sprints; not contradicted by Phase 1
  or Phase 2 outputs

### Technology Stack (from Phase 2)

- **Frontend:** React.js (from Phase 2 Software Architect ADR-001: Modular
  Monolith with React frontend)
- **Backend:** Node.js + Express.js (from Phase 2 DevOps Engineer IND-401)
- **State Management:** JSON file-based (from Phase 2 Data Architect IND-901:
  session-state.json)
- **Real-time Updates:** Server-Sent Events (SSE) (from Phase 2 Software
  Architect ADR-003)
- **Analytics:** DECISION REQUIRED (GA4 vs Mixpanel) → QR-UX-004 questionnaire
  item

### Prerequisites (Must be complete before Sprint SP-1 starts)

1. **Phase 3 agents complete:** UX Researcher (10), UX Designer (11), UI
   Designer (12), Accessibility Specialist (13), Content Strategist (32),
   Localization Specialist (35)
2. **Phase 4 Brand & Assets:** Design tokens (`design-tokens.json`) available
   from Brand & Assets Agent (30)
3. **Phase 4 Storybook:** Component library baseline from Storybook Agent (31)
4. **Synthesis Agent:** Master Report approved (all 4 phases validated)
5. **GitHub Integration Agent:** GitHub Project created and stories published as
   Issues

**HALT CHECK:** Are all prerequisites documented? ✓ YES

---

## P1/P2 Recommendation Coverage Check

### P1 Recommendations (CRITICAL — must have stories)

| Recommendation ID | Recommendation Title                                     | Story ID(s)  | Story Count |
| ----------------- | -------------------------------------------------------- | ------------ | ----------- |
| REC-UX-001        | Conduct User Interviews to Validate Personas             | UX-STORY-001 | 1           |
| REC-UX-004        | Design Questionnaire Interface with Priority Indicators  | UX-STORY-004 | 1           |
| REC-UX-005        | Establish Accessibility Baseline and Guidelines          | UX-STORY-005 | 1           |
| REC-UX-006        | Optimize Onboarding Flow to Minimize Abandonment         | UX-STORY-006 | 1           |
| REC-UX-009        | Implement Questionnaire Consolidation and Prioritization | UX-STORY-009 | 1           |

**Total P1 recommendations:** 5  
**Total P1 stories:** 5  
**Coverage:** 100% ✓ (every P1 recommendation has at least one story)

### P2 Recommendations (STRATEGIC — should have stories)

| Recommendation ID | Recommendation Title                        | Story ID(s)  | Story Count |
| ----------------- | ------------------------------------------- | ------------ | ----------- |
| REC-UX-002        | Establish Usability Baseline Metrics        | UX-STORY-002 | 1           |
| REC-UX-003        | Validate Command Center IA via Card Sorting | UX-STORY-003 | 1           |

**Total P2 recommendations:** 2  
**Total P2 stories:** 2  
**Coverage:** 100% ✓

### P3 Recommendations (NICE-TO-HAVE — optional stories)

| Recommendation ID | Recommendation Title                                | Story ID(s)  | Story Count |
| ----------------- | --------------------------------------------------- | ------------ | ----------- |
| REC-UX-007        | Improve Command Center URL Discoverability          | UX-STORY-007 | 1           |
| REC-UX-008        | Implement SSE Reconnection Logic                    | UX-STORY-008 | 1           |
| REC-UX-010        | Document Mobile Limitation and Design Responsive UI | UX-STORY-010 | 1           |

**Total P3 recommendations:** 3  
**Total P3 stories:** 3  
**Coverage:** 100% ✓

**VERIFICATION:** No MISSING_STORY issues. All recommendations have associated
stories.

---

## Sprint Stories

### UX-STORY-001: Conduct User Interviews to Validate Personas

**Recommendation:** REC-UX-001 (P1)

**Sprint:** SP-2

**Story Description:**  
As a UX Researcher, I need to conduct user interviews with 3 participants (1
Alex-type, 2 Jordan-type) to validate persona assumptions, so that we design for
real user needs instead of unvalidated assumptions.

**Acceptance Criteria:**

1. **Recruit 3 participants:**
   - [ ] 1 participant matching Alex persona (senior DevOps/Platform lead
         profile)
   - [ ] 2 participants matching Jordan persona (team members: developer, QA,
         product owner roles)
   - [ ] Participant consent forms signed (GDPR-compliant per Phase 2 Legal
         Counsel IND-3301)
2. **Conduct interviews:**
   - [ ] 30-minute semi-structured interviews completed (3 × 30 min = 90 min
         total)
   - [ ] Interview recordings saved to `.github/docs/phase-3/interviews/` (with
         participant consent)
   - [ ] Interview notes transcribed (verbatim if possible, or detailed
         summaries)
3. **Validate persona attributes:**
   - [ ] 12 ASSUMPTION items from analysis Section 2 tested via targeted
         questions
   - [ ] At least 7 of 12 attributes confirmed by 2+ participants (58%
         confirmation rate)
   - [ ] Any invalidated assumptions documented with participant quotes
4. **Persona updates:**
   - [ ] Personas updated in `.github/docs/phase-3/10-ux-researcher-analysis.md`
         (Section 2)
   - [ ] Validation status changed from ASSUMPTION to VALIDATED (for confirmed
         items)
5. **Deliverable:**
   - [ ] Persona validation report created
         (`.github/docs/phase-3/persona-validation-report.md`)
   - [ ] Report includes: participant profiles, key findings,
         validated/invalidated attributes, updated personas

**Estimate:** 16 hours

- Participant recruitment: 4 hours
- Interview preparation (protocol, questions): 2 hours
- Conducting interviews: 2 hours (90 min + setup/wrap-up)
- Transcription and analysis: 6 hours
- Persona updates and report writing: 2 hours

**Dependencies:**

- **None** (can start immediately in Sprint SP-2)

**Owner:** UX Researcher (10)

**DEPENDENT_STORIES:**

- UX-STORY-006 (Onboarding flow optimization depends on validated persona
  preferences)

**Risk:** HIGH (if personas are invalid, significant UX rework required)

**Blocked by:** NONE

---

### UX-STORY-002: Define and Document Usability Baseline Metrics

**Recommendation:** REC-UX-002 (P2)

**Sprint:** SP-2

**Story Description:**  
As a UX Researcher, I need to define target baseline metrics for 9 KPIs (SUS,
task success rate, onboarding time, etc.), so that we can measure UX
improvements post-MVP and demonstrate "best user experience" claim from project
brief.

**Acceptance Criteria:**

1. **Baseline targets documented:**
   - [ ] `.github/docs/phase-3/ux-baseline-targets.md` created with targets for
         all 9 KPIs (from analysis Section 9)
   - [ ] Targets based on industry benchmarks (SUS > 68, onboarding completion >
         90%, etc.)
   - [ ] Rationale for each target documented (cite Nielsen Norman Group, ISO
         9241-11, or other standards)
2. **Approval:**
   - [ ] Product Owner (Alex persona or actual project lead) reviews and
         approves targets
   - [ ] Approval documented in file (e.g., "Approved by [Name] on [Date]")
3. **Analytics instrumentation plan:**
   - [ ] GA4 event schema defined (9 events corresponding to 9 KPIs)
   - [ ] Event schema documented in `.github/docs/phase-3/analytics-schema.md`
   - [ ] GA4 vs Mixpanel decision made (resolves QR-UX-004)

**Estimate:** 8 hours

- Research industry benchmarks: 2 hours
- Define targets and rationale: 2 hours
- Analytics schema design: 3 hours
- Documentation and approval: 1 hour

**Dependencies:**

- **Optional:** UX-STORY-001 (persona validation may refine KPI targets, but not
  blocking)

**Owner:** UX Researcher (10)

**DEPENDENT_STORIES:**

- UX-STORY-003 (Usability tests in SP-3 will measure against these baselines)

**Risk:** LOW (baseline definition is low-risk; measurement happens post-MVP)

**Blocked by:** NONE

---

### UX-STORY-003: Conduct Card Sorting and Tree Testing for IA Validation

**Recommendation:** REC-UX-003 (P2)

**Sprint:** SP-3

**Story Description:**  
As a UX Researcher, I need to validate Command Center tab structure (Home,
Progress, Questionnaires, Decisions, Synthesis, Sprints) via card sorting and
tree testing with 8 participants, so that users can find features intuitively
without navigation friction.

**Acceptance Criteria:**

1. **Card sorting (open):**
   - [ ] 8 participants recruited (5 Alex-type, 3 Jordan-type)
   - [ ] Card sorting session completed (tool: Miro or Optimal Workshop)
   - [ ] 9 feature cards grouped by participants (project creation, phase
         progress, questionnaires, etc.)
   - [ ] Agreement score calculated (target: > 70%)
2. **Tree testing:**
   - [ ] Tree testing session completed (tool: Optimal Workshop or
         UserTesting.com)
   - [ ] 6 tasks tested (e.g., "Where would you find phase progress?")
   - [ ] Success rate calculated (target: > 80% find correct tab on first
         attempt)
3. **Analysis:**
   - [ ] IA validation report created
         (`.github/docs/phase-3/ia-validation-report.md`)
   - [ ] Recommendations for tab structure changes (if agreement score < 70% or
         success rate < 80%)
4. **Implementation:**
   - [ ] If changes needed: UI Designer (Agent 12) updates wireframes and visual
         design
   - [ ] If no changes: Validation confirms current structure

**Estimate:** 12 hours

- Participant recruitment: 3 hours
- Card sorting setup and facilitation: 3 hours
- Tree testing setup and facilitation: 2 hours
- Analysis and report writing: 4 hours

**Dependencies:**

- **UX-STORY-001** (persona validation helps recruit matching participants)
- **Phase 3 UI Designer deliverables** (wireframes must exist to test)

**Owner:** UX Researcher (10)

**DEPENDENT_STORIES:**

- If IA changes required → creates rework stories for UI Designer (Agent 12)

**Risk:** MEDIUM (if IA is invalid, wireframes/visual design need rework)

**Blocked by:** UI Designer wireframes (Agent 12 deliverable)

---

### UX-STORY-004: Design Questionnaire Interface (Wireframes + Visual Design)

**Recommendation:** REC-UX-004 (P1)

**Sprint:** SP-1

**Story Description:**  
As a UX Designer and UI Designer, we need to design the questionnaire interface
with priority indicators, deferral mechanism, progress tracking, and contextual
help, so that users can answer questions efficiently without abandonment.

**Acceptance Criteria:**

1. **UX Designer (Agent 11) deliverables:**
   - [ ] Wireframes for Questionnaires tab (list view + detail view)
   - [ ] Question card design (question text, priority badge, answer input
         field, defer button, help tooltip)
   - [ ] Progress indicator placement (counter + progress bar)
   - [ ] Wireframes approved by Product Owner
2. **UI Designer (Agent 12) deliverables:**
   - [ ] Visual design mockups (high-fidelity)
   - [ ] Color palette for priority badges (red = HIGH, yellow = MEDIUM, gray =
         LOW)
   - [ ] Typography specifications (question text 16px bold, help text 14px
         regular)
   - [ ] WCAG 2.1 AA compliance verified (4.5:1 contrast ratio, keyboard
         navigation)
   - [ ] Design mockups approved by Product Owner
3. **Design system integration:**
   - [ ] Design tokens from Phase 4 Brand & Assets Agent (30) applied to visual
         design
   - [ ] Components added to Storybook (from Phase 4 Storybook Agent 31)

**Estimate:** 24 hours

- UX Designer wireframes: 10 hours
- UI Designer visual design: 10 hours
- Accessibility compliance check: 2 hours
- Approval and iterations: 2 hours

**Dependencies:**

- **Phase 4 Brand & Assets:** Design tokens (`design-tokens.json`) required for
  color palette, typography
- **Phase 4 Storybook:** Component library baseline required for consistency

**Owner:** UX Designer (11) + UI Designer (12)

**DEPENDENT_STORIES:**

- UX-STORY-009 (Questionnaire consolidation logic implementation depends on UI
  design)

**Risk:** HIGH (questionnaire UI is MVP-critical; poor design → high
abandonment)

**Blocked by:** Phase 4 Brand & Assets and Storybook outputs

---

### UX-STORY-005: Establish Accessibility Baseline and Guidelines

**Recommendation:** REC-UX-005 (P1)

**Sprint:** SP-1

**Story Description:**  
As an Accessibility Specialist, I need to audit existing Command Center UI (if
any) and define WCAG 2.1 AA compliance guidelines, so that all UX/UI design and
implementation meet accessibility standards.

**Acceptance Criteria:**

1. **Baseline audit (if UI exists):**
   - [ ] Automated accessibility scan run (Axe DevTools, WAVE, or Lighthouse)
   - [ ] Accessibility violations documented by severity (Level A, AA, AAA)
   - [ ] Remediation effort estimated (hours per violation category)
   - [ ] Baseline report created
         (`.github/docs/phase-3/accessibility-baseline.md`)
2. **Guidelines (greenfield or remediation):**
   - [ ] Keyboard navigation requirements documented (Tab, Enter, Escape, Arrow
         keys)
   - [ ] Screen reader compatibility rules (ARIA labels, landmarks, roles)
   - [ ] Color contrast minimums (4.5:1 normal text, 3:1 large text)
   - [ ] Focus indicator requirements (2px solid outline minimum)
3. **Checklist for designers:**
   - [ ] Accessibility checklist created for UX Designer and UI Designer
   - [ ] Checklist integrated into
         `.github/docs/phase-3/13-accessibility-specialist-guardrails.md`
4. **Target:**
   - [ ] Lighthouse accessibility score target set (> 90 for MVP launch)

**Estimate:** 10 hours

- Automated scan (if UI exists): 1 hour
- Manual audit and violation documentation: 3 hours
- Guidelines and checklist creation: 4 hours
- Documentation: 2 hours

**Dependencies:**

- **QR-UX-003** (Current Command Center UI status) — if UI doesn't exist, skip
  audit; if exists, audit required

**Owner:** Accessibility Specialist (13)

**DEPENDENT_STORIES:**

- UX-STORY-004 (Questionnaire UI design must follow accessibility guidelines)
- UX-STORY-006 (Onboarding UI must follow accessibility guidelines)

**Risk:** MEDIUM (accessibility issues discovered late → rework)

**Blocked by:** QR-UX-003 questionnaire answer (UI status)

---

### UX-STORY-006: Optimize Onboarding Flow with Progressive Disclosure

**Recommendation:** REC-UX-006 (P1)

**Sprint:** SP-1

**Story Description:**  
As a UX Designer and Senior Developer, we need to implement progressive
disclosure in the onboarding flow (5 required questions + collapsible advanced
options), so that users complete onboarding in < 10 minutes without abandonment.

**Acceptance Criteria:**

1. **UX Designer deliverables:**
   - [ ] Wireframes for onboarding flow (Phase 1: required fields; Phase 2:
         advanced options)
   - [ ] "Show advanced options" collapsible section designed
   - [ ] "Skip for now" button placement (for Phase 2 questions)
   - [ ] Progress indicator ("Step 1 of 2") designed
2. **Senior Developer implementation:**
   - [ ] Onboarding form implemented with 5 required fields only (project name,
         scope, mode, problem statement, contact)
   - [ ] Advanced options (technology preferences, team size, timeline, budget)
         collapsible
   - [ ] "Skip for now" button functional (saves partial onboarding to session
         state)
   - [ ] Progress indicator visible and accurate
3. **Validation:**
   - [ ] Onboarding can be completed with only 5 required fields (tested in
         smoke test)
   - [ ] Advanced options collapsed by default (user must click to expand)
4. **Documentation:**
   - [ ] Onboarding flow documented in `.github/docs/user-manual.md`

**Estimate:** 20 hours

- UX Designer wireframes: 6 hours
- Senior Developer implementation: 12 hours
- Testing and validation: 2 hours

**Dependencies:**

- **UX-STORY-001** (persona validation may refine required vs optional field
  distinctions)
- **UX-STORY-005** (accessibility guidelines must be applied)

**Owner:** UX Designer (11) + Senior Developer (from Phase 2, Agent 06)

**DEPENDENT_STORIES:**

- Usability test in Sprint SP-3 (UX-STORY-003 extended scope) will measure
  onboarding time

**Risk:** HIGH (onboarding is first impression; poor UX → abandonment)

**Blocked by:** UX-STORY-005 (accessibility guidelines required)

---

### UX-STORY-007: Improve Command Center URL Discoverability

**Recommendation:** REC-UX-007 (P3)

**Sprint:** SP-1

**Story Description:**  
As a DevOps Engineer and Documentation Agent, we need to print Command Center
URL to terminal on server start, add Quick Start to README, and create
`open_command_center` MCP tool, so that users can access the UI without
confusion.

**Acceptance Criteria:**

1. **Terminal output:**
   - [ ] `server.js` modified to print on startup:
     ```
     ✓ Command Center running at: http://127.0.0.1:3000
     ✓ Open in browser: Ctrl+Click (or Cmd+Click on macOS)
     ```
   - [ ] Tested on Windows, macOS, Linux (cross-platform compatibility)
2. **README update:**
   - [ ] Quick Start section added at top of README (visible without scrolling)
   - [ ] Example:

     ```markdown
     ## Quick Start

     1. `npm install`
     2. `node server.js`
     3. Open **http://127.0.0.1:3000** in your browser
     ```

3. **MCP tool (optional for SP-1, can defer to SP-2):**
   - [ ] `open_command_center` MCP tool created (opens http://127.0.0.1:3000 in
         default browser)
   - [ ] Tool tested in GitHub Copilot Chat ("Open Command Center")

**Estimate:** 4 hours

- Server.js modification: 1 hour
- README update: 1 hour
- MCP tool (optional): 2 hours

**Dependencies:**

- **None** (can implement immediately)

**Owner:** DevOps Engineer (Agent 07) + Documentation Agent (Agent 16)

**DEPENDENT_STORIES:**

- Usability test in Sprint SP-3 will measure discoverability (expect 100%
  success rate)

**Risk:** LOW (quick win; improves first-time user experience)

**Blocked by:** NONE

---

### UX-STORY-008: Implement SSE Reconnection Logic for Progress Dashboard

**Recommendation:** REC-UX-008 (P3)

**Sprint:** SP-2

**Story Description:**  
As a Senior Developer, I need to implement SSE reconnection logic with
exponential backoff and fallback UI, so that Progress dashboard remains accurate
even if SSE connection is interrupted.

**Acceptance Criteria:**

1. **SSE reconnection logic:**
   - [ ] Detect SSE connection loss (EventSource `error` event)
   - [ ] Auto-retry with exponential backoff (1s, 2s, 4s, 8s, max 30s)
   - [ ] Max retry attempts: 5
   - [ ] Log reconnection attempts to browser console
2. **Fallback UI:**
   - [ ] "Connection lost — retrying..." banner displayed at top of Progress tab
   - [ ] "Refresh" button shown after 5 failed retry attempts
   - [ ] Banner dismissed on successful reconnection
3. **Testing:**
   - [ ] Simulated network interruption test (disconnect server, verify
         reconnection)
   - [ ] SSE uptime > 99% in controlled test (10-minute session)

**Estimate:** 8 hours

- Reconnection logic implementation: 4 hours
- Fallback UI implementation: 2 hours
- Testing and debugging: 2 hours

**Dependencies:**

- **Phase 2 Software Architect ADR-003** (SSE architecture decision)

**Owner:** Senior Developer (Agent 06)

**DEPENDENT_STORIES:**

- NONE

**Risk:** LOW (localhost deployment reduces network risk; defensive programming)

**Blocked by:** NONE

---

### UX-STORY-009: Implement Questionnaire Consolidation and Prioritization Logic

**Recommendation:** REC-UX-009 (P1)

**Sprint:** SP-1

**Story Description:**  
As a Questionnaire Agent, I need to consolidate duplicate questions via semantic
similarity detection and assign priority levels (HIGH/MEDIUM/LOW), so that users
are not overwhelmed by questionnaire volume.

**Acceptance Criteria:**

1. **Consolidation logic:**
   - [ ] Duplicate detection algorithm implemented (semantic similarity >80% or
         keyword matching)
   - [ ] Cross-agent consolidation: merge similar questions from different
         agents
   - [ ] Consolidation reduces total question count by ≥ 30% (tested with Phase
         2's 17 INSUFFICIENT_DATA items as sample)
2. **Priority assignment:**
   - [ ] HIGH priority: INSUFFICIENT_DATA items blocking RISK mitigation (e.g.,
         "classification matrix" for RISK-P2-002)
   - [ ] MEDIUM priority: Quality improvements but not blocking
   - [ ] LOW priority: Nice-to-have context
   - [ ] Priority assignment logic documented in
         `.github/docs/phase-3/questionnaire-prioritization-rules.md`
3. **Sprint Gate blocking policy:**
   - [ ] HIGH-priority questions block Sprint Gate if unanswered
   - [ ] MEDIUM/LOW-priority questions never block Sprint Gate
   - [ ] Policy documented in
         `.github/docs/guardrails/sprint-gate-blocking-policy.md`
4. **Testing:**
   - [ ] Test with Phase 2's 17 INSUFFICIENT_DATA items
   - [ ] Verify at least 5 questions consolidated (30% of 17 = ~5)

**Estimate:** 16 hours

- Consolidation algorithm research and implementation: 8 hours
- Priority assignment logic: 4 hours
- Sprint Gate blocking policy integration: 2 hours
- Testing and documentation: 2 hours

**Dependencies:**

- **UX-STORY-004** (Questionnaire UI design must support priority badges)

**Owner:** Questionnaire Agent (36) + Senior Developer (Agent 06 for
implementation)

**DEPENDENT_STORIES:**

- All questionnaires generated in Phase 3-5 will use this logic

**Risk:** HIGH (questionnaire fatigue is likely; mitigation is critical)

**Blocked by:** UX-STORY-004 (UI design for priority indicators)

---

### UX-STORY-010: Document Mobile Limitation and Design Responsive UI

**Recommendation:** REC-UX-010 (P3)

**Sprint:** SP-1

**Story Description:**  
As a Documentation Agent and UI Designer, we need to document the localhost-only
limitation (no mobile support) in README and design responsive UI anyway for
future-proofing, so that users understand constraints and UI is ready for V2
cloud deployment.

**Acceptance Criteria:**

1. **Documentation:**
   - [ ] "Known Limitations" section added to README
   - [ ] Mobile limitation explained clearly (localhost-only → no mobile access)
   - [ ] Workaround documented (use desktop browser)
   - [ ] Future scope mentioned (mobile support deferred to V2)
2. **Responsive design:**
   - [ ] UI Designer creates responsive breakpoints (mobile 375px, tablet 768px,
         desktop 1440px)
   - [ ] Wireframes and visual design include all 3 breakpoints
   - [ ] CSS media queries implemented (flexbox/grid for fluid layouts)
3. **Testing:**
   - [ ] Visual regression tests at all 3 breakpoints
   - [ ] Tests pass (no layout breakage at any breakpoint)

**Estimate:** 10 hours

- README documentation: 1 hour
- Responsive design wireframes and mockups: 5 hours
- CSS implementation: 3 hours
- Visual regression testing: 1 hour

**Dependencies:**

- **None** (can implement immediately)

**Owner:** Documentation Agent (16) + UI Designer (12)

**DEPENDENT_STORIES:**

- NONE

**Risk:** LOW (responsive design is defensive investment; no immediate business
impact)

**Blocked by:** NONE

---

## Sprint Allocation Summary

| Sprint   | Story ID(s)                                                                        | Total Estimate (hours) | Priority Breakdown                                    |
| -------- | ---------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------- |
| **SP-1** | UX-STORY-004, UX-STORY-005, UX-STORY-006, UX-STORY-007, UX-STORY-009, UX-STORY-010 | 84 hours               | P1: 4 stories (70h), P3: 2 stories (14h)              |
| **SP-2** | UX-STORY-001, UX-STORY-002, UX-STORY-008                                           | 32 hours               | P1: 1 story (16h), P2: 1 story (8h), P3: 1 story (8h) |
| **SP-3** | UX-STORY-003                                                                       | 12 hours               | P2: 1 story (12h)                                     |

**Total effort:** 128 hours across 3 sprints

**Capacity check:**

- ASSUMPTION: 2-week sprints, 40 hours/week per team member
- INSUFFICIENT_DATA: Team size for UX implementation (UX Designer, UI Designer,
  Accessibility Specialist allocations unknown)
- **ESCALATION:** If actual capacity is lower than 84 hours in SP-1, prioritize
  P1 stories and defer P3 stories to SP-2

---

## Cross-Team Dependencies

| Story        | Dependent On                                             | Dependency Type | Risk if Blocked                                             |
| ------------ | -------------------------------------------------------- | --------------- | ----------------------------------------------------------- |
| UX-STORY-003 | UI Designer wireframes (Agent 12)                        | TECHNICAL       | MEDIUM (IA validation delayed)                              |
| UX-STORY-004 | Phase 4 Brand & Assets (Agent 30) + Storybook (Agent 31) | TECHNICAL       | HIGH (no visual design without design tokens)               |
| UX-STORY-005 | QR-UX-003 answer (Command Center UI status)              | BUSINESS        | MEDIUM (audit scope unclear)                                |
| UX-STORY-006 | UX-STORY-005 (accessibility guidelines)                  | TECHNICAL       | HIGH (onboarding may fail WCAG compliance)                  |
| UX-STORY-009 | UX-STORY-004 (questionnaire UI design)                   | TECHNICAL       | HIGH (consolidation logic cannot be implemented without UI) |

**Mitigation:**

- **UX-STORY-004 dependency on Phase 4:** Proceed with UX Designer wireframes in
  SP-1; apply design tokens in SP-2 after Brand & Assets completes
- **UX-STORY-005 dependency on QR-UX-003:** If questionnaire not answered by
  SP-1 start, assume greenfield (no existing UI) and skip audit step

---

## Sprint Story Sequencing (Recommended Execution Order)

### Sprint SP-1 (Foundation)

1. **UX-STORY-005** (Accessibility Baseline) — FIRST (provides guidelines for
   all design work)
2. **UX-STORY-007** (URL Discoverability) — PARALLEL (DevOps task, no design
   dependency)
3. **UX-STORY-010** (Mobile Documentation + Responsive Design) — PARALLEL (UI
   Designer task)
4. **UX-STORY-004** (Questionnaire UI Design) — AFTER UX-STORY-005 (requires
   accessibility guidelines)
5. **UX-STORY-006** (Onboarding Flow Optimization) — AFTER UX-STORY-005
   (requires accessibility guidelines)
6. **UX-STORY-009** (Questionnaire Consolidation Logic) — AFTER UX-STORY-004
   (requires UI design complete)

### Sprint SP-2 (Validation & Refinement)

1. **UX-STORY-001** (Persona Validation Interviews) — FIRST (informs all
   subsequent validation)
2. **UX-STORY-002** (Usability Baseline Metrics) — PARALLEL (documentation task)
3. **UX-STORY-008** (SSE Reconnection Logic) — PARALLEL (backend task)

### Sprint SP-3 (Usability Testing)

1. **UX-STORY-003** (IA Validation via Card Sorting/Tree Testing) — Uses
   UX-STORY-001 validated personas

---

## Risk Summary per Sprint

| Sprint | HIGH Risks                     | MEDIUM Risks  | LOW Risks            | Mitigation                                              |
| ------ | ------------------------------ | ------------- | -------------------- | ------------------------------------------------------- |
| SP-1   | 4 (Stories 004, 005, 006, 009) | 0             | 2 (Stories 007, 010) | Prioritize P1 stories; daily standups to catch blockers |
| SP-2   | 1 (Story 001)                  | 0             | 1 (Story 008)        | Persona validation gates SP-3; complete early in sprint |
| SP-3   | 0                              | 1 (Story 003) | 0                    | IA validation low-risk; can iterate post-MVP if needed  |

---

## Traceability Matrix: Recommendations → Stories

| Recommendation ID | Priority | Story ID(s)  | Sprint | Estimate |
| ----------------- | -------- | ------------ | ------ | -------- |
| REC-UX-001        | P1       | UX-STORY-001 | SP-2   | 16h      |
| REC-UX-002        | P2       | UX-STORY-002 | SP-2   | 8h       |
| REC-UX-003        | P2       | UX-STORY-003 | SP-3   | 12h      |
| REC-UX-004        | P1       | UX-STORY-004 | SP-1   | 24h      |
| REC-UX-005        | P1       | UX-STORY-005 | SP-1   | 10h      |
| REC-UX-006        | P1       | UX-STORY-006 | SP-1   | 20h      |
| REC-UX-007        | P3       | UX-STORY-007 | SP-1   | 4h       |
| REC-UX-008        | P3       | UX-STORY-008 | SP-2   | 8h       |
| REC-UX-009        | P1       | UX-STORY-009 | SP-1   | 16h      |
| REC-UX-010        | P3       | UX-STORY-010 | SP-1   | 10h      |

**Verification:** All 10 recommendations have associated stories. No
MISSING_STORY items.

---

## Self-Check

- [x] Prerequisites documented (teams, capacity, sprint duration, technology
      stack, phase dependencies)
- [x] HALT performed (prerequisites explicitly listed before stories)
- [x] P1/P2 traceability matrix complete (all P1 and P2 recommendations have
      stories)
- [x] No MISSING_STORY items (10 recommendations → 10 stories)
- [x] Every story has: description, acceptance criteria, estimate, dependencies,
      owner, risk level
- [x] Sprint allocation summary present (3 sprints planned)
- [x] Cross-team dependencies identified and documented
- [x] Story sequencing recommended (execution order per sprint)

---

## HANDOFF CHECKLIST – UX Researcher Sprint Plan

- [x] Prerequisites documented before stories (HALT performed)
- [x] Teams, capacity, sprint duration, technology stack documented
- [x] P1/P2 traceability matrix complete
- [x] Every P1 recommendation has at least one story (5 P1 recommendations → 5
      stories)
- [x] Every P2 recommendation has at least one story (2 P2 recommendations → 2
      stories)
- [x] No MISSING_STORY items
- [x] Every story has acceptance criteria, estimate, dependencies, owner
- [x] Sprint allocation summary present
- [x] Cross-team dependencies documented
- [x] Self-check performed

**STATUS:** READY FOR GUARDRAILS GENERATION

---

**End of UX Researcher Sprint Plan**
