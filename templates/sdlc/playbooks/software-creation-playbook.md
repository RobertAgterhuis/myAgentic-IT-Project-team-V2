# New Software Solution Creation – Complete Playbook

> End-to-end creation process for new commercial software products
>
> **Mode:** CREATE | **Counterpart:** AUDIT mode — see
> `commercial-software-audit-playbook.md` for the audit variant. Both playbooks
> share the same phase structure, agent set, contracts, and guardrails. The key
> difference: CREATE designs new solutions; AUDIT analyzes existing software.

---

## OVERVIEW

This playbook describes the complete creation process from A to Z. It covers
five phases and produces a final Solution Blueprint with Executive Summary,
Solution Blueprint Heatmap, Risk Matrix, 12-month roadmap, Guardrail document,
KPI targets, and Sprint Completion Reports per implemented sprint.

**The order is non-negotiable.** Strategy → Technology → Experience → Growth →
Implementation.

---

## ONBOARDING (Prerequisites)

### Objective

Capture the project brief, validate the working environment, and produce the
foundational context document that all subsequent phases consume.

### Agent

**Onboarding Agent** (skill: `25-onboarding-agent.md`)

### Trigger

The Orchestrator (Agent 00) activates the Onboarding Agent as the FIRST action
after receiving a `CREATE` command. No phase agent may start until onboarding is
complete.

### Steps

1. **Requirements Intake** — Gather project brief (product idea, target market,
   value proposition, constraints, timeline, budget)
2. **Stakeholder Context** — Identify key stakeholders, decision-makers, and
   communication channels
3. **Project Scan** — Scan the workspace for existing code, documentation, and
   configuration to establish baseline context
4. **Tooling Check** — Verify required tooling and platform integrations are
   available

### Required Output

- `BusinessDocs/onboarding/onboarding-output.md` — complete onboarding document
  with intake answers, scan results, and tooling status
- `session-state.json` updated to `status: ONBOARDING_COMPLETE`

### Validation

Onboarding output MUST be present and marked COMPLETE before Phase 1 begins.
The Orchestrator verifies this as a hard prerequisite.

---

## PHASE 1: REQUIREMENTS & STRATEGY (2–3 weeks)

### Objective

Complete definition of the business model, product vision, requirements,
strategic positioning, and financial projections for the new software product
before any technical or UX design starts.

### Agents (In Order)

1. **Business Analyst** (skill: `01-business-analyst.md`)
2. **Domain Expert** (skill: `02-domain-expert.md`)
3. **Sales Strategist** (skill: `03-sales-strategist.md`)
4. **Financial Analyst** (skill: `04-financial-analyst.md`)
5. **Product Manager** (skill: `34-product-manager.md`)

### Required Input

- Project brief (product idea, target market, value proposition)
- Business documentation (financial constraints, budget, timeline)
- Domain information (industry, compliance framework, target audience)
- Optional: stakeholder interviews, market research, competitor analysis
- Optional: reference codebase or existing prototype (if available)

### Required Output (Phase 1)

```json
{
  "product_vision": {},
  "business_model_canvas": {},
  "business_rules": [],
  "risk_assessment": [],
  "kpi_targets": {},
  "gap_analysis": {
    "market": [],
    "product": [],
    "revenue": [],
    "operations": []
  },
  "priority_matrix": [],
  "icp": {},
  "go_to_market_strategy": {},
  "financial_projections": {}
}
```

### Validation

After Phase 1: **Critic Agent** + **Risk Agent** validation mandatory. Phase 2
does NOT start without both validations APPROVED.

**Validation scope (applies to all phase transitions):**

The Critic Agent (18) and Risk Agent (19) run **in parallel** on the same phase
output. Combined verdict determines Go/No-Go:

| Agent  | Validates                                                          | Pass criteria                    |
| ------ | ------------------------------------------------------------------ | -------------------------------- |
| Critic | Contract compliance, internal consistency, anti-hallucination, completeness, scope discipline | All checks PASS or ACCEPTABLE    |
| Risk   | Strategic alignment, compliance risks, scope creep, business impact, system risks | No RED risks unmitigated         |

**APPROVED:** Both agents pass → next phase starts.  
**CONDITIONAL:** One agent raises AMBER items → Orchestrator reviews, may
proceed with documented conditions.  
**REJECTED:** Either agent raises RED/BLOCKING → phase agent reworks, then
re-validation.

