# myAgentic-IT-Project-team – End-to-End Software Solution Creation & Audit

[![CI](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/actions/workflows/ci.yml/badge.svg)](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/actions/workflows/ci.yml)
[![CI Pipeline](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/actions/workflows/ci-pipeline.yml/badge.svg)](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/actions/workflows/ci-pipeline.yml)
[![Storybook CI](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/actions/workflows/storybook.yml/badge.svg)](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/actions/workflows/storybook.yml)
[![Coverage: 75%+ enforced](https://img.shields.io/badge/Coverage-75%25%2B%20enforced-brightgreen.svg)](#testing)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js ≥ 18](https://img.shields.io/badge/Node.js-%E2%89%A518-green.svg)](https://nodejs.org/)
[![ESLint: 0 errors](https://img.shields.io/badge/ESLint-0%20errors-brightgreen.svg)](#code-quality)

A **multi-agent system** of 38 specialized AI agents that creates complete,
production-ready software solutions — or audits existing ones — through a
structured four-phase analysis followed by supervised sprint-by-sprint
implementation (human-in-the-loop, CONTINUE-to-proceed).

> **Quick result:** A full Phase 1–4 cycle that takes 7–10 weeks manually
> completes in **5–10 working days** with this agentic team, requiring only
> **7–12 hours of active attention** from you.

---

## Features

- **38 specialized AI agents** — Business Analyst, Software Architect, UX
  Designer, Brand Strategist and 34 more
- **Dual-mode operation** — CREATE new solutions or AUDIT existing software
- **4-phase analysis pipeline** — Requirements → Architecture → UX/UI → Brand &
  Growth
- **Supervised sprint execution** — Phase 5 implements story-by-story with human
  approval gates, testing, review, and KPI tracking
- **Command Center web UI** — Visual pipeline view, questionnaire management,
  and decision tracking
- **Built-in quality gates** — Critic + Risk agents validate every phase and
  sprint
- **Mutation audit trail** — Append-only JSON Lines log of all data mutations
- **Resumable sessions** — Checkpoint-and-yield design survives conversation
  resets
- **Accessibility baseline** — WCAG 2.1 AA compliant web UI with skip-nav,
  aria-live regions, keyboard navigation
- **Minimal runtime dependencies** — Node.js HTTP server with MCP SDK, schema
  validation, and TypeScript runner. No Express or web framework dependency

---

## Technology Stack

| Layer      | Technology                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------- |
| Runtime    | Node.js ≥ 18 (minimal runtime dependencies: MCP SDK, Ajv, tsx)                                    |
| Server     | Native `http` module, localhost only (127.0.0.1:3000)                                             |
| MCP Server | [Model Context Protocol](https://modelcontextprotocol.io/) via stdio transport                    |
| Data       | File-based JSON/Markdown storage with atomic writes                                               |
| Testing    | [Vitest 4](https://vitest.dev/) (2,420+ tests across 96 files)                                    |
| Linting    | [ESLint](https://eslint.org/) (flat config, `eslint.config.mjs`)                                  |
| AI Agents  | [GitHub Copilot](https://github.com/features/copilot) agents in VS Code, Visual Studio, JetBrains |
| License    | MIT                                                                                               |

---

## Prerequisites

| Requirement        | Description                                                                |
| ------------------ | -------------------------------------------------------------------------- |
| **GitHub account** | With repository access (the system creates a Kanban project automatically) |
| **GitHub Copilot** | Active subscription (Individual, Business, or Enterprise)                  |
| **VS Code**        | Agents run as Copilot Agents in the VS Code editor                         |
| **Git**            | Local installation for repository management                               |
| **Node.js ≥ 18**   | For the Command Center web UI and MCP server                               |

---

## Quick Start

**1. Open this workspace in VS Code** with Copilot enabled.

**2. Install and build:**

```bash
npm install
cd src/webapp/ui && npm install && cd ../../..
npm run build
```

**3. Launch the Command Center web UI:**

```bash
npm start
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) in your browser.

Containerized run (TECH-08):

```bash
# Webapp only (end-users)
docker compose -f infra/docker-compose.webapp.yml up --build

# Full stack (developers — includes analytics + translations)
docker compose -f infra/docker-compose.dev.yml up --build
```

Then open [http://127.0.0.1:3000](http://127.0.0.1:3000).

**4. Start a project** — in the Command Center:

- Select **CREATE** (or **AUDIT** for existing software)
- Enter a project name
- Optionally paste your full requirements in the **Project Brief** field (saved
  as a file, not sent to chat)
- Click **Queue Command** and paste the short command into Copilot Chat

Alternatively, type directly in Copilot Chat:

```text
CREATE MyProject
```

**5. Follow the agent pipeline:**

- The Orchestrator runs **one agent at a time** — type **CONTINUE** after each
- At **phase boundaries**, start a **new Copilot Chat** and type **CONTINUE**
  (all progress is preserved)
- Critic + Risk Agents validate every phase and every sprint automatically
- Track progress in the Command Center pipeline view

**6. Answer questionnaires & decisions** — when agents need your input,
questions appear in the **Questionnaires** tab. Use the **Decisions** tab to
create decisions or answer open questions. Answer them, then run `REEVALUATE`
for improved results.

---

## MCP Server (Cross-IDE Integration)

The system includes an **MCP (Model Context Protocol) server** that exposes the
Command Center functionality to any MCP-compatible IDE — VS Code, Visual Studio,
JetBrains, and others. See **[docs/mcp-setup.md](docs/mcp-setup.md)** for the
full setup guide and troubleshooting.

### Setup

**VS Code** — The `.vscode/mcp.json` configuration is included. The MCP server
appears automatically in the Copilot tools panel.

**Other IDEs** — Configure an MCP stdio server with:

```json
{
  "command": "node",
  "args": ["--import", "tsx", "src/webapp/mcp-server.ts"]
}
```

### Available MCP Tools

| Tool                  | Description                                                 |
| --------------------- | ----------------------------------------------------------- |
| `get_project_status`  | Session state, pipeline progress, and command queue summary |
| `get_progress`        | Detailed phase completion and current agent info            |
| `list_questionnaires` | All questionnaires with completion statistics               |
| `get_questionnaire`   | Full contents of a specific questionnaire                   |
| `save_answers`        | Save answers to questionnaire questions                     |
| `list_decisions`      | All decisions grouped by status                             |
| `create_decision`     | Create a new open question or operational decision          |
| `answer_decision`     | Answer an open question                                     |
| `decide_question`     | Finalize an answered question (move to decided)             |
| `queue_command`       | Queue a command for the orchestrator                        |
| `get_command_queue`   | Full command queue history                                  |
| `get_help`            | Help topics and documentation                               |
| `get_audit_log`       | Recent mutation audit trail entries                         |

### MCP Resources

| URI                       | Description                   |
| ------------------------- | ----------------------------- |
| `agentic://session-state` | Current session state as JSON |
| `agentic://decisions`     | All decisions as JSON         |
| `agentic://command-queue` | Command queue as JSON         |

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

## Project Structure

```
.vscode/
  mcp.json                    ← MCP server configuration for VS Code
.github/
  copilot-instructions.md     ← System instructions (Orchestrator entry point)
  workflows/                  ← CI/CD pipeline definitions

platform/
  engine/                     ← Domain-agnostic pipeline engine (state machine, dispatcher, gate validator)
  schema/                     ← Canonical schema definitions (agents, flows, tools)

templates/sdlc/
  agents/                     ← 38 agent skill files (00-orchestrator … 37-scope-change-agent)
  contracts/                  ← Output contracts per deliverable type
  guardrails/                 ← Domain guardrails (00-global … 09-questionnaire)
  playbooks/                  ← Process playbooks (CREATE + AUDIT)

src/webapp/
  server.ts                   ← Native http server entrypoint
  routes/                     ← API route handlers
  ui/                         ← React single-page web UI
  brand/                      ← Design tokens + brand guidelines

tests/
  unit/                       ← Unit tests (models, cache, schemas, engine, etc.)
  integration/                ← Integration tests (API, SSE, store, regression)

infra/                        ← Docker files, Compose configs, Nginx configs
scripts/                      ← Build & maintenance scripts
docs/                         ← GitHub Pages site: user manual, technical manual, data dictionary
BusinessDocs/                 ← Questionnaires + official business documents (generated per phase)
Workitems/                    ← Isolated workspaces per FEATURE command (generated on demand)
```

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

## How the Agentic Team Works

The system is designed to be **reliable and resumable** even for large, complex
projects. Three key design principles ensure stability:

### Project Brief as File

When launching a CREATE or AUDIT command via the Command Center, you can paste
your full project requirements in the **Project Brief** field. This is saved to
`BusinessDocs/project-brief.md` — a file the Onboarding Agent reads from disk.
The chat command stays short, preventing context overload and network timeouts.

### One Agent at a Time (Checkpoint-and-Yield)

The Orchestrator runs exactly **one agent per conversation turn**. After each
agent completes, its output is saved to disk, `session-state.json` is updated,
and the Orchestrator yields — prompting you to type **CONTINUE**. This prevents
memory overload and makes the entire process resumable. If anything fails, just
type CONTINUE to pick up where you left off.

### Fresh Conversations per Phase

At phase boundaries (after Critic + Risk validation passes), the Orchestrator
instructs you to **start a new Copilot Chat conversation** and type
**CONTINUE**. This resets accumulated conversation history — preventing "JS heap
out of memory" crashes — while `session-state.json` preserves all progress. The
Command Center pipeline view is unaffected by conversation resets.

---

## Architecture

See **[docs/architecture.md](docs/architecture.md)** for the full layer diagram,
data flow, MCP integration, and module inventory.

## Documentation

For the full guide including all agents, FAQ, troubleshooting, and ground rules,
see:

**[`docs/README.md`](docs/README.md)**

---

## Testing

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Watch mode (re-run on file changes)
npm run test:watch
```

The test suite includes **2,420+ tests** across 96 files (Vitest) with
coverage enforcement at **75%+**:

- **Unit tests (`tests/unit/`)** — Models, sanitization, cache, schemas,
  audit trail, file locking, MCP server, engine, state machine, validators
- **Integration tests (`tests/integration/`)** — API endpoints, store,
  regression suite
- **E2E tests (`tests/e2e/`)** — Playwright browser tests
- **Smoke tests (`tests/smoke/`)** — Quick sanity checks
- **Doc-drift tests (`tests/unit/doc-drift.test.js`)** — Catches stale
  `server.js` refs, unqualified "zero dependency" claims, positioning language
  drift, and Dockerfile/Playwright health endpoint consistency

## Code Quality

```bash
npm run lint
```

Single ESLint flat config (`eslint.config.mjs`) with rules including
`complexity` max 8, `no-unused-vars`, `no-var`, `prefer-const`, `eqeqeq`,
`no-eval`, `no-implied-eval`.

Current status: **0 errors, 0 warnings**.

---

## Community

- **[GitHub Discussions](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/discussions)**
  — Ask questions, share ideas, and show what you've built
- **[Issues](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/issues)**
  — Bug reports and feature requests

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding standards,
and PR process.

---

## License

[MIT](LICENSE) — Copyright (c) 2026 Robert Agterhuis
