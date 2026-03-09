# BIZ-03: Unattended Execution Architecture Spike

> **Story:** BIZ-03 | **Sprint:** SP-2 | **Type:** ANALYSIS  
> **Goal:** Define the end-to-end architecture for unattended CREATE cycle execution (Goal 1: DEC-R4-004)  
> **Date:** 2026-03-08  
> **Author:** Implementation Agent (20)  
> **Dependency:** BIZ-01 (Product Roadmap) — COMPLETED SP-1  

---

## 1. Executive Summary

Goal 1 requires all 38 agents to execute in sequence for a full CREATE cycle without manual intervention. This spike identifies **12 blocking gaps** in the current architecture, classifies them by severity and fixability, and proposes a concrete technical solution.

**Core finding:** The current system uses VS Code Copilot Chat as both the execution runtime and the LLM provider. The human types "CONTINUE" after each agent completes. Removing this human-in-the-loop requires an **external execution runner** — a Node.js process that orchestrates LLM API calls, manages file I/O, and enforces the Orchestrator's rules programmatically.

---

## 2. Current Execution Model

```
┌─────────────────────────────────────────────────────────┐
│  VS Code Copilot Chat                                   │
│  ┌─────────────────────────────────────────────────┐    │
│  │  LLM (Claude/GPT)                               │    │
│  │  ┌──────────────┐  reads   ┌────────────────┐   │    │
│  │  │ Orchestrator │◄────────►│ session-state  │   │    │
│  │  │ (00-orch.md) │  writes  │   .json        │   │    │
│  │  └──────┬───────┘          └────────────────┘   │    │
│  │         │ loads skill + executes                 │    │
│  │  ┌──────▼───────┐          ┌────────────────┐   │    │
│  │  │ Agent N      │─────────►│ Output files   │   │    │
│  │  │ (skill .md)  │  writes  │ (.md/.json)    │   │    │
│  │  └──────────────┘          └────────────────┘   │    │
│  └────────────────────┬────────────────────────────┘    │
│                       │                                  │
│   ◄── Human types "CONTINUE" ──►                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Per-agent cycle:**
1. LLM reads `session-state.json` → determines next agent
2. LLM loads agent skill file → executes → writes output to disk
3. LLM updates `session-state.json` → yields to human (ORC-30)
4. **Human types "CONTINUE"** → loop repeats

**Session boundaries:** At every phase boundary (after Critic + Risk validation), the user must start a **fresh Copilot Chat conversation** to prevent JS heap OOM (ORC-32). This adds ~6 manual conversation restarts to the full cycle.

---

## 3. Blocking Gaps Inventory

### 3.1 CRITICAL — Require New Component

| # | Gap | Description | Root Cause |
|---|-----|-------------|------------|
| 1 | **No execution loop** | The LLM cannot invoke itself for the next turn. ORC-30 mandates one-agent-per-turn with explicit human yield. | Copilot Chat is a request-response system — no self-invocation mechanism. |
| 2 | **No runtime engine** | The MCP command queue (`command-queue.json`) is write-only. No consumer exists to dequeue and execute commands. The `queue_command` tool response literally says: `"Paste this into Copilot Chat"`. | The human is the execution bridge by design. |

### 3.2 HIGH — Require Policy Changes

| # | Gap | Description | Current Behavior |
|---|-----|-------------|-----------------|
| 3 | **Sprint Gate decisions** | Before every sprint, the Orchestrator asks `IMPLEMENT` or `BACKLOG`. Blocks until human responds. | Interactive prompt, no default. Up to 9 blocks per cycle. |
| 4 | **HALT escalations** | 6 HALT-type triggers (`ONBOARDING_BLOCKED`, `TOOL_INSTALL_REQUEST`, `SCOPE_DECISION`, `SCOPE_CHANGE_DECISION`, `SECURITY_DECISION`, `DESTRUCTIVE_GIT_OP`) halt all agent execution. | System sets `AWAITING_HUMAN`, no fallback. |
| 5 | **OPEN HIGH decisions** | Sprint Gate Step 0 blocks if any `OPEN` + `HIGH` priority decision exists in scope. | Waits for human to answer and set `DECIDED`. |
| 6 | **Session boundaries** | ORC-32 forces fresh conversations at phase boundaries (memory management). | Solved implicitly by external loop (fresh API calls per agent). |

### 3.3 MEDIUM — Require Configuration

| # | Gap | Description | Fix |
|---|-----|-------------|-----|
| 7 | **Synthesis approval gate** | After Synthesis, user must APPROVE all 6 documents. | Auto-approve when Critic+Risk passed. |
| 8 | **Sprint capacity prompt** | ORC-43 asks "How many SP per sprint?" at first Sprint Gate. | Pre-configure in unattended config. |
| 9 | **Session recovery choice** | On start with existing state: "RESUME or RESET?" | Default to RESUME. |
| 10 | **Agent persistent failure** | After 3 contract validation failures, escalates HALT: SKIP/RETRY/MANUAL. | Auto-SKIP with documented gaps. |
| 11 | **Mid-cycle blocks** | Brand refresh, critic meta-validation, etc. | Auto-proceed with conservative defaults. |

### 3.4 NONE — Already Compatible

| # | Gap | Status |
|---|-----|--------|
| 12 | **Questionnaire answers** | Never block per ORC-25. `INSUFFICIENT_DATA:` propagates but does not halt. |

---

## 4. Proposed Architecture: External Execution Runner

### 4.1 High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│  Execution Runner (Node.js)                                 │
│  ┌───────────────┐                                          │
│  │ Orchestrator   │─── reads ──► session-state.json         │
│  │ Loop           │─── reads ──► sprint-plan.md             │
│  │ (run-cycle.js) │─── reads ──► lessons-learned.md         │
│  │                │─── reads ──► decisions.md                │
│  │   ┌───────┐   │                                          │
│  │   │ Agent │   │─── reads ──► skill file (.md)            │
│  │   │ Call  │   │─── reads ──► predecessor output          │
│  │   │       │◄──┤                                          │
│  │   │  LLM  │   │─── writes ─► agent output (.md/.json)   │
│  │   │  API  │   │─── writes ─► session-state.json          │
│  │   └───────┘   │                                          │
│  │                │                                          │
│  │ Policy Engine  │─── auto-resolves ──► Sprint Gates       │
│  │                │─── auto-resolves ──► HALT escalations   │
│  │                │─── auto-approves ──► Synthesis gate     │
│  └───────────────┘                                          │
│                                                              │
│  Tools (function-calling):                                   │
│  ● read_file / write_file / search_file                      │
│  ● run_command (npm test, eslint)                            │
│  ● github_api (issue create/close)                           │
│  ● FileStore (unified writes via store.js)                   │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Component Breakdown

| Component | Description | Complexity |
|-----------|-------------|------------|
| **run-cycle.js** | Main loop: read state → determine next agent → build prompt → call LLM → validate output → update state → loop | HIGH |
| **agent-prompt-builder.js** | Constructs prompt per agent: loads skill file, injects context (predecessor outputs, decisions, lessons), adds tool definitions | MEDIUM |
| **policy-engine.js** | Resolves HALT escalations, Sprint Gate decisions, Synthesis approvals per unattended config | MEDIUM |
| **tool-adapter.js** | Exposes file I/O, terminal commands, GitHub API as function-calling tools for the LLM | MEDIUM |
| **contract-validator.js** | Validates agent output against contract (handoff checklist, required sections, anti-hallucination) | LOW-MEDIUM |
| **session-manager.js** | Reads/writes `session-state.json`, manages phase transitions, enforces ORC rules | LOW |

### 4.3 LLM API Requirements

| Requirement | Why | Options |
|-------------|-----|---------|
| Function/tool calling | Agents need to read/write files, run tests, search code | OpenAI, Azure OpenAI, Anthropic (all support) |
| Large context window | Skill files + predecessor outputs can be 10K+ tokens | 128K+ models (GPT-4o, Claude 3.5 Sonnet, Claude 3 Opus) |
| Structured output | Contract validation requires predictable output format | Function-calling return types, JSON mode |
| Cost control | 38+ agents × multi-turn conversations | Token budgets per agent, caching of skill files |

### 4.4 Unattended Mode Configuration

New section in `session-state.json`:

```json
{
  "unattended_mode": {
    "enabled": true,
    "sprint_gate_default": "IMPLEMENT",
    "sprint_overrides": {},
    "synthesis_auto_approve": true,
    "session_recovery_default": "RESUME",
    "sprint_capacity": 10,
    "halt_policies": {
      "ONBOARDING_BLOCKED": "ABORT",
      "TOOL_INSTALL_REQUEST": "ABORT",
      "SCOPE_DECISION": "AUTO_PROCEED_CONSERVATIVE",
      "SCOPE_CHANGE_DECISION": "REJECT",
      "SECURITY_DECISION": "AUTO_PROCEED_CONSERVATIVE",
      "DESTRUCTIVE_GIT_OP": "REJECT"
    },
    "agent_failure_policy": "SKIP_AFTER_3_RETRIES",
    "max_sprints": 9,
    "llm_provider": "openai",
    "llm_model": "gpt-4o",
    "token_budget_per_agent": 50000,
    "log_level": "INFO"
  }
}
```

---

## 5. Execution Flow: Full CREATE Cycle (Unattended)

```
run-cycle.js starts
  │
  ├─ Read session-state.json
  │   └─ If exists + unattended_mode.enabled: RESUME
  │   └─ If not exists: initialize new session
  │
  ├─ PREFLIGHT CHECK
  │   ├─ Verify project-brief.md exists and is non-empty
  │   ├─ Verify no OPEN HIGH decisions in decisions.md
  │   ├─ Verify all required tools available (node, npm, eslint, vitest)
  │   ├─ Verify LLM API credentials configured
  │   └─ On failure: ABORT with clear error message
  │
  ├─ PHASE LOOP (1 → 4)
  │   ├─ For each agent in phase:
  │   │   ├─ Load skill file
  │   │   ├─ Load predecessor outputs (targeted reads, not full context)
  │   │   ├─ Inject decisions + DECIDED items as constraints
  │   │   ├─ Build prompt
  │   │   ├─ Call LLM API with tools
  │   │   ├─ Validate output against contract
  │   │   │   ├─ On PASS: write output, update session-state
  │   │   │   └─ On FAIL: retry (max 3) → auto-SKIP on persistent failure
  │   │   └─ Next agent
  │   │
  │   ├─ After all agents in phase:
  │   │   ├─ Run Critic Agent
  │   │   ├─ Run Risk Agent
  │   │   └─ Run Questionnaire Agent (generate questions, never blocks)
  │   │
  │   └─ Phase boundary: no action needed (fresh API calls = fresh context)
  │
  ├─ SYNTHESIS
  │   ├─ Run Synthesis Agent (produces 6 documents)
  │   ├─ Auto-approve (Critic+Risk already passed)
  │   └─ Run GitHub Integration Agent (publish issues)
  │
  ├─ PHASE 5 — SPRINT LOOP
  │   ├─ Sprint Gate: auto-IMPLEMENT (per policy)
  │   ├─ For each story in sprint:
  │   │   ├─ Route by story type (CODE → Implementation Agent, ANALYSIS → direct)
  │   │   ├─ Implementation Agent (with tool-calling for file edits + test runs)
  │   │   ├─ Test Agent (run vitest, analyze results)
  │   │   ├─ PR/Review Agent (code review, secret scan)
  │   │   └─ On HALT escalation: apply halt_policies
  │   ├─ KPI Agent (measure KPIs)
  │   ├─ Documentation Agent (update manuals)
  │   ├─ GitHub Integration Agent (close issues)
  │   ├─ Retrospective Agent (velocity, lessons)
  │   └─ Next Sprint Gate
  │
  └─ COMPLETE: all sprints done, final report generated
