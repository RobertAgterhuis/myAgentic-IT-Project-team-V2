# B1 — SDLC Coverage

**Dimension:** SDLC Methodology — Phase and Role Coverage  
**Score: 9 / 10**

---

## What Was Evaluated

Whether the platform covers the full software development lifecycle. Which phases and roles are present. Whether the agent roster matches real-world project needs. Whether governance artifacts are generated.

---

## Findings

### 1. Four-Phase SDLC + Three Execution Phases Fully Populated

The platform models a complete enterprise SDLC:

| Phase             | Description     | Agents                                                                                                                                          |
| ----------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| PHASE_1           | Business        | 01-BA, 02-Domain Expert, 03-Sales Strategist, 04-Financial Analyst, 34-Product Manager                                                          |
| PHASE_2           | Technical       | 05-Software Architect, 06-Senior Dev, 07-DevOps, 08-Security Architect, 09-Data Architect, 33-Legal/Privacy                                     |
| PHASE_3           | UX              | 10-UX Researcher, 11-UX Designer, 12-UI Designer, 13-Accessibility Specialist, 32-Content Strategist, 35-Localization                           |
| PHASE_4           | Marketing/Brand | 14-Brand Strategist, 15-Growth Marketer, 16-CRO Specialist, 30-Brand & Assets (Canva), 31-Storybook                                             |
| PHASE_5_EXECUTING | Delivery        | 20-Implementation, 21-Test, 22-PR/Review, 26-Documentation, 27-GitHub Integration, 28-Retrospective, 29-KPI/Metrics, 38-Architecture Compliance |

Source: `templates/sdlc/agents/` directory listing (all 39 files), `CLAUDE.md` agent roster.

**Notable inclusions that separate this from toy implementations:**

- Agent 33 (Legal / Privacy Counsel) — GDPR/compliance role explicitly in PHASE_2
- Agent 35 (Localization Specialist) — i18n in PHASE_3
- Agent 38 (Architecture Compliance Reviewer) — post-implementation architecture drift detection
- Agent 28 (Sprint Retrospective) — continuous improvement built into the lifecycle

### 2. Five Supporting Roles — Cross-Phase Infrastructure

| Agent                    | Phase         | Purpose                                      |
| ------------------------ | ------------- | -------------------------------------------- |
| 00 — Orchestrator        | SPRINT_GATE   | Overall coordination                         |
| 17 — Synthesis Agent     | SYNTHESIS     | Combines all phase outputs into unified plan |
| 18 — Critic Agent        | CRITIC_RISK   | Challenges and validates all phase outputs   |
| 19 — Risk Agent          | CRITIC_RISK   | Identifies blocking issues and risks         |
| 23 — Reevaluate Agent    | REEVALUATE    | Handles scope changes mid-cycle              |
| 24 — Feature Agent       | FEATURE       | Single-feature subset of full SDLC           |
| 25 — Onboarding Agent    | ONBOARDING    | First-run project setup                      |
| 36 — Questionnaire Agent | QUESTIONNAIRE | Structured information gathering             |
| 37 — Scope Change Agent  | SCOPE_CHANGE  | Handles mid-sprint scope modifications       |

The Critic + Risk pair at each gate (CRITIC_1 through CRITIC_4) ensures no phase can advance without adversarial review. This is architecturally sound.

### 3. Eight Command Modes — Appropriate Scope Control

| Mode             | Description              | Phases      |
| ---------------- | ------------------------ | ----------- |
| CREATE           | Full new product/project | P1→P2→P3→P4 |
| AUDIT            | Review existing system   | P1→P2→P3→P4 |
| CREATE_BUSINESS  | Business case only       | P1          |
| CREATE_TECH      | Technical spec only      | P2          |
| CREATE_UX        | UX deliverables only     | P3          |
| CREATE_MARKETING | Marketing only           | P4          |
| FEATURE          | New feature cycle        | P1→P2→P3→P4 |
| SCOPE_CHANGE     | Mid-cycle re-analysis    | (none)      |
| HOTFIX           | Emergency bypass         | P5 direct   |

The presence of `SCOPE_CHANGE` and `HOTFIX` as first-class modes is particularly valuable — most SDLC tools treat these as exceptions. Here they are named, modeled, and have dedicated agents (37, emergency bypass path).

Source: `platform/engine/state-machine.ts` `COMMAND_PHASE_MAPS`, `CLAUDE.md`.

### 4. Contracts and Guardrails — Per-Phase Validation