### Post-Phase 1: Questionnaire Agent

After Critic + Risk PASSED:

1. **Questionnaire Agent** (skill: `36-questionnaire-agent.md`) — collects all
   `INSUFFICIENT_DATA:` items from Phase 1 agents and generates customer-facing
   questionnaires in `BusinessDocs/Phase1-Business/Questionnaires/`
2. **Questionnaire Agent** — creates or updates
   `BusinessDocs/OfficialDocuments/product-vision.md` and
   `financial-model-overview.md` based on verified Phase 1 output and any
   answered questionnaire data

Questionnaire generation NEVER blocks Phase 2. Answers fed back via REEVALUATE
or new CREATE cycle. Non-technical stakeholders can use the Questionnaire &
Decisions Manager web UI: `node src/webapp/server.js` →
http://127.0.0.1:3000 Decisions can also be created and answered from the
**Decisions** tab in the web UI — changes are written directly to
`BusinessDocs/decisions.md`.

---

## PHASE 2: ARCHITECTURE & DESIGN (3–4 weeks)

### Objective

Complete architecture design, technology stack selection, security design, and
data model for the new software product — designed to fulfill the strategic
ambitions from Phase 1.

### Agents (In Order)

1. **Software Architect** (skill: `05-software-architect.md`)
2. **Senior Developer** (skill: `06-senior-developer.md`)
3. **DevOps Engineer** (skill: `07-devops-engineer.md`)
4. **Security Architect** (skill: `08-security-architect.md`)
5. **Data Architect** (skill: `09-data-architect.md`)
6. **Legal / Privacy Counsel** (skill: `33-legal-counsel.md`)

### Required Input

- Phase 1 output (complete)
- Technology preferences (if any)
- Infrastructure constraints (cloud provider, budget, compliance)
- Optional: reference architecture, existing patterns to follow
- Optional: reference codebase (if building on an existing foundation)

### Required Output (Phase 2)

```json
{
  "architecture_decisions": [],
  "technology_stack": {},
  "system_design": {},
  "api_contracts": [],
  "security_design": {},
  "data_model": {},
  "ci_cd_design": {},
  "infrastructure_design": {},
  "legal_requirements": [],
  "non_functional_requirements": {}
}
```

### Validation

After Phase 2: **Critic Agent** + **Risk Agent** validation mandatory.

### Post-Phase 2: Questionnaire Agent

After Critic + Risk PASSED:

1. **Questionnaire Agent** — generates questionnaires in
   `BusinessDocs/Phase2-Tech/Questionnaires/`
2. **Questionnaire Agent** — creates or updates
   `BusinessDocs/OfficialDocuments/technical-overview.md` and
   `legal-compliance-overview.md`

Answers fed back via REEVALUATE or new cycle. Web UI available:
`node src/webapp/server.js` → http://127.0.0.1:3000 (questionnaires +
decisions management)

---

## PHASE 3: EXPERIENCE DESIGN (2–3 weeks)

### Objective

Complete UX/UI design, accessibility baseline, content strategy, and
internationalization plan for the new product — designed against the technical
architecture from Phase 2 and the business goals from Phase 1.

### Agents (In Order)

1. **UX Researcher** (skill: `10-ux-researcher.md`)
2. **UX Designer** (skill: `11-ux-designer.md`)
3. **UI Designer** (skill: `12-ui-designer.md`)
4. **Accessibility Specialist** (skill: `13-accessibility-specialist.md`)
5. **Content Strategist / UX Writer** (skill: `32-content-strategist.md`)
6. **Localization Specialist** (skill: `35-localization-specialist.md`)

### Required Input

- Phase 1 + Phase 2 output (complete)
- User personas and ICP from Phase 1
- Architecture constraints from Phase 2
- Optional: user research data, competitor UX analysis
- Optional: design files or brand guidelines (if available)

### Required Output (Phase 3)

```json
{
  "user_personas": [],
  "user_journeys": [],
  "information_architecture": {},
  "wireframes": [],
  "design_system": {},
  "accessibility_requirements": {},
  "content_strategy": {},
  "microcopy_guidelines": {},
  "localization_plan": {}
}
```

### Validation

After Phase 3: **Critic Agent** + **Risk Agent** validation mandatory.

