# Agency Team Integration — Implementation Checklist & Quick Reference

> Day-by-day checklist and quick lookup for Implementation Agents + Leadership  
> Print-friendly format for daily standups and sprint planning

---

## QUICK REFERENCE: What Gets Built When

| Week  | Phase | Key Deliverable                                                   | Owner                |
| ----- | ----- | ----------------------------------------------------------------- | -------------------- |
| 1–2   | M1    | 230-agent registry + APIs                                         | Agent 05, 06, 09     |
| 3     | M2    | Unified handoff template + validation                             | Agent 06, 18         |
| 4–6   | M3    | Task schema + matching algorithm + orchestrator API               | Agent 05, 06         |
| 7–10  | M4    | Three execution modes (SDLC_ONLY, AGENCY_ONLY, HYBRID) + 3 pilots | Agent 05, 06, 07, 20 |
| 11–13 | M5    | Outcome tracking + pattern analysis + optimization                | Agent 09, 29         |

---

## PHASE 1: FOUNDATION (WEEKS 1–2)

### ✅ Checklist: Registry Design & Data Extraction

**Day 1–2: Registry Schema Design**

- [ ] Domain experts agree on 15–20 core metadata fields
- [ ] TypeScript interfaces drafted (`agent.ts`)
- [ ] JSON Schema created for validation (`agent-registry.schema.json`)
- [ ] 5 sample agents processed (different types: engineer, designer, auditor)
- [ ] Schema review: zero UNCERTAIN flags
- [ ] Schema approved by Software Architect (05)

**Owner:** Software Architect (05)  
**Success metric:** All checkboxes marked

---

**Day 3–5: Extract 191 Agency Agents**

- [ ] Metadata extraction script created (reads .md → extracts fields)
- [ ] 191 agents processed (domain, capabilities, timeline, emoji, etc.)
- [ ] Spot-check: 10 random agents verified against source files
- [ ] Data quality check: zero missing required fields
- [ ] Gap report generated (list of UNCERTAIN fields, if any)
- [ ] Escalate UNCERTAIN fields to domain expert (Agent 02)

**Owner:** Senior Developer (06)  
**Success metric:** All 191 agents extracted, ≤5 UNCERTAIN fields

---

**Day 5: Extract 39 SDLC Agents**

- [ ] SDLC agent metadata extracted (include phase, gate membership)
- [ ] Phase mapping verified (agent → PHASE_1/2/3/4/5 correct?)
- [ ] Sequence dependencies captured
- [ ] Merged with agency agents: 230-agent registry complete
- [ ] Registry JSON generated and validated against schema

**Owner:** Senior Developer (06)  
**Success metric:** 230-agent registry file exists and validates

---

**Day 6–8: Query API & Documentation**

- [ ] queryAgents(filters) function implemented (TypeScript)
- [ ] 5 example queries documented (search by domain, capability, timeline)
- [ ] getAgent(id) function working
- [ ] findComplementaryAgents(agentId) function working
- [ ] Registry README.md written with examples
- [ ] CLI tool stub created (for Day 6, phase handoff)

**Owner:** Senior Developer (06), Domain Expert (02)  
**Success metric:** All APIs working, README has ≥5 examples

---

### 📋 Daily Standup Template: Week 1–2

```
## Standup [Date]

**Completed:**: [Description of completed tasks]
**In Progress:** [Task + % complete + blocker if any]
**Upcoming:** [Next 2 tasks planned for today/tomorrow]
**Risk:**s None / [Risk name, mitigation]

**Metrics:**
- Agency agents extracted: [N/191]
- SDLC agents extracted: [N/39]
- Tests passing: [N]
- Registry validation: [% agents with zero UNCERTAIN fields]
```

---

## PHASE 2: STANDARDS (WEEK 3)

### ✅ Checklist: Handoff Template & Validation

**Day 9–10: Design Unified Handoff Template**