```

---

## 6. Gap Resolution Matrix

| Gap | Resolution | Implementation Sprint | Effort (SP) |
|-----|------------|----------------------|-------------|
| #1 + #2 | Build `run-cycle.js` external execution runner | POST-SP-9 | ~21 |
| #3 | `unattended_mode.sprint_gate_default` policy | POST-SP-9 | ~2 |
| #4 | `unattended_mode.halt_policies` per-type config | POST-SP-9 | ~5 |
| #5 | Preflight check for OPEN HIGH decisions | POST-SP-9 | ~1 |
| #6 | Solved by external loop (no accumulated context) | N/A | 0 |
| #7 | `unattended_mode.synthesis_auto_approve` flag | POST-SP-9 | ~1 |
| #8 | `unattended_mode.sprint_capacity` pre-config | POST-SP-9 | ~0.5 |
| #9 | `unattended_mode.session_recovery_default` pre-config | POST-SP-9 | ~0.5 |
| #10 | `unattended_mode.agent_failure_policy` | POST-SP-9 | ~2 |
| #11 | Conservative defaults in policy engine | POST-SP-9 | ~1 |
| **Total estimated** | | | **~34 SP** |

---

## 7. Technical Foundation Assessment (SP-1 through SP-9)

The 9 planned sprints build the prerequisite foundation for unattended execution:

| Sprint | Contribution to Goal 1 |
|--------|----------------------|
| SP-1 | ✅ File locking — prevents data corruption during agent file writes |
| SP-2 | ✅ Unified FileStore — single write contract (this sprint) |
| SP-2 | ✅ This architecture spike — informs all future work |
| SP-3 | Schema validators — ensures agent output data integrity |
| SP-4 | Server decomposition — modular codebase for tool-adapter development |
| SP-5 | Accessibility — UX foundation (not directly Goal 1) |
| SP-6 | Observability — metrics/logging for monitoring unattended runs |
| SP-7 | Docker deployment — containerized runtime for execution runner |
| SP-8-9 | Remaining stories — complete the technical platform |

**Assessment:** Sprints 1–9 are correctly sequenced to build the foundation. The execution runner (estimated ~34 SP) is POST-SP-9 scope, as stated in the roadmap (BIZ-01). No resequencing needed.

---

## 8. Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| LLM API costs exceed budget | MEDIUM | HIGH | Token budgets per agent, caching, smaller models for simple agents |
| Agent output quality degrades without human oversight | MEDIUM | MEDIUM | Contract validation + Critic/Risk agents provide automated quality gates |
| Security decisions auto-resolved incorrectly | LOW | HIGH | Conservative default (reject/block), mandatory post-run security review |
| Execution runner takes longer than estimated | MEDIUM | LOW | No timeline pressure (DEC-R4-004). Incremental delivery possible. |
| LLM function-calling insufficient for complex agents (e.g., Implementation Agent writing code) | MEDIUM | HIGH | Start with analysis-only agents, iterate on code-writing prompts |

---

## 9. Recommended Next Steps

1. **SP-3 through SP-9:** Continue building the technical foundation as planned
2. **POST-SP-9:** Begin implementation of `run-cycle.js` execution runner
3. **Design decision needed:** Which LLM provider/model for unattended execution (impacts cost, quality, tool support)
4. **Design decision needed:** Local execution vs GitHub Actions vs hybrid
5. **Validation approach:** Run a partial unattended cycle (Phase 1 only, 5 agents) as proof-of-concept before full implementation

---

## 10. Acceptance Criteria Verification

| Criterion | Status |
|-----------|--------|
| Spike document describes end-to-end flow for unattended CREATE cycle | ✅ Section 5 |
| Identifies blocking gaps | ✅ Section 3 (12 gaps identified) |
| Proposes technical changes needed | ✅ Sections 4, 6 |
| Findings are actionable | ✅ Section 9 (concrete next steps) |

---

## HANDOFF CHECKLIST — Implementation Agent — BIZ-03

- [x] All required sections are filled (not empty, not placeholder)
- [x] All UNCERTAIN: items are documented and escalated — NONE identified
- [x] All INSUFFICIENT_DATA: items are documented and escalated — NONE identified
- [x] Output complies with the contract in .github/docs/contracts/
- [x] Guardrails from .github/docs/guardrails/ have been checked
- [x] Output is machine-readable and ready as input for the next agent
- [x] No contradictory statements in this document
- [x] All findings include a source reference
- [x] Deliverable written to file (not only in chat) per MEMORY MANAGEMENT PROTOCOL