### Post-Phase 3: Questionnaire Agent

After Critic + Risk PASSED:

1. **Questionnaire Agent** — generates questionnaires in
   `BusinessDocs/Phase3-UX/Questionnaires/`
2. **Questionnaire Agent** — creates or updates
   `BusinessDocs/OfficialDocuments/ux-design-brief.md` and
   `content-strategy-brief.md`

Answers fed back via REEVALUATE or new cycle. Web UI available:
`node src/webapp/server.js` → http://127.0.0.1:3000 (questionnaires +
decisions management)

---

## PHASE 4: BRAND & GROWTH (2 weeks)

### Objective

Create the brand identity and growth strategy for the new product based on the
product reality established in the preceding phases.

### Agents (In Order)

1. **Brand Strategist** (skill: `14-brand-strategist.md`)
2. **Growth Marketer** (skill: `15-growth-marketer.md`)
3. **CRO Specialist** (skill: `16-cro-specialist.md`)

### Required Input

- Phase 1 through Phase 3 output (complete)
- Brand preferences (if any)
- Marketing budget (if known)
- Competitive positioning from Phase 1

### Required Output (Phase 4)

```json
{
  "brand_identity": {},
  "brand_voice_tone": {},
  "growth_model": {},
  "acquisition_channels": [],
  "conversion_funnel_design": {},
  "experiment_backlog": [],
  "launch_plan": {},
  "seo_strategy": {}
}
```

### Validation

After Phase 4: **Critic Agent** + **Risk Agent** validation mandatory.

### Post-Phase 4: Questionnaire Agent

After Critic + Risk PASSED:

1. **Questionnaire Agent** — generates questionnaires in
   `BusinessDocs/Phase4-Marketing/Questionnaires/`
2. **Questionnaire Agent** — creates or updates
   `BusinessDocs/OfficialDocuments/brand-brief.md` and `market-positioning.md`

Answers fed back via REEVALUATE or new cycle. Web UI available:
`node src/webapp/server.js` → http://127.0.0.1:3000 (questionnaires +
decisions management)

### Post-Phase 4: Brand & Storybook

After Critic + Risk validation:

1. **Brand & Assets Agent** (skill: `30-brand-assets-agent.md`) — design
   tokens + brand assets (`BusinessDocs/brand/`)
2. **Storybook Agent** (skill: `31-storybook-agent.md`) — component library +
   a11y baseline (`BusinessDocs/storybook/`)

---

## SYNTHESIS (1 week)

### Objective

Consolidation of all phase outputs into one coherent Solution Blueprint for
decision-makers and implementation teams.

### Agent

**Synthesis Agent** (skill: `17-synthesis-agent.md`)

### Required Output (Final Report)

1. Executive Summary (board-level, max 2 pages)
2. Solution Blueprint Heatmap (readiness across dimensions)
3. Risk Matrix (consolidated)
4. 12-month roadmap (build milestones)
5. Combined Guardrail Document
6. KPI Target Dashboard
7. Open Items Register

**Output files (6 documents in `BusinessDocs/synthesis/`):**

| File                            | Content                                           |
| ------------------------------- | ------------------------------------------------- |
| `final-report-master.md`        | 7 components above                                |
| `final-report-business.md`      | Phase 1 department report with blocker section     |
| `final-report-tech.md`          | Phase 2 department report with blocker section     |
| `final-report-ux.md`            | Phase 3 department report with blocker section     |
| `final-report-marketing.md`     | Phase 4 department report with blocker section     |
| `cross-team-blocker-matrix.md`  | All cross-team dependencies (BLOCKING / ADVISORY)  |

---

## POST-SYNTHESIS: GITHUB INTEGRATION

After Synthesis is APPROVED, the **GitHub Integration Agent** (skill:
`27-github-integration-agent.md`) publishes all sprint stories as GitHub Issues
in `INITIAL_PUBLICATION` mode. This creates the project board, labels,
milestones, and issues before any sprint begins.

---

## SPRINT GATE

### Definition

The Sprint Gate is the decision point between Synthesis and each sprint in
Phase 5. It gates entry into implementation and recurs between sprints.

**Owner:** Orchestrator (Agent 00) — see `agents/00-orchestrator.md` for full
Sprint Gate logic, decision injection, and Definition of Ready criteria.

