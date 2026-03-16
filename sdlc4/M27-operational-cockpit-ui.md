# M27: Operational Cockpit UI

> **Impact:** HIGH | **Breaking changes:** NONE (additive — new pages and
> components) | **Blocks:** nothing | **Blocked by:** nothing (benefits from
> M21, M23, M24, M25 but can start with current data)
>
> **Audit reference:** Phase 6 recommendation — "The UI must become a true
> operational cockpit: guided onboarding, explicit current-state /
> next-best-action flows, dependency graphs, artifact lineage views, operator
> confidence indicators, clear human-approval workflow, execution replay and
> root-cause views."
>
> **Validation:** CONFIRMED. The UI has 16 page directories and 10 routes
> covering dashboards, sessions, pipeline, commands, agents, decisions,
> artifacts, questionnaires, observability, and governance. What's missing are
> the advanced platform visualization capabilities: lineage graphs, dependency
> views, execution replay, and confidence indicators.

---

## Rationale

The audit's strongest critique of the UI is not structural — it's about
**explanatory power**. A platform cockpit doesn't just display data; it explains
what's happening, why it matters, and what the operator should do next. This
milestone adds the visualization and interaction capabilities that close the gap
between "dashboard" and "cockpit."

---

## Issues

### M27-001: Implement artifact lineage graph visualization

**Labels:** `frontend`, `feature`, `traceability`

Create a visual lineage graph on the Artifacts page:

- Nodes = artifacts (documents, code, decisions, approvals)
- Edges = derivation relationships (artifact A was produced from artifact B)
- Interactive: click a node to see details, hover for summary
- Layout: left-to-right flow (input → processing → output)
- Filter by phase, type, or time range
- Use a lightweight graph library (e.g., `dagre` for layout, SVG rendering)

Data source: `platform/sdlc/traceability.ts` lineage graph.

**Acceptance criteria:**

- [ ] Lineage graph renders on the Artifacts page
- [ ] Nodes and edges reflect actual artifact relationships
- [ ] Interactive: click, hover, zoom, pan
- [ ] Filters work (phase, type, time)
- [ ] Empty state shows "No artifacts yet" with guidance

---

### M27-002: Implement execution timeline / replay view

**Labels:** `frontend`, `feature`, `observability`

Create an execution timeline on the Sessions page:

- Horizontal timeline of all state transitions in a session
- Each node: engine state, duration, agent invoked, outcome
- Color-coded: green (success), yellow (warning), red (failure), gray (skipped)
- Click a node to see: agent output path, gate validation result, errors
- Replay mode: step through the timeline sequentially with context at each point

Data source: session-state.json run history + audit trail events.

**Acceptance criteria:**

- [ ] Timeline renders all session state transitions
- [ ] States are color-coded by outcome
- [ ] Click reveals details (agent, output, errors)
- [ ] Timeline is scrollable for long sessions
- [ ] Works for both active and completed sessions

---

### M27-003: Implement dependency graph for decisions and gates

**Labels:** `frontend`, `feature`, `governance`

Create a dependency visualization on the Governance page:

- Show which decisions block which gates
- Show which gates block which sprints
- Show which questionnaires feed which decisions
- Interactive: click to navigate to the blocking item
- Highlight the critical path (blocking chain to next sprint)

**Acceptance criteria:**

- [ ] Dependency graph renders decision → gate → sprint relationships
- [ ] Blocking items are visually highlighted
- [ ] Critical path is identifiable
- [ ] Click navigates to the relevant decision/gate/sprint
- [ ] Updates in real-time as decisions are answered

---

### M27-004: Implement operator confidence indicators

**Labels:** `frontend`, `feature`, `ux`

Add contextual confidence signals throughout the UI:

- **Session health score:** composite of: % gates passed, % decisions resolved,
  % questionnaires complete, error count, time on track
- **Sprint readiness score:** % stories ready, blocking items count,
  dependency resolution
- **Agent confidence:** based on `UNCERTAIN:` and `INSUFFICIENT_DATA:` markers
  in agent output
- Display as color-coded badges on dashboard, session list, and pipeline

**Acceptance criteria:**

- [ ] Health scores visible on dashboard
- [ ] Scores computed from actual data (not hardcoded)
- [ ] Color coding: green (> 80%), yellow (50–80%), red (< 50%)
- [ ] Tooltip explains contributing factors
- [ ] Scores update in real-time

---

### M27-005: Implement human-approval workflow UI

**Labels:** `frontend`, `feature`, `governance`

Redesign the approval flow for clarity:

- Dedicated "Needs Your Attention" section on dashboard (from M21-002)
- Approval detail page: what needs approval, context, risk assessment,
  recommended action
- Side-by-side comparison for reevaluation approvals
- Approve/reject with required comment
- Approval history with rationale

**Acceptance criteria:**

- [ ] Approval items are prominently surfaced
- [ ] Detail page provides full context for informed decision
- [ ] Approve/reject requires a comment
- [ ] Approval history shows who approved what and why
- [ ] Notifications via SSE when new approval is needed

---

### M27-006: Implement root-cause analysis view

**Labels:** `frontend`, `feature`, `observability`

When a gate fails or agent reports errors, provide a root-cause drill-down:

- Failed gate → show which specific checks failed → link to source
- `UNCERTAIN:` items → show what data was missing → link to questionnaire
- `INSUFFICIENT_DATA:` items → show which agent flagged it → link to source
  document
- Sprint blocked → show the blocking chain → highlight the unresolved item

**Acceptance criteria:**

- [ ] Root-cause view accessible from any failed gate or error
- [ ] Drill-down shows cause chain (not just the symptom)
- [ ] Links to actionable items (questionnaire, decision, document)
- [ ] Works for both current and historical sessions

---

### M27-007: Add Storybook documentation for cockpit components

**Labels:** `storybook`, `docs`, `frontend`

Create comprehensive Storybook stories for all new cockpit components:

- Lineage graph: empty, simple (3 nodes), complex (20+ nodes)
- Timeline: single state, full session, failed session
- Dependency graph: no blockers, with blockers, critical path
- Confidence indicators: all green, mixed, all red
- Approval workflow: pending, approved, rejected

**Acceptance criteria:**

- [ ] All cockpit components have Storybook stories
- [ ] Stories cover key states (empty, typical, edge case)
- [ ] Storybook builds successfully
- [ ] Stories use realistic mock data
