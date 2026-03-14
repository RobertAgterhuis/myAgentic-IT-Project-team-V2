# SP-11-612 Test Strategy Framework

**Story:** SP-11-612 (Critical E2E Smoke Suite / Test Strategy Framework)  
**Sprint:** Sprint 1 (March 10-24, 2026)  
**Track:** Tech  
**Owner:** Senior Developer  
**GitHub Issue:** #116  
**Depends On:** SP-11-611 ✅ COMPLETE  
**Blocks:** SP-11-613 (Smoke Suite)  
**Status:** ✅ COMPLETE (Day 5 — 100%, approved March 17)  
**Completed:** March 17

---

## 1. Test Pyramid Strategy

### 1.1 Overview

The Agentic SDLC Platform adopts a **3-tier test pyramid** optimized for a
Node.js application with a Docker-based deployment model.

```
          ╱ ╲
         ╱ E2E ╲          10% — Playwright browser flows
        ╱───────╲
       ╱ INTEGR. ╲        20% — Supertest API + Docker service tests
      ╱─────────────╲
     ╱    UNIT TESTS  ╲   70% — Jest unit tests (logic, utilities, transforms)
    ╱───────────────────╲
```

### 1.2 Tier Definitions

| Tier            | Tool             | Scope                                                                   | Run Location                         | Speed Target |
| --------------- | ---------------- | ----------------------------------------------------------------------- | ------------------------------------ | ------------ |
| **Unit**        | Jest             | Pure functions, utilities, data transforms, validators                  | CI (every push)                      | <30s         |
| **Integration** | Jest + Supertest | HTTP endpoints, server routes, middleware, Docker service               | CI (every push, after build)         | <60s         |
| **E2E**         | Playwright       | Critical user journeys through browser (landing, onboarding, dashboard) | CI (main only, after staging deploy) | <120s        |

### 1.3 Coverage Targets

| Metric                | Target | Gate                   | Notes                                  |
| --------------------- | ------ | ---------------------- | -------------------------------------- |
| Line coverage         | ≥80%   | CI FAIL below 80%      | Existing gate in ci-pipeline.yml Job 2 |
| Branch coverage       | ≥75%   | WARN below 75%         | Advisory; becomes gate Sprint 2        |
| Function coverage     | ≥80%   | CI FAIL below 80%      | Tracks untested exported functions     |
| Integration pass rate | 100%   | CI FAIL on any failure | All integration tests must pass        |
| E2E pass rate         | 100%   | CI FAIL on any failure | All smoke/E2E tests must pass          |

---

## 2. Test File Organization

```
tests/
  example.test.js              # Baseline (SP-11-611) — RETAINED
  unit/
    config.test.js             # Configuration validation
    utils.test.js              # Utility functions
    validators.test.js         # Input validation logic
  integration/
    server.integration.test.js # HTTP endpoint tests (Supertest)
    health.integration.test.js # Health check endpoint
  smoke/                       # SP-11-613 (future)
    landing.smoke.test.js
    health.smoke.test.js
```

### Naming Convention

- Unit tests: `*.test.js` (or `*.test.ts`)
- Integration tests: `*.integration.test.js`
- Smoke/E2E tests: `*.smoke.test.js`

These patterns match the npm scripts already defined in `package.json`:

- `npm test` → all `tests/**/*.{js,ts}` files
- `npm run test:integration` → `**/*.integration.test.js`
- `npm run test:smoke` → `**/*.smoke.test.js`

---

## 3. Test Configuration

### 3.1 Jest Configuration (Enhanced)

The project's Jest config in `package.json` already provides a solid foundation.
SP-11-612 extends it with project-based configuration for multi-tier testing:

- **Unit tests** run in `node` environment (default)
- **Integration tests** run in `node` environment with extended timeout (10s)
- **E2E/Smoke tests** (SP-11-613) will use Playwright's own test runner

### 3.2 Test Utilities

Standard test patterns for the Agentic SDLC codebase:

- **Mocking:** Jest built-in `jest.mock()` for module-level mocks
- **HTTP testing:** Supertest for Express/HTTP server endpoint validation
- **File system testing:** `jest.spyOn(fs, 'method')` for file operations
- **Environment isolation:** Each test file is self-contained; no shared state

---

## 4. Integration Test Strategy

### 4.1 Server Endpoint Tests

The webapp server (`/src/webapp/server.js`) exposes HTTP endpoints.
Integration tests validate:

| Endpoint           | Test            | Expected                       |
| ------------------ | --------------- | ------------------------------ |
| `GET /`            | Response status | 200 OK                         |
| `GET /`            | Response body   | Contains expected HTML/content |
| `GET /health`      | Health check    | 200 OK with status: "healthy"  |
| `GET /nonexistent` | 404 handling    | 404 Not Found                  |