### Inputs

- Synthesis outputs (all 6 documents APPROVED)
- `BusinessDocs/decisions.md` (decided items since last gate)
- `BusinessDocs/session/reevaluate-trigger.json` (if `status: "PENDING"`)
- `BusinessDocs/session/github-state-snapshot.json` (captured at Sprint Gate
  Step 0)
- Sprint Completion Report from previous sprint (if not first sprint)
- Lessons learned from previous sprint (if not first sprint)

### Sprint Gate Steps

1. **Step 0 — GitHub State Snapshot + Check Decisions + Reevaluate Triggers:**
   Run `github-state-snapshot.js` to capture current GitHub board state
   (milestones, issues) into `github-state-snapshot.json`. Inject snapshot as
   `## GITHUB STATE` block into Reevaluate Agent context. Update
   `session-state.json` `github_sync` fields. Then load decisions.md for new
   DECIDED items; check reevaluate-trigger.json for PENDING triggers. If PENDING
   reevaluate found, execute REEVALUATE before proceeding.
2. **Step 1 — Present Sprint:** Present the next sprint's stories to user for
   `IMPLEMENT` or `BACKLOG` decision per story. Apply Definition of Ready check.
   Inject lessons-learned from previous sprints.

### Outputs

- Sprint activation decision: `IMPLEMENT` | `BACKLOG` per story
- Updated story statuses in session-state.json
- Lessons-learned injection into agent contexts

### Transition

On `IMPLEMENT` decision → Phase 5 activates for the selected sprint.

---

## PHASE 5: AUTONOMOUS IMPLEMENTATION (Ongoing per sprint)

### Objective

Actual implementation of the designed software product per the approved sprint
stories from Phases 1–4, fully autonomous and traceable, with automated tests,
guardrail validation, and Sprint Completion Reports per sprint.

### Agents (Per Sprint, In Order)

1. **Implementation Agent** (skill: `20-implementation-agent.md`) — writes code
   per story
2. **Test Agent** (skill: `21-test-agent.md`) — validates implementation against
   acceptance criteria
3. **Architecture Compliance Reviewer** (skill:
   `38-architecture-compliance-reviewer.md`) — validates code against Phase 1–4
   design decisions (3-tier review: T1 Architecture, T2 UX/Design, T3 Business
   Rules). Returns to Implementation Agent on violation.
4. **PR/Review Agent** (skill: `22-pr-review-agent.md`) — final review, create
   PR, close sprint
5. ↓ **Critic Agent** (skill: `18-critic-agent.md`) — validate sprint output
6. ↓ **Risk Agent** (skill: `19-risk-agent.md`) — risk assessment per sprint
7. **KPI Agent** (skill: `29-kpi-agent.md`) — measure sprint KPIs and emit
   alerts
8. **Documentation Agent** (skill: `26-documentation-agent.md`) — update
   user/technical manuals and changelog
9. **GitHub Integration Agent** (skill: `27-github-integration-agent.md`) —
   update project board and close issues
10. **Retrospective Agent** (skill: `28-retrospective-agent.md`) — sprint
    retrospective, velocity log, lessons learned

### Required Input

- Synthesis Final Report (complete, Critic + Risk APPROVED)
- Approved sprint plans from all specialist agents
- Architecture decisions from Phase 2 (Software Architect + Senior Developer
  output)
- Design system from Phase 3 (UI Designer + Storybook Agent output)
- Guardrails (`templates/sdlc/guardrails/00–09`)
- Implementation Output Contract
  (`templates/sdlc/contracts/implementation-output-contract.md`)

**HALT:** Phase 5 NEVER starts without a fully APPROVED Synthesis Final Report
and validated sprint plans (Critic + Risk PASSED per phase).

### Execution Per Sprint

```
For each sprint (SP-1, SP-2, ...):
  1. Orchestrator: activate stories per sprint plan (parallel tracks = simultaneously)
  2. Per story: Implementation Agent → Test Agent (return if REJECTED)
  3. After all stories tested: Architecture Compliance Reviewer validates code against Phase 1–4 decisions
     - T1 (Architecture): always — code vs Phase 2 decisions
     - T2 (UX/Design): when UI files changed — code vs Phase 3 design system
     - T3 (Business Rules): when business logic changed — code vs Phase 1 rules
     - On NON_COMPLIANT: return to Implementation Agent → re-test → re-review (max 3 iterations)
  4. After compliance PASSED: PR/Review Agent assembles sprint PR
  5. Critic Agent validates Sprint Completion Report
  6. Risk Agent assesses new findings
  7. On PASSED: merge PR, activate next sprint
  8. On FAILED: return to Implementation Agent per finding
```

