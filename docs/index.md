---
layout: default
title: Home
nav_order: 1
description:
  Documentation hub for the multi-agent system for end-to-end software solution
  creation.
permalink: /
---

# myAgentic-IT-Project-team

A multi-agent system of 38+ specialized AI agents that creates complete,
production-ready software solutions — or audits existing ones — through a
structured four-phase analysis followed by supervised sprint-by-sprint
implementation.

---

## Documentation Areas

| Area                                       | Contents                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------- |
| [Getting Started](getting-started/)        | Quick start, user manual, mode guide, pilot guide, MCP setup                    |
| [Architecture](architecture/)              | Architecture overview and architectural evolution                               |
| [Reference](reference/)                    | Technical manual, data dictionary, glossary, file system reference, agent index |
| [Operations](operations/)                  | Operating handbook, release checklist, GA definition, CI review, privacy policy |
| [Contributing Guide](contributing)         | Development workflow, standards, and PR process                                 |
| [API Reference](api/)                      | Endpoint contracts and examples                                                 |
| [Security](security/)                      | Security design, data inventory, and privacy/security guidance                  |
| [Help](help/)                              | Task-oriented help topics                                                       |
| [UX](ux/)                                  | UX documentation and design-system material                                     |
| [Brand Guidelines](brand/brand-guidelines) | Colors, typography, design tokens, voice & tone                                 |

---

## Quick Start

### Prerequisites

- **VS Code** with
  [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot)
- **Node.js ≥ 18** — [download here](https://nodejs.org/)
- **Git** — [download here](https://git-scm.com/)

### Install & Launch

```bash
npm install
cd src/webapp/ui && npm install && cd ../../..
npm run build
npm start
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) — the server runs locally,
no data leaves your machine.

### Your First Project

1. Open the **Command Center** tab.
2. Click **CREATE** to start a new solution, or **AUDIT** to analyze existing
   software.
3. Enter a project name and paste your requirements.
4. Click **Queue Command** — the command is copied to your clipboard.
5. Paste into **Copilot Chat** in VS Code.

Type **CONTINUE** after each agent completes to advance the pipeline.

---

## Technology Stack

| Layer     | Technology                                                             |
| --------- | ---------------------------------------------------------------------- |
| Runtime   | Node.js ≥ 18                                                           |
| Server    | Fastify 5 with plugin architecture (cors, rate-limit, static, swagger) |
| Auth      | GitHub OAuth + session cookies + RBAC                                  |
| Queue     | BullMQ (optional Redis-backed, graceful degradation to sync)           |
| Data      | File-based JSON/Markdown + better-sqlite3 + optional Redis             |
| MCP       | Model Context Protocol via stdio transport                             |
| Testing   | Vitest (large automated test suite, coverage 75%+ enforced)            |
| Linting   | ESLint flat config (0 errors)                                          |
| AI Agents | GitHub Copilot agents in VS Code, Visual Studio, JetBrains             |

---

## Available Commands

| Command                                          | Purpose                                             |
| ------------------------------------------------ | --------------------------------------------------- |
| `CREATE [project]`                               | Build a complete new software solution              |
| `AUDIT [project]`                                | Comprehensive analysis of existing software         |
| `CREATE BUSINESS\|TECH\|UX\|MARKETING [project]` | Partial run per discipline                          |
| `CREATE SYNTHESIS`                               | Merge previously completed partial designs          |
| `FEATURE [name]: [description]`                  | Add new functionality (isolated full cycle)         |
| `REEVALUATE [scope]`                             | Reassess after incremental changes                  |
| `SCOPE CHANGE [DIMENSION]: [description]`        | Handle fundamental premise changes                  |
| `HOTFIX [description]`                           | Critical production fix (bypasses Sprint Gate)      |
| `REFRESH ONBOARDING`                             | Re-scan codebase without re-asking intake questions |

---

## Key Concepts

- **Phases 1–4** produce Analysis → Recommendations → Sprint Plan → Guardrails
  per discipline
- **Phase 5** implements the solution sprint-by-sprint with automated testing,
  PR review, and KPI tracking
- **Critic + Risk Agents** validate every phase before handoff
- **`decisions.md`** is your direct communication channel — `DECIDED` entries
  become hard constraints; `HIGH` + `OPEN` entries block sprint start
- **Questionnaires** are generated for missing data — answer them, then
  `REEVALUATE` for improved results
- **All findings cite sources** — file, line number, or document reference
  (Anti-Hallucination Protocol)

---

## How It Works

The system uses specialized AI agents organized into phases:

1. **Phase 1 — Requirements & Strategy** — Business Analyst, Domain Expert,
   Sales Strategist, Financial Analyst, Product Manager
2. **Phase 2 — Architecture & Design** — Software Architect, Senior Developer,
   DevOps Engineer, Security Architect, Data Architect, Legal Counsel
3. **Phase 3 — Experience Design** — UX Researcher, UX Designer, UI Designer,
   Accessibility Specialist, Content Strategist, Localization Specialist
4. **Phase 4 — Brand & Growth** — Brand Strategist, Growth Marketer, CRO
   Specialist
5. **Synthesis** — Cross-team integration and final reports
6. **Phase 5 — Implementation** — Sprint-by-sprint coding with automated
   testing, PR review, and KPI tracking

Each phase produces **Analysis → Recommendations → Sprint Plan → Guardrails**,
validated by Critic and Risk agents before handoff.

---

## Links

- [GitHub Repository](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team)
- [Security Policy](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team/blob/main/SECURITY.md)
- [License (MIT)](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team/blob/main/LICENSE)