- [ ] Template sections defined (Summary, Deliverables, Handoff, Exit Criteria, Escalations, etc.)
- [ ] Rationale for each section documented
- [ ] Tested on 3 example agents (before finalizing)
- [ ] Markdown template created (`handoff-template.md`)
- [ ] Template approved by Senior Developer (06)
- [ ] No changes needed to 80% of SDLC agents (compliant already)

**Owner:** Senior Developer (06), Critic Agent (18)  
**Success metric:** Template finalized, ≥3 agents fit template with zero changes

---

**Day 11–12: Audit SDLC Agent Compliance**

- [ ] All 39 SDLC agents reviewed for template compliance
- [ ] Compliance report generated: % agents already compliant
- [ ] Non-compliant agents listed with needed changes
- [ ] Effort estimate for updates (if >5 agents need changes, escalate)
- [ ] Approved by Senior Developer (06)

**Owner:** Senior Developer (06)  
**Success metric:** Compliance report shows ≥30 agents (77%) already compliant

---

**Day 13–14: Validation Schema & Examples**

- [ ] Validation schema/validator implemented (Zod or JSON Schema)
- [ ] CLI tool created: `validate-handoff [file.md]`
- [ ] 10 example handoffs created (engineers, designers, PMs, testers, etc.)
- [ ] Examples tested: all pass validation
- [ ] Unit tests written (≥10 test cases: valid + invalid handoffs)
- [ ] CI/CD integration: all PRs validate handoff documents
- [ ] Examples checked into repo (`docs/handoff-examples/`)

**Owner:** Senior Developer (06)  
**Success metric:** All 10 examples pass, CI integration working

---

### 📋 Daily Standup Template: Week 3

```
## Standup [Date]

**Completed:** [Template section, SDLC audit, validation implementation, etc.]
**In Progress:** [Current task + % + blocker]
**Upcoming:** [Examples creation, CI integration]
**Risks:** None / [Compliance rate lower than expected?]

**Metrics:**
- Template sections defined: [N/8]
- SDLC agents audited: [N/39]
- Approval rate (already compliant): [%]
- Example handoffs created: [N/10]
- Tests passing: [N]
```

---

## PHASE 3: ORCHESTRATOR (WEEKS 4–6)

### ✅ Checklist: Matching Algorithm & Team Assembly

**Day 15–16: Task Schema**

- [ ] Task schema designed (goal, domains, constraints, context, preferences)
- [ ] TypeScript interface created (`task.ts`)
- [ ] JSON Schema created (`task.schema.json`)
- [ ] 5 example tasks written (SaaS, game, compliance, marketing, incident response)
- [ ] Examples validated against schema
- [ ] Approved by Software Architect (05)

**Owner:** Software Architect (05)  
**Success metric:** Schema complete, 5 examples validated

---

**Day 17–18: Matching Algorithm**

- [ ] Scoring function implemented (domain +20, capability +10, success rate +0.1, timeline +10)
- [ ] Filtering logic: remove conflicting agents
- [ ] Ranking: sort by score
- [ ] Edge case handling: no matches, impossible timeline, conflicting preferences
- [ ] Unit tests (≥15 cases)
- [ ] Example outputs: algorithm tested on 5 tasks
- [ ] Approved by Software Architect (05)

**Owner:** Senior Developer (06)  
**Success metric:** ≥15 tests pass, all 5 example tasks produce sensible teams

---

**Day 19–20: Pre-Built Team Templates**

- [ ] 7 team templates designed:
  - [ ] Startup MVP
  - [ ] Enterprise Feature (full SDLC)
  - [ ] Game Development
  - [ ] Compliance/Audit
  - [ ] Marketing Campaign
  - [ ] Incident Response
  - [ ] Blockchain Integration
- [ ] Each template documented: sequence, dependencies, parallelization, timeline
- [ ] Team template schema defined
- [ ] Templates stored in config (YAML)
- [ ] Approved by Product Manager (34)

**Owner:** Software Architect (05), Domain Expert (02)  
**Success metric:** 7 templates defined, all documented