### Parallel Tracks

Stories in the same sprint that have NO mutual dependencies (identified in the
Parallel Tracks section of the sprint plans) are picked up **simultaneously** by
multiple Implementation Agent instances. After all stories are APPROVED by the
Test Agent, the Architecture Compliance Reviewer validates the full sprint's code
against Phase 1–4 design decisions. Only after compliance PASSED does the
PR/Review Agent assemble all story outputs into one sprint PR.

**Timing clarification:** The Architecture Compliance Reviewer runs ONCE per
sprint on the combined output of all stories — NOT per individual story. This
means all parallel tracks must complete Implementation + Test before the
Compliance Reviewer activates. If any story fails compliance (NON_COMPLIANT),
only that story returns to Implementation; other compliant stories are not
re-reviewed unless the fix introduces changes to shared code.

### Required Output (Per Sprint)

```json
{
  "sprint_id": "SP-N",
  "sprint_goal": "",
  "stories_implemented": [],
  "sprint_completion_report": {},
  "pr_url": "",
  "kpi_measurement": {},
  "new_critical_findings": [],
  "blockers_open": [],
  "critic_status": "PASSED | FAILED",
  "risk_status": "PASSED | FAILED"
}
```

### Validation Per Sprint

After each sprint: **Critic Agent** + **Risk Agent** validation mandatory. Next
sprint does NOT start without both validations APPROVED.

---

## ON-DEMAND COMMANDS

These commands can be triggered at any time, independent of the running sprint
cycle:

### REEVALUATE [scope]

Re-analyzes one or more phases after requirements or context has changed —
direction stays the same, design decisions are updated via delta.

| Scope        | What is re-analyzed                                      |
| ------------ | -------------------------------------------------------- |
| `BUSINESS`   | Phase 1 only                                             |
| `TECH`       | Phase 2 only                                             |
| `UX`         | Phase 3 only                                             |
| `MARKETING`  | Phase 4 only                                             |
| `ALL`        | All four phases                                          |
| `DELTA-ONLY` | Valid modifier: detect what changed, no full re-analysis |

Agent: `23-reevaluate-agent.md` → Critic + Risk → Re-evaluation Report →
Orchestrator (Sprint Gate impact)

**Mid-sprint impact mechanics:**

- If a sprint is IN_PROGRESS when REEVALUATE fires: the **current sprint
  continues uninterrupted**. The re-evaluation report is queued for the next
  Sprint Gate (Step 0 checks for pending re-evaluations).
- Stories in QUEUED sprints that are invalidated by the delta are marked
  `REQUEUED` with a reference to the re-evaluation report.
- The Orchestrator reviews the delta at Sprint Gate and may re-prioritize,
  add, or defer stories — but never cancels an in-progress story mid-sprint.
- If the delta is urgent (affects correctness of in-progress work), the
  Reevaluate Agent sets `urgent: true` in the report, triggering an
  Orchestrator review before the sprint completes.

### SCOPE CHANGE [DIMENSION]: [description]

Changes the fundamental premise on which the solution design was built — not a
delta, but a direction change.

Use when: business model pivot, core architecture change, target audience shift
— situations where parts of the existing design become actively _wrong_.

| Dimension   | Affected design |
| ----------- | --------------- |
| `BUSINESS`  | Phase 1 agents  |
| `TECH`      | Phase 2 agents  |
| `UX`        | Phase 3 agents  |
| `MARKETING` | Phase 4 agents  |
| `ALL`       | All phases      |

Agent: `37-scope-change-agent.md`

**Mechanics:**

1. **Backlog Hold:** The Orchestrator immediately sets `sprint_status = HOLD`
   for all IN_PROGRESS and QUEUED sprints in the affected dimension(s).
   Implementation Agents currently executing stories in affected sprints
   receive `SCOPE_CHANGE_HALT` and stop work.
