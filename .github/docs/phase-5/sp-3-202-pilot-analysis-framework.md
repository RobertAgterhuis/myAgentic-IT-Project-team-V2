# SP-3-202 — Pilot Feedback Analysis Framework

**Story:** SP-3-202 (#110) — AC4  
**Sprint:** Sprint 3 (April 8 – April 21, 2026)  
**Owner:** Product Manager  
**Status:** ✅ COMPLETE  
**Input:** `sp-2-202-pilot-feedback-rubric.md` (rubric instrument)  
**First Dataset:** `sp-3-201p-internal-self-test-rubric.md` (internal self-test,
0.7× weight)

---

## 1. Purpose

This framework defines how pilot feedback rubric data is processed, scored,
prioritized, and converted into actionable sprint backlog items. It applies to
both internal self-tests (0.7× confidence weight) and external pilot responses
(1.0× weight).

---

## 2. Data Ingestion

### 2.1 Source Documents

| Source Type               | Document Pattern                          | Weight |
| ------------------------- | ----------------------------------------- | ------ |
| External pilot rubric     | `sp-N-201p-pilot-rubric-[PARTICIPANT].md` | 1.0×   |
| Internal self-test rubric | `sp-N-201p-internal-self-test-rubric.md`  | 0.7×   |

### 2.2 Required Fields Per Response

| Field                       | Type                                          | Required | Validation                        |
| --------------------------- | --------------------------------------------- | -------- | --------------------------------- |
| Participant Role            | Enum (Eng Lead / PM / UX / Dev / QA / Writer) | Yes      | Must match candidate roster       |
| Date of Mini-Cycle          | Date (YYYY-MM-DD)                             | Yes      | Within sprint window              |
| Clarity score (per step)    | Integer 1–5                                   | Yes      | 6 steps × 1 score each            |
| Confidence score (per step) | Integer 1–5                                   | Yes      | 6 steps × 1 score each            |
| Completeness (per step)     | Boolean (Yes/No)                              | Yes      | 6 steps                           |
| Friction points             | Structured table                              | Yes      | At least severity + description   |
| Gaps identified             | Structured table                              | Optional | Phase/document + expected content |

---

## 3. Scoring Aggregation

### 3.1 Per-Response Scoring

```
Average Clarity     = SUM(step_clarity_scores) / 6
Average Confidence  = SUM(step_confidence_scores) / 6
Completeness Rate   = (steps_marked_complete / 6) × 100
Friction Count      = COUNT(friction_points)
Critical Count      = COUNT(friction_points WHERE severity IN [Critical, High])
```

### 3.2 Cross-Response Aggregation (when N > 1)

```
Weighted Clarity     = SUM(response_clarity × weight) / SUM(weights)
Weighted Confidence  = SUM(response_confidence × weight) / SUM(weights)
Weighted Completeness = SUM(response_completeness × weight) / SUM(weights)
Friction Union       = DEDUPLICATED union of all friction points
```

### 3.3 KPI Evaluation (vs REC-203 Targets)

| KPI                    | Target | Formula                                           | Pass Condition       |
| ---------------------- | ------ | ------------------------------------------------- | -------------------- |
| Actionable findings    | ≥ 10   | Friction Count + Gap Count                        | ≥ 10                 |
| Critical/High blockers | 0      | Critical Count                                    | = 0 (WARNING if > 0) |
| Average clarity        | ≥ 4.0  | Weighted Clarity                                  | ≥ 4.0                |
| Average confidence     | ≥ 3.5  | Weighted Confidence                               | ≥ 3.5                |
| Completeness rate      | ≥ 90%  | Weighted Completeness                             | ≥ 90%                |
| NPS                    | ≥ 7    | External only (N/A for self-test)                 | ≥ 7                  |
| Closure rate           | ≥ 80%  | Closed findings / Total findings (by next sprint) | ≥ 80%                |

---

## 4. Finding Prioritization

### 4.1 Severity Classification

Findings are classified using the rubric's severity levels:

| Severity     | Definition                                   | SLA                                    |
| ------------ | -------------------------------------------- | -------------------------------------- |
| **CRITICAL** | Prevents completing the step — no workaround | Must address in next sprint            |
| **HIGH**     | Significant friction, workaround possible    | Should address in next sprint          |
| **MEDIUM**   | Noticeable friction, still completable       | Plan for next 2 sprints                |
| **LOW**      | Minor improvement suggestion                 | Backlog — prioritize opportunistically |

### 4.2 Deduplication Rules

When multiple respondents report the same friction point:

1. Merge into single finding with highest severity reported
2. Record count of occurrences (consensus weight)
3. Preserve all unique suggested fixes
4. Finding ID: `F-[sprint]-[sequence]` (e.g., F-03-01)

### 4.3 Prioritization Score

```
Priority Score = Severity Weight × Occurrence Count × Source Weight

Severity Weights: CRITICAL=4, HIGH=3, MEDIUM=2, LOW=1
Source Weight: External=1.0, Internal=0.7
```

Findings with Priority Score ≥ 3.0 are **mandatory Sprint N+1 backlog items**.
Findings with Priority Score 1.5–2.9 are **recommended backlog items**. Findings
with Priority Score < 1.5 are **optional improvements**.

---

## 5. Backlog Conversion

### 5.1 Finding → Issue Template

Each finding with Priority Score ≥ 1.5 produces a GitHub issue:

```markdown
**Title:** [PILOT-F-{ID}] {Finding title} **Labels:** pilot-finding, {severity},
sprint-{N+1} **Body:**

- **Source:** {self-test | external pilot} (weight: {0.7 | 1.0})
- **Severity:** {CRITICAL | HIGH | MEDIUM | LOW}
- **Occurrences:** {count}
- **Description:** {finding description}
- **Evidence:** {source reference from rubric}
- **Recommended Fix:** {suggested fix}
- **Acceptance Criteria:**
  - [ ] Finding addressed
  - [ ] Verified by re-test or review
```

### 5.2 Closure Tracking

| Status      | Definition                                  |
| ----------- | ------------------------------------------- |
| OPEN        | Finding identified, not yet addressed       |
| IN_PROGRESS | Work started in current sprint              |
| CLOSED      | Fix implemented and verified                |
| DEFERRED    | Explicitly deprioritized with justification |
| WONT_FIX    | Finding rejected with documented rationale  |

**Closure Rate** = (CLOSED + WONT_FIX) / Total findings × 100  
**Target:** ≥ 80% by end of Sprint N+1

---

## 6. Reporting

### 6.1 Per-Sprint Pilot Report

After each pilot cycle, produce `sprint-N-pilot-report.md` containing:

1. **Response Summary** — participant count, roles, source types
2. **Aggregate Scores** — weighted clarity, confidence, completeness
3. **KPI Dashboard** — all REC-203 targets with actual values and pass/fail
4. **Finding Registry** — all findings with priority scores, sorted descending
5. **Backlog Items Generated** — issue numbers for Sprint N+1
6. **Trend Comparison** — scores vs previous sprint (when available)

### 6.2 Cross-Sprint Trend Tracking

Maintain `pilot-trend-log.json` with structure:

```json
{
  "sprints": [
    {
      "sprint_id": "SP-3",
      "date": "2026-04-10",
      "responses": 1,
      "source": "internal",
      "weighted_clarity": 4.7,
      "weighted_confidence": 4.2,
      "completeness_rate": 100,
      "finding_count": 17,
      "critical_count": 1,
      "high_count": 3,
      "closure_rate": null
    }
  ]
}
```

---

## 7. First Dataset: Sprint 3 Internal Self-Test Results

Applying this framework to the Sprint 3 self-test data:

### 7.1 Aggregate Scores

| Metric             | Raw Score | Weight | Weighted Score   |
| ------------------ | --------- | ------ | ---------------- |
| Average Clarity    | 4.7/5     | 0.7×   | 3.29 (effective) |
| Average Confidence | 4.2/5     | 0.7×   | 2.94 (effective) |
| Completeness Rate  | 100%      | 0.7×   | 70% (effective)  |

> **Note:** Effective scores reflect confidence-weighted values. For KPI
> evaluation, raw scores are used (internal self-test still meets thresholds
> independently). Effective scores inform prioritization only.

### 7.2 KPI Dashboard — Sprint 3

| KPI                    | Target | Actual          | Status                             |
| ---------------------- | ------ | --------------- | ---------------------------------- |
| Actionable findings    | ≥ 10   | 17              | ✅ PASS                            |
| Critical/High blockers | 0      | 4               | ⚠️ WARNING — backlog items created |
| Average clarity        | ≥ 4.0  | 4.7             | ✅ PASS                            |
| Average confidence     | ≥ 3.5  | 4.2             | ✅ PASS                            |
| Completeness rate      | ≥ 90%  | 100%            | ✅ PASS                            |
| NPS                    | ≥ 7    | N/A (self-test) | — SKIPPED                          |
| Closure rate           | ≥ 80%  | TBD Sprint 4    | — PENDING                          |

### 7.3 Finding Registry (Top Priority)

| ID      | Finding                               | Severity | Score | Sprint 4 Action                                |
| ------- | ------------------------------------- | -------- | ----- | ---------------------------------------------- |
| F-03-01 | No "start here" guide                 | CRITICAL | 2.8   | Create pilot-participant-guide.md              |
| F-03-02 | Phase output volume overwhelming      | HIGH     | 2.1   | Per-phase summary documents                    |
| F-03-03 | Synthesis report stale                | HIGH     | 2.1   | Synthesis refresh mechanism                    |
| F-03-04 | Critic validates format not substance | HIGH     | 2.1   | Technical substance review                     |
| F-03-05 | Sprint Gate artifact inconsistency    | MEDIUM   | 1.4   | Standardize per-sprint gate files              |
| F-03-06 | Session-state.json growing unbounded  | MEDIUM   | 1.4   | Session archival mechanism                     |
| F-03-07 | Thin output for non-commercial agents | MEDIUM   | 1.4   | Scope gate at Onboarding                       |
| F-03-08 | Pilot recruitment recurring failure   | MEDIUM   | 1.4   | Self-test first, recruit with proven materials |
| F-03-09 | Docker runtime listed as UNKNOWN      | LOW      | 0.7   | Add Docker check to Onboarding                 |
| F-03-10 | Ambiguous roadmap sprint labels       | LOW      | 0.7   | Use actual Sprint IDs                          |

**Mandatory backlog (Score ≥ 3.0):** None (highest is 2.8 — CRITICAL at 0.7×
weight)  
**Recommended backlog (Score 1.5–2.9):** F-03-01 through F-03-04  
**Optional (Score < 1.5):** F-03-05 through F-03-10

---

_Created: 2026-04-10 Day 3 | Implementation Agent_