`templates/sdlc/contracts/` — output contracts per agent (section requirements)
`templates/sdlc/guardrails/` — behavioral guardrails per phase

The gate validator (`platform/engine/gate-validator.ts`) maps phases to their required contracts and guardrails:

- PHASE_1 → global + business guardrails
- PHASE_2 → global + architecture + security guardrails
- PHASE_3 → global + UX + content guardrails
- PHASE_4 → global + marketing guardrails

Source: `platform/engine/gate-validator.ts` `PHASE_GUARDRAILS` constant.

### 5. BusinessDocs Directory — Artifact Storage

The `BusinessDocs/` tree mirrors the SDLC phases for deliverable storage:

- `BusinessDocs/Phase1-Business/`
- `BusinessDocs/Phase2-Tech/`
- `BusinessDocs/Phase3-UX/`
- `BusinessDocs/synthesis/`
- `BusinessDocs/decisions/`
- `BusinessDocs/metrics/`
- `BusinessDocs/session/`
- `BusinessDocs/audit/`

Agent deliverables are written to this tree. The `artifact-registration.ts` (65% coverage) formally registers artifacts with lineage tracking.

### 6. Protocols Enforced per Agent — Anti-Hallucination, Anti-Laziness

From `CLAUDE.md` and individual agent skill files:

- **AH-1 through AH-6** — Anti-hallucination protocol (UNCERTAIN:, INSUFFICIENT_DATA: prefixes)
- **AL-1 through AL-6** — Anti-laziness protocol (no placeholder content)
- **MM-1 through MM-5** — Memory management protocol
- **QP-1 through QP-4** — Questionnaire protocol
- **SD-1 through SD-3** — Scope discipline
- **VP-1 through VP-4** — Verification and handoff checklist

These are injected into the system prompt for every agent invocation. The gate-validator enforces their output artifacts comply.

---

## Strengths

1. **39 agents across every SDLC role** — No major role is missing. Legal/Privacy, Localization, Architecture Compliance, and Sprint Retrospective are present, which typical SDLC automation tools omit.
2. **Adversarial CRITIC + RISK pair** — Each phase transition has a structured challenge mechanism. This is the single most important quality gate in the architecture.
3. **SCOPE_CHANGE and HOTFIX as first-class modes** — Realistic project management, not happy-path only.
4. **Per-phase contracts and guardrails** — Validation is phase-specific, not generic. A security checklist is enforced at PHASE_2, not PHASE_3.
5. **Questionnaire protocol** — Structured input gathering ensures agent outputs ground in verified client input, not hallucinated requirements.

---

## Weaknesses

1. **Phase 1 agents run sequentially** — With 5 Business agents, each generating a full deliverable, the cycle time for PHASE_1 is long. A parallel execution option for independent agents in the same phase would reduce wall-clock time significantly.
2. **No explicit timeline/scheduling** — The SDLC phases have no time-box constraints. A sprint gate exists but there is no configurable deadline per phase or automated stall detection (e.g., a phase stuck for >N hours triggers an admin alert).
3. **Synthesis Agent (17) is a single point of failure** — All six synthesis documents flow through one agent. If the synthesis agent produces a poor output, all subsequent phases are affected. A synthesis critic or structured synthesis validation is absent.
4. **Marketing Phase (PHASE_4) depth** — Canva integration (Agent 30) and Storybook (Agent 31) are in the skill files but their real-world executability depends on external API access that may not be configured. These agents likely produce design recommendations, not actual Canva/Storybook artifacts.

---

## Recommended Improvements

1. Add wall-clock timeouts per phase in `flows.yaml` to detect and alert on stalled pipelines.
2. Add a synthesis validation sub-step (critic agent reviews synthesis output before sprint-gate) to protect the single synthesis agent failure mode.
3. Mark which agents produce fully automated outputs vs. human-assisted outputs in the skill file metadata to set realistic expectations.

---

## Source References

| File                                | Lines Read        | Key Finding                       |
| ----------------------------------- | ----------------- | --------------------------------- |
| `templates/sdlc/agents/`            | directory listing | 39 agent skill files              |
| `platform/engine/state-machine.ts`  | 1–123             | 8 command modes, phase maps       |
| `platform/engine/gate-validator.ts` | 1–100             | PHASE_GUARDRAILS, PHASE_CONTRACTS |
| `platform/engine/engine.ts`         | 1–184             | PHASE_GATE_TRANSITION_MAP         |
| `CLAUDE.md`                         | full              | Agent roster, phases, gates       |
| `BusinessDocs/`                     | dir listing       | Artifact storage tree             |
