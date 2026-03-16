# Phase 04 — Component Design Specifications

> M11: UI Redesign — Detailed component contracts for new and extracted components

---

## 1. New Runtime Domain Components

### 1.1 FlowTimeline

**Purpose:** Horizontal visualization of the session's phase progression.

```
Props:
  phases: FlowPhase[]        — ordered list of phases
  activePhaseId?: string     — currently running phase
  onPhaseClick?: (id) => void

FlowPhase:
  id: string
  label: string
  status: 'completed' | 'running' | 'pending' | 'failed' | 'paused'
```

**Visual:**

```
[Discovery ✔]──[Architecture ●]──[Planning ○]──[Implementation ○]──[Validation ○]
```

**States:**

- ✔ completed — green, filled check
- ● running — blue, pulsing dot
- ○ pending — gray, hollow circle
- ✖ failed — red, X
- ⏸ paused — amber, pause icon

**Implementation notes:**

- Responsive: horizontal on ≥ md, vertical on < md
- Connector lines between steps (CSS border or SVG)
- Active step subtly highlighted with ring

---

### 1.2 FlowStep

**Purpose:** Individual step within the FlowTimeline.

```
Props:
  label: string
  status: FlowStepStatus
  isActive: boolean
  onClick?: () => void
```

**Storybook:** Story with all 5 status combinations.

---

### 1.3 SessionStatus

**Purpose:** Compact active session summary card for the Overview page.

```
Props:
  session: Session | null
  progress: number
  activePhase?: string
  activeAgent?: string
  connectionStatus: ConnectionStatus
```

**Visual:**

```
┌─────────────────────────────────────────┐
│ ● Active Session                        │
│ CREATE / Project Phoenix                │
│ Phase: Architecture · 38%               │
│ Agent: DevOps Engineer                  │
│ ████████████████░░░░░░░ 38%            │
└─────────────────────────────────────────┘
```

---

### 1.4 AgentCard

**Purpose:** Live status card showing one agent's current activity.

```
Props:
  name: string
  status: 'idle' | 'running' | 'completed' | 'failed' | 'retrying'
  taskDescription?: string
  progress?: number         — 0-100
  startedAt?: string
  retryCount?: number
  onClick?: () => void
```

**Visual:**

```
┌─────────────────────────────┐
│ DevOps Engineer         ● ← pulsing when running
│ Generating Bicep infrastructure
│ ████████░░ 80%
│ Started 2m ago · 0 retries
└─────────────────────────────┘
```

**Animations:**

- `running`: pulsing blue dot, subtle gradient animation
- `retrying`: amber warning icon
- `failed`: red X with shake

---

### 1.5 AgentActivity

**Purpose:** Panel showing all active/recent agents.

```
Props:
  agents: AgentEntry[]
  onAgentClick?: (agentId: string) => void
```

Renders a vertical list of `AgentCard` components. Sorted: running first,
then completed, then pending.

---

### 1.6 RuntimeLog

**Purpose:** Scrollable chronological event stream with auto-scroll and filtering.

```
Props:
  events: RuntimeEvent[]
  maxVisible?: number       — default 100
  filter?: string[]         — event type filter
  autoScroll?: boolean      — default true
```

**Visual:**

```
┌─────────────────────────────────────────┐
│ ▼ Runtime Timeline              [Filter]│
│─────────────────────────────────────────│
│ 10:00 ● Session started                │
│ 10:02 ✔ Business Analyst completed     │
│ 10:05 ● Architecture phase started     │
│ 10:08 → DevOps agent executing         │
│ 10:10 📄 Artifact: architecture.md      │
│ 10:12 → Security agent executing       │
│                            [auto-scroll]│
└─────────────────────────────────────────┘
```

---

### 1.7 RuntimeEvent

**Purpose:** Single event row in the RuntimeLog.

```
Props:
  type: TimelineEventType
  timestamp: string
  description: string
  agent?: string
  phase?: string
  artifactId?: string
```

**Type → Icon mapping:**

- `session_start` → Play
- `phase_start` → GitBranch
- `phase_complete` → CheckCircle
- `agent_start` → Radio (pulsing)
- `agent_complete` → CheckCircle
- `artifact_created` → FileText
- `gate_passed` → ShieldCheck
- `gate_failed` → ShieldAlert
- `error` → XCircle
- `retry` → RefreshCw

---

### 1.8 GateStatus

**Purpose:** Gate pass/fail indicator with optional explainability.

```
Props:
  gateId: string
  label: string
  status: 'passed' | 'pending' | 'blocked' | 'failed'
  reason?: string
  suggestedAction?: string
  onClick?: () => void
```

---

### 1.9 ExplainabilityPanel

**Purpose:** Contextual panel explaining why a gate failed or an agent retried.

```
Props:
  title: string             — e.g., "Gate Failed" or "Agent Retry"
  reason: string            — plain text explanation
  suggestedAction?: string  — what the user can do
  details?: Record<string, string>  — additional metadata
  onDismiss: () => void
```

**Visual:**

