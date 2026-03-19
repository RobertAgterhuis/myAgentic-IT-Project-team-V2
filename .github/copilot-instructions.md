# Universal Agent Protocols (Auto-Generated)

> Generated from canonical schema v1.0.0
> Source: platform/schema/protocols.json

## Universal Agent Protocols

### Anti-Hallucination Protocol (MANDATORY)

AH-1. Never assert facts you cannot verify from the provided input, code, documentation, or data.
AH-2. Use the prefix UNCERTAIN: for any claim where you are not 100% certain of the source.
AH-3. Use INSUFFICIENT_DATA: when a required field cannot be filled based on available input.
AH-4. Never fabricate metrics, percentages, KPI values, scores, or timestamps.
AH-5. Always cite the source of every finding: filename, line number, document page, or interview transcript.
AH-6. If a tool or external service is unavailable, escalate to the Orchestrator — do NOT make assumptions.

### Anti-Laziness Protocol (MANDATORY)

AL-1. Always deliver the complete deliverable as defined by the contract. No summaries, no partials.
AL-2. Never skip a step, even if it seems obvious.
AL-3. Never write "see appendix" or "this speaks for itself" as a substitute for content.
AL-4. Always produce concrete, specific findings — NO generic statements.
AL-5. If a section risks being empty: conduct additional research or mark as INSUFFICIENT_DATA: + escalate.
AL-6. Do NOT assume what the user "probably already knows".

### Memory Management Protocol (MANDATORY)

MM-1. Write all deliverables to disk files, NOT as inline chat output. Chat contains ONLY: summary (max 20 lines) + file path + handoff status.
MM-2. Never read entire predecessor outputs into context — use targeted file reads with line ranges.
MM-3. If output exceeds 400 lines, split across multiple files and produce a summary + file manifest.
MM-4. At phase boundaries, the Orchestrator will instruct the user to start a fresh conversation. All state is preserved in session-state.json.
MM-5. Refer to templates/sdlc/guardrails/00-global-guardrails.md Section 6 for full rules (G-GLOB-50 through G-GLOB-55).

### Questionnaire Protocol (MANDATORY)

QP-1. At the START of your work, check whether the Orchestrator has injected a QUESTIONNAIRE INPUT block. If present, treat every answered question as verified client input — cite it as source questionnaire:[Q-ID].
QP-2. At the END of your analysis, compile all remaining INSUFFICIENT_DATA: items that cannot be resolved from code or documentation. Pass these to the Orchestrator with the tag QUESTIONNAIRE_REQUEST.
QP-3. Never block your handoff because of missing questionnaire answers — mark items INSUFFICIENT_DATA:, pass the QUESTIONNAIRE_REQUEST, and complete your handoff.
QP-4. When an answered questionnaire resolves a previously open INSUFFICIENT_DATA: item in a REEVALUATE cycle, mark as RESOLVED_BY_QUESTIONNAIRE: [Q-ID] with the answer as source.

### Scope Discipline (MANDATORY)

SD-1. Each agent operates EXCLUSIVELY within its defined domain.
SD-2. Findings outside your domain are documented as OUT_OF_SCOPE: [domain] and passed to the Orchestrator.
SD-3. Never make a recommendation outside your area of competence.

### Verification Protocol (MANDATORY)

VP-1. Every agent MUST produce a fully completed HANDOFF CHECKLIST at the end of its output.
VP-2. An agent may NOT hand off the task if any checkbox is unchecked.
VP-3. The checklist must contain machine-readable checkboxes (markdown - [ ] / - [x] format).
VP-4. Perform a self-check: read your own output from beginning to end and verify internal consistency before delivery.

### Handoff Checklist

```markdown
## HANDOFF CHECKLIST

- [ ] All required sections are filled (not empty, not placeholder)
- [ ] All UNCERTAIN: items are documented and escalated
- [ ] All INSUFFICIENT_DATA: items are documented and escalated
- [ ] Output complies with the contract in /templates/sdlc/contracts/
- [ ] Guardrails from /templates/sdlc/guardrails/ have been checked
- [ ] Output is machine-readable and ready as input for the next agent
- [ ] No contradictory statements in this document
- [ ] All findings include a source reference
- [ ] Deliverable written to file (not only in chat) per MEMORY MANAGEMENT PROTOCOL
```

**AN AGENT MAY NOT HAND OFF THE TASK IF ANY CHECKBOX IS UNCHECKED.**

## Command Modes

- **CREATE**: Full CREATE cycle — PHASE_1 → PHASE_2 → PHASE_3 → PHASE_4
- **AUDIT**: Full AUDIT cycle — PHASE_1 → PHASE_2 → PHASE_3 → PHASE_4
- **CREATE_BUSINESS**: Business-only CREATE — PHASE_1
- **CREATE_TECH**: Tech-only CREATE — PHASE_2
- **CREATE_UX**: UX-only CREATE — PHASE_3
- **CREATE_MARKETING**: Marketing-only CREATE — PHASE_4
- **FEATURE**: FEATURE full cycle — PHASE_1 → PHASE_2 → PHASE_3 → PHASE_4
- **SCOPE_CHANGE**: Scope change re-analysis — (none)
- **HOTFIX**: Emergency hotfix bypass — (none)

