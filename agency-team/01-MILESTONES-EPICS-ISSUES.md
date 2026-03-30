# Agency Team Integration — GitHub Milestones, Epics & Issues

> Ready to import into GitHub for maximum traceability and team coordination  
> Format: GitHub-compatible markdown  
> Based on: [00-SYNTHESIS.md](00-SYNTHESIS.md)

---

## MILESTONES

---

### M1 — Agent Registry & Metadata

**Title**: `[Agency Team] M1: Agent Registry & Metadata`

**Description**:
Catalog all 191 agency agents + 39 SDLC agents with structured metadata. Foundation for all subsequent integration phases. No orchestrator changes yet — just cataloging and schema.

**Success criteria**:

- [ ] Agent registry JSON file created with all 230 agents
- [ ] Metadata schema defined and validated (TypeScript type definitions)
- [ ] Agent search/filter utilities working (query by domain, capability, timeline)
- [ ] Metadata validation tests covering all agents
- [ ] Migration guide: convert agent personalities → registry format
- [ ] Registry documented in README with examples

**Dependencies:** None  
**Estimated Timeline:** 1–2 weeks  
**Blocks:** M2, M3, M4

---

### M2 — Handoff Protocol Standardization

**Title**: `[Agency Team] M2: Handoff Protocol Standardization`

**Description**:
Define unified output format for all agents (SDLC + agency) and create validation. Enables composability and orchestrator-aware team assembly.

**Success criteria**:

- [ ] Standardized handoff template defined (markdown format)
- [ ] Validation schema created (what makes a valid handoff)
- [ ] Examples from ≥5 SDLC agents + ≥5 agency agents showing compliance
- [ ] All 39 SDLC agents audited for handoff compliance (update if needed)
- [ ] Template + examples provided for new agency agents to follow
- [ ] Handoff protocol documented with rationale and examples

**Dependencies:** M1

**Estimated Timeline:** 1 week  
**Blocks:** M3, M4

---

### M3 — Orchestrator Enhancement — Task-Aware Assembly

**Title**: `[Agency Team] M3: Task-Aware Agent Assembly in Orchestrator`

**Description**:
Enhance orchestrator to analyze task requirements and assemble agent teams dynamically. Task schema, matching algorithm, team composition.

**Success criteria**:

- [ ] Task schema defined and documented (goal, domains, constraints, timeline)
- [ ] Agent matching algorithm implemented and tested
- [ ] Team composition engine (orders agents, manages dependencies)
- [ ] Team configuration library with ≥10 pre-built successful patterns
- [ ] Fallback/retry logic for agent failures
- [ ] Orchestrator can recommend agent teams for a given task
- [ ] Unit tests for matching algorithm (≥20 test cases)

**Dependencies:** M1, M2  
**Estimated Timeline:** 2–3 weeks  
**Blocks:** M4

---

### M4 — Hybrid Execution Model

**Title**: `[Agency Team] M4: Hybrid SDLC + Agency Execution Model`

**Description**:
Orchestrator can run pure-SDLC, pure-agency, and hybrid workflows. Full integration point for both agent ecosystem types.

**Success criteria**:

- [ ] Execution modes implemented: SDLC_ONLY, AGENCY_ONLY, HYBRID
- [ ] Context passing between SDLC and agency agents (file-based)
- [ ] Unified quality gates: Critic Agent validates both types
- [ ] State management: track agent progress, blockers, decisions
- [ ] Outcome tracking for team compositions
- [ ] ≥3 pilot projects completed using hybrid model
- [ ] Integration tests covering all execution modes

**Dependencies:** M1, M2, M3  
**Estimated Timeline:** 3–4 weeks  
**Blocks:** M5

---

### M5 — Learning & Optimization (Continuous)

**Title**: `[Agency Team] M5: Learning & Optimization Engine`

**Description**:
Orchestrator improves team assembly over time based on outcomes. Recommendation engine, pattern analysis, quarterly optimization cycles.

**Success criteria**:

- [ ] Outcome tracking dataset implemented (success rate per composition)
- [ ] Pattern analysis: identify which agent pairs/trios work best
- [ ] Recommendation engine suggests better teams for similar future tasks
- [ ] Feedback loop: Critic scores feed back into agent performance metrics
- [ ] Quarterly optimization review and registry updates
- [ ] Dashboard showing agent utilization, success rates, improvement trends

**Dependencies:** M4  
**Estimated Timeline:** 2–3 weeks (ongoing)

---

## EPICS

---

### Epic 1: Agent Metadata Extraction & Schema

**Title**: `[Agency Team] Epic: Agent Metadata Extraction & Registry Schema`

**Description**:
Extract structured metadata from all 230 agents (domain, capabilities, inputs, outputs, success patterns). Design and validate registry schema.

