# Accessibility Specialist Recommendations — CREATE Mode

> **Agent:** 13-accessibility-specialist  
> **Phase:** 3 — Experience Design  
> **Deliverable:** 2 of 4 (Recommendations)  
> **Based on analysis:**
> `.github/docs/phase-3/13-accessibility-specialist-analysis.md`  
> **Date:** 2026-03-10

---

## Metadata

- Agent: Accessibility Specialist (13)
- Phase: 3
- Based on analysis: `13-accessibility-specialist-analysis.md`
- Date: 2026-03-10
- Mode: CREATE

---

## Recommendation REC-A11Y-001

### Problem

No approved contrast matrix exists for tokenized text/control states.

**Analysis reference:** GAP-A11Y-001, RISK-A11Y-001

### Solution

Create and approve a WCAG contrast matrix for all semantic
text/surface/control/focus combinations before implementation lock.

**Implementation approach:**

1. Enumerate all token pairings used by priority components.
2. Test against WCAG AA contrast thresholds.
3. Publish approved/denied matrix with replacement guidance.
4. Gate Storybook and UI PRs to approved pairs only.

### Impact

| Dimension      | Expected effect             | Rationale                                                           |
| -------------- | --------------------------- | ------------------------------------------------------------------- |
| Revenue        | INSUFFICIENT_DATA: indirect | Better accessibility can widen enterprise eligibility and adoption. |
| Risk Reduction | High                        | Directly reduces release-blocking WCAG violations.                  |
| Cost           | Medium reduction            | Prevents late-stage rework after visual implementation.             |
| UX             | High                        | Improves readability and control clarity for all users.             |

### Rationale

Contrast issues are frequent and expensive when detected late.

### Dependencies

- Requires: UI Designer (12), Storybook Agent (31)
- Blocked by: none
- Depends on output of: Accessibility Specialist (13)

### Risk of Not Implementing

Core interfaces may fail WCAG checks and be blocked in quality gates.

### Measurement Criterion

- KPI: Approved contrast pair coverage
- Baseline: INSUFFICIENT_DATA
- Target: 100% of used token pairs approved
- Measurement method: Contrast matrix audit
- Time horizon: Sprint 1

---

## Recommendation REC-A11Y-002

### Problem

Focus order, traps, and modal return behavior are not fully standardized.

**Analysis reference:** GAP-A11Y-002, RISK-A11Y-002

### Solution

Publish a focus management spec for all dynamic components and enforce via
keyboard test scripts.

**Implementation approach:**

1. Define focus behavior for modal open/close, drawer toggle, route change, and
   async status updates.
2. Add deterministic focus return rules and trap boundaries.
3. Implement keyboard path tests for all primary flows.
4. Add CI smoke checks for critical keyboard journeys.

### Impact

| Dimension      | Expected effect             | Rationale                                                      |
| -------------- | --------------------------- | -------------------------------------------------------------- |
| Revenue        | INSUFFICIENT_DATA: indirect | Better usability can improve retention and reduce abandonment. |
| Risk Reduction | High                        | Reduces severe operability failures for keyboard users.        |
| Cost           | Medium reduction            | Early scripted coverage catches regressions fast.              |
| UX             | High                        | Predictable navigation and reduced confusion.                  |

### Rationale

Focus handling failures are among the highest-friction accessibility defects.

### Dependencies

- Requires: UX Designer (11), UI Designer (12), Senior Developer (06)
- Blocked by: none
- Depends on output of: Accessibility Specialist (13)

### Risk of Not Implementing

Critical workflows may be inaccessible without mouse input.

### Measurement Criterion

- KPI: Keyboard journey pass rate
- Baseline: INSUFFICIENT_DATA
- Target: >= 98% pass on scripted critical paths
- Measurement method: automated keyboard E2E suite
- Time horizon: Sprint 2

---

## Recommendation REC-A11Y-003

### Problem

No aria-live policy exists for real-time updates and status messaging.

**Analysis reference:** GAP-A11Y-003, RISK-A11Y-005

### Solution

Define a global status-announcement policy with event priority, throttling, and
deduplication for SSE-driven UI.

**Implementation approach:**

1. Classify events as polite vs assertive announcements.
2. Throttle repetitive low-priority updates.
3. Add deduplication by event key/time window.
4. Add test cases for expected announcement output.

### Impact

| Dimension      | Expected effect   | Rationale                                              |
| -------------- | ----------------- | ------------------------------------------------------ |
| Revenue        | INSUFFICIENT_DATA | No direct revenue baseline available.                  |
| Risk Reduction | Medium            | Prevents silent updates and screen-reader noise.       |
| Cost           | Low increase      | Small setup effort with high ongoing QA value.         |
| UX             | High              | Better signal-to-noise for assistive technology users. |

### Rationale

Real-time products must avoid over-announcing and under-announcing at the same
time.