---

**Day 21–22: Team Assembly API**

- [ ] orchestrator.assembleTeam(task) API implemented
- [ ] Incorporates matching algorithm (M3-2)
- [ ] Loads and applies templates (M3-3)
- [ ] Returns team + reasoning + alternatives + confidence
- [ ] Unit tests (≥20 cases)
- [ ] Integration with session state
- [ ] Example outputs: demonstrated on 3 tasks
- [ ] Approved by Software Architect (05)

**Owner:** Senior Developer (06)  
**Success metric:** ≥20 tests pass, all 3 example tasks work correctly

---

### 📋 Daily Standup Template: Weeks 4–6

```
## Standup [Date]

**Completed:** [Task schema, matching algorithm, template library, API]
**In Progress:** [Current implementation + % + blocker]
**Upcoming:** [Next stage, integration tests]
**Risks:** None / [Matching algorithm accuracy, scoring weights unclear?]

**Metrics:**
- Task schema defined: Yes/No
- Matching algorithm scoring tested: Y/N
- Team templates created: [N/7]
- assembleTeam() API tests passing: [N/20+]
- Code review approval: Yes/No
```

---

## PHASE 4: HYBRID EXECUTION (WEEKS 7–10)

### ✅ Checklist: Three Execution Modes

**Day 23–24: Define Execution Modes**

- [ ] SDLC_ONLY mode documented (current behavior)
- [ ] AGENCY_ONLY mode documented (lightweight, task-driven)
- [ ] HYBRID mode documented (SDLC backbone + agency injection points)
- [ ] Use cases defined for each mode
- [ ] Flow diagrams created (all 3 modes)
- [ ] Approved by Software Architect (05)

**Owner:** Software Architect (05), Product Manager (34)  
**Success metric:** All 3 modes clearly documented, no ambiguity

---

**Day 25–26: SDLC_ONLY Refactoring**

- [ ] SDLC orchestrator logic extracted to executeSDLCMode()
- [ ] Execution mode parameter added to orchestrator
- [ ] All existing SDLC tests pass (regression check)
- [ ] Mode logged in session state
- [ ] Approved by Senior Developer (06)

**Owner:** Senior Developer (06)  
**Success metric:** All existing SDLC tests pass, no new regressions

---

**Day 27–28: AGENCY_ONLY Implementation**

- [ ] executeAgencyMode() function implemented
- [ ] Calls assembleTeam() to get agent list
- [ ] Sequential agent activation
- [ ] Handoff validation between agents
- [ ] Escalation handling (BLOCKED/ESCALATED statuses)
- [ ] Reality Checker final validation
- [ ] Unit tests (≥15 cases)
- [ ] Approved by Senior Developer (06)

**Owner:** Senior Developer (06), Implementation Agent (20)  
**Success metric:** ≥15 tests pass, mode works end-to-end

---

**Day 29–30: HYBRID Implementation**

- [ ] executeHybridMode() function implemented
- [ ] Injection points defined (phases where agency agents inserted)
- [ ] Context passing: Agent X output → Agent Y input
- [ ] Merged handoff: outputs from multiple agents unified
- [ ] Unified quality gates: Critic validates all agent types
- [ ] Unit tests (≥20 cases)
- [ ] Approved by Software Architect (05)

**Owner:** Senior Developer (06), Software Architect (05)  
**Success metric:** ≥20 tests pass, hybrid teams functional

---

**Day 31–32: Unified Quality Gates**

- [ ] Critic Agent updated to validate all agent types
- [ ] Validation against unified handoff schema
- [ ] Quality scoring consistent across SDLC + agency agents
- [ ] Actionable feedback on failures
- [ ] Unit tests (≥10 realistic handoff docs)
- [ ] Approved by Critic Agent (18)

**Owner:** Critic Agent (18), Senior Developer (06)  
**Success metric:** ≥10 tests pass, feedback is actionable

---

**Day 33–37: Pilot Projects**