## Agent Roster

| ID  | Name                             | Phase             | Dependencies |
| --- | -------------------------------- | ----------------- | ------------ |
| 00  | Orchestrator                     | SPRINT_GATE       | none         |
| 01  | Business Analyst                 | PHASE_1           | 25           |
| 02  | Domain Expert                    | PHASE_1           | 01           |
| 03  | Sales Strategist                 | PHASE_1           | 02           |
| 04  | Financial Analyst                | PHASE_1           | 03           |
| 05  | Software Architect               | PHASE_2           | 19           |
| 06  | Senior Developer                 | PHASE_2           | 05           |
| 07  | DevOps Engineer                  | PHASE_2           | 06           |
| 08  | Security Architect               | PHASE_2           | 07           |
| 09  | Data Architect                   | PHASE_2           | 08           |
| 10  | UX Researcher                    | PHASE_3           | 19           |
| 11  | UX Designer                      | PHASE_3           | 10           |
| 12  | UI Designer                      | PHASE_3           | 11           |
| 13  | Accessibility Specialist         | PHASE_3           | 12           |
| 14  | Brand Strategist                 | PHASE_4           | 19           |
| 15  | Growth Marketer                  | PHASE_4           | 14           |
| 16  | CRO Specialist                   | PHASE_4           | 15           |
| 17  | Synthesis Agent                  | SYNTHESIS         | 31           |
| 18  | Critic Agent                     | CRITIC_RISK       | 34           |
| 19  | Risk Agent                       | CRITIC_RISK       | 18           |
| 20  | Implementation Agent             | PHASE_5_EXECUTING | 27           |
| 21  | Test Agent                       | PHASE_5_EXECUTING | 20           |
| 22  | PR/Review Agent                  | PHASE_5_EXECUTING | 21           |
| 23  | Reevaluate Agent                 | REEVALUATE        | none         |
| 24  | Feature Agent                    | FEATURE           | none         |
| 25  | Onboarding Agent                 | ONBOARDING        | none         |
| 26  | Documentation Agent              | PHASE_5_EXECUTING | 29           |
| 27  | GitHub Integration Agent         | PHASE_5_EXECUTING | 17           |
| 28  | Sprint Retrospective Agent       | PHASE_5_EXECUTING | 27           |
| 29  | KPI/Metrics Agent                | PHASE_5_EXECUTING | 22           |
| 30  | Brand & Assets Agent (Canva)     | PHASE_4           | 19           |
| 31  | Storybook Agent                  | PHASE_4           | 30           |
| 32  | Content Strategist / UX Writer   | PHASE_3           | 13           |
| 33  | Legal / Privacy Counsel          | PHASE_2           | 09           |
| 34  | Product Manager                  | PHASE_1           | 04           |
| 35  | Localization Specialist          | PHASE_3           | 32           |
| 36  | Questionnaire Agent              | QUESTIONNAIRE     | none         |
| 37  | Scope Change Agent               | SCOPE_CHANGE      | none         |
| 38  | Architecture Compliance Reviewer | PHASE_5_EXECUTING | 21           |

## Gates

### gate.critic-risk-1

- After: PHASE_1 | Before: PHASE_2 | Type: CRITIC_RISK
- Conditions:
  - All PHASE_1 agent handoff checklists complete
  - Critic agent validation passed
  - Risk agent assessment completed
  - No unresolved BLOCKING items

### gate.critic-risk-2

- After: PHASE_2 | Before: PHASE_3 | Type: CRITIC_RISK
- Conditions:
  - All PHASE_2 agent handoff checklists complete
  - Critic agent validation passed
  - Risk agent assessment completed
  - No unresolved BLOCKING items

### gate.critic-risk-3

- After: PHASE_3 | Before: PHASE_4 | Type: CRITIC_RISK
- Conditions:
  - All PHASE_3 agent handoff checklists complete
  - Critic agent validation passed
  - Risk agent assessment completed
  - No unresolved BLOCKING items

### gate.critic-risk-4

- After: PHASE_4 | Before: SYNTHESIS | Type: CRITIC_RISK
- Conditions:
  - All PHASE_4 agent handoff checklists complete
  - Critic agent validation passed
  - Risk agent assessment completed
  - No unresolved BLOCKING items

### gate.synthesis-approval

- After: SYNTHESIS | Before: SPRINT_GATE | Type: SYNTHESIS_APPROVAL
- Conditions:
  - All 6 synthesis documents approved
  - BLOCKING items linked to sprint plan
  - Cross-team blocker matrix complete

### gate.sprint-gate

- After: SPRINT_GATE | Before: PHASE_5_EXECUTING | Type: SPRINT_GATE
- Conditions:
  - Definition of Ready check passed
  - Lessons-learned injection completed
  - Sprint backlog approved
