# Sprint 2 Day 2 Summary (March 26, 2026)

**Sprint:** Sprint 2 (March 25 – April 7, 2026)  
**Day:** Day 2 (March 26, 2026)  
**Time:** 09:00 UTC – 18:00 UTC  
**Status:** ✅ **HIGHLY PRODUCTIVE** — 1 item completed (SP-2-CI8), 4 items
advanced significantly

---

## Executive Summary

Day 2 delivered substantial progress across all 5 tracks. **SP-2-CI8
(Accessibility Gate)** is COMPLETE with Job 8 added to the CI pipeline. The
**subscribe endpoint** (SP-2-BTN) is fully implemented with 8 integration tests.
The **marketing landing page** (SP-2-LND) is live with 6 smoke tests. The
**Matomo analytics stack** (SP-2-MAT) has its Docker Compose + deployment spec
ready. The **technical manual** (SP-2-DOC) is updated to v1.8 with all new
endpoints, CI changes, and test counts documented. Test suite grew from 99 to
**113 tests across 6 suites** — all passing.

**Items Completed Today:** SP-2-CI8 (#124)  
**Items In Progress:** SP-2-BTN, SP-2-MAT, SP-2-LND, SP-2-DOC, SP-2-SOC,
SP-2-201-P, SP-2-501  
**Cumulative Sprint Progress:** 2/11 items complete (18%) — on track for
Checkpoint 1 target (25-35% by Day 4)

---

## Daily Standup Results (09:00 UTC)

**Attendance:** ✅ **Full (5/5)** — Business, Tech, UX, Marketing, PM  
**Duration:** 12 minutes (15-min target)  
**Team Morale:** ✅ **High** — Strong Day 1 start with PR #130 merged

### Completed Yesterday (March 25):

- **Tech:** SP-2-CI7 ✅ — PR #130 merged (squash, sha bec101a), CI Jobs 1-7
  verified on `main`
- **Marketing:** SP-2-BTN setup spec, SP-2-SOC publication plan, SP-2-LND scope
- **Business:** SP-2-201-P pilot scope defined
- **UX:** SP-2-501 TMS evaluation kickoff (Weblate, Lokalize, POEditor)
- **Docs:** SP-2-DOC tech manual v1.7 CI pipeline section

### Building Today (March 26):

- **Tech:** Implement Job 8 accessibility gate (SP-2-CI8), start Matomo Docker
  stack (SP-2-MAT)
- **Marketing:** Implement subscribe endpoint (SP-2-BTN), build landing page
  (SP-2-LND)
- **Docs:** Update tech manual to v1.8 (SP-2-DOC)

### Blockers:

- None

---

## Work Completed

### SP-2-CI8 (#124) — Accessibility Gate ✅ COMPLETE

**Status:** DONE  
**Acceptance Criteria Met:** 3/3

| Criterion                                     | Status |
| --------------------------------------------- | ------ |
| Job 8 added to ci-pipeline.yml                | ✅     |
| axe-core WCAG 2.1 A+AA scan + Lighthouse ≥90% | ✅     |
| Triggers on main push + all PRs               | ✅     |

**Implementation:** Added Job 8 (`accessibility-gate`) to CI pipeline with
`needs: [build]` (comment indicates switch to `[smoke-test]` when Job 6 is
enabled). Steps: checkout → setup-node → npm ci → npm start & → wait-on →
axe-core WCAG scan → Lighthouse audit → score verification (>90) → artifact
upload.

**File:** `.github/workflows/ci-pipeline.yml`

### SP-2-BTN (#126) — Subscribe Endpoint → 85%

**Status:** IN_PROGRESS (subscribe endpoint + tests complete; cross-client email
templates still pending)

**Delivered:**

- `routes/subscribe.js` — POST /api/subscribe with full validation (email
  format, segment allowlist, content-type enforcement)
- Buttondown ESP integration (server-side, API key via `BUTTONDOWN_API_KEY` env)
- 8 integration tests — all passing
- Wired into server.js route table

**Remaining:** Cross-client email template design + testing

### SP-2-MAT (#125) — Matomo Analytics → 60%

**Status:** IN_PROGRESS (Docker stack + deployment spec complete; staging deploy
pending)

**Delivered:**

- `docker-compose.analytics.yml` — 3-service stack (matomo:5-fpm-alpine,
  mariadb:11, nginx:alpine)
- `matomo-nginx.conf` — Reverse proxy with PHP-FPM pass-through
- `sp-2-mat-matomo-deployment.md` — Full deployment spec with cookieless config

**Remaining:** Staging deployment, cookieless mode activation, tracking code
integration

### SP-2-LND (#128) — Marketing Landing Page → 80%

**Status:** IN_PROGRESS (page + smoke tests complete; Matomo integration
pending)

**Delivered:**

- `landing.html` — Full marketing landing page with hero, value pillars, 5-phase
  flow, social proof stats, subscribe form
- 6 smoke tests (SMOKE-008) — all passing
- Accessible: skip-link, aria-labels, semantic HTML, keyboard nav
- Served at `/landing` and `/landing.html`

**Remaining:** Matomo tracking code integration (blocked by SP-2-MAT)

### SP-2-DOC (#129) — Technical Manual → 95%

**Status:** IN_PROGRESS (v1.8 update complete; final review pending)

**Delivered:**

- Version bumped to 1.8 (Sprint 2 Day 2)
- CI/CD Pipeline section: 9 jobs, Job 8 IMPLEMENTED
- Newsletter API: POST /api/subscribe documented
- Smoke tests: 8 groups, 29 tests
- Route modules: subscribe.js added
- Test counts: 113 tests, 6 suites
- Deployment: Analytics Stack (Matomo) subsection
- Secrets: BUTTONDOWN_API_KEY added
- Accessibility gate marked IMPLEMENTED

---

## Test Report

| Metric      | Start of Day | End of Day | Delta |
| ----------- | ------------ | ---------- | ----- |
| Total Tests | 99           | 113        | +14   |
| Test Suites | 5            | 6          | +1    |
| Failures    | 0            | 0          | 0     |

### New Tests Added

| Suite                             | Tests | Description                                                           |
| --------------------------------- | ----- | --------------------------------------------------------------------- |
| subscribe.integration.test.js     | 8     | POST /api/subscribe validation, segment handling, API key checks      |
| landing.smoke.test.js (SMOKE-008) | 6     | Marketing landing page: status, heading, pillars, form, headers, a11y |

---

## Files Created / Modified

### Created (6 files)

| File                                                  | Purpose                        |
| ----------------------------------------------------- | ------------------------------ |
| `src/webapp/routes/subscribe.js`                  | Newsletter subscribe endpoint  |
| `src/webapp/landing.html`                         | Marketing landing page         |
| `__tests__/integration/subscribe.integration.test.js` | Subscribe endpoint tests       |
| `docker-compose.analytics.yml`                        | Matomo Docker stack            |
| `matomo-nginx.conf`                                   | Nginx reverse proxy for Matomo |
| `.github/docs/phase-5/sp-2-mat-matomo-deployment.md`  | Matomo deployment spec         |

### Modified (4 files)

| File                                    | Changes                                |
| --------------------------------------- | -------------------------------------- |
| `.github/workflows/ci-pipeline.yml`     | Added Job 8 accessibility gate         |
| `src/webapp/server.js`              | Subscribe route + landing page serving |
| `__tests__/smoke/landing.smoke.test.js` | Added SMOKE-008 (6 tests)              |
| `docs/technical-manual.md`              | Updated to v1.8                        |

---

## Sprint 2 Item Status Board

| #   | ID         | Issue | Title                       | Status  | Progress | Notes                    |
| --- | ---------- | ----- | --------------------------- | ------- | -------- | ------------------------ |
| 1   | SP-2-CI7   | #123  | CI Job 7 verification       | ✅ DONE | 100%     | PR #130 merged Day 1     |
| 2   | SP-2-CI8   | #124  | CI Job 8 accessibility gate | ✅ DONE | 100%     | Completed Day 2          |
| 3   | SP-2-MAT   | #125  | Matomo deployment           | 🔄      | 60%      | Docker stack + spec done |
| 4   | SP-2-BTN   | #126  | Buttondown setup            | 🔄      | 85%      | Endpoint + tests done    |
| 5   | SP-2-SOC   | #127  | Social content              | 🔄      | 35%      | Publication plan done    |
| 6   | SP-2-LND   | #128  | Landing page                | 🔄      | 80%      | Page + smoke tests done  |
| 7   | SP-2-DOC   | #129  | Technical manual            | 🔄      | 95%      | v1.8 update complete     |
| 8   | SP-2-201-P | #107  | Internal pilot              | 🔄      | 40%      | Pilot scope done         |
| 9   | SP-2-202   | #110  | Pilot rubric                | ⏳      | 0%       | Blocked by SP-2-201-P    |
| 10  | SP-2-501   | #117  | TMS setup                   | 🔄      | 25%      | Weblate eval in progress |
| 11  | SP-2-201   | #115  | Landing experiment          | ⏳      | 0%       | Blocked by SP-2-MAT      |

**Sprint Velocity:** 2/11 (18%)  
**On Track:** Yes — Checkpoint 1 (Day 4) target is 25-35%

---

## Day 3 Priorities (March 27, 2026)

1. **SP-2-MAT** — Deploy Matomo to staging, activate cookieless mode
2. **SP-2-BTN** — Design cross-client email templates
3. **SP-2-201-P** — Complete pilot environment setup + feedback rubric draft
4. **SP-2-501** — Weblate Docker trial installation
5. **SP-2-DOC** — Final review pass on tech manual v1.8
6. **SP-2-202** — Begin pilot feedback rubric (if SP-2-201-P ready)
