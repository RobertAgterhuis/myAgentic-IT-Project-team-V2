# CI Health Dashboard — Monthly Review Process

> **Owner:** DevOps Engineer | **Frequency:** Monthly (1st week) | **Ref:**
> M16-006

---

## Review Checklist

### 1. Pipeline Success Rate

- [ ] Check CI workflow success rate for the past 30 days
- [ ] Target: ≥ 95% pass rate on `main` branch
- [ ] Document failures that were not caused by legitimate code issues

### 2. Pipeline Duration

- [ ] Record average duration for each CI job
- [ ] Flag any job that exceeds its timeout threshold
- [ ] Compare with previous month — investigate regressions > 20%

| Job                 | Timeout | Avg Duration | Trend |
| ------------------- | ------- | ------------ | ----- |
| Lint & Code Quality | –       |              |       |
| Unit Tests          | –       |              |       |
| Integration Tests   | 5 min   |              |       |
| Smoke Tests         | 5 min   |              |       |
| Accessibility Gate  | 5 min   |              |       |
| Security Scan       | –       |              |       |
| Container Scan      | –       |              |       |

### 3. Flaky Test Inventory

- [ ] List tests that failed intermittently (passed on re-run)
- [ ] Quarantined tests (marked `it.skip` with `// TODO: flaky`):
  - _None currently quarantined_
- [ ] Action items for flaky tests (fix or permanently skip with rationale)

### 4. Disabled Gates Inventory

- [ ] List any CI jobs with `if: false` or `continue-on-error: true`
- [ ] Document reason and target re-enable date for each

### 5. Coverage Trend

- [ ] Current coverage thresholds: statements 75%, branches 60%, functions 75%,
      lines 75%
- [ ] Review if thresholds should be raised based on actual coverage
- [ ] Check that `coverage-final.json` artifact is being uploaded

---

## Baseline (March 2026)

| Metric              | Value                                          |
| ------------------- | ---------------------------------------------- |
| CI workflows        | `ci.yml`, `ci-pipeline.yml`, `storybook.yml`   |
| Unit tests          | 3,000+ passing                                 |
| Integration tests   | 350+ passing                                   |
| Smoke tests         | 40+ passing                                    |
| Coverage thresholds | 75% lines / 75% stmts / 75% fns / 60% branches |
| Disabled gates      | None (all re-enabled per M16)                  |
| Quarantined tests   | 2 excluded (git-adapter, testing-adapter)      |
| Accessibility gate  | Enabled on main-branch merges                  |

---

## Process

1. At the start of each month, create a copy of this checklist as a GitHub Issue
   titled `CI Health Review — [Month Year]`.
2. Fill in metrics from GitHub Actions dashboard.
3. Tag blockers as `ci-health` label.
4. Close the issue once all items are reviewed and action items assigned.