2. **Invalidation Marking:** The Scope Change Agent scans all existing phase
   outputs, sprint stories, and recommendations in the affected dimension.
   Items that conflict with the new direction are marked
   `INVALIDATED_BY_SCOPE_CHANGE: SC-[N]` with a reason.
3. **Re-analysis:** Only the affected dimension is re-analyzed by the
   corresponding phase agents. Unaffected dimensions are preserved.
4. **Critic + Risk:** Validation of the re-analyzed dimension.
5. **Sprint Gate Reconciliation:** The Orchestrator presents a reconciliation
   report showing: invalidated stories, new/modified stories, cascade impact
   on dependent sprints. User approval required before resuming.
6. **Master Synthesis Update:** The Synthesis Agent updates
   `final-report-master.md` and the affected department report.

Output: `BusinessDocs/synthesis/scope-change-[N].md` + updated sprint statuses

### FEATURE [name]: [description]

Runs the complete Phase 1–4 + Synthesis + Sprint Plan cycle for a single new
feature in an isolated workspace.

Output: `Workitems/[FEATURENAME]/` — own sprint IDs, own Sprint Gate, no impact
on main backlog without Orchestrator approval. Agent: `24-feature-agent.md`

**Feature sprint mechanics:**

1. Feature Agent runs Phases 1–4 + Critic/Risk per phase (same as main cycle)
2. Synthesis produces a feature-scoped master report in
   `Workitems/[FEATURENAME]/synthesis/`
3. Sprint IDs use format `FT-[FEATURENAME]-SP-N` to avoid main backlog
   collisions
4. Sprint Gate runs identically to main Sprint Gate (same steps, same checks)
5. After feature cycle completes, Orchestrator merges remaining stories into
   the main backlog at the next main Sprint Gate (see
   `sprintplan-output-contract.md` § Feature Sprint Plan Integration)

### HOTFIX [description]

Emergency protocol for critical production issues. Bypasses Sprint Gate.

**Urgency Validation (Orchestrator, mandatory before bypass):**

1. Orchestrator verifies the issue qualifies as HOTFIX (production down, data
   loss risk, security breach, or SLA violation)
2. If not urgent: reject HOTFIX, route to normal sprint backlog
3. If urgent: document justification in Orchestrator Log and proceed with bypass

Agent pipeline: Implementation → Test (abbreviated regression) → PR/Review
(secret scan mandatory) → merge → KPI → Documentation → GitHub Integration →
Retrospective

Sprint ID: `HOTFIX-[N]` | Mandatory: LESSON_CANDIDATE + DECIDED item if
structural constraint results.

### REFRESH ONBOARDING

Re-runs steps 3+4 of the Onboarding Agent (project scan + tooling check) without
re-asking intake questions. Useful after significant changes when a full
REEVALUATE is premature.

---

## GOVERNANCE STRUCTURE

| Meeting              | Frequency         | Participants                 | Purpose                         |
| -------------------- | ----------------- | ---------------------------- | ------------------------------- |
| Agent Handoff Review | Per handoff       | Orchestrator                 | Quality control                 |
| Phase Review         | End of each phase | Critic + Risk + Orchestrator | Go/No-Go decision               |
| Stakeholder Update   | Weekly            | Product owner / client       | Progress reporting              |
| Final Presentation   | Week 12           | All stakeholders             | Solution Blueprint presentation |

---

## TIME ESTIMATE

| Phase                                | Duration                     |
| ------------------------------------ | ---------------------------- |
| Phase 1: Requirements & Strategy     | 2–3 weeks                    |
| Phase 2: Architecture & Design       | 3–4 weeks                    |
| Phase 3: Experience Design           | 2–3 weeks                    |
| Phase 4: Brand & Growth              | 2 weeks                      |
| Synthesis & Roadmap                  | 1 week                       |
| Phase 5: Implementation (per sprint) | 2 weeks/sprint × [n sprints] |
| **Total (design + first sprint)**    | **12–14 weeks**              |

---

## DEFINITION OF DONE (SYSTEM)

The creation process is COMPLETE when:

1. All four design phases are Critic + Risk APPROVED
2. The Synthesis Agent has produced the Solution Blueprint
3. The Solution Blueprint (`final-report-master.md`) contains all 7 required
   components: (1) Executive Summary, (2) Solution Blueprint Heatmap, (3) Risk
   Matrix, (4) Roadmap, (5) Guardrails, (6) KPIs, (7) Open Items
