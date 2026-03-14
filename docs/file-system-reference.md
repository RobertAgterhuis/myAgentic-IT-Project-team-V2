---
layout: default
title: File System Reference
nav_order: 8
description:
  Complete map of the repository — what each directory and key file does, which
  agents write where, and what's safe to modify.
---

# File System Reference

> Complete map of the repository — what each directory and key file does, which
> agents write where, and what's safe to modify.

---

## Top-level structure

```
myAgentic-IT-Project-team/
├── .github/                    ← CI workflows, issue templates, Copilot instructions
├── .husky/                     ← Git hooks (pre-commit)
├── templates/                  ← Template packs (SDLC agents, contracts, guardrails, playbooks)
├── BusinessDocs/               ← Project-specific business data (session, decisions, phases, brand, synthesis, metrics, retrospectives)
├── data/                       ← Runtime data (milestones.json)
├── docs/                       ← Infrastructure docs (contracts, guardrails, playbooks, templates, help, api, security)
├── infra/                      ← Docker files, Compose configs, Nginx configs
├── platform/                   ← Platform schema definitions (agents, flows, tools)
├── scripts/                    ← Build & maintenance scripts
├── src/                        ← Application source code
├── tests/                      ← All test files (unit, integration, e2e, smoke)
├── Workitems/                  ← Feature-specific workspaces (created by FEATURE command)
├── CONTRIBUTING.md             ← Contribution guidelines
├── LICENSE                     ← License file
├── README.md                   ← Project README
└── SECURITY.md                 ← Security policy
```

---

## `.github/` — CI & repository configuration

| File                       | Purpose                                  |
| -------------------------- | ---------------------------------------- |
| `CODEOWNERS`               | Code ownership rules for PR reviews      |
| `copilot-instructions.md`  | Copilot agent instructions for this repo |
| `dependabot.yml`           | Dependabot configuration                 |
| `PULL_REQUEST_TEMPLATE.md` | PR template                              |

### Issue templates — `.github/ISSUE_TEMPLATE/`

GitHub issue templates for bugs, features, stories, and tasks.

### Workflows — `.github/workflows/`

| File                             | Purpose                                 |
| -------------------------------- | --------------------------------------- |
| `ci.yml`                         | Vitest + npm audit + typecheck          |
| `ci-pipeline.yml`                | Jest + ESLint + Prettier                |
| `generate-and-validate.yml`      | Platform schema generation + validation |
| `my-agentic-team-board-sync.yml` | GitHub Project board synchronization    |
| `release.yml`                    | Release workflow                        |
| `storybook.yml`                  | Storybook build + deploy                |

---

## `templates/sdlc/agents/` — Agent skill files

| File pattern                                                | Purpose                             | Modified by             |
| ----------------------------------------------------------- | ----------------------------------- | ----------------------- |
| `00-orchestrator.md`                                        | Orchestrator rules and flow         | System maintainers only |
| `01-business-analyst.md` through `37-scope-change-agent.md` | One skill file per agent (38 total) | System maintainers only |

These files define agent behavior. **Do not modify** unless you're changing the
system itself.

---

## `infra/` — Docker & container infrastructure

| File                           | Purpose                                           | Modified by  |
| ------------------------------ | ------------------------------------------------- | ------------ |
| `Dockerfile`                   | Multi-stage production build (Node.js + React UI) | DevOps / SWE |
| `Dockerfile.storybook`         | Storybook design system build (nginx)             | DevOps / SWE |
| `docker-compose.yml`           | Base webapp service definition                    | DevOps / SWE |
| `docker-compose.webapp.yml`    | End-user compose (webapp only, port 3000)         | DevOps / SWE |
| `docker-compose.dev.yml`       | Full-stack developer compose (all 7 services)     | DevOps / SWE |
| `docker-compose.analytics.yml` | Matomo analytics stack (3 services, port 8080)    | DevOps / SWE |
| `docker-compose.weblate.yml`   | Weblate TMS stack (3 services, port 8081)         | DevOps / SWE |
| `matomo-nginx.conf`            | Nginx reverse proxy config for Matomo FPM         | DevOps / SWE |

> **Note:** `.dockerignore` remains in the repository root (Docker reads it from
> the build context root).

---

