# Agentic SDLC — Navigation Architecture, Design System Specification, and User Journeys

## 1. Product UX Positioning

This product should be designed as a **governed operational control plane for human-in-the-loop software delivery**.

It is not primarily:

- a chat application
- a conventional project management tool
- a generic DevOps dashboard
- an agent playground

It is primarily:

- a **control surface** for governed execution
- a **decision system** for human approvals and escalations
- an **evidence system** for traceability and auditability
- an **operational console** for runtime health and delivery flow

The UX must therefore optimize for:

- clarity of system state
- visibility of control boundaries
- explainability of actions and outcomes
- auditability of decisions
- safe delegation to agents
- fast operator comprehension under pressure

---

## 2. Information Architecture

### 2.1 Top-level product architecture

The navigation should be structured around how users mentally operate the system.

#### Primary navigation

1. **Overview**
2. **Workspaces**
3. **Runs**
4. **Approvals**
5. **Policies**
6. **Agents**
7. **Prompts & Contracts**
8. **Audit & Evidence**
9. **Observability**
10. **Administration**

This order is deliberate.

- **Overview** answers: what is happening overall?
- **Workspaces** answers: where is it happening?
- **Runs** answers: what governed execution is currently in motion?
- **Approvals** answers: what needs human action?
- **Policies** answers: what rules are shaping runtime behavior?
- **Agents** answers: which runtime actors exist and how are they controlled?
- **Prompts & Contracts** answers: what defines agent behavior and interfaces?
- **Audit & Evidence** answers: what happened and how can it be reconstructed?
- **Observability** answers: is the platform healthy and trending well?
- **Administration** answers: who has authority and what is connected?

### 2.2 Navigation layers

The system should use **three navigation layers**.

#### Layer 1 — Global navigation

Persistent left navigation or collapsible enterprise sidebar.

Purpose:

- switch product domains
- preserve orientation
- communicate product structure

#### Layer 2 — Domain tabs

Contextual top tabs within a domain page.

Examples:

- Workspace: Summary, Repositories, Runs, Agents, Policies, Integrations, Audit
- Agent Registry: Registry, Selected Agent, Permissions, Tools, Activity, Incidents
- Administration: Overview, Roles, Permissions, Integrations, Access Reviews, Tenancy, Security

Purpose:

- reduce page sprawl
- keep related content grouped
- support power-user scanning

#### Layer 3 — Drill-down path / breadcrumb

Persistent breadcrumb above page header.

Examples:

- Overview / Customer Experience Platform / RUN-2421
- Policies / External Connector Controls / GOV-214
- Agents / Builder Agent / Activity / RUN-2421

Purpose:

- maintain orientation in deep operational flows
- show hierarchy of context
- provide quick upward traversal

---

## 3. Global Layout Model

### 3.1 Standard page shell

Every major page should follow a consistent shell:

1. **Global sidebar**
2. **Page header**
3. **Context strip**
4. **Primary body**
5. **Secondary supporting panels**
6. **Utility actions**

### 3.2 Page header pattern

Every page header should contain:

- page label in small uppercase overline
- page title
- one-sentence operational explanation
- context badges when relevant
- one primary action button
- optional one secondary action button

This creates strong consistency and immediate orientation.

### 3.3 Context strip pattern

Below each header, use a compact strip for key context.

Examples:

- current workspace
- current run state
- risk tier
- environment
- decision owner
- active filters

This prevents users from losing critical operational context when navigating deeper.

### 3.4 Panel grammar

The UI should consistently use the following panel types:

#### Summary card

For KPI or state summary.

#### Operational card

For actionable items like runs, approvals, policies, or alerts.

#### Evidence card

For linked artifacts, logs, evidence packs, contracts, or policy basis.

#### Guidance card

For design principles, warnings, explanatory text, or governance guidance.

#### Triage list

For queues, event feeds, incident streams, approval lists.

---

## 4. Design System Specification

## 4.1 Visual character

The visual language should feel:

- precise
- sober
- enterprise-grade
- modern
- high trust
- low ambiguity

