---
title: Quick Start
nav_order: 5
description: Get the Agentic SDLC Platform running and create your first project in under 5 minutes.
---

# Quick Start Guide

Get the Agentic SDLC Platform running and create your first project in under 5
minutes.

---

## Prerequisites

| Requirement        | Version                                                                                           | Check           |
| ------------------ | ------------------------------------------------------------------------------------------------- | --------------- |
| **Node.js**        | ≥ 18 (22 recommended)                                                                             | `node -v`       |
| **npm**            | ≥ 9                                                                                               | `npm -v`        |
| **Git**            | any recent version                                                                                | `git --version` |
| **VS Code**        | latest, with [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot) | —               |
| **GitHub account** | with repository access                                                                            | —               |

---

## Step 1: Clone and Install

```bash
git clone https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2.git
cd myAgentic-IT-Project-team-V2
npm install
```

This installs root dependencies. The UI has its own `package.json` under
`src/webapp/ui/` — install those separately:

```bash
cd src/webapp/ui
npm install
cd ../../..
```

## Step 2: Build the UI

The server serves a pre-built React SPA from `src/webapp/ui/dist/`. Build it:

```bash
npm run build
```

This runs two steps:

1. `npm run tokens:build` — generates CSS custom properties from design tokens
2. `npm run build --prefix src/webapp/ui` — builds the React SPA with Vite

## Step 3: Start the Server

```bash
npm start
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) in your browser. You should
see the Command Center dashboard with pipeline view, questionnaire management,
and decision tracking tabs.

## Step 4: Run Tests

```bash
npm test
```

This runs the full Vitest suite. All tests should pass with **0 failures**.

## Step 5: Create Your First Project

### Option A: Via Command Center (recommended)

1. Click **Commands** in the navigation
2. Select **CREATE** mode
3. Enter a project name (e.g., "MyApp")
4. (Optional) Paste your full requirements in the **Project Brief** field
5. Click **Queue Command**
6. Copy the short command and paste it into **Copilot Chat** in VS Code

### Option B: Via Copilot Chat

Open Copilot Chat in VS Code and type:

```
CREATE MyApp
```

## Step 6: Follow the Pipeline

The Orchestrator runs **one agent at a time**:

1. Agent completes its work and saves output to disk
2. You see a summary in chat with a `CONTINUE` prompt
3. Type **CONTINUE** to proceed to the next agent
4. At **phase boundaries**, start a **new Copilot Chat** and type **CONTINUE**

All progress is saved in `session-state.json` — you can safely close and resume
at any time.

## Step 7: Answer Questionnaires

When agents need your input:

1. Open the **Questionnaires** tab in the Command Center
2. Find the questionnaire with unanswered questions
3. Answer the questions (mark as Required or Optional)
4. Run `REEVALUATE` in Copilot Chat for improved results

---

## Docker Workflow

For a containerised setup (includes analytics and translation services):

```bash
# Webapp only (end-users)
docker compose -f infra/docker-compose.webapp.yml up --build

# Full development stack (includes Matomo analytics + Weblate translations)
docker compose -f infra/docker-compose.dev.yml up --build
```

Then open [http://127.0.0.1:3000](http://127.0.0.1:3000).

---

## Other Useful Commands

| Command                    | Purpose                             |
| -------------------------- | ----------------------------------- |
| `npm run lint`             | ESLint + Prettier check             |
| `npm run lint:fix`         | Auto-fix lint issues                |
| `npm run typecheck`        | TypeScript type checking            |
| `npm run test:coverage`    | Tests with coverage reporting       |
| `npm run test:integration` | Integration tests only              |
| `npm run test:smoke`       | Smoke tests only                    |
| `npm run test:e2e`         | Playwright end-to-end tests         |
| `npm run start:mcp`        | Start MCP server standalone (stdio) |
| `npm run format`           | Format all files with Prettier      |

---

## What's Next?

- **[Architecture Overview](architecture.md)** — Layer diagram, data flow, module inventory
- **[MCP Setup Guide](mcp-setup.md)** — Configure MCP server for your IDE
- **[User Manual](user-manual.md)** — Comprehensive guide to all features
- **[Technical Manual](technical-manual.md)** — Architecture and API reference
- **[Operating Handbook](operating-handbook.md)** — Monitoring, troubleshooting,
  recovery
