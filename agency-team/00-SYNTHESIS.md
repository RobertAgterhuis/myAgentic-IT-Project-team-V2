# Agency Team Integration — Comprehensive Synthesis

> Complete analysis of 191 specialized agents across 16 domains + integration with orchestrator-driven SDLC model  
> Status: Ready for implementation  
> Date: 2026-03-30

---

## EXECUTIVE SUMMARY

The solution currently maintains **two parallel agent ecosystems**:

1. **SDLC Orchestrator Model** (templates/sdlc): 39 agents across 6 phases with strict ordering and gate-based progression — optimized for structured product development workflows
2. **Agency Agents** (templates/agency-agents-markdown): 191 specialized agents across 16 domains with rich personalities, memories, and specialized capabilities — optimized for domain expertise and lateral problem-solving

**Current state**: These systems are decoupled and package-aware (load pre-bundled agent collections). **Recommended state**: Orchestrator-aware dynamic team assembly — the orchestrator becomes aware of agency agents and assembles task-specific teams on demand.

### Key Opportunity

Instead of forcing every project through the same PHASE_1 → PHASE_2 → PHASE_3 → PHASE_4 → SYNTHESIS sequence, the orchestrator could:

1. **Analyze task requirements** (domain, complexity, timeline, constraints)
2. **Query the agent registry** for matching specialists
3. **Assemble a task-specific team** from either SDLC or agency agents (or both)
4. **Manage handoffs** with unified protocols and context
5. **Track outcomes** to learn which team configurations work best

This enables rapid scaling to specialized domains (e.g., "I need a game design + blockchain audit + compliance review") while preserving the structured SDLC workflow for traditional product development.

---

## PART 1: CURRENT STATE ANALYSIS

### The SDLC Orchestrator Model (templates/sdlc)

**39 agents** organized in strict phase order:

| Phase          | Agents   | Responsibility                                                                                                                               |
| -------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| ONBOARDING (0) | 1 agent  | Collects project inputs, validates tooling, initializes session                                                                              |
| PHASE_1        | 5 agents | Business Analyst, Domain Expert, Sales Strategist, Financial Analyst, Product Manager — define requirements and strategy                     |
| CRITIC_1       | 2 agents | Critic Agent (validates), Risk Agent (assesses) — quality gate before Phase 2                                                                |
| PHASE_2        | 5 agents | Software Architect, Senior Developer, DevOps Engineer, Security Architect, Data Architect, Legal/Privacy — technical design and architecture |
| CRITIC_2       | 2 agents | Critic + Risk — quality gate                                                                                                                 |
| PHASE_3        | 6 agents | UX Researcher, UX Designer, UI Designer, Accessibility Specialist, Content Strategist, Localization Specialist — experience design           |
| CRITIC_3       | 2 agents | Critic + Risk — quality gate                                                                                                                 |
| PHASE_4        | 6 agents | Brand Strategist, Growth Marketer, CRO Specialist, Brand & Assets Agent, Storybook Agent — marketing and brand                               |
| CRITIC_4       | 2 agents | Critic + Risk — quality gate                                                                                                                 |
| SYNTHESIS      | 1 agent  | Synthesis Agent — aggregates all phase outputs                                                                                               |
| SPRINT_GATE    | 1 agent  | Orchestrator — validates sprint readiness                                                                                                    |
| PHASE_5        | 8 agents | Implementation, Test, PR/Review, Documentation, GitHub Integration, KPI/Metrics, Retrospective, Architecture Compliance — execution          |

**Characteristics**:

- ✅ Linear progression with clear gates and contracts
- ✅ Reusable across projects (CREATE, AUDIT, FEATURE modes)
- ✅ Built-in quality validation (Critic/Risk agents)
- ✅ Domain-agnostic business phases (works for SaaS, content platforms, etc.)
- ❌ All projects must go through all phases (no shortcutting even for small tasks)
- ❌ No access to specialized agents for niche domains (blockchain, game dev, spatial computing, etc.)
- ❌ Package-aware loading (pre-bundled collections loaded as units)

### The Agency Agents Ecosystem (191 agents, 16 domains)

**Domain breakdown**:

| Domain                 | Count | Representative agents                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Academic**           | 5     | Anthropologist, Geographer, Historian, Narratologist, Psychologist                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Design**             | 8     | UX Architect, UX Researcher, UI Designer, Brand Guardian, Visual Storyteller, Inclusive Visuals, Image Prompt Engineer, Whimsy Injector                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Engineering**        | 26    | Senior Developer, Software Architect, AI Engineer, Backend Architect, Frontend Developer, Data Engineer, Database Optimizer, DevOps Automator, Security Engineer, SRE, Mobile Developer, Incident Response Commander, Rapid Prototyper, Solidity Engineer, Firmware Engineer, MCP Builder, CMS Developer, Code Reviewer, Email Intelligence Engineer, Git Workflow Master, Technical Writer, Threat Detection Engineer, Autonomous Optimization Architect, Filament Optimization Specialist, Feishu Integration Developer, WeChat Mini Program Developer                                                                                                                            |
| **Game Development**   | 17    | Game Designer, Level Designer, Narrative Designer, Technical Artist, Audio Engineer + engine-specific: Godot (3 agents), Unity (4 agents), Unreal (4 agents), Blender (1 agent), Roblox (3 agents)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Integrations**       | 12    | Aider, Claude Code, Cursor, Gemini CLI, GitHub Copilot, Kimi, MCP Memory Backend Architect, OpenCode, OpenClaw, Windsurf + README docs for each                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Marketing**          | 28    | Content Creator, Growth Hacker, SEO Specialist, Social Media Strategist + platform-specific: TikTok, Douyin, WeChat, Bilibili, Xiaohongshu, Weibo, Zhihu, Kuaishou, Instagram, Twitter, LinkedIn, Reddit, Podcast, Short Video, Video Optimization, App Store Optimizer, Baidu SEO, Livestream Commerce, Carousel Growth, Cross-Border Ecommerce, China Ecommerce, Localization Strategist, Bot Citation Strategist, Book Co-Author, Private Domain Operator                                                                                                                                                                                                                        |
| **Paid Media**         | 7     | PPC Strategist, Paid Social Strategist, Programmatic Buyer, Auditor, Creative Strategist, Search Query Analyst, Tracking Specialist                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Product**            | 5     | Product Manager, Sprint Prioritizer, Feedback Synthesizer, Behavioral Nudge Engine, Trend Researcher                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Project Management** | 6     | Senior PM, Project Shepherd, Experiment Tracker, Jira Workflow Steward, Studio Operations, Studio Producer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Sales**              | 8     | Deal Strategist, Coach, Account Strategist, Discovery Coach, Engineer, Outbound Strategist, Pipeline Analyst, Proposal Strategist                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Spatial Computing**  | 6     | VisionOS Spatial Engineer, macOS Spatial Metal Engineer, XR Cockpit Interaction Specialist, XR Immersive Developer, XR Interface Architect, Terminal Integration Specialist                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Specialized**        | 29    | Compliance Auditor, Blockchain Security Auditor, Agentic Identity Trust, Agents Orchestrator, Automation Governance Architect, Accounts Payable, Corporate Training Designer, Data Consolidation Agent, Government Digital Presales Consultant, Healthcare Marketing Compliance, Identity Graph Operator, LSP Index Engineer, Recruitment Specialist, Report Distribution Agent, Sales Data Extraction Agent, Civil Engineer, Cultural Intelligence Strategist, Developer Advocate, Document Generator, French Consulting Market, Korean Business Navigator, Model QA, Salesforce Architect, Workflow Architect, Study Abroad Advisor, Supply Chain Strategist, ZK Steward + others |
| **Strategy**           | 10    | NEXUS Executive Brief, NEXUS Strategy (operational doctrine), 6 Phase Playbooks, 4 Scenario Runbooks (Startup MVP, Enterprise Feature, Marketing Campaign, Incident Response), Quick-Start Guide                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Support**            | 6     | Support Responder, Analytics Reporter, Executive Summary Generator, Finance Tracker, Infrastructure Maintainer, Legal Compliance Checker                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Testing**            | 8     | API Tester, Accessibility Auditor, Evidence Collector, Performance Benchmarker, Reality Checker, Test Results Analyzer, Tool Evaluator, Workflow Optimizer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

**Characteristics**:

- ✅ Deep domain expertise (e.g., Godot Multiplayer Engineer understands Godot-specific physics, networking, and synchronization)
- ✅ Specialized tools and languages (e.g., Solidity Engineer for smart contracts, Blender Addon Engineer for 3D)
- ✅ Rich personalities and memory (agents retain learning across conversations)
- ✅ Cross-domain scenario runbooks (startup MVP, incident response, marketing campaigns)
- ✅ Easy to activate for specialized tasks ("I need a compliance audit")
- ❌ No built-in phase structure (how do game design + audio engineering + level design narrative work together?)
- ❌ No quality gates or Critic/Risk validation
- ❌ Handoff protocols not standardized (each agent has its own output format)
- ❌ No integration with SDLC workflow