It should not feel:

- playful
- experimental
- chat-centric
- AI-gimmicky
- overly futuristic

### 4.2 Color strategy

Use a restrained dark theme as the default control-plane presentation.

#### Base surfaces

- Background: deep slate / graphite
- Primary surface: slightly elevated dark neutral
- Secondary surface: darker inset surface
- Border: subtle low-contrast border

#### Semantic accents

- Informational / selected / navigational emphasis: cyan or cool blue
- Healthy / compliant / approved: emerald
- Warning / review required / degraded: amber
- Critical / blocked / denied: rose or red
- Neutral metadata: muted slate

#### Rule

Color must communicate state first and brand second.

### 4.3 Typography

Typography should be highly legible and hierarchical.

Recommended scale:

- Overline / section marker
- Page title
- Section heading
- Card heading
- Body text
- Supporting metadata
- Micro-labels / timestamps / badges

Typography should emphasize:

- short scan paths
- compact but not cramped density
- strong distinction between headings and metadata

### 4.4 Spacing and rhythm

The system should use a disciplined spacing scale with generous internal padding.

Guidelines:

- rounded containers for primary panels
- clear separation between page sections
- enough whitespace to let dense information breathe
- no visually noisy data tables by default unless necessary

### 4.5 Component standards

#### Badges

Used for:

- risk levels
- status labels
- enforcement types
- role types
- health states

Badges must be:

- compact
- consistent in casing
- semantically colored
- never overloaded with too much text

#### Buttons

Three primary levels:

- Primary action
- Secondary action
- Tertiary / contextual action

Destructive or override actions must always be visually distinct.

#### Tables vs cards

Use **cards** when the user needs contextual interpretation.
Use **tables** when the user needs density, scanning, bulk comparison, or sorting.

This product should default more often to **cards and structured panels** than raw tables, especially for:

- approvals
- runs
- policies
- agent definitions
- audit events

### 4.6 Motion and interaction feedback

Motion should be subtle and informative.

Use it for:

- state transitions
- expanding evidence detail
- loading and asynchronous confirmation
- queue updates
- panel opening

Avoid decorative motion.

Feedback must clearly communicate:

- pending action
- accepted action
- rejected action
- system processing
- blocked action
- approval recorded
- evidence export generated

---

## 5. Cross-Cutting UX Rules

## 5.1 The user must never ask “why is this blocked?”

Blocked states must always show:

- reason
- policy or control basis
- owner
- required evidence or action
- next path to unblock

## 5.2 The user must never ask “who owns this decision?”

Every decision object must display:

- decision owner
- due time
- urgency
- escalation path
- downstream effect of approval or rejection

## 5.3 The user must never ask “what exactly did the agent do?”

Agent-related views must always expose:

- action taken
- scope used
- tool invoked
- resulting artifact or output
- policy evaluation if relevant
- human escalation if triggered

## 5.4 The user must never ask “where is the evidence?”

For every high-impact object, expose linked evidence directly from the object.

High-impact objects include:

- approvals
- blocked runs
- policy triggers
- exceptions
- contract changes
- permission escalations
- deployment decisions

## 5.5 The user must never lose context while drilling down

Deep views must retain:

- workspace
- run
- selected policy / agent / approval / event
- status context
- breadcrumb

---

## 6. Page-to-Page Navigation Architecture

## 6.1 Recommended page relationships

### Overview → Workspace Overview

Used when user sees operational pressure and wants bounded context.

### Overview → Approval Center

Used when user sees pending human decisions.

### Workspace Overview → Run Detail

Used when user wants to inspect one governed execution case.

### Run Detail → Approval Center

Used when a run is blocked by human action.

### Run Detail → Audit & Evidence

Used when the user needs forensic detail.

### Approval Center → Policies

Used when the user wants to inspect rule basis.

### Approval Center → Audit & Evidence

Used when the user needs evidence before deciding.

### Agent Registry → Prompt & Contract Management

Used when the user needs to understand the behavioral definition of an agent.

