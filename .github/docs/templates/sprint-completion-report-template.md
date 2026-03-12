# Sprint [N] Completion Report

**Sprint:** Sprint [N] **Milestone:** #[M] **Period:** [START_DATE] – [END_DATE]
([CALENDAR_DAYS] calendar days) **Status:** [STATUS_EMOJI] **[STATUS — e.g.
SPRINT COMPLETE — X% VELOCITY (Y/Z ITEMS)]** **Report Date:** [REPORT_DATE] (Day
[D]) **Agent:** Implementation Agent → Test Agent → KPI Agent

---

## Executive Summary

[2-3 paragraph summary of sprint outcomes, key achievements, deferrals, and
blockers. Include both item velocity and AC velocity.]

---

## 1. Sprint Items — Final Status

### 1.1 [Track Name] ([X/Y] = [Z]%)

| Sprint ID | Issue | Title   | Status   | Day | ACs Done/Total | Acceptance |
| --------- | ----- | ------- | -------- | --- | -------------- | ---------- |
| [ID]      | #[N]  | [Title] | [STATUS] | [D] | [X/Y]          | [Summary]  |

<!-- Repeat section 1.1 per discipline track -->

### 1.N Deferred Items ([D] → Sprint [N+1])

| Sprint ID | Issue | Title   | Status      | Reason   | Next Sprint Start Condition |
| --------- | ----- | ------- | ----------- | -------- | --------------------------- |
| [ID]      | #[N]  | [Title] | ⏸️ DEFERRED | [Reason] | [Condition]                 |

---

## 2. Test Suite — Final Verification

### 2.1 Test Results (Day [D] — Sprint Close)

```
Test Suites: [X] passed, [X] total
Tests:       [X] passed, [X] total
Failures:    [X]
Time:        ~[T]s
```

### 2.2 Test Growth Summary

| Metric      | Prior Sprint End | This Sprint End | Delta       |
| ----------- | ---------------- | --------------- | ----------- |
| Test suites | [X]              | [Y]             | [+Z]        |
| Total tests | [X]              | [Y]             | [+Z] ([P]%) |
| Failures    | [X]              | [Y]             | [+/-Z]      |

### 2.3 New Test Suites Added

| Suite          | Tests | Type                     | Added   |
| -------------- | ----- | ------------------------ | ------- |
| [file.test.js] | [~N]  | [Unit/Integration/Smoke] | Day [D] |

### 2.4 Secret Scan