---

## PART 2: PROPOSED INTEGRATION ARCHITECTURE

### Design Principle: Orchestrator-Aware Dynamic Team Assembly

The orchestrator becomes **task-aware and domain-aware**. Instead of "run PHASE_1", it reasons: "What is the actual goal? What skills are required? Which agents (SDLC or agency) can deliver?"

```
┌─────────────────────────────────────────────────────────────────────┐
│ ORCHESTRATOR (Agent 00) — Task-Aware, Registry-Aware               │
└─────────────────────────────────────────────────────────────────────┘
     │
     ├─ Receives task request with metadata:
     │  - Goal (e.g., "Design a game for iOS")
     │  - Domains (Game Development, Mobile, Audio)
     │  - Context (existing game engine, art style, timeline)
     │  - Constraints (team size, budget, timeline)
     │
     ├─ Queries AGENT REGISTRY:
     │  - Search for agents matching goal domains
     │  - Filter by capability, team experience, success rate
     │  - Identify phase structure (structured SDLC vs. ad-hoc assembly)
     │
     ├─ Assembles TASK-SPECIFIC TEAM:
     │  - Game Design (agency agent for game mechanics)
     │  - UI/UX Design (agency UX + SDLC UX Researcher/Designer if needed)
     │  - Mobile Development (agency agent for iOS)
     │  - Audio Engineering (agency agent for game audio)
     │  - QA/Testing (SDLC Test Agent or agency Testing specialists)
     │  - Optionally: Critic + Risk agents for quality gates
     │
     ├─ Activates agents with unified HANDOFF PROTOCOL:
     │  - Each agent receives: task goal, previous agent outputs, quality gates
     │  - Each agent produces standardized output contract
     │  - Orchestrator validates completion + stores in session state
     │
     └─ Tracks OUTCOMES:
        - Which teams succeeded? Which agents worked well together?
        - Store patterns for future similar tasks
        - Refine team compositions based on results
```

### Integration Model: Three Paths

#### Path 1: Structured SDLC Tasks (Traditional Projects)

For tasks that follow the PHASE_1 → PHASE_2 → PHASE_3 → PHASE_4 → PHASE_5 pattern:

- **Use existing SDLC agents**
- **Optionally augment** with agency agents for specialized domains (e.g., add "Blockchain Security Auditor" to PHASE_2 if building crypto product)
- **Maintain current gate structure** (Critic Gate 1–4, Sprint Gate)

**Example**: "Build a SaaS product for HR management"
→ Uses SDLC PHASE_1–5 + adds "Compliance Auditor" to PHASE_2

---

#### Path 2: Specialized Domain Tasks (Single-Domain Expertise)

For tasks that don't need the full SDLC workflow:

- **Assemble team from agency agents only**
- **Define lightweight quality gates** (Reality Checker as final validator)
- **Use unified handoff protocol** (same template system as SDLC)

**Example**: "Design a compliant trading algorithm and audit it"
→ Assembles: Solidity Engineer + Blockchain Security Auditor + Compliance Auditor
→ Uses handoff templates but no strict phases

---

#### Path 3: Hybrid Tasks (Multiple Domains + SDLC Structure)

For complex projects spanning multiple domains that need both structure and specialization:

- **Use SDLC phases as backbone** (provides structure and gates)
- **Inject agency agents at decision points** (e.g., "Design this game mechanic here", "Audit blockchain integration here", "Optimize database here")
- **Maintain unified output contracts** across both agent types
- **Track dependencies** (e.g., if blockchain auditor finds issues, loop back to engineer)

**Example**: "Build a gaming platform with blockchain rewards and live streaming"
→ PHASE_1 (traditional business/product) + inject Game Designer + Blockchain Auditor
→ PHASE_2 (traditional architecture) + inject Solidity Engineer + Streaming Infrastructure Specialist
→ PHASE_3 (traditional UX) + inject Game Designer for UI + Livestream UI specialist
→ PHASE_5 (traditional execution) + keep Implementation Agent for code

---

### Agent Registry Schema

The orchestrator needs to know what agents exist and how to activate them:

```typescript
interface AgentMetadata {
  // Identity
  id: string; // e.g., "sdlc-01-business-analyst" or "agency-game-designer"
  name: string;
  description: string;
  domain: string[]; // e.g., ["game-development", "mechanics", "systems-design"]

  // Capability
  capabilities: string[]; // e.g., ["gameplay-loop-design", "economy-balancing", "progression-systems"]
  inputs: string[]; // What this agent expects from previous agent
  outputs: string[]; // What this agent produces

  // Constraints
  minPrerequisites: string[]; // e.g., ["game-concept-defined", "target-platform-identified"]
  optionalInputs: string[]; // Can work without these but produces better output with them

  // Activation
  skillPath: string; // e.g., "templates/agency-agents-markdown/game-development/game-designer.md"
  maxRetries: number; // How many times to retry on failure
  timelineEstimate: string; // "1-3 days", "4-8 hours", etc.

  // Performance
  successRate: number; // Percentage of successful completions
  avgQualityScore: number; // 0-100, from Critic Agent feedback
  commonFailures: string[]; // Known failure modes

  // Relationships
  worksWith: string[]; // Other agents this one pairs well with
  conflictsWith: string[]; // Avoid activating alongside these

  // Memory & Learning
  lastUpdated: Date;
  successPatterns: string[]; // What team configurations work well with this agent
}
```

---

### Unified Handoff Protocol

Both SDLC and agency agents must produce standardized outputs:

```markdown
# Handoff Document: [Task] — [Agent Name]

**Task ID**: [UUID]
**Agent**: [Name]
**Status**: COMPLETED | BLOCKED | ESCALATED
**Date**: [ISO-8601]
**Timeline**: [Actual vs. estimate]

---

## MANDATORY SECTIONS

### 1. Summary (max 100 words)

High-level summary of what was accomplished.

---

### 2. Deliverables

- [ ] Primary deliverable: [File path | Description]
- [ ] Secondary deliverable: [File path | Description]
- [ ] Evidence (screenshots, metrics, test results): [Links]

---

### 3. Handoff to Next Agent

**Next agent**: [Name or ID]
**Context they need**: [Specific findings, decisions made, constraints discovered]
**Required reading**: [Files they must review before starting]

---

### 4. Exit Criteria Met?

- [ ] All acceptance criteria from task definition met
- [ ] Quality gates passed (if Critic Agent validate)
- [ ] No outstanding escalations or blockers

---

### 5. Escalations (if Status = ESCALATED)

- **Issue**: [Description]
- **Reason**: [Why this blocks progress]
- **Required**: [Who or what's needed to resolve]

---

### 6. Quality Validation

**Self-check**: [Agent's own validation of output quality]
**Evidence**: [Proof the work is complete and correct]

---

## OPTIONAL SECTIONS (if applicable)

### Lessons Learned

Insights about what worked, what didn't, how to improve next time.

### Dependencies

What this work depends on that may affect future work in this task.

### Technical Decisions

Important choices made and their rationale.
```

---

## PART 3: IMPLEMENTATION STRATEGY

### Phase M1: Agent Registry & Metadata

**Goal**: Catalog all 191 agency agents + 39 SDLC agents with structured metadata.

**Deliverables**:

- Agent metadata JSON file (`platform/engine/agent-registry.json`) with all agents
- Metadata schema validation (TypeScript type definitions)
- Agent search/query utilities (filter by domain, capability, timeline)
- Migration guide: convert existing agent personalities → registry format

**Timeline**: 1–2 weeks

---

### Phase M2: Handoff Protocol Standardization

**Goal**: Define unified output format + validate all existing agents produce it.

**Deliverables**:

- Standardized handoff template (markdown format)
- Validation schema (what makes a valid handoff)
- Examples from SDLC agents + agency agents showing compliance
- Update all 39 SDLC agents to use new handoff format (if needed)
- Template + examples for new agency agents to follow

**Timeline**: 1 week

---

### Phase M3: Orchestrator Enhancement — Task-Aware Assembly

**Goal**: Orchestrator can analyze task requirements and assemble agent teams.

**Deliverables**:

- Task schema definition (goal, domains, constraints, constraints, timeline)
- Agent matching algorithm (find agents that fit task)
- Team composition engine (order agents, manage dependencies)
- Team configuration library (pre-built successful team patterns)
- Fallback/retry logic (if agent fails, find alternative)

**Timeline**: 2–3 weeks

---

### Phase M4: Hybrid Execution Model

**Goal**: Orchestrator can run both pure-SDLC and pure-agency workflows and hybrid combinations.

**Deliverables**:

- Execution modes (SDLC_ONLY, AGENCY_ONLY, HYBRID)
- Context passing between SDLC and agency agents
- Unified quality gates (Critic Agent can validate both SDLC + agency output)
- State management (track which agents have run, what blockers exist)
- Outcome tracking (which team patterns worked, which didn't)

**Timeline**: 3–4 weeks

---

### Phase M5: Learning & Optimization

**Goal**: Orchestrator improves team assembly over time based on outcomes.

**Deliverables**:

- Outcome tracking dataset (success rate per agent combination)
- Pattern analysis (which pairs/trios work best for which tasks)
- Recommendation engine (suggest better team assemblies for future similar tasks)
- Feedback loop (Critic Agent provides quality scores that refine performance metrics)
- Quarterly optimization (review patterns, update registry success rates)

**Timeline**: 2–3 weeks (ongoing after MVP)

---

## PART 4: KEY DESIGN DECISIONS

### Decision 1: Agent Independence vs. Tight Coupling

**Decision**: Maintain agent independence (current state) but add optional orchestrator coordination.

**Rationale**:

- Agency agents have rich personalities and work well as standalone consultants
- SDLC agents are designed for structured workflows
- Neither should be forced into the other's model
- Orchestrator acts as a coordinator, not a controller

---

### Decision 2: Handoff Protocol Unification

**Decision**: Create optional unified handoff format, but don't break existing agent personalities.

**Rationale**:

- Some SDLC agents have detailed output contracts; some agency agents don't
- Unified format enables composability
- Agents can still have personality in how they approach work; just standardize outputs
- Backward compatible: existing agents keep working

---

### Decision 3: Quality Gates

**Decision**: Keep CRITIC_N gates for structured SDLC tasks; make gates optional for agency-only tasks.

**Rationale**:

- SDLC gates have proven value (catch issues early)
- Specialized agency tasks might have their own quality validation (e.g., "Blockchain Security Auditor" IS the quality gate)
- Hybrid tasks can choose gates strategically (e.g., gate between architecture and game design, but not between two design agents)

---

### Decision 4: Priority: User Requests or Orchestrator Recommendations?

**Decision**: User always has final say. Orchestrator recommends; user approves team composition.

**Rationale**:

- Humans have context orchestrator might not (political constraints, team preferences, budget limits)
- Orchestrator learns from approvals (refines recommendations)
- Fails safe: orchestrator never forces a team on the user

---

## PART 5: RISKS & MITIGATIONS

| Risk                                                                                 | Mitigation                                                                                          |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| **Too many agents to manage** — 230 agents is complex                                | Organize agents by domain + use registry search; start with MVP (top 50 agents), expand gradually   |
| **Handoff protocol adds overhead** — agents slow down to produce docs                | Make template lightweight; use markdown; agents already do most of this work, just standardize      |
| **Mixed quality across agency agents** — some personalities are stronger than others | Critic Agent validates all output regardless of source; allow users to blacklist weak agents        |
| **Orchestrator recommendation engine is wrong** — suggests bad team                  | A/B test recommendations; collect feedback from users; surface confidence scores in recommendations |
| **Integration breaks existing workflows** — SDLC teams rely on current structure     | Maintain backward compatibility; PURE_SDLC mode uses old system; new features are opt-in            |
| **Memory/context explosion** — too much state to pass between agents                 | Use file-based context (JSON) instead of large prompts; keep session state lean                     |

---

## PART 6: SUCCESS METRICS

### Adoption

- % of new projects using agency agents
- % of projects using hybrid (SDLC + agency) model
- Agent activation frequency (which agents get used most)

### Quality

- Critic Agent validation pass rate
- Defect rate in final implementations
- User satisfaction with agent quality

### Efficiency

- Time saved by assembling task-specific teams (vs. running full SDLC)
- Team assembly recommendation accuracy (% of recommendations user accepts)
- Retry rate (fewer agent failures due to better matching)

### Learning

- Team pattern accuracy (predictions improve as orchestrator learns)
- Success rate improvements over time

---

## PART 7: RECOMMENDED NEXT STEPS

1. **Select MVP scope** (15–20 agents to integrate first)
2. **Build agent registry** with metadata schema
3. **Standardize handoff format** across MVP agents
4. **Prototype orchestrator enhancement** with task-aware assembly
5. **Run pilot project** using hybrid SDLC + agency team
6. **Collect feedback** and iterate
7. **Expand to full 230-agent ecosystem** based on learnings

---

## CONCLUSION

The proposed integration model is **additive, not disruptive**. It preserves the strengths of both systems:

- SDLC workflow excellence (structure, gates, quality validation)
- Agency agent expertise (specialization, personality, lateral thinking)

By making the orchestrator **task-aware and registry-aware**, projects can be completed faster, with higher specialization, while maintaining quality. The investment is primarily in metadata and orchestration logic, not in rewriting agents.

**Recommendation**: Proceed with Phase M1 (Agent Registry) as the foundation for all subsequent phases.