### Policy Center → Audit & Evidence

Used when the user wants to inspect a real enforcement event.

### Observability → Run Detail / Agent Registry / Approvals

Used when a trend or alert requires operational intervention.

### Administration → Policies / Agents / Workspaces

Used when authority or trust boundaries need to be changed.

---

## 7. End-to-End User Journeys

## 7.1 Journey A — Executive checks platform state

### User

Executive, platform owner, head of engineering, enterprise architect

### Goal

Understand whether the platform is operating safely and whether human action is required.

### Flow

1. Open **Overview**
2. Review KPI strip and approval pressure
3. See blocked runs and governance findings
4. Open **Workspace Overview** for affected domain
5. Open **Run Detail** for highest-risk blocked run
6. See required decision owner and impact
7. Route to **Approval Center** if intervention is needed

### UX requirement

This journey must take less than one minute to understand:

- current pressure
- affected workspace
- specific blocked run
- current owner of next action

## 7.2 Journey B — Security Officer reviews high-risk approval

### User

Security Officer

### Goal

Decide whether to allow a risky connector or permission request.

### Flow

1. Open **Approval Center**
2. Filter to Critical approvals
3. Select approval request
4. Review rationale, impact, scope, policy basis, blast radius
5. Open linked **Audit & Evidence** artifacts if needed
6. Optionally open **Policy Center** for rule details
7. Approve with constraints, reject, delegate, or request evidence
8. System records decision and returns user to updated queue

### UX requirement

The decision surface must minimize context switching while preserving safety.

## 7.3 Journey C — Workspace Governor investigates blocked run

### User

Workspace Governor or delivery lead

### Goal

Understand why a run is blocked and restore safe progression.

### Flow

1. Open **Workspace Overview**
2. Inspect active runs queue
3. Open **Run Detail**
4. See timeline, blockers, evidence, and current decision queue
5. If governance-related, open **Approval Center**
6. If policy-related, open **Policy Center**
7. If behavior-definition-related, open **Prompt & Contract Management**
8. Resolve issue and return to updated run state

### UX requirement

The run page must narrate the case without requiring reconstruction from low-level logs.

## 7.4 Journey D — Agent Maintainer updates contract or prompt

### User

Agent Maintainer, platform engineer

### Goal

Safely modify behavioral assets without introducing drift or unsafe runtime change.

### Flow

1. Open **Prompt & Contract Management**
2. Search for asset
3. Review current approved version
4. Inspect validation results and version history
5. Open diff view
6. Submit change request
7. Route to governance review
8. Monitor approval state and eventual rollout

### UX requirement

Behavioral assets must feel like governed software assets, not hidden text blobs.

## 7.5 Journey E — Auditor reconstructs an event

### User

Auditor, compliance lead, security reviewer

### Goal

Understand exactly what happened for a run, approval, or policy incident.

### Flow

1. Open **Audit & Evidence**
2. Search by run, policy, agent, approval, or event ID
3. Select event
4. Review narrative, evidence pack, linked artifacts, and timeline
5. Verify chain of custody
6. Export evidence bundle if required

### UX requirement

Audit users must be able to reconstruct events without specialist platform knowledge.

## 7.6 Journey F — Operator investigates degraded system health

### User

Platform operator, SRE, service owner

### Goal

Diagnose why the platform is trending toward failure or friction.

### Flow

1. Open **Observability**
2. Inspect KPI strip and alert triage
3. Review run health and runtime health panels
4. Open affected **Agent Registry** entry or **Run Detail**
5. Correlate approval latency, blocked runs, agent errors, and policy triggers
6. Route issue to appropriate owner

### UX requirement

The page must help operators understand causality, not just show disconnected signals.

## 7.7 Journey G — Administrator reviews privilege and integrations

### User

Platform Administrator, IAM administrator, security admin

### Goal

Ensure that authority, connector trust, and privileged scopes remain appropriate.

### Flow

1. Open **Administration**
2. Review role model and privileged concentration
3. Inspect selected role permissions
4. Review integration trust posture
5. Open access reviews
6. Recertify, escalate, or reduce authority

