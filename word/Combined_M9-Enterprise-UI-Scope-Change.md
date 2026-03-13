**SCOPE CHANGE DOCUMENT**

M9: Enterprise UI (FEAT-02)

Complete Milestone Redesign & Sprint Planning

|                 |                                   |
| --------------- | --------------------------------- |
| **Project:**    | myAgentic-IT-Project-team-V2      |
| **Repository:** | github.com/RobertAgterhuis        |
| **Branch:**     | main                              |
| **Date:**       | March 13, 2026                    |
| **Milestone:**  | M9 (#37)                          |
| **Priority:**   | P1-high (elevated from P2-medium) |

# 1. Executive Summary

This document replaces the current M9: Enterprise UI (FEAT-02) milestone (GitHub milestone #37) and its single issue (#197) with a comprehensive, requirement-aligned scope that addresses critical gaps identified through deep code analysis of the main branch. The original milestone contained only one generic epic with 7 abstract stories and 24 story points. This scope change expands M9 into **8 focused sprints containing 44 detailed issues totalling approximately 178 story points**, reflecting the true complexity of delivering a production-grade enterprise UI, including new considerations for testing, state management security, and CI/CD pipelines.

# 2. Current State Analysis

## 2.1 Codebase Statistics

|                                   |                                                    |
| --------------------------------- | -------------------------------------------------- |
| **File / Area**                   | **Lines / Detail**                                 |
| index.html (main UI)              | 4,909 lines — monolithic single file               |
| design-system.css                 | 3,485 lines — external stylesheet                  |
| dashboard.js                      | 1,391 lines — dashboard rendering module           |
| dashboard.html                    | 882 lines — dashboard template                     |
| landing.html                      | 440 lines — marketing landing page                 |
| API routes (11 modules)           | 30+ REST endpoints (GET/POST/PUT/PATCH/DELETE)     |
| Backend (server + models + store) | 1,726 lines across server.js, models.js, store.js  |
| Total frontend code               | ~11,100 lines of vanilla JS/HTML/CSS               |
| Test coverage                     | 1,172 tests (363 Jest + 809 Vitest), 70%+ enforced |

## 2.2 Critical Findings

### Finding 1: No UI Framework & Monolithic Architecture (GOD Files)

The entire frontend is built with raw vanilla JavaScript in a single monolithic `index.html` file (4,909 lines) containing inline CSS and embedded JavaScript. There is no component model or virtual DOM. It violates the project's own mandatory DRY and Modular code requirements.

### Finding 2: Security & State Contamination Vulnerabilities

All UI state is currently managed through global variables in a single IIFE (Immediately Invoked Function Expression) scope in `index.html`. As the application grows, global state mutations become untraceable, making it highly susceptible to memory leaks, race conditions with SSE (Server-Sent Events), and state contamination between independent functional areas like the Command Center and operational dashboards.

### Finding 3: The "Testing Bridge" Gap

The codebase has strong testing (1,172 tests), but they are heavily coupled to the existing Node/Vanilla DOM environment. Attempting a Strangler-fig migration risks invalidating these tests. We need an E2E "black-box" testing layer (like Playwright) to verify user flows independently of the framework before beginning the migration to avoid a massive coverage drop.

### Finding 4: No Storybook or CI/CD Design System Deployment

Despite planning documents existing, zero Storybook infrastructure exists. Furthermore, without a CI/CD pipeline to deploy Storybook statically (e.g., via Chromatic or GitHub Pages) on every PR, visual regression testing is impossible and developers cannot reference the design system easily.

### Finding 5: Emoji-Based Icons — No Icon Library

All icons throughout the UI are Unicode emoji characters (e.g., &#128203; for clipboard). These render inconsistently, are not accessible by default, cannot be styled, and look unprofessional.

### Finding 6: Partial API Integration

The backend exposes 30+ REST API endpoints, but the frontend currently only consumes about 40% of them. Many milestone, drift, and advanced orchestrator endpoints are completely unused.

### Finding 7: Design Token Duplication and Drift

There are three separate, conflicting sources of design tokens: `docs/brand/design-tokens.json`, `index.html` inline `:root` variables, and `design-system.css` variables, causing visual inconsistencies.

# 3. Target Technology Stack & Strategy

Based on the requirements for zero external runtime dependencies (serving static files via Node), enterprise capabilities, and rapid development, the following stack is adopted:

1. **Framework**: React 18 + Vite + TypeScript (Solves monolithic DOM manipulation and matches project docs).
2. **Component Library**: shadcn/ui + Tailwind CSS (Fast, accessible enterprise components unified under one token system).
3. **Icons**: Lucide React (Replaces emojis with crisp, accessible, and styleable SVG stroke icons).
4. **State Management**: TanStack Query (Server State / API caching) + Zustand (Client State) (Isolates UI state from server state, eliminating the IIFE global state risk).
5. **E2E Testing**: Playwright (Provides the "Safety Net" to ensure existing functionality remains intact during the transition).
6. **Deployment Infrastructure**: Dedicated `Dockerfile.storybook` (Separating design governance from the core `webapp` container to preserve production lightness).

# 4. Enhanced Sprint Plan — Detailed Issue Breakdown

The following 8-sprint plan (2 weeks per sprint) introduces a **Test-Driven Strangler Pattern**, where E2E tests are implemented _before_ replacing the legacy features, to ensure safe migration without regressions.

## Sprint 9A: E2E Safety Net & Tooling Foundation (Weeks 1-2)

**Goal:** Create a black-box testing safety net for existing features, set up the React workspace, and configure a CI pipeline for Storybook to enable visual regression testing.

| #                         | Issue Title                                                                                  | SP  | Priority | Type     |
| ------------------------- | -------------------------------------------------------------------------------------------- | --- | -------- | -------- |
| 1                         | Baseline E2E tests via Playwright for core user flows (Dashboard, Questionnaires)            | 5   | P0       | test     |
| 2                         | Initialize React 18 + Vite 6 + TypeScript project in src/webapp/ui/                          | 5   | P0       | setup    |
| 3                         | Configure Storybook 8.x with a separate `Dockerfile.storybook` and CI/CD deployment pipeline | 5   | P0       | setup    |
| 4                         | Unify design tokens: single design-tokens.json → CSS variables build pipeline                | 5   | P0       | refactor |
| 5                         | Install and configure shadcn/ui and Lucide React icon library                                | 3   | P1       | setup    |
| 6                         | Configure Vitest + React Testing Library for React component unit testing                    | 3   | P1       | setup    |
| \*(Total: 26 story points | 6 issues)\*                                                                                  |

## Sprint 9B: Design System Atoms (Weeks 3-4)

**Goal:** Build foundational design system components.

| #                         | Issue Title                                             | SP  | Priority | Type      |
| ------------------------- | ------------------------------------------------------- | --- | -------- | --------- |
| 7                         | Button component variants + loading states              | 5   | P0       | component |
| 8                         | InputField component + validation states                | 5   | P0       | component |
| 9                         | Badge component: success, warning, error, info, neutral | 3   | P1       | component |
| 10                        | Toggle/Switch component with accessible labeling        | 3   | P1       | component |
| 11                        | Spinner and Skeleton loader atoms for loading states    | 3   | P1       | component |
| 12                        | Typography set (Heading, Text, Label, Code)             | 2   | P1       | component |
| \*(Total: 21 story points | 6 issues)\*                                             |

## Sprint 9C: Design System Molecules & Organisms (Weeks 5-6)

**Goal:** Compose atoms into higher-level UI constructs.

| #                         | Issue Title                                              | SP  | Priority | Type      |
| ------------------------- | -------------------------------------------------------- | --- | -------- | --------- |
| 13                        | Card component: elevation, tone variants, slots          | 5   | P0       | component |
| 14                        | AlertBanner component: dismissible options               | 3   | P1       | component |
| 15                        | FormRow molecule: label, helper text, error display      | 3   | P1       | component |
| 16                        | TopNavigation organism: project context, search, status  | 5   | P0       | component |
| 17                        | SidePanel organism: collapsible nav, progress indicators | 5   | P0       | component |
| 18                        | ModalDialog organism: focus trap, return-focus           | 5   | P0       | component |
| \*(Total: 26 story points | 6 issues)\*                                              |

## Sprint 9D: UX Feedback & Data Components (Weeks 7-8)

**Goal:** Finish complex structures for dashboards and UX feedback.

| #                         | Issue Title                                                  | SP  | Priority | Type      |
| ------------------------- | ------------------------------------------------------------ | --- | -------- | --------- |
| 19                        | Toast notification system: stacking, aria-live               | 5   | P0       | component |
| 20                        | ConfirmDialog: destructive action confirmation               | 3   | P1       | component |
| 21                        | ProgressBar and StepIndicator                                | 3   | P1       | component |
| 22                        | EmptyState and ErrorBoundary components                      | 3   | P1       | component |
| 23                        | DataTable organism: Tanstack Table, sort, filter, pagination | 8   | P0       | component |
| 24                        | MetricCard and ActivityFeed molecules                        | 3   | P1       | component |
| \*(Total: 25 story points | 6 issues)\*                                                  |

## Sprint 9E: Robust API Integration Layer (Weeks 9-10)

**Goal:** Hook into the 30+ endpoints strictly via TanStack Query to isolate state and fix Finding 2 (State Contamination).

| #                         | Issue Title                                                       | SP  | Priority | Type        |
| ------------------------- | ----------------------------------------------------------------- | --- | -------- | ----------- |
| 25                        | Zustand & TanStack Query setup (centralized error/retry policies) | 5   | P0       | setup       |
| 26                        | API hooks: Questionnaires CRUD                                    | 5   | P0       | integration |
| 27                        | API hooks: Decisions full CRUD                                    | 5   | P0       | integration |
| 28                        | API hooks: Milestones full CRUD                                   | 5   | P0       | integration |
| 29                        | API hooks: Orchestrator (status, advance, gates, errors)          | 5   | P0       | integration |
| 30                        | API hooks: Dashboard, Drift, Progress, SSE events                 | 5   | P0       | integration |
| \*(Total: 30 story points | 6 issues)\*                                                       |

## Sprint 9F: Page Assembly — Command Center & Pipeline (Weeks 11-12)

**Goal:** Compose the first functional pages utilizing our components, hooks, and E2E coverage.

| #                         | Issue Title                                     | SP  | Priority | Type |
| ------------------------- | ----------------------------------------------- | --- | -------- | ---- |
| 31                        | App shell route container & layout rendering    | 5   | P0       | page |
| 32                        | Command Center page: project brief input, queue | 5   | P0       | page |
| 33                        | Pipeline page: state machine flow, gates        | 5   | P0       | page |
| 34                        | Help panel overlay & keyboard shortcuts         | 3   | P1       | page |
| \*(Total: 18 story points | 4 issues)\*                                     |

## Sprint 9G: Page Assembly — Questionnaires, Decisions, Dashboard (Weeks 13-14)

**Goal:** Finalize the remaining primary interfaces.

| #                         | Issue Title                                         | SP  | Priority | Type |
| ------------------------- | --------------------------------------------------- | --- | -------- | ---- |
| 35                        | Questionnaires page: sidebar nav, answer forms      | 8   | P0       | page |
| 36                        | Decisions page: filter bar, lifecycle flow          | 8   | P0       | page |
| 37                        | Dashboard Home page: health cards, metric summaries | 8   | P0       | page |
| 38                        | Metrics page: drift detection, KPI charts           | 5   | P1       | page |
| \*(Total: 29 story points | 4 issues)\*                                         |

## Sprint 9H: Polish, i18n, Accessibility & Monolith Sunset (Weeks 15-16)

**Goal:** Quality gates and finalizing the migration. By passing playright tests from Sprint 9A, we safely delete `index.html`.

| #                         | Issue Title                                                                                                        | SP  | Priority | Type        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ | --- | -------- | ----------- |
| 39                        | i18n integration (react-intl/i18next) for en-US, de-DE, fr-FR                                                      | 5   | P1       | integration |
| 40                        | WCAG 2.1 AA audit & keyboard navigation testing                                                                    | 5   | P0       | a11y        |
| 41                        | Production build config & update core webapp `Dockerfile` to serve new UI assets                                   | 5   | P0       | devops      |
| 42                        | Verify Playwright E2E tests pass on new shell, and delete the legacy `index.html` and `design-system.css` monolith | 8   | P0       | sunset      |
| \*(Total: 23 story points | 4 issues)\*                                                                                                        |

# 5. Risks & Proposed Mitigations

| Risk                                          | Impact | Likelihood | Mitigation                                                                                                                   |
| --------------------------------------------- | ------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Global State Mutations (Current Architecture) | High   | High       | Strict enforcement of React data flow with Tanstack Query to decouple from the IIFE scope.                                   |
| Test Invalidation (During Strangler Fig)      | High   | Med        | Sprint 9A mandate: Playwright E2E coverage covers business flows entirely separate from the React vs Vanilla implementation. |
| React learning curve slows velocity           | Med    | Med        | Relying heavily on shadcn/ui pre-built components bounds the cognitive load required to build complex accessible primitives. |
| Missing Visual System Adoption                | Med    | High       | Building Storybook CI/CD deployment ensures devs refer to it natively in Pull Requests.                                      |

# 6. Action Items

1. **Close existing issue #197** as "not planned" in favor of this updated strategy.
2. **Create labels `S9A` through `S9H`** and track all 42 issues in the GitHub Project board.
3. Update project documentation to strictly enforce Playwright test development alongside API endpoint changes.