### Dependencies

- Requires: Senior Developer (06)
- Blocked by: none
- Depends on output of: Accessibility Specialist (13), UX Designer (11)

### Risk of Not Implementing

Screen-reader users may miss important state changes or get overwhelmed by
repetitive output.

### Measurement Criterion

- KPI: Announcement accuracy score
- Baseline: INSUFFICIENT_DATA
- Target: >= 95% expected announcements emitted, <= 5% duplicates
- Measurement method: scripted SR test logs
- Time horizon: Sprint 2

---

## Recommendation REC-A11Y-004

### Problem

Cognitive accessibility requirements are identified but not operationalized in
content/form patterns.

**Analysis reference:** GAP-A11Y-004, RISK-A11Y-004

### Solution

Introduce plain-language and error-prevention standards for forms and guidance
content.

**Implementation approach:**

1. Define plain-language rubric for labels, prompts, and errors.
2. Require actionable error messages with correction examples.
3. Use progressive disclosure for advanced options.
4. Include comprehension checks in UX/content review.

### Impact

| Dimension      | Expected effect             | Rationale                                                   |
| -------------- | --------------------------- | ----------------------------------------------------------- |
| Revenue        | INSUFFICIENT_DATA: indirect | Reduced abandonment can improve completion-driven outcomes. |
| Risk Reduction | Medium                      | Lowers user error and frustration in complex flows.         |
| Cost           | Medium reduction            | Fewer support interactions and correction loops.            |
| UX             | High                        | Better clarity and confidence in task completion.           |

### Rationale

Cognitive accessibility improves usability for all users, not only specific
cohorts.

### Dependencies

- Requires: Content Strategist (32), UX Designer (11)
- Blocked by: none
- Depends on output of: Accessibility Specialist (13)

### Risk of Not Implementing

Questionnaire and decision workflows may remain difficult to complete
accurately.

### Measurement Criterion

- KPI: Form error recovery success rate
- Baseline: INSUFFICIENT_DATA
- Target: >= 90% successful correction on first retry
- Measurement method: form analytics and usability test sessions
- Time horizon: Sprint 3

---

## Recommendation REC-A11Y-005

### Problem

Assistive technology support matrix exists conceptually but lacks executable
test scripts and evidence artifacts.

**Analysis reference:** GAP-A11Y-005, RISK-A11Y-002, RISK-A11Y-003

### Solution

Create versioned assistive technology test scripts and evidence pack templates
per supported AT/browser pair.

**Implementation approach:**

1. Define scenario scripts for each primary flow and AT/browser pair.
2. Store expected announcement/output checkpoints.
3. Record test outcomes in standardized evidence files.
4. Attach evidence summary to sprint completion review.

### Impact

| Dimension      | Expected effect            | Rationale                                                                   |
| -------------- | -------------------------- | --------------------------------------------------------------------------- |
| Revenue        | INSUFFICIENT_DATA          | Compliance evidence may influence enterprise procurement, baseline unknown. |
| Risk Reduction | High                       | Improves legal readiness and release confidence.                            |
| Cost           | Medium increase short-term | Structured testing adds effort but reduces late defect costs.               |
| UX             | Medium                     | Higher confidence that assistive journeys stay usable.                      |

### Rationale

Evidence-driven validation is required for reliable accessibility governance.

### Dependencies

- Requires: QA/Test Agent (21), Legal Counsel (33)
- Blocked by: Assistive device access confirmation
- Depends on output of: Accessibility Specialist (13)

### Risk of Not Implementing

Accessibility claims remain unverifiable and high-risk in audits/procurement.

### Measurement Criterion

- KPI: Assistive-tech evidence completeness
- Baseline: 0%
- Target: 100% of required AT/browser scenarios documented per sprint
- Measurement method: evidence checklist completion rate
- Time horizon: Sprint 3

---

## Priority Matrix

| Recommendation ID | Impact | Effort | Priority | Sprint     |
| ----------------- | ------ | ------ | -------- | ---------- |
| REC-A11Y-001      | High   | Medium | P1       | Sprint 1   |
| REC-A11Y-002      | High   | Medium | P1       | Sprint 1-2 |
| REC-A11Y-003      | Medium | Medium | P2       | Sprint 2   |
| REC-A11Y-004      | Medium | Medium | P2       | Sprint 3   |
| REC-A11Y-005      | High   | High   | P1       | Sprint 2-3 |

---

## HANDOFF CHECKLIST

- [x] Every recommendation references analysis GAP/RISK IDs
- [x] Impact fields contain rationale or `INSUFFICIENT_DATA`
- [x] SMART measurement criteria included
- [x] Dependencies documented
- [x] Priority matrix complete
- [x] No out-of-domain recommendations
- [x] Scope change section not applicable
- [x] Ready for sprint plan handoff

**Status:** READY