4. No open `CRITICAL_FINDING` or `CRITICAL_GAP` items without resolution
5. No open `CRITICAL_MISALIGNMENT` items without resolution
6. KPI targets are documented (or `INSUFFICIENT_DATA:` with escalations
   resolved)
7. No open `UNCERTAIN:` or `INSUFFICIENT_DATA:` items without resolution —
   unresolvable items have a corresponding question in
   `BusinessDocs/[PHASE]/Questionnaires/`
8. `BusinessDocs/questionnaire-index.md` is present; all REQUIRED questions are
   either ANSWERED or explicitly marked `DEFERRED` by the Orchestrator
9. `BusinessDocs/OfficialDocuments/document-registry.md` is present; all 8
   official documents exist (completeness may be < 100% when questionnaires are
   still open)

### The 8 Official Documents

Generated by the Questionnaire Agent (Workflow 3) after each phase's Critic +
Risk validation. Full schema: `questionnaire-output-contract.md` § Workflow 3.

| # | Document                                   | Producer Phase | Location                                                |
|---|-------------------------------------------|---------------|---------------------------------------------------------|
| 1 | `product-vision.md`                       | Phase 1       | `BusinessDocs/OfficialDocuments/product-vision.md`      |
| 2 | `financial-model-overview.md`             | Phase 1       | `BusinessDocs/OfficialDocuments/financial-model-overview.md` |
| 3 | `technical-overview.md`                   | Phase 2       | `BusinessDocs/OfficialDocuments/technical-overview.md`  |
| 4 | `legal-compliance-overview.md`            | Phase 2       | `BusinessDocs/OfficialDocuments/legal-compliance-overview.md` |
| 5 | `ux-design-brief.md`                      | Phase 3       | `BusinessDocs/OfficialDocuments/ux-design-brief.md`     |
| 6 | `content-strategy-brief.md`               | Phase 3       | `BusinessDocs/OfficialDocuments/content-strategy-brief.md` |
| 7 | `brand-brief.md`                          | Phase 4       | `BusinessDocs/OfficialDocuments/brand-brief.md`         |
| 8 | `market-positioning.md`                   | Phase 4       | `BusinessDocs/OfficialDocuments/market-positioning.md`  |

The `document-registry.md` tracks: Version, Last Updated, Source Phases,
Completeness (%) for each document.

The implementation process (Phase 5) is COMPLETE per sprint when:

10. All stories in the sprint are IMPLEMENTED or BLOCKED (with escalation)
11. Sprint Completion Report JSON is present and APPROVED by Critic + Risk Agent
12. KPI measurement per sprint has been performed and documented
13. No new `CRITICAL_FINDING` without resolution in the sprint output
14. The PR has been merged into the main branch
15. Secret scan PASSED, user-manual.md and technical-manual.md updated
16. GitHub board updated (all implemented issues closed), retrospective COMPLETE,
    `BusinessDocs/retrospectives/velocity-log.json` updated, lessons-learned.md
    updated

### BLOCKED Story Escalation Protocol

When a story is marked BLOCKED during Phase 5:

1. **Implementation Agent** documents the blocker type:
   - `EXTERN: [dependency]` — external dependency unavailable
   - `TECH_DEBT: [description]` — prerequisite refactoring needed
   - `DECISION_REQUIRED: [question]` — architectural or business decision pending
   - `ENVIRONMENT: [issue]` — infrastructure or tooling failure
2. **Orchestrator** evaluates within the same sprint cycle:
   - If resolvable (e.g., decision can be made): resolve and return story to
     Implementation Agent
   - If not resolvable: move story to next sprint backlog, add to
     `cross-team-blocker-matrix.md` if cross-team
3. **Escalation threshold:** If ≥ 50% of sprint stories are BLOCKED, the
   Orchestrator triggers a `REEVALUATE` cycle before proceeding to the next
   sprint
4. **Documentation:** Every BLOCKED story must appear in the Sprint Completion
   Report with blocker type, attempted resolution, and disposition (DEFERRED /
   ESCALATED / RESOLVED)

---

## CORE PRINCIPLE

> **Building without strategic validation leads to features without market
> value.**

The order: **Strategy → Technology → Experience → Growth → Implementation**

is deliberate and immutable.