**Pilot 1: AGENCY_ONLY Game Design (Days 33–34)**

- [ ] Task: "Design 2D roguelike with procedural generation"
- [ ] Assemble team (Game Designer + Architect + Engineer)
- [ ] Activate agents sequentially
- [ ] Validate quality gates
- [ ] Capture outcomes (success rate, timeline, quality score)
- [ ] Approved: no blocker issues
- [ ] Result: Outcome data logged for M5

**Owner:** Implementation Agent (20), Software Architect (05)  
**Success metric:** Pilot completes, zero critical blockers

---

**Pilot 2: HYBRID SaaS + Blockchain (Days 35–36)**

- [ ] Task: "Build smart contract wallet integration"
- [ ] SDLC backbone (PHASE_1 through PHASE_5)
- [ ] Agency injections (Blockchain Auditor in PHASE_2, Solidity Engineer in PHASE_3)
- [ ] Validate context passing
- [ ] Validate merged outputs
- [ ] Capture outcomes
- [ ] Approved: no blocker issues

**Owner:** Implementation Agent (20), Software Architect (05)  
**Success metric:** Pilot completes, hybrid mode seamless

---

**Pilot 3: SDLC_ONLY Refactoring (Day 37)**

- [ ] Task: "Refactor auth module for performance"
- [ ] Pure SDLC, all standard agents (Architect → Engineer → QA → PR Review)
- [ ] Validate no regressions
- [ ] Capture outcomes

**Owner:** Implementation Agent (20), Senior Developer (06)  
**Success metric:** Pilot completes, outcomes match baseline

---

### 📋 Daily Standup Template: Weeks 7–10

```
## Standup [Date]

**Completed:** [Mode definition, refactoring, AGENCY_ONLY/HYBRID impl, QA gates, pilot 1/2/3]
**In Progress:** [Current pilot + progress + blockers]
**Upcoming:** [Next pilot, M5 kickoff]
**Risks:** Pilot failure? Context passing broke? Quality gate giving false negatives?

**Metrics:**
- Modes defined: [Y/N and which ones]
- Tests passing: [SDLC: N], [AGENCY_ONLY: N], [HYBRID: N]
- Pilots completed: [N/3]
- Regressions detected: [Y or N, if Y then list]
- Outcome data captured: [% of required fields]
```

---

## PHASE 5: LEARNING & OPTIMIZATION (WEEKS 11–13)

### ✅ Checklist: Outcome Tracking & Pattern Analysis

**Day 38–39: Outcome Tracking**

- [ ] Data model designed (sessionId, agentId, teamId, execution time, quality score, success)
- [ ] Database schema created
- [ ] Outcome data extracted from all 3 pilots
- [ ] Data quality validated (no missing required fields)
- [ ] Approved by Data Architect (09)

**Owner:** Data Architect (09), KPI Agent (29)  
**Success metric:** All pilot outcomes captured in database

---

**Day 40–41: Pattern Analysis**

- [ ] Pair success rates computed (Agent1 → Agent2)
- [ ] Team pattern success computed
- [ ] Conflict analysis: which combinations fail?
- [ ] Timeline accuracy analysis
- [ ] Dashboard created (showing top patterns)
- [ ] Weekly report automation
- [ ] Approved by Data Architect (09)

**Owner:** Data Architect (09), KPI Agent (29)  
**Success metric:** Patterns identified, dashboard showing insights

---

**Day 42–43: Recommendation Refinement**

- [ ] assembleTeam() updated to use historical patterns
- [ ] Scoring boosts agents in successful combinations
- [ ] Penalizes agents in failed combinations
- [ ] Confidence calculation (n ≥ 5)
- [ ] A/B test: new recommendations vs. baseline
- [ ] Success metric: +30% improvement in recommendation quality
- [ ] Approved by Software Architect (05)

**Owner:** Software Architect (05), Data Architect (09)  
**Success metric:** A/B test shows +30% improvement

---

**Day 44: Quarterly Optimization**