## `docs/` — Documentation & system configuration

### Root files

| Path                       | Purpose                                            | Written by          | Safe to edit? |
| -------------------------- | -------------------------------------------------- | ------------------- | ------------- |
| `_config.yml`              | Jekyll / GitHub Pages config                       | System maintainers  | Yes           |
| `agent-index.md`           | Lookup table for all skills, guardrails, contracts | System maintainers  | No            |
| `contributing.md`          | Developer contribution guide                       | System maintainers  | Yes           |
| `data-dictionary.md`       | Data entity catalog                                | System maintainers  | Yes           |
| `domain-glossary.md`       | Domain terminology reference                       | System maintainers  | Yes           |
| `file-system-reference.md` | This file                                          | System maintainers  | Yes           |
| `index.md`                 | GitHub Pages landing page                          | System maintainers  | Yes           |
| `mode-guide.md`            | CREATE vs AUDIT mode guidance                      | System maintainers  | No            |
| `privacy-policy.md`        | Privacy policy                                     | System maintainers  | Yes           |
| `quick-start.md`           | Getting started guide                              | System maintainers  | Yes           |
| `README.md`                | Overview of the docs/ structure                    | System maintainers  | No            |
| `technical-manual.md`      | API reference + architecture                       | Documentation Agent | After sprint  |
| `user-manual.md`           | User guide                                         | Documentation Agent | After sprint  |

### Contracts — `templates/sdlc/contracts/`

25 contract files defining the input/output format for every agent type. These
are **agent-facing specifications** — they tell each agent what to produce and
what to expect as input.

Key contracts:

| File                                | Defines                                        |
| ----------------------------------- | ---------------------------------------------- |
| `session-state-contract.md`         | Session state format, lifecycle, state machine |
| `human-escalation-protocol.md`      | How agents ask you questions                   |
| `implementation-output-contract.md` | What the Implementation Agent produces         |
| `test-output-contract.md`           | Test report format                             |
| `pr-review-output-contract.md`      | PR review and sprint completion format         |
| `tooling-contract.md`               | Required tools and verification                |

**Do not modify** contracts unless you're changing agent behavior.

### Decisions — `BusinessDocs/decisions/`

| Path                                 | Purpose                                    | Written by                  | Safe to edit?                          |
| ------------------------------------ | ------------------------------------------ | --------------------------- | -------------------------------------- |
| `BusinessDocs/decisions.md`          | Decision index (open questions + registry) | You + web UI + Orchestrator | **Yes**                                |
| `BusinessDocs/decisions/*.md`        | Category files (technology stacks)         | You + web UI + Orchestrator | **Yes** (header status, decision rows) |
| `BusinessDocs/analytics-events.json` | Event tracking definitions                 | System maintainers          | No                                     |

This is your primary communication channel with the agent team. See
`docs/help/decisions.md` for details.

### Guardrails — `templates/sdlc/guardrails/`

11 guardrail files that define rules agents must follow:

| File                              | Scope                        |
| --------------------------------- | ---------------------------- |
| `00-global-guardrails.md`         | Universal rules (all agents) |
| `01-business-guardrails.md`       | Phase 1 agents               |
| `02-architecture-guardrails.md`   | Phase 2 agents               |
| `03-security-guardrails.md`       | Security constraints         |
| `04-ux-guardrails.md`             | Phase 3 agents               |
| `05-marketing-guardrails.md`      | Phase 4 agents               |
| `06-implementation-guardrails.md` | Phase 5 agents               |
| `07-legal-guardrails.md`          | Legal constraints            |
| `08-content-guardrails.md`        | Content rules                |
| `09-questionnaire-guardrails.md`  | Questionnaire formatting     |

**Do not modify** unless you're changing system rules.

### Templates — `docs/templates/`

Template files used by agents to format their outputs (analysis,
recommendations, sprint plan, guardrails). **Do not modify.**

### Playbooks — `templates/sdlc/playbooks/`

| File                                    | Purpose                  |
| --------------------------------------- | ------------------------ |
| `software-creation-playbook.md`         | Full CREATE mode process |
| `commercial-software-audit-playbook.md` | AUDIT mode process       |

Agent-facing process definitions. **Do not modify** unless changing the system
flow.

### Help — `docs/help/`

