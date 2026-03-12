# Quick Start Guide

Get the Agentic SDLC Platform running and create your first project in under 5
minutes.

---

## Prerequisites

- **Node.js 18+** — [download](https://nodejs.org/)
- **Git** — [download](https://git-scm.com/)
- **VS Code** with
  [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot)
  enabled
- **GitHub account** with repository access

---

## Step 1: Clone and Install

```bash
git clone https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2.git
cd myAgentic-IT-Project-team-V2
npm install
cd .github && npm install && cd ..
```

## Step 2: Start the Command Center

```bash
node .github/webapp/server.js
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) in your browser.

You should see the Command Center dashboard with pipeline view, questionnaire
management, and decision tracking tabs.

**Alternative: Docker (includes Matomo analytics)**

```bash
docker compose up --build
```

## Step 3: Create Your First Project

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

## Step 4: Follow the Pipeline

The Orchestrator runs **one agent at a time**:

1. Agent completes its work and saves output to disk
2. You see a summary in chat with a `CONTINUE` prompt
3. Type **CONTINUE** to proceed to the next agent
4. At **phase boundaries**, start a **new Copilot Chat** and type **CONTINUE**

All progress is saved in `session-state.json` — you can safely close and resume
at any time.

## Step 5: Answer Questionnaires

When agents need your input:

1. Open the **Questionnaires** tab in the Command Center
2. Find the questionnaire with unanswered questions
3. Answer the questions (mark as Required or Optional)
4. Run `REEVALUATE` in Copilot Chat for improved results

---

## Verify Your Installation

```bash
# Run test suites to confirm everything works
npm test                      # Root suite (363 tests)
cd .github && npm test        # .github/ suite (809 tests)
```

Both suites should report **0 failures**.

---

## What's Next?

- **[User Manual](user-manual.md)** — Comprehensive guide to all features
- **[Technical Manual](technical-manual.md)** — Architecture and API reference
- **[Operating Handbook](../.github/docs/operating-handbook.md)** — Monitoring,
  troubleshooting, recovery
- **[Available Commands](../README.md#available-commands)** — All CREATE, AUDIT,
  FEATURE, and utility commands