[Result of secret scan — e.g. "No secrets detected. .env files excluded via
.gitignore. No hardcoded credentials, API keys, or tokens found."]

---

## 3. CI/CD Pipeline Status

### 3.1 Active Jobs ([X] of [Y])

| Job | Name   | Status   | Trigger   |
| --- | ------ | -------- | --------- |
| [N] | [name] | [STATUS] | [trigger] |

### 3.2 Docker Stack

| Container | Port   | Status   |
| --------- | ------ | -------- |
| [name]    | [port] | [STATUS] |

---

## 4. Velocity Analysis (Dual Metric: Items + ACs)

### 4.1 Daily Velocity Progression

| Day | Date   | Items Done | Items % | ACs Done | ACs Total | ACs % | Delta Items | Delta ACs | Phase   |
| --- | ------ | ---------- | ------- | -------- | --------- | ----- | ----------- | --------- | ------- |
| 1   | [DATE] | [X]/[T]    | [P]%    | [A]/[AT] | [AT]      | [AP]% | [+N]        | [+N]      | [Notes] |

<!-- Repeat for each day -->

### 4.2 Velocity Chart — Dual Metric (Items vs ACs)

```
Items %                                  ACs %
100% |                                  100% |
 90% |                                   90% |
 80% |          ●── [D]                  80% |                    ●── [D]
 70% |      ●── [D]                      70% |              ●── [D]
 60% |                                   60% |         ●── [D]
 50% |                                   50% |
 40% | ●── [D]                           40% |    ●── [D]
 30% |                                   30% |
 20% |                                   20% | ●── [D]
 10% |                                   10% |
  0% |                                    0% |
     D1 D2 D3 D4 D5 D6 D7 D8           D1 D2 D3 D4 D5 D6 D7 D8

[KEY INSIGHT: Describe the relationship between the two curves.
AC velocity captures progress on multi-day items that item velocity misses.
Example: "ACs show 60% progress by Day 4, while items show only 40% —
indicating substantial work-in-progress on multi-day items."]
```

### 4.3 Velocity vs Targets

| Checkpoint   | Day | Item Target | Item Actual | AC Target | AC Actual | Status   |
| ------------ | --- | ----------- | ----------- | --------- | --------- | -------- |
| Checkpoint 1 | [D] | [X-Y]%      | [Z]%        | [X-Y]%    | [Z]%      | [STATUS] |
| Checkpoint 2 | [D] | [X-Y]%      | [Z]%        | [X-Y]%    | [Z]%      | [STATUS] |
| Sprint Close | [D] | ≥[X]%       | [Y]%        | ≥[X]%     | [Y]%      | [STATUS] |

### 4.4 AC Velocity Analysis

**Zero-item-velocity days with AC progress:**

| Day | Items Δ | ACs Δ | Work Performed                |
| --- | ------- | ----- | ----------------------------- |
| [D] | +0      | +[N]  | [Description of WIP progress] |

[INSIGHT: Identify days where AC velocity revealed hidden progress that item
velocity missed. This addresses Sprint 2 L7 / Retro Action #4 — "zero-velocity
days with significant work."]

**AC completion rate per item:**

| Sprint ID | ACs Total | ACs/Day (avg) | Days Active | Complexity        |
| --------- | --------- | ------------- | ----------- | ----------------- |
| [ID]      | [N]       | [X.X]         | [D]         | [Low/Medium/High] |

### 4.5 Cross-Sprint Velocity Comparison

| Metric            | Sprint [N-2] | Sprint [N-1] | Sprint [N] | Trend          |
| ----------------- | ------------ | ------------ | ---------- | -------------- |
| Items planned     | [X]          | [X]          | [X]        | [Trend note]   |
| Items completed   | [X]          | [X]          | [X]        | —              |
| Items deferred    | [X]          | [X]          | [X]        | [Trend note]   |
| Item velocity     | [X]%         | [X]%         | [X]%       | [Trend note]   |
| **ACs planned**   | **—**        | **—**        | **[X]**    | **New metric** |
| **ACs completed** | **—**        | **—**        | **[X]**    | **New metric** |
| **AC velocity**   | **—**        | **—**        | **[X]%**   | **New metric** |
| **ACs/day (avg)** | **—**        | **—**        | **[X.X]**  | **New metric** |
| Tests added       | [X]          | [X]          | [X]        | [Trend note]   |
| Blockers          | [X]          | [X]          | [X]        | [Trend note]   |
| Escalations       | [X]          | [X]          | [X]        | [Trend note]   |

---

## 5. Key Deliverables Produced

### 5.1 Implementation

| Deliverable | Description   |
| ----------- | ------------- |
| [Name]      | [Description] |

### 5.2 Documentation

| Document | Version | Changes   |
| -------- | ------- | --------- |
| [Name]   | [vX.X]  | [Summary] |

---

## 6. Risks & Blockers

### 6.1 Active Risks

| Risk          | Severity          | Mitigation   | Status   |
| ------------- | ----------------- | ------------ | -------- |
| [Description] | [HIGH/MEDIUM/LOW] | [Mitigation] | [STATUS] |

### 6.2 Escalations

| Trigger   | Day | Item | Action Taken | Outcome                       |
| --------- | --- | ---- | ------------ | ----------------------------- |
| [Trigger] | [D] | [ID] | [Action]     | [Resolved/Deferred/Escalated] |

---

## 7. Sprint Health Summary

| Indicator     | Status                | Notes  |
| ------------- | --------------------- | ------ |
| Item velocity | [X]% ([STATUS])       | [Note] |
| AC velocity   | [X]% ([STATUS])       | [Note] |
| Test coverage | [+N] tests ([STATUS]) | [Note] |
| CI pipeline   | [X/Y] jobs green      | [Note] |
| Secret scan   | [PASS/FAIL]           | [Note] |
| Blockers      | [N] open              | [Note] |

---

_Generated by KPI Agent | [DATE]_