```
┌─────────────────────────────────────────┐
│ ⚠ Security Gate Failed           [×]   │
│─────────────────────────────────────────│
│ Reason:                                 │
│ Architecture missing authentication     │
│ model.                                  │
│                                         │
│ Suggested Action:                       │
│ Add OAuth strategy decision.            │
│                                 [Go →]  │
└─────────────────────────────────────────┘
```

---

### 1.10 PhaseCard (Extracted)

**Source:** Currently inline in `pipeline-page.tsx`

```
Props:
  phase: PhaseEntry
  isExpanded: boolean
  onToggle: () => void
```

**Changes from current:**

- Extract from page file to `components/runtime/phase-card.tsx`
- Add Storybook story
- Add unit test
- No functional changes

---

## 2. Extracted Decision Components

### 2.1 LifecycleFlow (Extracted)

**Source:** Currently inline in `decisions-page.tsx`

```
Props:
  status: string
  steps?: string[]  — default ['OPEN', 'DECIDED']
```

Move to `components/decisions/lifecycle-flow.tsx`. Add story.

### 2.2 CreateDecisionDialog (Extracted)

**Source:** Currently inline in `decisions-page.tsx` (~60 lines)

```
Props:
  open: boolean
  onOpenChange: (open: boolean) => void
```

Uses `useCreateDecision` hook internally. Move to
`components/decisions/create-decision-dialog.tsx`. Add story.

---

## 3. Extracted Artifact Components

### 3.1 DagNode (Extracted)

**Source:** Currently inline in `lineage-page.tsx`

```
Props:
  node: LineageNode
  selected: boolean
  onClick: () => void
```

Move to `components/artifacts/dag-node.tsx`. Add story.

### 3.2 DagEdge (Extracted)

**Source:** Currently inline in `lineage-page.tsx`

```
Props:
  edge: LineageEdge
```

Move to `components/artifacts/dag-edge.tsx`. Add story.

---

## 4. Extracted Observability Components

### 4.1 MiniBar (Extracted)

**Source:** Currently inline in `analytics-trends-page.tsx`

```
Props:
  value: number
  max: number
  color: string  — Tailwind class
```

Move to `components/ui/mini-bar.tsx`. Add story. This is a generic
UI primitive.

### 4.2 VelocityChart (Extracted)

**Source:** Currently inline in `analytics-trends-page.tsx`

```
Props:
  data: VelocityTrendEntry[]
```

Move to `components/observability/velocity-chart.tsx`. Add story.

### 4.3 AgentChart (Extracted)

**Source:** Currently inline in `analytics-trends-page.tsx`

```
Props:
  data: AgentPerformanceStats[]
```

Move to `components/observability/agent-chart.tsx`. Add story.

---

## 5. New Shared UI Primitives

### 5.1 StatusDot

**Purpose:** Colored dot indicating status, used across many components.

```
Props:
  status: 'active' | 'completed' | 'pending' | 'error' | 'warning'
  animated?: boolean  — pulse animation for active
  size?: 'sm' | 'md' | 'lg'
```

### 5.2 TimelineConnector

**Purpose:** Visual connector between timeline items (vertical or horizontal).

```
Props:
  orientation: 'horizontal' | 'vertical'
  active?: boolean
```

---

## 6. Onboarding Components

### 6.1 WelcomeWizard

**Purpose:** First-time user guided flow.

```
Props:
  onDismiss: () => void
  onStartCreate: () => void
```

**Steps:**

1. Welcome message explaining the system
2. Create project brief
3. Start CREATE workflow
4. Monitor progress
5. Review and approve

**Persistence:** Show once, store dismissal in `localStorage`.

---

## 7. Component Size Targets

| Component Category | Target Max Lines | Rationale                 |
| ------------------ | ---------------- | ------------------------- |
| UI Primitives      | 80               | Single responsibility     |
| Domain Components  | 120              | Focused domain logic      |
| Page Components    | 150              | Composition + layout only |
| Test Files         | No limit         | Thoroughness > brevity    |
| Storybook Stories  | 80               | One story per variant     |

---

## 8. Storybook Story Requirements

Each new/extracted component must have a story before being used in a page:

| Component            | Story Variants                                      |
| -------------------- | --------------------------------------------------- |
| FlowTimeline         | empty, all-pending, mid-progress, completed, failed |
| FlowStep             | each status × active/inactive                       |
| SessionStatus        | active, idle, error, no-session                     |
| AgentCard            | running, completed, failed, retrying, idle          |
| AgentActivity        | empty, single-agent, multi-agent                    |
| RuntimeLog           | empty, few-events, many-events, filtered            |
| RuntimeEvent         | each event type                                     |
| GateStatus           | passed, pending, blocked, failed                    |
| ExplainabilityPanel  | gate-failure, agent-retry, generic                  |
| MiniBar              | 0%, 50%, 100%, various colors                       |
| VelocityChart        | single-sprint, multi-sprint, empty                  |
| AgentChart           | single-agent, multi-agent, high-failure             |
| LifecycleFlow        | OPEN, DECIDED                                       |
| CreateDecisionDialog | open, closing                                       |
| DagNode              | each status, selected/unselected                    |
| WelcomeWizard        | step-1 through step-5                               |
