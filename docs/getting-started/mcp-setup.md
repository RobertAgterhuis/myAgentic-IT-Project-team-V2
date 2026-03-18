---
title: MCP Server Setup
parent: Getting Started
nav_order: 5
permalink: /mcp-setup/
description: Configure the MCP server for VS Code, Visual Studio, JetBrains, and other MCP-compatible IDEs.
---

# MCP Server Setup Guide

The Agentic SDLC Platform includes an **MCP (Model Context Protocol) server**
that exposes Command Center functionality directly to your IDE. This lets
Copilot (or any MCP-compatible AI assistant) read project status, manage
questionnaires, create decisions, queue commands, and more — without leaving the
editor.

---

## VS Code Setup

The repository ships with a pre-configured `.vscode/mcp.json`. No manual setup
is needed:

1. Open this workspace in VS Code
2. Ensure [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot) is installed and active
3. The MCP server appears automatically in the **Copilot tools panel**

To verify: open Copilot Chat and ask _"What is the current project status?"_ —
Copilot should invoke the `get_project_status` tool.

### VS Code configuration file

`.vscode/mcp.json`:

```json
{
  "servers": {
    "agentic-it-project-team": {
      "type": "stdio",
      "command": "node",
      "args": ["--import", "tsx", "src/webapp/mcp-server.ts"]
    }
  }
}
```

---

## Other IDEs (Visual Studio, JetBrains, etc.)

Configure an MCP stdio server in your IDE's MCP settings with:

| Field                 | Value                                   |
| --------------------- | --------------------------------------- |
| **Type**              | `stdio`                                 |
| **Command**           | `node`                                  |
| **Arguments**         | `--import tsx src/webapp/mcp-server.ts` |
| **Working directory** | Repository root                         |

### Example JSON (generic MCP client)

```json
{
  "command": "node",
  "args": ["--import", "tsx", "src/webapp/mcp-server.ts"]
}
```

### Prerequisites

- **Node.js ≥ 18** must be on your PATH
- **Dependencies installed** — run `npm install` at the repository root first
  (this installs `tsx` and `@modelcontextprotocol/sdk`)

---

## Available Tools (17)

### Project & Progress

| Tool                 | Description                                                                      |
| -------------------- | -------------------------------------------------------------------------------- |
| `get_project_status` | Session state, pipeline progress, active command, and command queue summary      |
| `get_progress`       | Detailed phase completion status, current agent, sprint information              |
| `check_drift`        | Detect drift between session-state sprint statuses and GitHub board sync reports |

### Questionnaires

| Tool                  | Description                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------ |
| `list_questionnaires` | All questionnaire files with completion statistics (total, answered, unanswered, deferred) |
| `get_questionnaire`   | Full contents of a specific questionnaire including all questions, answers, and statuses   |
| `save_answers`        | Save one or more answers to a questionnaire file (supports batch updates)                  |

### Decisions

| Tool              | Description                                              |
| ----------------- | -------------------------------------------------------- |
| `list_decisions`  | All decisions grouped by status: open, decided, deferred |
| `create_decision` | Create a new open question or operational decision       |
| `answer_decision` | Provide an answer to an open question                    |
| `decide_question` | Finalize an answered question (move to decided)          |

### Commands

| Tool                | Description                                                                     |
| ------------------- | ------------------------------------------------------------------------------- |
| `queue_command`     | Queue a command for the orchestrator (CREATE, AUDIT, REEVALUATE, FEATURE, etc.) |
| `get_command_queue` | Full command queue history with all queued, active, and completed commands      |

### Governance

| Tool              | Description                                                    |
| ----------------- | -------------------------------------------------------------- |
| `list_approvals`  | List pending governance approval requests                      |
| `approve_request` | Approve a pending governance approval request                  |
| `reject_request`  | Reject a pending governance approval request (reason required) |

### Utility

| Tool            | Description                                                                  |
| --------------- | ---------------------------------------------------------------------------- |
| `get_help`      | Help on commands, concepts, and workflows (omit topic for table of contents) |
| `get_audit_log` | Recent entries from the mutation audit trail (append-only log)               |

---

## Available Resources (3)

| URI                       | Description                                                              |
| ------------------------- | ------------------------------------------------------------------------ |
| `agentic://session-state` | Current session state as JSON (project name, mode, phase, agent, sprint) |
| `agentic://decisions`     | All decisions as JSON                                                    |
| `agentic://command-queue` | Command queue as JSON                                                    |

---

## Example Interactions

### Check project status

> _"What is the current project status?"_

Copilot invokes `get_project_status` and returns the session state, current
phase/agent, and latest command.

### Answer a questionnaire

> _"List the questionnaires and show me the unanswered questions in the business
> analyst questionnaire."_

Copilot calls `list_questionnaires`, then `get_questionnaire` with the file
path.

### Create a decision

> _"Create a HIGH priority TECH decision: Should we use PostgreSQL or MongoDB
> for the persistence layer?"_

Copilot calls `create_decision` with `type: "question"`, `priority: "HIGH"`,
`scope: "TECH"`, and the question text.

### Queue a command

> _"Queue a CREATE command for project WidgetApp with a brief describing an
> e-commerce widget platform."_

Copilot calls `queue_command` with `command: "CREATE"`, `project: "WidgetApp"`,
and `brief: "..."`.

---

## Troubleshooting

### MCP server doesn't appear in VS Code

1. Verify `.vscode/mcp.json` exists in the workspace root
2. Reload VS Code window (`Ctrl+Shift+P` → "Reload Window")
3. Check the Output panel → select "MCP" from the dropdown for error messages

### "Cannot find module tsx"

Run `npm install` at the repository root — `tsx` is a runtime dependency.

### Tools return errors about missing files

The MCP server reads from `BusinessDocs/`. If no project has been started yet,
status tools will return null/empty values. Start a project first with
`queue_command` or via the Command Center UI.

### MCP server crashes on startup

Check that no other process is using the same stdio streams. The MCP server uses
stdin/stdout for JSON-RPC communication — it cannot run alongside another stdio
process on the same terminal.

### Slow responses

The MCP server reads files from disk on each call (no long-lived cache). If
`BusinessDocs/` contains many large questionnaire files, responses may take a
moment. This is normal.