16 help pages for the web UI (commands, decisions, agents, sprints, keyboard
shortcuts, troubleshooting, etc.). Written by System maintainers + Documentation
Agent. Includes `decisions-architecture.md` (decision system technical reference).

### Session state — `BusinessDocs/session/`

| File                      | Purpose                          | Written by                      | Safe to edit?                     |
| ------------------------- | -------------------------------- | ------------------------------- | --------------------------------- |
| `session-state.json`      | Current cycle progress           | Orchestrator + Onboarding Agent | **Carefully** (for recovery only) |
| `command-queue.json`      | Queued command from web UI       | Web UI Command Center           | Transient — auto-consumed         |
| `reevaluate-trigger.json` | Reevaluation trigger from web UI | Web UI Decisions tab            | Transient — auto-consumed         |
| `README.md`               | Explains the session directory   | —                               | No                                |

### API — `docs/api/`

| File                | Purpose                  |
| ------------------- | ------------------------ |
| `milestones-api.md` | Milestones API reference |

### Platform brand assets — `src/webapp/brand/`

These are the **platform's own** brand assets, used by the build pipeline.

| File                     | Purpose                                        | Written by                                        |
| ------------------------ | ---------------------------------------------- | ------------------------------------------------- |
| `brand-guidelines.md`    | Color palette, typography, spacing, logo usage | Brand Strategist (Phase 4) + Brand & Assets Agent |
| `content-style-guide.md` | Tone of voice, writing rules                   | Content Strategist (Phase 3)                      |
| `design-tokens.json`     | Machine-readable design tokens                 | Brand & Assets Agent (Canva or manual)            |

### Solution brand assets — `BusinessDocs/brand/`

Populated by Agent 30 during solution creation. Empty in a fresh checkout.

### GitHub integration — `docs/github/`

| File                     | Purpose                          |
| ------------------------ | -------------------------------- |
| `project-board-setup.md` | Board configuration guide        |
| `sync-report-*.md`       | Board sync reports (timestamped) |

### Onboarding — `BusinessDocs/onboarding/`

| File                   | Purpose                       | Written by       |
| ---------------------- | ----------------------------- | ---------------- |
| `onboarding-output.md` | Onboarding intake + scan data | Onboarding Agent |

### Phase outputs — `BusinessDocs/phase-1/` through `BusinessDocs/phase-5/`

| Directory               | Purpose                                                   |
| ----------------------- | --------------------------------------------------------- |
| `BusinessDocs/phase-1/` | Phase 1 (Requirements & Strategy) analysis outputs        |
| `BusinessDocs/phase-2/` | Phase 2 (Architecture & Design) analysis outputs          |
| `BusinessDocs/phase-3/` | Phase 3 (Experience Design) analysis outputs              |
| `BusinessDocs/phase-4/` | Phase 4 (Brand & Growth) analysis outputs                 |
| `BusinessDocs/phase-5/` | Phase 5 (Implementation) sprint plans, completion reports |

### Security — `docs/security/`

| File                          | Purpose                                     | Written by                   |
| ----------------------------- | ------------------------------------------- | ---------------------------- |
| `data-inventory.md`           | Data classification and inventory           | Security Architect (Phase 2) |
| `security-design.md`          | Security architecture design                | Security Architect (Phase 2) |
| `security-handoff-context.md` | Security constraints for all Phase 5 agents | Security Architect (Phase 2) |

### Storybook — `BusinessDocs/storybook/`

| File                     | Purpose                              | Written by      |
| ------------------------ | ------------------------------------ | --------------- |
| `component-inventory.md` | UI component library + a11y baseline | Storybook Agent |

Generated after Phase 4, before Synthesis.

### Synthesis — `BusinessDocs/synthesis/`

| File                           | Purpose                                          | Written by      |
| ------------------------------ | ------------------------------------------------ | --------------- |
| `final-report-master.md`       | Executive summary, heatmap, risk matrix, roadmap | Synthesis Agent |
| `final-report-business.md`     | Business discipline report                       | Synthesis Agent |
| `final-report-tech.md`         | Tech discipline report                           | Synthesis Agent |
| `final-report-ux.md`           | UX discipline report                             | Synthesis Agent |
| `final-report-marketing.md`    | Marketing discipline report                      | Synthesis Agent |
| `cross-team-blocker-matrix.md` | All cross-team dependencies                      | Synthesis Agent |