- [ ] Quarterly cycle process documented
- [ ] Metrics dashboard created (for reviews)
- [ ] Report generation automated
- [ ] Registry update scripts (bulk success rate updates)
- [ ] First quarterly cycle executable (no runtime errors)
- [ ] Approved by Product Manager (34)

**Owner:** Data Architect (09), Product Manager (34)  
**Success metric:** Quarterly process documented and tested

---

### 📋 Daily Standup Template: Weeks 11–13

```
## Standup [Date]

**Completed:** [Outcome tracking, pattern analysis, recommendation refinement, quarterly process]
**In Progress:** [Current task + % + blocker]
**Upcoming:** [Analytics review, quarterly cycle first run]
**Risks:** Data quality issues? Pattern signals too noisy?

**Metrics:**
- Outcome records captured: [N at 3 pilots]
- Patterns identified: [N, showing diversity]
- Confidence calculation: Y/N (all precedent combos counted)
- A/B test improvement: [%]
- Quarterly process: Y/N (executable)
```

---

## DETAILED IMPLEMENTATION CHECKLIST: File Artifacts

Print this checklist and tick off files as they're created:

### Registry & Metadata

- [ ] `registry/schema/agent.ts` — Agent TypeScript interface
- [ ] `registry/schema/agent-registry.schema.json` — JSON Schema
- [ ] `registry/data/agent-registry.json` — 230-agent data file (generated)
- [ ] `registry/README.md` — Documentation + examples
- [ ] `registry/utils/queryAgents.ts` — Search/filter API
- [ ] `registry/utils/registry.test.ts` — Unit tests (≥15)

### Handoff Protocol

- [ ] `platform/standards/HANDOFF-TEMPLATE.md` — Unified template
- [ ] `platform/standards/validation-schema.json` — Validation schema
- [ ] `platform/standards/validate-handoff.ts` — Validator implementation + CLI
- [ ] `tests/unit/validate-handoff.test.ts` — Unit tests (≥10)
- [ ] `docs/handoff-examples/` — 10 example handoff documents (agents, designers, engineers, etc.)
- [ ] `docs/HANDOFF-GUIDE.md` — Guide for agents on how to use template

### Matching & Assembly

- [ ] `orchestrator/schema/task.ts` — Task TypeScript interface
- [ ] `orchestrator/schema/task.schema.json` — Task JSON Schema
- [ ] `orchestrator/matching/scoringFunction.ts` — Matching algorithm
- [ ] `orchestrator/matching/matching.test.ts` — Unit tests (≥15)
- [ ] `orchestrator/templates/teamTemplates.json` — 7 pre-built patterns
- [ ] `orchestrator/api/assembleTeam.ts` — Team assembly API
- [ ] `orchestrator/api/assembleTeam.test.ts` — Unit tests (≥20)

### Execution Modes

- [ ] `orchestrator/modes/executeSDLCMode.ts` — SDLC_ONLY
- [ ] `orchestrator/modes/executeAgencyMode.ts` — AGENCY_ONLY
- [ ] `orchestrator/modes/executeHybridMode.ts` — HYBRID
- [ ] `orchestrator/modes/executionModes.test.ts` — Integration tests (≥35)
- [ ] `orchestrator/qualityGates/criticAgent.ts` — Updated Critic for all agent types
- [ ] `orchestrator/qualityGates/criticAgent.test.ts` — Unit tests (≥10)

### Learning & Outcomes

- [ ] `analytics/schema/outcome.ts` — Outcome data interface
- [ ] `analytics/database/outcomes.sql` — Database schema
- [ ] `analytics/analysis/patternAnalysis.ts` — Pattern analysis queries
- [ ] `analytics/dashboard/top-patterns.html` — Dashboard view
- [ ] `analytics/reporting/weeklyReport.ts` — Automated reporting
- [ ] `quarterlyOptimization/QUARTERLY-PROCESS.md` — Process documentation

### Documentation & Guides