**Source**: [00-SYNTHESIS.md — Agent Registry Schema](00-SYNTHESIS.md#agent-registry-schema)  
**Milestone:** M1  
**Labels:** `agency-team`, `architecture`, `backend`

**Acceptance criteria:**

- [ ] Agent Registry schema designed (see SYNTHESIS document)
- [ ] TypeScript interfaces for registry metadata
- [ ] Metadata extracted for all 191 agency agents
- [ ] Metadata extracted for all 39 SDLC agents
- [ ] Schema validation tests (Zod or similar)
- [ ] Registry JSON file generated with all 230 agents
- [ ] No data loss: every agent mapped with complete metadata

---

### Epic 2: Agent Search & Discovery

**Title**: `[Agency Team] Epic: Agent Search, Query & Discovery Utilities`

**Description**:
UI and programmatic tools for discovering agents by domain, capability, timeline, and other criteria.

**Source**: [00-SYNTHESIS.md — Orchestrator Task-Aware Assembly](00-SYNTHESIS.md#orchestrator-enhancement--task-aware-assembly)  
**Milestone:** M1  
**Labels:** `agency-team`, `discovery`, `devtools`

**Acceptance criteria:**

- [ ] Agent search API: by domain, capability, timeline estimate
- [ ] CLI tool: `agent-registry search --domain game-development --capability "3D physics"`
- [ ] Agent profile view: name, description, capabilities, success rate, related agents
- [ ] Filter by success rate, team experience, timeline constraints
- [ ] Integration with orchestrator for team assembly
- [ ] Documentation with examples

---

### Epic 3: Handoff Protocol & Validation

**Title**: `[Agency Team] Epic: Unified Handoff Protocol & Format Validation`

**Description**:
Design standardized handoff template for all agents. Validation ensures outputs are composable.

**Source**: [00-SYNTHESIS.md — Unified Handoff Protocol](00-SYNTHESIS.md#unified-handoff-protocol)  
**Milestone:** M2  
**Labels:** `agency-team`, `quality`, `standards`

**Acceptance criteria:**

- [ ] Handoff template markdown format designed and documented
- [ ] Validation schema created (mandatory sections, optional sections)
- [ ] Template examples from ≥5 SDLC agents + ≥5 agency agents
- [ ] All SDLC agents audit: do they already meet the format? (update if not)
- [ ] Validation tests: verify sample handoffs pass/fail correctly
- [ ] Developer guide: how new agents should format outputs
- [ ] Integration with session state (each handoff stored and traceable)

---

### Epic 4: Task-to-Team Matching Algorithm

**Title**: `[Agency Team] Epic: Task-to-Agent Matching & Team Assembly Logic`

**Description**:
Given a task (goal, domains, constraints), find the best agent team to execute it.

**Source**: [00-SYNTHESIS.md — Orchestrator Enhancement](00-SYNTHESIS.md#phase-m3-orchestrator-enhancement--task-aware-assembly)  
**Milestone:** M3  
**Labels:** `agency-team`, `orchestrator`, `matching-engine`

**Acceptance criteria:**

- [ ] Task schema defined (goal, domains, constraints, timeline, budget)
- [ ] Matching algorithm: finds agents matching task requirements
- [ ] Team composition engine: orders agents respecting dependencies
- [ ] Pre-built team patterns library (startup MVP, enterprise feature, game dev, etc.)
- [ ] Fallback logic: if primary agent unavailable, suggest alternates
- [ ] Confidence scoring: how confident is the recommendation?
- [ ] Unit tests: ≥20 test cases covering different task types

---

### Epic 5: Execution Mode: Pure Agency (New)

**Title**: `[Agency Team] Epic: Pure-Agency Execution Mode`

**Description**:
Orchestrator can assemble and run task-specific teams using only agency agents (skip SDLC structure).

**Source**: [00-SYNTHESIS.md — Path 2: Specialized Domain Tasks](00-SYNTHESIS.md#path-2-specialized-domain-tasks-single-domain-expertise)  
**Milestone:** M4  
**Labels:** `agency-team`, `orchestrator`, `execution`

**Acceptance criteria:**

- [ ] AGENCY_ONLY execution mode defined
- [ ] Lightweight quality gates (Reality Checker as final validator)
- [ ] Context passing between agency agents
- [ ] Session state management for pure-agency workflows
- [ ] ≥3 pilot projects completed in AGENCY_ONLY mode
- [ ] Failure handling and retry logic
- [ ] Integration tests

---

### Epic 6: Execution Mode: Hybrid (SDLC + Agency)

**Title**: `[Agency Team] Epic: Hybrid SDLC + Agency Execution Model`

**Description**:
Orchestrator runs SDLC phases as a backbone and injects agency agents where specialized domain expertise is needed.

**Source**: [00-SYNTHESIS.md — Path 3: Hybrid Tasks](00-SYNTHESIS.md#path-3-hybrid-tasks-multiple-domains--sdlc-structure)  
**Milestone:** M4  
**Labels:** `agency-team`, `orchestrator`, `execution`, `integration`

**Acceptance criteria:**

- [ ] HYBRID execution mode defined
- [ ] Decision points in SDLC phases where agency agents can be injected
- [ ] Context passing: SDLC agent outputs → agency agent inputs and vice versa
- [ ] Unified quality gates: Critic Agent validates both types
- [ ] Dependency tracking (e.g., if blockchain auditor finds issues, loop back to engineer)
- [ ] ≥3 pilot projects completed in HYBRID mode
- [ ] Integration tests covering hand-offs between SDLC and agency agents

---

### Epic 7: Outcome Tracking & Learning

**Title**: `[Agency Team] Epic: Outcome Tracking & Pattern-Based Learning`

**Description**:
Orchestrator learns from past team compositions: which agents work well together, which combinations succeed/fail.

**Source**: [00-SYNTHESIS.md — Phase M5](00-SYNTHESIS.md#phase-m5-learning--optimization)  
**Milestone:** M5  
**Labels:** `agency-team`, `learning`, `optimization`

**Acceptance criteria:**

- [ ] Outcome tracking: capture success/failure of every agent activation
- [ ] Dataset schema: agent combo, task type, success rate, quality score, timeline
- [ ] Pattern analysis: identify successful team patterns by task type
- [ ] Performance metrics: track success rate per agent over time
- [ ] Recommendation refinement: use outcomes to improve team suggestions
- [ ] Quarterly optimization cycle defined and documented
- [ ] Dashboard: visualize agent performance, team patterns, improvement trends

---

### Epic 8: Agent Registry Documentation & Tooling

**Title**: `[Agency Team] Epic: Agent Registry Documentation, Migration & Tooling`

**Description**:
User-facing documentation, CLI tools, and migration guides for the agent registry.

**Source**: [00-SYNTHESIS.md — Implementation Strategy](00-SYNTHESIS.md#part-3-implementation-strategy)  
**Milestone:** M1  
**Labels:** `agency-team`, `documentation`, `devtools`

**Acceptance criteria:**

- [ ] README: what is the agent registry, how to use it
- [ ] CLI tools: search agents, view profiles, propose teams for a task
- [ ] Migration guide: convert existing agent personalities to registry format
- [ ] Examples: complete workflows showing agent registry in action
- [ ] Troubleshooting guide: common issues and solutions

---

## ISSUES

### M1: Agent Registry & Metadata

---

#### Issue M1-1: Design Agent Registry Schema

**Title**: `[Agency Team] Design Agent Registry Schema`

**Labels:** `agency-team`, `M1`, `schema`, `architecture`  
**Milestone:** M1  
**Epic:** Epic 1  
**Estimate:** 1 day

**Body:**
Design the TypeScript/JSON schema for the agent registry. Reference the Agent Registry Schema section in SYNTHESIS document.

**Required schema fields:**

- Identity: `id`, `name`, `description`, `domain[]`, `color`, `emoji`, `vibe`
- Capability: `capabilities[]`, `inputs[]`, `outputs[]`, `minPrerequisites[]`, `optionalInputs[]`
- Constraints: Timeline estimate, max retries, success rate
- Activation: Skill file path, required tools
- Relationships: Works well with, conflicts with, suggested sequences
- Performance metrics: Success rate, quality score, common failures

**Acceptance criteria:**

- [ ] Schema document created and reviewed
- [ ] TypeScript interfaces auto-generated from schema
- [ ] Validation rules defined (e.g., domain must be one of 16 known domains)
- [ ] Examples for 5 different agent types (SDLC, game designer, marketing, compliance, infrastructure)

---

#### Issue M1-2: Extract Metadata for all 191 Agency Agents

**Title**: `[Agency Team] Extract metadata for all 191 agency agents`

**Labels:** `agency-team`, `M1`, `data-extraction`  
**Milestone:** M1  
**Epic:** Epic 1  
**Estimate:** 3 days

**Body:**
Read all 191 agency markdown files and extract metadata into structured format per the schema.

**For each agent file, extract:**

- Name, description, domain(s), capabilities
- Input/output expectations
- Timeline estimate (inferred from agent description or estimate from similar agents)
- Emoji, vibe, color (from YAML frontmatter if present)
- Related agents / common patterns
- Success rate (default to 85 if not determinable; will refine in M5)

**Output:**

- One JSON entry per agent in the registry
- Data quality checklist: no missing required fields
- Gap report: which agents have incomplete metadata

**Acceptance criteria:**

- [ ] All 191 agents extracted
- [ ] No missing required fields (escalate to domain expert if unclear)
- [ ] Spot-check: 10 random agents manually verified against original files
- [ ] Agent registry JSON file generated and validated against schema

---

#### Issue M1-3: Extract & Validate Metadata for 39 SDLC Agents

**Title**: `[Agency Team] Extract metadata for 39 SDLC agents`

**Labels:** `agency-team`, `M1`, `data-extraction`  
**Milestone:** M1  
**Epic:** Epic 1  
**Estimate:** 2 days

**Body:**
Extract metadata from templates/sdlc/agents for all 39 SDLC agents.

**Differences vs. agency agents:**

- SDLC agents have explicit phase (PHASE_1, PHASE_2, etc.)
- Handoff protocols already documented (may require format standardization in M2)
- Success rates more determinable (they have output contract specifications)

**Output:**

- JSON entries for all 39 SDLC agents
- Phase mapping: which phase does each agent run in
- Gate mapping: which agents are quality gatekeepers
- Ordered sequences: which agents must run before which

**Acceptance criteria:**

- [ ] All 39 agents extracted
- [ ] Phase and sequence information captured
- [ ] Merged with M1-2 output: 230-agent registry complete

---

#### Issue M1-4: Agent Registry Search & Query API

**Title**: `[Agency Team] Build agent registry search and query API`

**Labels:** `agency-team`, `M1`, `api`, `backend`  
**Milestone:** M1  
**Epic:** Epic 2  
**Estimate:** 1 day

**Body:**
Implement search/filter utilities for the agent registry. Support queries by domain, capability, timeline, success rate, etc.

**API design:**

```typescript
// Search agents by criteria
queryAgents({
  domain?: string[];          // e.g., ["game-development", "AI"]
  capability?: string[];      // e.g., ["gameplay-loop-design"]
  timeline?: string;          // "1-3 days", "<4 hours"
  minSuccessRate?: number;    // 0-100
  sortBy?: 'name' | 'success_rate' | 'recency';
  limit?: number;             // default 20
}): Agent[]

// Get single agent
getAgent(id: string): Agent

// Find agents that work well together
findComplementaryAgents(agentId: string): Agent[]
```

**Acceptance criteria:**

- [ ] QueryAgents function implemented
- [ ] Support filters: domain, capability, timeline, success rate
- [ ] GetAgent function works
- [ ] FindComplementaryAgents (uses "worksWith" field)
- [ ] Unit tests: ≥10 test cases
- [ ] Example queries with results

---

#### Issue M1-5: Agent Registry Documentation & README

**Title**: `[Agency Team] Document agent registry with README and examples`

**Labels:** `agency-team`, `M1`, `documentation`  
**Milestone:** M1  
**Epic:** Epic 8  
**Estimate:** 1 day

**Body:**
Document the agent registry for users: what it is, how to use it, examples.

**Documentation sections:**

- Overview: what is the agent registry
- Schema explained: each field and why it matters
- Examples: ≥5 sample agent entries (annotated)
- Queries: how to search and find the right agents
- Adding new agents: how to create metadata for a new agent

**Acceptance criteria:**

- [ ] README in agency-team folder
- [ ] Links to full registry JSON
- [ ] ≥5 example agent profiles with explanations
- [ ] Quick-start guide for common queries

---

### M2: Handoff Protocol Standardization

---

#### Issue M2-1: Design Unified Handoff Template

**Title**: `[Agency Team] Design unified handoff template for all agents`

**Labels:** `agency-team`, `M2`, `standards`, `handoff`  
**Milestone:** M2  
**Epic:** Epic 3  
**Estimate:** 2 days

**Body:**
Design a standardized markdown template that all agents (SDLC + agency) can use for outputs. Template should be lightweight and not overly prescriptive about work style.

**Requirements:**

- Mandatory sections: Summary, Deliverables, Handoff to Next Agent, Exit Criteria Met
- Optional sections: Escalations, Quality Validation, Lessons Learned, Dependencies, Technical Decisions
- Flexible enough for game designers, engineers, marketers, etc.
- Reference: see SYNTHESIS document for draft template

**Acceptance criteria:**

- [ ] Template defined in markdown
- [ ] Clear guidance on when each section is required vs. optional
- [ ] Examples showing different agent types using the template
- [ ] Rationale for each section documented

---

#### Issue M2-2: Audit SDLC Agent Outputs for Handoff Compliance

**Title**: `[Agency Team] Audit SDLC agents for handoff template compliance`

**Labels:** `agency-team`, `M2`, `audit`, `sdlc`  
**Milestone:** M2  
**Epic:** Epic 3  
**Estimate:** 2 days

**Body:**
Review all 39 SDLC agents' current output formats. Do they already match the unified handoff template? Where do they deviate?

**For each agent:**

- Current output format documented
- Compliance check: which mandatory sections are present?
- Gap analysis: what needs to change?
- Update plan: if changes needed, what's the effort?

**Output:**

- Compliance report: % of SDLC agents already compliant
- List of agents needing updates
- Effort estimate for updates

**Acceptance criteria:**

- [ ] All 39 agents audited
- [ ] Report generated with compliance status
- [ ] Zero or justified exceptions

---

#### Issue M2-3: Create Handoff Template Validation Schema

**Title**: `[Agency Team] Create validation schema for handoff template`

**Labels:** `agency-team`, `M2`, `validation`, `schema`  
**Milestone:** M2  
**Epic:** Epic 3  
**Estimate:** 1 day

**Body:**
Implement validation logic to ensure all handoff outputs comply with the template.

**Validation rules:**

- Mandatory sections present and non-empty
- Format consistency (markdown syntax correct)
- Deliverables point to actual files or verifiable evidence
- Status field is one of: COMPLETED, BLOCKED, ESCALATED
- Quality validation section has actual evidence (not just claims)

**Implementation:**

- TypeScript/JavaScript validator (Zod or similar)
- CLI tool: `validate-handoff [file.md]`
- Detailed error messages on validation failures

**Acceptance criteria:**

- [ ] Validation schema implemented
- [ ] CLI tool works
- [ ] Unit tests: ≥10 test cases (valid + invalid examples)
- [ ] Integrated into CI/CD (all handoff documents validated on PR)

---

#### Issue M2-4: Create Handoff Template Examples

**Title**: `[Agency Team] Create ≥10 handoff template examples from real agents`

**Labels:** `agency-team`, `M2`, `documentation`, `examples`  
**Milestone:** M2  
**Epic:** Epic 3  
**Estimate:** 1 day

**Body:**
Create realistic examples of handoff documents using the new template. Show different agent types: architect, developer, designer, PM, tester, etc.

**Examples to create:**

- Business Analyst handing off to Domain Expert
- Software Architect handing off to Senior Developer
- UX Researcher handing off to Designer
- Game Designer handing off to Developer
- Tester handing off to PR/Review Agent
- Agency Game Designer handing off to Engineering team
- Compliance Auditor with findings

**Acceptance criteria:**

- [ ] ≥10 example documents created
- [ ] Each example is realistic and passes validation
- [ ] Variety: different domains, different outcomes (success, escalation, blocker)
- [ ] Annotated: explanations of why certain sections included/excluded

---

### M3: Task-Aware Agent Assembly

---

#### Issue M3-1: Define Task Schema

**Title**: `[Agency Team] Define task schema for orchestrator`

**Labels:** `agency-team`, `M3`, `schema`, `orchestrator`  
**Milestone:** M3  
**Epic:** Epic 4  
**Estimate:** 1 day

**Body:**
Define the schema for task inputs to the orchestrator. A task describes what needs to be done; orchestrator uses it to assemble a team.

**Task fields:**

- `goal`: What is the desired outcome? (e.g., "Design a mobile game for iOS with multiplayer")
- `domains`: What domains are involved? (e.g., ["game-development", "mobile", "networking"])
- `constraints`: Timeline, budget, team size limits
- `context`: Existing assets, prior decisions, team preferences
- `preferredAgents`: User can specify agents they trust or request specific people
- `avoidAgents`: Agents to exclude (e.g., known to conflict with team)
- `qualityGates`: Should Critic Agent validate? Any special requirements?

**Output:**

- TypeScript interface for Task
- JSON schema for validation
- Examples: 5 different task types

**Acceptance criteria:**

- [ ] Schema designed and documented
- [ ] Examples for: SaaS product, game, marketing campaign, incident response, compliance audit
- [ ] Schema validates all examples

---

#### Issue M3-2: Implement Agent Matching Algorithm

**Title**: `[Agency Team] Implement agent matching algorithm`

**Labels:** `agency-team`, `M3`, `algorithm`, `matching`  
**Milestone:** M3  
**Epic:** Epic 4  
**Estimate:** 2 days

**Body:**
Given a task, find the agents best suited to execute it.

**Algorithm design:**

- Input: Task (goal, domains, constraints)
- Query registry for agents matching task domains
- Score agents by: capability match, success rate, timeline fit
- Filter: remove agents that conflict with each other
- Rank: sort by score
- Output: ordered list of recommended agents

**Scoring example:**

- Domain match: +20 points per matching domain
- Capability match: +10 points per matching capability
- Success rate: +0.1 points per percentage point above 80%
- Timeline fit: +10 points if agent timeline ≤ task timeline
- Conflict penalty: -100 points if agent conflicts with another recommended agent

**Acceptance criteria:**

- [ ] Algorithm implemented in TypeScript
- [ ] Unit tests: ≥15 test cases (various task types, constraints)
- [ ] Example outputs: demonstrate matching for 3 different tasks
- [ ] Edge cases handled: no matching agents, conflicting preferences, timeline impossible

---

#### Issue M3-3: Build Pre-Built Team Template Library

**Title**: `[Agency Team] Create pre-built team configuration library`

**Labels:** `agency-team`, `M3`, `templates`, `patterns`  
**Milestone:** M3  
**Epic:** Epic 4  
**Estimate:** 2 days

**Body:**
Create a library of successful team patterns for common tasks. Teams can be reused and customized.

**Template patterns to create:**

- Startup MVP: Product Manager → Architecture → Dev ↔ QA → Synthesis
- Enterprise Feature: Full SDLC (PHASE_1–5) + specialized domain agent if needed
- Game Development: Game Designer → Architect → Dev + Audio Engineer → QA
- Compliance/Audit: Compliance Auditor → Remediation Engineer → Validation
- Marketing Campaign: Product Manager → Marketing Content Creator → Growth → Analytics
- Incident Response: Incident Commander → Investigation → Remediation → Review
- Blockchain Integration: Business → Solidity Engineer → Blockchain Auditor → Dev

**For each template:**

- Agent sequence (who works when)
- Dependencies (which agents must finish before next starts)
- Parallel opportunities (which agents can work simultaneously)
- Timeline estimate
- Success rate (if known)

**Acceptance criteria:**

- [ ] ≥7 templates created
- [ ] Each template documented with rationale
- [ ] Schema for team templates defined
- [ ] Orchestrator can load and apply templates

---

#### Issue M3-4: Implement Orchestrator Team Assembly API

**Title**: `[Agency Team] Implement orchestrator API for team assembly`

**Labels:** `agency-team`, `M3`, `orchestrator`, `api`  
**Milestone:** M3  
**Epic:** Epic 4  
**Estimate:** 2 days

**Body:**
API endpoint that orchestrator uses to assemble teams given a task.

**API design:**

```typescript
interface AssembleTeamRequest {
  task: Task; // Task definition
  mode: 'RECOMMEND' | 'ASSEMBLE'; // Get recommendations or auto-assemble?
  userPreferences?: {
    preferredAgents?: string[];
    avoidAgents?: string[];
    maxTeamSize?: number;
  };
}

interface AssembleTeamResponse {
  teamId: string;
  agents: Agent[]; // Ordered list
  reasoning: string; // Why this team?
  alternativeTeams: Team[]; // If user wants options
  confidence: number; // 0-100
  estimatedTimeline: string; // "2 weeks", "3 days"
  potentialRisks: string[]; // Known issues with this combo
}

// Usage
const team = await orchestrator.assembleTeam(request);
```

**Acceptance criteria:**

- [ ] API implemented
- [ ] Incorporates matching algorithm from M3-2
- [ ] Can load and apply team templates from M3-3
- [ ] Returns reasoning (explainable recommendations)
- [ ] Alternative teams provided (user can choose)
- [ ] Unit tests: ≥20 test cases

---

### M4: Hybrid Execution Model

---

#### Issue M4-1: Define Execution Modes

**Title**: `[Agency Team] Define SDLC_ONLY, AGENCY_ONLY, HYBRID execution modes`

**Labels:** `agency-team`, `M4`, `modes`, `execution`  
**Milestone:** M4  
**Epic:** Epic 5, Epic 6  
**Estimate:** 1 day

**Body:**
Document the three execution modes the orchestrator will support.

**Mode 1: SDLC_ONLY**

- Current behavior: PHASE_1 → PHASE_2 → ... → PHASE_5
- All agents standard SDLC agents
- All gates active (Critic 1–4, Sprint Gate)
- Useful for: traditional product development

**Mode 2: AGENCY_ONLY**

- Assemble team from agency agents only
- No phase structure (agents determined by task)
- Lightweight validation (Reality Checker as final validator)
- Useful for: specialized domain work (game design, compliance audit, crypto analysis)

**Mode 3: HYBRID**

- SDLC phases as backbone
- Inject agency agents at strategic points
- Unified quality gates
- Useful for: complex projects spanning multiple domains

**Acceptance criteria:**

- [ ] Each mode documented with use cases
- [ ] Flow diagrams for each mode
- [ ] Agent composition examples for each mode
- [ ] When to use each mode decision matrix

---

#### Issue M4-2: Implement SDLC_ONLY Execution (Refactor)

**Title**: `[Agency Team] Refactor SDLC orchestrator to support mode parameter`

**Labels:** `agency-team`, `M4`, `refactor`, `sdlc`  
**Milestone:** M4  
**Epic:** Epic 5  
**Estimate:** 2 days

**Body:**
Take existing SDLC orchestrator logic and make it one execution mode (`SDLC_ONLY`). This is primarily refactoring to expose the mode parameter.

**Changes:**

- Orchestrator enhanced to accept `executionMode` parameter
- SDLC flow extracted to `executeSDLCMode()`
- Existing behavior preserved (backward compatible)
- Tests updated to pass `executionMode`

**Acceptance criteria:**

- [ ] SDLC_ONLY mode works identical to current behavior
- [ ] All existing SDLC tests still pass
- [ ] No new bugs introduced
- [ ] Mode parameter logged in session state

---

#### Issue M4-3: Implement AGENCY_ONLY Execution

**Title**: `[Agency Team] Implement AGENCY_ONLY execution mode`

**Labels:** `agency-team`, `M4`, `new-feature`, `agency`  
**Milestone:** M4  
**Epic:** Epic 5  
**Estimate:** 2 days

**Body:**
New code path: orchestrator assembles agency team and runs agents sequentially with lightweight validation.

**Flow:**

1. Receive task
2. Call assembleTeam() to get agent list
3. For each agent:
   - Activate agent with task context
   - Wait for handoff document
   - Validate handoff (passes schema validation)
   - If status = BLOCKED or ESCALATED: escalate
   - If status = COMPLETED: continue to next agent
4. Final validation: Reality Checker reviews overall output
5. Return completion summary

**Acceptance criteria:**

- [ ] Mode selection works (task specifies AGENCY_ONLY or user selects)
- [ ] Team assembly integration
- [ ] Sequential agent activation
- [ ] Handoff validation between agents
- [ ] Escalation handling (if agent fails or blocks)
- [ ] Unit tests: ≥15 test cases

---

#### Issue M4-4: Implement HYBRID Execution

**Title**: `[Agency Team] Implement HYBRID execution mode (SDLC + agency injection)`

**Labels:** `agency-team`, `M4`, `new-feature`, `hybrid`  
**Milestone:** M4  
**Epic:** Epic 6  
**Estimate:** 3 days

**Body:**
Most complex mode: run SDLC phases, inject agency agents at decision points.

**Flow:**

1. Receive task with multiple domains (e.g., "Build gaming platform with blockchain rewards")
2. PHASE_1 runs normally (business/product analysis)
   - **Injection point 1**: If domains include crypto/blockchain, inject "Blockchain Security Auditor" as input to PHASE_2 recommendation
3. PHASE_2 runs (architects design the system)
   - **Injection point 2**: If gaming domain, inject "Game Designer" to consult on architecture
   - **Injection point 3**: If blockchain, inject "Solidity Engineer" to design contract architecture
4. PHASE_3 runs (UX/Design)
   - **Injection point 4**: If gaming, inject "Game Designer" for game UI
5. Similar for other phases
6. All outputs merged into unified handoff
7. Critic agents validate across different specialties

**Acceptance criteria:**

- [ ] Injection points mapped to phases
- [ ] Agency agent context passed to SDLC agents (previous agent outputs)
- [ ] SDLC agent outputs passed to injected agency agents
- [ ] Unified handoff: merge outputs from multiple agents
- [ ] Critic validation handles mixed agent types
- [ ] Unit tests: ≥20 test cases covering different domain combinations

---

#### Issue M4-5: Unified Quality Gates

**Title**: `[Agency Team] Implement unified quality gates for all agent types`

**Labels:** `agency-team`, `M4`, `quality`, `gates`  
**Milestone:** M4  
**Epic:** Epic 6  
**Estimate:** 2 days

**Body:**
Critic Agent must be able to validate outputs from both SDLC and agency agents using the handoff template.

**Validation criteria:**

- Are mandatory handoff sections present and complete?
- Are deliverables real (files exist, evidence provided)?
- Is the output internally consistent?
- Does the output meet the task's stated goals?
- Are there any escalations or blockers?

**Changes to Critic Agent:**

- Accept handoff documents from any agent (not just SDLC)
- Validate against unified handoff schema
- Score output quality on consistent scale
- Return PASS or NEEDS_WORK (with specific feedback)

**Acceptance criteria:**

- [ ] Critic Agent updated to handle agency agent outputs
- [ ] Validation tests: ≥10 realistic handoff documents (mixed types)
- [ ] Quality scoring consistent across agent types
- [ ] Feedback is actionable (specific issues noted, not generic "needs improvement")

---

### M5: Learning & Optimization

---

#### Issue M5-1: Outcome Tracking Data Model

**Title**: `[Agency Team] Design outcome tracking data model`

**Labels:** `agency-team`, `M5`, `learning`, `data-model`  
**Milestone:** M5  
**Epic:** Epic 7  
**Estimate:** 1 day

**Body:**
Define what data to capture about each agent activation so we can learn from outcomes.

**Data to track per agent activation:**

- `sessionId`, `taskId`, `agentId`, `teamId`
- `executionMode` (SDLC_ONLY, AGENCY_ONLY, HYBRID)
- Input: task definition, previous agent outputs
- Output: deliverables, handoff document
- Metrics: execution time, quality score (Critic feedback), blockers encountered
- Success: Did agent complete? Did next agent succeed?
- Timeline: estimated vs. actual

**Aggregation:**

- Per agent: success rate, average quality, average timeline
- Per team: success rate, average quality (how often this combo works)
- Per task type: which team patterns work best for games vs. products vs. compliance

**Schema:**

- TypeScript interfaces for outcome data
- Aggregation SQL queries (or equivalent)
- Dashboard queries

**Acceptance criteria:**

- [ ] Data model designed
- [ ] Schema stored in database (alongside session state)
- [ ] All outcome data captured for M4 pilot projects
- [ ] Validation: no missing required fields

---

#### Issue M5-2: Pattern Analysis Engine

**Title**: `[Agency Team] Implement pattern analysis for team composition`

**Labels:** `agency-team`, `M5`, `learning`, `analysis`  
**Milestone:** M5  
**Epic:** Epic 7  
**Estimate:** 2 days

**Body:**
Analyze outcomes to find patterns: which agent combinations work, which fail?

**Analyses to implement:**

- **Pair Success Rate**: For each (Agent1, Agent2) pair in sequence, what's the success rate?
- **Team Pattern Success**: For each unique team composition, what's the success rate?
- **Task Type Matching**: For each task type, which teams succeed most often?
- **Timeline Accuracy**: Which agents estimate timelines accurately? Which overrun?
- **Conflict Detection**: Which agents tend to produce outputs that the next agent rejects?

**Output:**

- Dashboard showing top-performing team patterns
- Recommendations: "For game design tasks, use: Game Designer → Architect → Dev + Audio Engineer" (90% success)
- Conflict alerts: "Avoid: Agent X → Agent Y (20% success, frequent rejection)"
- Improvement areas: "Agent Z is underperforming (60% success vs. 80% average)"

**Acceptance criteria:**

- [ ] Pattern analysis queries implemented
- [ ] Dashboard showing top patterns (sortable by task type, domain)
- [ ] Confidence intervals (n ≥ 5 for reliable patterns)
- [ ] Automated email reports (weekly pattern summary)

---

#### Issue M5-3: Orchestrator Recommendation Refinement

**Title**: `[Agency Team] Refine team recommendations based on historical outcomes`

**Labels:** `agency-team`, `M5`, `learning`, `ai`  
**Milestone:** M5  
**Epic:** Epic 7  
**Estimate:** 2 days

**Body:**
Improve orchestrator's assembleTeam() algorithm using learned patterns.

**Updates:**

- Matching algorithm now boosts score for agents in successful historical patterns
- Penalizes agents in failed combinations
- Considers task-specific patterns (gaming tasks prefer game designer, etc.)
- Confidence score reflects how many historical precedents exist

**Implementation:**

- Load historical pattern data when scoring agents
- Weight by confidence (n ≥ 5)
- Dynamically adjust scoring over time

**Acceptance criteria:**

- [ ] Recommendation algorithm updated
- [ ] Historical data integrated (patterns from M5-2)
- [ ] Confidence tracking (show in recommendations)
- [ ] A/B test: user acceptance of recommendations improves
- [ ] Success metrics: recommended teams beat random/baseline by 30%+

---

#### Issue M5-4: Quarterly Optimization & Registry Updates

**Title**: `[Agency Team] Establish quarterly optimization cycle for agent registry`

**Labels:** `agency-team`, `M5`, `learning`, `process`  
**Milestone:** M5  
**Epic:** Epic 7  
**Estimate:** 1 day

**Body:**
Define a quarterly process to review outcomes and update agent registry.

**Quarterly cycle (every 3 months):**

1. **Analyze outcomes** (M5-2): Run pattern analysis on all completed tasks
2. **Identify underperformers**: Agents with success rate < 75%
3. **Identify stars**: Top-performing agents and team combinations
4. **Review failures**: Why do certain combinations fail? Design impr

ovements 5. **Update registry**: Refresh success rates, update team patterns, retire underperforming agents (or retire them with clear note) 6. **Report & recommendations**: Share findings with team, recommend process improvements 7. **Archive**: Keep historical data for trend analysis

**Acceptance criteria:**

- [ ] Process documented
- [ ] Metrics dashboard ready (for review)
- [ ] Automated report generation
- [ ] Registry updates scripted (bulk update success rates)
- [ ] First cycle completed with findings

---

## SUMMARY TABLE

| Milestone | Epics | Issues | Estimate            |
| --------- | ----- | ------ | ------------------- |
| M1        | 2     | 5      | 1–2 weeks           |
| M2        | 1     | 4      | 1 week              |
| M3        | 2     | 4      | 2–3 weeks           |
| M4        | 2     | 5      | 3–4 weeks           |
| M5        | 1     | 4      | 2–3 weeks (ongoing) |
| **TOTAL** | **8** | **22** | **9–13 weeks**      |

---

## IMPORT NOTES

When importing into GitHub:

1. Create milestones in order (M1 before M2, etc.)
2. Create epics first, then link issues to them
3. Use labels consistently: `agency-team`, `M[number]`, domain labels
4. Link issues to blockers (e.g., M3 issues blocked by M1, M2)
5. Create project board to track progress
6. Assign team members to issues based on expertise