You must **APPROVE** all 6 before Phase 5 starts. These are read-only after
approval.

### Audit trail — `BusinessDocs/audit/`

| File              | Purpose                               |
| ----------------- | ------------------------------------- |
| `audit-log.jsonl` | Append-only log of all system actions |

Auto-generated. **Do not modify.**

### Metrics — `BusinessDocs/metrics/`

| File                           | Purpose                           | Written by |
| ------------------------------ | --------------------------------- | ---------- |
| `runtime-metrics.json`         | Runtime metrics data              | Server     |
| `sprint-[SP-N]-kpi-log.md`     | KPI log per sprint (markdown)     | KPI Agent  |
| `sprint-[SP-N]-kpi-final.json` | KPI final measurements per sprint | KPI Agent  |

### Retrospectives — `BusinessDocs/retrospectives/`

| File                             | Purpose                                             | Written by          |
| -------------------------------- | --------------------------------------------------- | ------------------- |
| `sprint-[SP-N]-retrospective.md` | Per-sprint retrospective (immutable)                | Retrospective Agent |
| `lessons-learned.md`             | Cumulative lessons, top-3 injected into next sprint | Retrospective Agent |
| `velocity-log.json`              | Machine-readable velocity data                      | Retrospective Agent |

---

## `BusinessDocs/` — Project data

| Path                     | Purpose                                                        | Written by                           | Safe to edit? |
| ------------------------ | -------------------------------------------------------------- | ------------------------------------ | ------------- |
| `project-brief.md`       | Your project requirements (saved from Command Center)          | You (via web UI)                     | **Yes**       |
| `Phase1-Business/`       | Phase 1 analysis outputs + questionnaires                      | Phase 1 agents + Questionnaire Agent | Review only   |
| `Phase2-Tech/`           | Phase 2 analysis outputs + questionnaires                      | Phase 2 agents + Questionnaire Agent | Review only   |
| `Phase3-UX/`             | Phase 3 analysis outputs + questionnaires                      | Phase 3 agents + Questionnaire Agent | Review only   |
| `Phase4-Marketing/`      | Phase 4 analysis outputs + questionnaires                      | Phase 4 agents + Questionnaire Agent | Review only   |
| `OfficialDocuments/`     | Consolidated documents (product vision, financial model, etc.) | Questionnaire Agent                  | Review only   |
| `questionnaire-index.md` | Master index of all questionnaires and answer status           | Questionnaire Agent                  | Answers only  |

### Questionnaire structure per phase:

```
BusinessDocs/Phase[N]-[Discipline]/
├── Questionnaires/
│   ├── [agent-name]-questionnaire.md     ← Questions for you
│   └── ...
├── [agent-name]-analysis.md              ← Agent output
├── [agent-name]-recommendations.md       ← Agent output
├── [agent-name]-sprintplan.md            ← Agent output
└── [agent-name]-guardrails.md            ← Agent output
```

---

## `Workitems/` — Feature workspaces (on demand)

Created by the `FEATURE [name]` command. Each feature gets an isolated
directory:

```
Workitems/
└── [FEATURENAME]/
    ├── 00-feature-request.md          ← Feature definition
    ├── Phase1-Business/               ← Mini-cycle outputs
    ├── Phase2-Tech/
    ├── Phase3-UX/
    ├── Phase4-Marketing/
    └── sprint-plan.md                 ← Feature-specific sprint plan
```

Feature workspaces have their own sprint IDs and Sprint Gate, independent of the
main project cycle.

---

## `src/webapp/` — Web UI application

### Root modules

| File                        | Purpose                       |
| --------------------------- | ----------------------------- |
| `server.js`                 | Express server (API + static) |
| `mcp-server.js`             | MCP server for Copilot        |
| `store.js`                  | State management              |
| `schemas.js`                | Validation schemas            |
| `models.js`                 | Data models                   |
| `audit.js`                  | Audit logging                 |
| `cache.js`                  | Server-side caching           |
| `drift-detector.js`         | Configuration drift detection |
| `file-lock.js`              | File locking utility          |
| `middleware.js`             | Express middleware            |
| `session-state-resolver.js` | Session state resolution      |
| `strings.js`                | UI string constants           |
| `start.ps1`                 | PowerShell startup script     |