### UX requirement

Privilege must be explainable in operational language, not only via technical permission labels.

---

## 8. Recommended Global Objects and Their Canonical Fields

To keep the product coherent, each object type should have a canonical information pattern.

## 8.1 Run

- Run ID
- Title
- Workspace
- Current phase
- State
- Risk tier
- Owner
- Repo scope
- Trigger source
- Linked approvals
- Linked evidence
- Timeline

## 8.2 Approval

- Approval ID
- Title
- Category
- Workspace
- Linked run
- Owner
- Due time
- Risk
- Rationale
- Impact
- Scope
- Decision options
- Evidence pack

## 8.3 Policy

- Policy ID
- Title
- Domain
- Severity
- Enforcement mode
- Scope
- Owner
- Trigger history
- Exceptions
- Drift findings
- Linked evidence

## 8.4 Agent

- Name
- Role
- Version
- Workspace scope
- Runtime state
- Risk tier
- Tool scope
- Write scope
- Escalation model
- Recent actions
- Health metrics

## 8.5 Prompt / Contract Asset

- Asset name
- Asset type
- Version
- Scope
- Owner
- Approval state
- Validation state
- Drift state
- Version history
- Linked change requests

## 8.6 Audit Event

- Event ID
- Event type
- Title
- Primary actor
- Time
- Workspace
- Run / agent / policy relation
- Severity
- Narrative
- Evidence pack
- Artifact links
- Chain of custody

---

## 9. Recommended Design System Token Categories

A full implementation should define at least these token groups:

- color.semantic
- color.surface
- color.border
- color.text
- spacing
- radius
- shadow
- typography.size
- typography.weight
- typography.tracking
- motion.duration
- motion.easing
- z-index layers
- status tokens
- badge tokens
- button tokens
- card tokens

---

## 10. Recommended Component Inventory

A real implementation should create a reusable component set for:

- AppShell
- SidebarNav
- PageHeader
- ContextStrip
- KPIStatCard
- RiskBadge
- StatusBadge
- ApprovalCard
- RunCard
- PolicyCard
- AgentCard
- EvidenceCard
- TimelineList
- ActivityFeed
- GuidanceCallout
- SplitDecisionPanel
- EmptyState
- FilterBar
- SearchCommandBar
- DetailDrawer
- DiffViewer
- ExportActionBar
- AccessReviewCard
- IntegrationTrustCard

---

## 11. Core UX Risks to Avoid

### 11.1 Over-chatification

Do not make the platform feel like users must talk to the system to understand it.

### 11.2 Hidden governance

Do not bury approvals, policies, or exceptions in settings.

### 11.3 Log overload

Do not confuse evidence with undifferentiated raw logs.

### 11.4 Flat navigation

Do not mix workspaces, runs, agents, policies, and admin features without hierarchy.

### 11.5 Unclear ownership

Do not display critical objects without owner, due time, and next action.

### 11.6 Decorative AI branding

Do not use glowing sci-fi styling that reduces trust and operational seriousness.

---

## 12. Implementation Recommendation

The implementation should proceed in this order:

### Phase 1 — Structural shell

- app shell
- global navigation
- page header system
- context strip
- stat cards
- badge system

### Phase 2 — Core operational objects

- run card
- approval card
- policy card
- agent card
- evidence card
- timeline

### Phase 3 — Decision and evidence flows

- approval workstation
- audit explorer
- prompt/contract diffing
- policy exception flows

### Phase 4 — Runtime operations

- observability views
- alert triage
- telemetry stream monitoring
- access reviews and admin trust posture

---

## 13. Final UX Verdict

For this product to stand out, the UI/UX must communicate one thing extremely clearly:

**this is a governed, inspectable, enterprise-grade software delivery control plane where agents operate under visible boundaries and humans remain accountable for critical decisions**.

If the interface achieves that, the platform will feel differentiated.
If it does not, it will feel like another agent orchestration demo with extra screens.