### 4.2 Docker Service Tests

When Docker Compose is available (CI staging environment):

| Test              | Method                          | Expected          |
| ----------------- | ------------------------------- | ----------------- |
| Container starts  | `docker compose up` exit code   | 0                 |
| Port binding      | HTTP request to localhost:3000  | Response received |
| Health endpoint   | HTTP GET /health                | 200 OK            |
| Graceful shutdown | `docker compose down` exit code | 0                 |

---

## 5. Risk-Aligned Test Cases

Per Tech Lead recommendation (SP-10-603 sign-off), the test strategy explicitly
addresses these risks from the risk matrix:

| Risk                         | Test Coverage                             | Priority |
| ---------------------------- | ----------------------------------------- | -------- |
| RISK-801 (Access Control)    | Authorization header validation tests     | P1       |
| RISK-804 (Rate Limiting)     | Concurrent request behavior tests         | P2       |
| RISK-602 (Low Test Coverage) | Coverage gate at 80% with branch tracking | P1       |
| RISK-803 (Dependency Vulns)  | Trivy in CI (already configured)          | P1       |
| RISK-806 (Secret Exposure)   | Gitleaks in CI (already configured)       | P1       |

---

## 6. CI Pipeline Integration Plan

### Current State (SP-11-611):

- Job 2 (Unit Tests) ✅ active — runs `npm run test:coverage`
- Job 6 (Integration Tests) ⏳ disabled — `if: false`
- Job 7 (Smoke Tests) ⏳ disabled — `if: false`

### Target State (SP-11-612 completion):

- Job 2 (Unit Tests) ✅ remains active — covers unit tier
- Job 6 (Integration Tests) ✅ **ENABLED** — runs `npm run test:integration`
- Job 7 (Smoke Tests) ⏳ remains disabled — awaits SP-11-613

### Enabling Integration Tests in CI:

1. Remove `if: false` from Job 6
2. Update Job 6 dependency to `needs: build` (doesn't require staging for
   HTTP-level tests)
3. Add integration test results as CI artifact

---

## 7. Deliverable Checklist (SP-11-612 Acceptance Criteria)

| #   | Criterion                                       | Status      | Evidence                                                               |
| --- | ----------------------------------------------- | ----------- | ---------------------------------------------------------------------- |
| 1   | Test pyramid documented (unit/integration/E2E)  | ✅ COMPLETE | This document, Section 1                                               |
| 2   | Jest configuration supports multi-tier testing  | ✅ COMPLETE | package.json scripts, Section 3                                        |
| 3   | Integration test suite created (≥10 test cases) | ✅ COMPLETE | 34 integration tests (25 server + 9 health)                            |
| 4   | Coverage reporting with ≥80% gate               | ✅ COMPLETE | CI pipeline Job 2 (existing)                                           |
| 5   | CI integration-test job enabled                 | ✅ COMPLETE | ci-pipeline.yml Job 6 enabled (Day 4)                                  |
| 6   | Risk-aligned test cases (RISK-801, 804)         | ✅ COMPLETE | RISK-801 path traversal + error leak; RISK-804 concurrency             |
| 7   | E2E test scaffold for SP-11-613                 | ✅ COMPLETE | `tests/smoke/landing.smoke.test.js` with 5 journey defs                |
| 8   | Test strategy document approved                 | ✅ COMPLETE | Approved at March 17 Week 2 standup — 77 tests all green, CI validated |

**Progress:** 8/8 complete = **100%** ✅ DONE

---

## 8. Remaining Work (March 15-17)

- [x] Complete integration test suite (target: 10+ test cases) — 34 tests
- [x] Create health check integration test — 9 tests in
      health.integration.test.js
- [x] Create server route integration tests — 25 tests covering 12+ endpoints
- [x] Add access control validation tests (RISK-801) — path traversal, error
      leak, oversized body
- [x] Enable CI Job 6 (integration-test) by removing `if: false` — enabled Day 4
- [x] E2E test scaffold for SP-11-613 handoff (5 critical journey definitions)
- [x] Run full CI pipeline locally — 77 tests, 5 suites, all green (validated
      March 17)
- [x] Verify ≥80% coverage gate holds with new test files — gate passes
      (confirmed March 17)
- [x] Document test strategy approval at March 17 checkpoint — APPROVED

---

## HANDOFF CHECKLIST

- [x] Test pyramid strategy documented
- [x] Test file organization defined
- [x] Jest configuration verified (existing setup supports multi-tier)
- [x] Integration test patterns established
- [x] Risk-aligned test cases identified
- [x] CI integration plan documented
- [x] Integration test suite complete (34 tests) — completed March 14
- [x] CI Job 6 enabled — completed March 14
- [x] Test strategy approved — approved March 17
- [x] Output written to file per MEMORY MANAGEMENT PROTOCOL