### Locales — `src/webapp/locales/`

i18n translation files: `en-US/`, `de-DE/`, `fr-FR/` — each with
`ui-labels.json`, `validation-messages.json`, `doc-snippets.json`.

### Routes — `src/webapp/routes/`

11 route modules (commands, dashboard, decisions, drift, metrics-dashboard,
milestones, misc, orchestrator, progress, questionnaires, subscribe).

### Orchestrator engine — `platform/engine/`

12 modules: agent-schema, cli, dispatcher, engine, flow-loader, flow-schema,
flows.yaml, gate-validator, sprint-gate, state-machine, state-persistence,
tool-schema.

### Other subdirectories

| Directory          | Purpose                                |
| ------------------ | -------------------------------------- |
| `email-templates/` | Email HTML templates (7 templates)     |
| `social-cards/`    | OG/Twitter social card templates       |
| `types/`           | TypeScript type definitions            |
| `utils/`           | Utilities (errors.js, secret-utils.js) |
| `ui/`              | Vite + React frontend (see below)      |

### Frontend — `src/webapp/ui/`

Vite-based React application with Storybook. Key structure:

```
src/webapp/ui/
├── src/
│   ├── components/     ← UI components (layout, help-panel, ui/)
│   ├── hooks/          ← React hooks (18 files)
│   ├── lib/            ← Library utilities (9 files)
│   ├── pages/          ← Page components (command-center, dashboard, decisions, metrics, pipeline, questionnaires)
│   ├── stores/         ← State stores (3 files)
│   └── test/           ← UI test setup (5 files)
├── .storybook/         ← Storybook config
├── dist/               ← Production build output
└── storybook-static/   ← Storybook static build
```

---

## `tests/` — All tests

### Unit tests — `tests/unit/` (48 files)

All unit tests live here. Run with Vitest (`npm run test:vitest`) or Jest
(`npx jest --ci` for the Jest subset).

Key test files:

| File pattern              | What it tests                         |
| ------------------------- | ------------------------------------- |
| `routes-*.test.js`        | Route handler tests (6 route modules) |
| `server.test.js`          | Server startup and configuration      |
| `schemas.test.js`         | Schema validation                     |
| `models.test.js`          | Data model logic                      |
| `engine.test.js`          | Orchestrator engine                   |
| `state-*.test.js`         | State machine and persistence         |
| `governance-docs.test.js` | Governance document structure         |

### Integration tests — `tests/integration/` (10 files)

API integration tests, store-cache tests, observability tests, regression suite.

### E2E tests — `tests/e2e/` (6 files)

Playwright browser tests (dashboard, decisions, metrics, questionnaires,
accessibility).

### Smoke tests — `tests/smoke/` (2 files)

Quick smoke tests (landing page, create pipeline).

---

## Other root directories

| Directory   | Purpose                                               |
| ----------- | ----------------------------------------------------- |
| `data/`     | Runtime data (`milestones.json`)                      |
| `platform/` | Platform schema definitions (`platform/schema/`)      |
| `scripts/`  | Build and maintenance scripts (7 files)               |
| `.husky/`   | Git hooks (pre-commit: lint-staged + fast unit tests) |
| `.vscode/`  | VS Code workspace settings                            |

---

## What's safe to delete?

| Path                                               | Safe to delete? | Consequence                                       |
| -------------------------------------------------- | --------------- | ------------------------------------------------- |
| `BusinessDocs/session/session-state.json`          | Yes             | Loses current progress; can start fresh           |
| `BusinessDocs/session/command-queue.json`          | Yes             | Loses queued (unconsumed) command                 |
| `BusinessDocs/session/reevaluate-trigger.json`     | Yes             | Cancels pending reevaluation                      |
| `BusinessDocs/` contents                           | With caution    | Loses all phase outputs and questionnaire answers |
| `BusinessDocs/synthesis/` contents                 | With caution    | Must re-run Synthesis Agent                       |
| Anything in `templates/sdlc/agents/`, `templates/sdlc/contracts/`, `templates/sdlc/guardrails/` | **No** | Breaks agent behavior |
