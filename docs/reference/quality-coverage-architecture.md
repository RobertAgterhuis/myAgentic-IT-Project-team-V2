---
title: Quality Coverage Architecture
parent: Reference
nav_order: 20
permalink: /quality-coverage-architecture/
description: Test coverage responsibility boundaries and measurement strategy across backend and UI.
---

# Quality Coverage Architecture

## Overview

The Agentic SDLC Platform spans two independently-testable layers:

- **Backend** (root package): Node.js server, orchestrator engine, adapters, services, CLI
- **Frontend** (src/webapp/ui): React 18 UI, components, pages, state management

Each layer has distinct test responsibilities, coverage metrics, and release-readiness evidence.

---

## Responsibility Boundaries

### Root (Backend) Coverage

**Scope:** Node.js server and orchestration layer

| Component                                 | Responsibility                             | Test Type          | Coverage Tool |
| ----------------------------------------- | ------------------------------------------ | ------------------ | ------------- |
| **Server (src/webapp/server.ts)**         | HTTP routing, middleware, request handling | Unit + Integration | vitest (root) |
| **MCP Server (src/webapp/mcp-server.ts)** | Model Context Protocol stdio interface     | Unit + Integration | vitest (root) |
| **Engine (platform/engine/\*)**           | State machine, orchestrator logic, gates   | Unit + Integration | vitest (root) |
| **Services (src/webapp/services/\*)**     | Business logic, data access, external APIs | Unit + Integration | vitest (root) |
| **Adapters (platform/sdlc/adapters/\*)**  | GitHub, testing, shell adapters            | Unit + Integration | vitest (root) |
| **CLI (scripts/\*)**                      | Command-line automation, code generation   | Unit + Integration | vitest (root) |
| **Config & Runtime**                      | Environment profiles, constants, utilities | Unit               | vitest (root) |

**Root Coverage Report:** `npm run test:coverage` → `coverage/coverage-summary.json`

### UI (Frontend) Coverage

**Scope:** React SPA and interactive components

| Component                          | Responsibility                                      | Test Type  | Coverage Tool          |
| ---------------------------------- | --------------------------------------------------- | ---------- | ---------------------- |
| **Components (src/components/\*)** | Reusable React components, UI logic                 | Unit       | vitest (UI)            |
| **Pages (src/pages/\*)**           | Page-level logic and layout                         | Unit       | vitest (UI)            |
| **Hooks (src/hooks/\*)**           | Custom React hooks, state logic                     | Unit       | vitest (UI)            |
| **Store (src/store/\*)**           | Zustand state management                            | Unit       | vitest (UI)            |
| **Utils (src/utils/\*)**           | Client-side utilities, formatters                   | Unit       | vitest (UI)            |
| **Accessibility (ARIA, a11y)**     | Semantic HTML, ARIA attributes, keyboard navigation | Unit + Axe | vitest (UI) + axe-core |

**UI Coverage Report:** `cd src/webapp/ui && npm run test:coverage` → `src/webapp/ui/coverage/coverage-summary.json`

---

## Coverage Measurement & Targets

### Root Quality Gates

| Metric         | Target | Enforced               |
| -------------- | ------ | ---------------------- |
| **Statements** | ≥73%   | Yes (vitest threshold) |
| **Branches**   | ≥68%   | Yes (vitest threshold) |
| **Functions**  | ≥73%   | Yes (vitest threshold) |
| **Lines**      | ≥73%   | Yes (vitest threshold) |

**Report Location:** `coverage/coverage-summary.json`

### UI Quality Gates

| Metric         | Target | Enforced                                 |
| -------------- | ------ | ---------------------------------------- |
| **Statements** | ≥70%   | (set in src/webapp/ui/vitest.config.mjs) |
| **Branches**   | ≥65%   | (set in src/webapp/ui/vitest.config.mjs) |
| **Functions**  | ≥70%   | (set in src/webapp/ui/vitest.config.mjs) |
| **Lines**      | ≥70%   | (set in src/webapp/ui/vitest.config.mjs) |

**Report Location:** `src/webapp/ui/coverage/coverage-summary.json`

---

## Release Readiness Checklist

### Root Package Release Criteria

- [ ] `npm run test:coverage` passes all thresholds
- [ ] All critical adapters (GitHub, testing, shell) have ≥80% coverage
- [ ] Engine logic achieves ≥85% coverage (core business logic)
- [ ] No skipped tests (`it.skip`, `describe.skip`) in production code paths
- [ ] All integration tests pass

### UI Package Release Criteria

- [ ] `cd src/webapp/ui && npm run test:coverage` passes all thresholds
- [ ] Critical user flows tested (CREATE, AUDIT, questionnaires, decisions)
- [ ] Accessibility (ARIA) validated with axe-core
- [ ] Responsive design verified across breakpoints (via unit tests or Storybook)
- [ ] No skipped or pending tests

---

## Running Coverage Reports

### Root Coverage

```bash
# Run root coverage report
npm run test:coverage

# View root coverage in HTML
open coverage/coverage-final.json
```

### UI Coverage

```bash
# Run UI coverage report
cd src/webapp/ui
npm run test:coverage

# View UI coverage in HTML
open coverage/coverage-final.json
```

### Combined Quality Report (Manual)

To get a holistic view of product quality:

```bash
# 1. Run root coverage
npm run test:coverage

# 2. Run UI coverage
cd src/webapp/ui && npm run test:coverage && cd ../../..

# 3. Review both reports
# - Root: coverage/coverage-summary.json
# - UI:   src/webapp/ui/coverage/coverage-summary.json
```

---

## Known Exclusions & Rationale

### Root Exclusions

| Exclusion                      | Reason                                    | Review Date |
| ------------------------------ | ----------------------------------------- | ----------- |
| `src/webapp/ui/**`             | Frontend has separate coverage reporting  | 2026-03-19  |
| `src/webapp/services/types.ts` | Type-only declarations (no runtime logic) | 2026-03-19  |
| `**/*.d.ts`                    | Type definitions only                     | 2026-03-19  |

### UI Exclusions

Configured in `src/webapp/ui/vitest.config.mjs` (review separately).

---

## Updating This Document

When coverage architecture changes:

1. Update responsibility matrices if roles change
2. Update target thresholds if gates shift
3. Add new exclusions with review date and rationale
4. Run both coverage reports to verify accuracy

Last updated: 2026-03-19