- [ ] `docs/MILESTONES-EPICS-ISSUES.md` — (this file)
- [ ] `docs/EXECUTION-PHASES.md` — (this file)
- [ ] `docs/ARCHITECTURAL-DECISIONS.md` — (this file)
- [ ] `docs/QUICK-REFERENCE.md` — (this file)
- [ ] `docs/INTEGRATION-GUIDE.md` — How orchestrator + registry work together

---

## QUICK LOOKUP: FAQ for Implementation

**Q: Where does the agent registry live?**  
A: `registry/data/agent-registry.json`. Backed by database for M5 learning.

**Q: Do I need to update SDLC agent code?**  
A: Only if they don't fit handoff template (likely <20% of 39). Template is backward-compatible.

**Q: How do agencies agents and SDLC agents play together in HYBRID mode?**  
A: SDLC phases run as normal (PHASE_1–5). At injection points (e.g., end of PHASE_1, start of PHASE_2), agency agents inserted based on task domains. Outputs merged into single handoff.

**Q: What happens if an agent fails?**  
A: Orchestrator catches handoff status = `BLOCKED` or `ESCALATED`. If agency agent, escalate to human. If SDLC agent, follow normal gate logic (Critic decides next action).

**Q: How are confidence scores calculated?**  
A: MIN(number of historical precedents, matching algo score). Min ensures no false confidence from weak matches.

**Q: When does the learning loop start?**  
A: After M4 pilots (M5 phase). Outcomes from pilots seed the database. Quarterly cycles refine teams.

**Q: Can I run all 3 execution modes in parallel?**  
A: Yes, orchestrator switches mode per task. Different tasks can use different modes simultaneously.

**Q: What's the rollback plan if Phase M4 fails?**  
A: Keep SDLC_ONLY mode as fallback. AGENCY_ONLY and HYBRID are additive (don't break existing SDLC).

---

## HANDOFF CHECKLIST: Ready for Phase?

### Phase 1 → Phase 2

- [ ] 230-agent registry generated and validated
- [ ] Query APIs working
- [ ] Documentation complete
- [ ] No UNCERTAIN fields (or escalated to domain expert)

### Phase 2 → Phase 3

- [ ] Handoff template finalized
- [ ] SDLC agents audited (compliance report)
- [ ] Validation schema implemented + CI/CD integrated
- [ ] ≥10 example handoffs created and pass validation

### Phase 3 → Phase 4

- [ ] Task schema complete
- [ ] Matching algorithm tested (≥15 unit tests)
- [ ] 7 team templates documented
- [ ] assembleTeam() API working (≥20 unit tests)

### Phase 4 → Phase 5

- [ ] All 3 execution modes implemented
- [ ] ≥3 pilot projects completed successfully
- [ ] Critic Agent validates all agent types
- [ ] ≥35 integration tests pass
- [ ] No regressions in SDLC_ONLY mode

### Phase 5 (Completion)

- [ ] Outcome tracking database active
- [ ] Pattern analysis dashboard working
- [ ] Recommendation refinement deployed
- [ ] Quarterly process documented and tested

---

## ESCALATION PATHS

**If** task schema doesn't fit all agent types  
**Then** escalate to Domain Expert (02) and Software Architect (05)  
**Timeline impact:** +1 day

**If** matching algorithm produces unsensible teams >20% of time  
**Then** escalate to Software Architect (05) for algorithm refinement  
**Timeline impact:** +2 days

**If** SDLC agents heavily non-compliant with handoff template  
**Then** escalate to Software Architect (05) for design decision: (A) update template, (B) update agents  
**Timeline impact:** +3 days

**If** pilot project fails (blockers, poor quality)  
**Then** escalate to Senior Developer (06) + Software Architect (05) for root-cause analysis  
**Timeline impact:** +5–10 days

**If** outcomes not capturing expected patterns (noise > signal)  
**Then** escalate to Data Architect (09) for new metrics or data quality check  
**Timeline impact:** +2 days
