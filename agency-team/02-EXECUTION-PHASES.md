# Agency Team Integration — Execution Phases & Implementation Plan

> Tactical roadmap with daily checkpoints, decision points, and risk mitigation  
> Format: Quick-reference timeline for sprint planning  
> Complements: [00-SYNTHESIS.md](00-SYNTHESIS.md), [01-MILESTONES-EPICS-ISSUES.md](01-MILESTONES-EPICS-ISSUES.md)

---

## PHASE 1: FOUNDATION (Weeks 1–2)

### Goal

Build the agent registry and reference implementation so all downstream work has a solid data foundation.

### Deliverables

- Agent registry JSON with all 230 agents + metadata
- Registry schema (TypeScript + JSON Schema)
- Search/query utilities
- Registry documentation + examples

---

## Week 1: Data Extraction & Schema

### Day 1–2: Registry Schema Design (Issue M1-1)

**Checklist:**

- [ ] Domain experts agree on required fields (review SYNTHESIS schema proposal)
- [ ] TypeScript interfaces drafted
- [ ] JSON schema written and validated
- [ ] 5 example agent entries created (different types)

**Success criteria:**

- No field marked UNCERTAIN
- Schema handles 230+ diverse agents
- Examples pass validation

**Decision point:** If schema doesn't fit some agent types, escalate to domain expert for clarification

---

### Day 3–4: Agency Agent Metadata Extraction (Issue M1-2)

**Tasks:**

1. Read all 191 agency markdown files
2. For each agent, extract:
   - Name, description, domain(s), capabilities
   - Input/output spec
   - Timeline estimate (from description or infer)
   - Emoji, vibe, color (YAML frontmatter)
   - Related agents / patterns
   - Start success rate at 85% (refine in M5)
3. Generate registry JSON

**Parallel:** Spot-check 10 random agents as you go to catch schema mismatches early

**Success criteria:**

- All 191 extracted with no missing required fields
- Spot checks pass
- Zero validation errors in registry JSON

---

### Day 5: SDLC Agent Metadata Extraction (Issue M1-3)

**Tasks:**

1. Extract from templates/sdlc/agents (39 agents)
2. Special attention to: phase, gate membership, sequence dependencies
3. Merge with M1-2 output: 230-agent registry complete

**Success criteria:**

- 230-agent registry generated
- SDLC agents have phase/gate/sequence info
- Registry passes schema validation

**Handoff:** Registry JSON ready for M1-4

---

## Week 2: APIs, Search & Documentation

### Day 6–7: Registry Query API (Issue M1-4)

**Tasks:**

1. Implement queryAgents() function
2. Support filters: domain, capability, timeline, success rate
3. Implement findComplementaryAgents()
4. Unit tests (≥10 cases)

**Success criteria:**

- queryAgents() works for all filter combinations
- getAgent() returns single agent by ID
- findComplementaryAgents() uses "worksWith" metadata
- All tests pass

**Parallel:** Integrate with session state (prepare for M2)

---

### Day 8: Registry Documentation & Examples (Issue M1-5)

**Tasks:**

1. Write README for agency-team folder
2. Explain schema with examples
3. Create CLI examples (how to query registry)
4. Document how to add new agents to registry

**Success criteria:**

- README has ≥5 annotated example agents
- Queries demonstrated with real output
- Zero missing documentation

**Handoff:** Registry complete and documented. Ready for M2.

---

## PHASE 2: STANDARDS (Week 3)

### Goal

Define how agents hand off work to each other so outputs are composable.

### Deliverables

- Unified handoff template (markdown format)
- Validation schema & CLI tool
- ≥10 real examples (annotated)
- Audit report (SDLC agent compliance)

---

### Day 9–10: Design Unified Handoff Template (Issue M2-1)

**Tasks:**

1. Reference SYNTHESIS handoff template proposal
2. Refine based on feedback from M1 team
3. Define: mandatory vs. optional sections
4. Draft rationale for each section
5. Create 3 example templates (agency, SDLC, hybrid scenario)

**Success criteria:**

- Template fits all agent types (no exceptions)
- Clear guidance on section requirements
- Rationale documented

**Parallel:** Begin audit of SDLC agents (Day 11)

---

### Day 11–12: Audit SDLC Agent Compliance (Issue M2-2)

**Tasks:**

1. For each 39 SDLC agents, review current output format
2. Check: does it already match the unified template?
3. Document discrepancies
4. Generate compliance report (% already compliant, % needing updates)
5. Effort estimate for updates

**Success criteria:**

- Compliance audit complete
- All 39 agents assessed
- Clear action items for updates (if any)

---

### Day 13–14: Validation Schema & Examples (Issues M2-3, M2-4)

**Tasks - M2-3:**

1. Implement TypeScript validator (Zod or similar)
2. Build CLI tool: `validate-handoff [file.md]`
3. Create unit tests (≥10: valid + invalid examples)
4. Integrate into CI/CD

**Tasks - M2-4:**

1. Create ≥10 realistic handoff examples
2. Different agent types (architect, dev, designer, PM, tester)
3. Different outcomes (success, escalation, blocking issue)
4. Annotate: explain rationale for each section

**Success criteria:**

- Validator catches all common mistakes
- All example handoffs pass validation
- CI/CD integration working

**Handoff:** Standards defined and enforced. Ready for M3.

---

## PHASE 3: ORCHESTRATOR ENHANCEMENT (Weeks 4–6)

### Goal

Teach orchestrator to assemble optimal agent teams for any task.

### Deliverables

- Task schema
- Agent matching algorithm
- Team assembly API
- Pre-built team templates (≥7)
- Unit tests (≥35 total)

---

### Day 15–16: Task Schema (Issue M3-1)

**Tasks:**

1. Design task schema (goal, domains, constraints, context)
2. Create TypeScript interface + JSON schema
3. Generate ≥5 example tasks (diverse types)
4. Validate all examples against schema

**Success criteria:**

- Schema is complete and consistent
- All examples pass validation
- No ambiguous fields

**Parallel:** Begin matching algorithm research (Day 17)

---

### Day 17–18: Matching Algorithm (Issue M3-2)

**Tasks:**

1. Implement agent scoring function (domain match, capability, success rate, timeline)
2. Implement filtering (remove conflicts)
3. Implement ranking (sort by score)
4. Handle edge cases (no matches available, conflicting preferences, impossible timeline)
5. Unit tests (≥15 cases)

**Example algorithm:**

- Domain match: +20 per domain
- Capability match: +10 per capability
- Success rate above 80%: +0.1 per point
- Timeline fit: +10 if estimate ≤ task timeline
- Conflict penalty: -100

**Success criteria:**

- Algorithm produces sensible results for ≥5 different task types
- Edge cases handled without crashing
- Tests pass

---

### Day 19–20: Pre-Built Team Templates (Issue M3-3)

**Tasks:**

1. Document ≥7 successful team patterns:
   - Startup MVP
   - Enterprise Feature (full SDLC)
   - Game Development
   - Compliance/Audit
   - Marketing Campaign
   - Incident Response
   - Blockchain Integration
2. For each: agent sequence, dependencies, parallelization, timeline estimate
3. Define schema for team templates
4. Store templates in config (JSON or YAML)

**Success criteria:**

- ≥7 templates created and documented
- Templates are specific, not generic
- Each has clear use case

---

### Day 21–22: Team Assembly API (Issue M3-4)

**Tasks:**

1. Implement orchestrator.assembleTeam(task) API
2. Incorporates matching algorithm (M3-2)
3. Can load and apply templates (M3-3)
4. Returns reasoning, alternatives, confidence
5. Unit tests (≥20 cases)

**API signature:**

```typescript
const team = await orchestrator.assembleTeam({
  task: Task,
  mode: 'RECOMMEND' | 'ASSEMBLE',
  userPreferences?: {...}
}): AssembleTeamResponse
```

**Success criteria:**

- API returns team in logical order (dependencies respected)
- Reasoning is explainable (not black box)
- Alternative teams suggested
- Confidence scoring makes sense

**Handoff:** Orchestrator can now dynamically assemble teams. Ready for M4.

---

## PHASE 4: HYBRID EXECUTION (Weeks 7–10)

### Goal

Implement three execution modes (SDLC_ONLY, AGENCY_ONLY, HYBRID) and run pilot projects.

### Deliverables

- All three modes implemented and tested
- Unified quality gates for all agent types
- ≥3 pilot projects completed
- Integration tests (≥35 cases)

---

### Day 23–24: Define Execution Modes (Issue M4-1)

**Tasks:**

1. Document SDLC_ONLY, AGENCY_ONLY, HYBRID with use cases
2. Flow diagrams for each mode
3. Agent composition examples
4. Decision matrix: when to use each

**Success criteria:**

- Clear guidance on which mode for which scenario
- No ambiguity between modes

---

### Day 25–26: SDLC_ONLY Refactoring (Issue M4-2)

**Tasks:**

1. Extract existing SDLC orchestrator logic to separate function
2. Add executionMode parameter to orchestrator
3. Ensure backward compatibility (all existing tests pass)
4. Update tests to pass executionMode

**Success criteria:**

- Existing SDLC behavior unchanged
- Mode parameter logged in session state
- No regressions

---

### Day 27–28: AGENCY_ONLY Implementation (Issue M4-3)

**Tasks:**

1. Implement executeAgencyMode()
2. Call assembleTeam() from M3
3. Sequential agent activation
4. Handoff validation between agents
5. Escalation handling
6. Reality Checker as final validator
7. Unit tests (≥15 cases)

**Flow:**

```
Task → AssembleTeam → [Agent1, Agent2, ...]
  → Activate each sequentially
  → Validate handoffs
  → Reality Check final output
  → Return summary
```

**Success criteria:**

- Mode works end-to-end
- Team assembly integration smooth
- Error handling robust

---

### Day 29–30: HYBRID Implementation (Issue M4-4)

**Tasks:**

1. Implement executeHybridMode()
2. Map injection points (where to insert agency agents in SDLC phases)
3. Context passing between SDLC and agency agents
4. Unified handoff (merge outputs from different agent types)
5. Unified quality gates (Critic validates both types)
6. Unit tests (≥20 cases)

**Injection points example:**

- PHASE_1 → PHASE_2: if blockchain domain, inject Blockchain Auditor
- PHASE_2: if gaming domain, inject Game Designer
- PHASE_3: if gaming, inject for UI
- PHASE_4: if marketing needed, inject Growth Marketer

**Success criteria:**

- Hybrid teams execute without errors
- Context passing works
- Merged handoffs are coherent

---

### Day 31–32: Unified Quality Gates (Issue M4-5)

**Tasks:**

1. Update Critic Agent to validate all agent types
2. Validate against unified handoff schema
3. Score consistency across SDLC/agency agents
4. Provide actionable feedback
5. Unit tests (≥10 realistic handoff documents)

**Success criteria:**

- Critic can handle mixed agent types
- Quality scoring unbiased (SDLC agents not favored over agency, etc.)
- Feedback is actionable

---

### Day 33–37: Pilot Projects (All modes)

**Pilot 1: AGENCY_ONLY (Game Design)**

- Task: "Design a 2D roguelike game with procedural generation"
- Assemble team → Execute → Validate
- Capture outcomes for M5

**Pilot 2: HYBRID (SaaS Product with Blockchain)**

- Task: "Build smart contract wallet integration for payment platform"
- SDLC backbone + blockchain/crypto agents injected
- Capture outcomes

**Pilot 3: SDLC_ONLY (Refactoring)**

- Baseline: pure SDLC to ensure no regressions
- Capture outcomes

**For each pilot:**

- Team assembly
- Agent activation
- Quality gate validation
- Handoff validation
- Outcome tracking (for M5)

**Success criteria:**

- All 3 pilots complete successfully
- No critical bugs
- Outcome data collected (for pattern analysis in M5)

---

## PHASE 5: LEARNING & CONTINUOUS IMPROVEMENT (Weeks 11–13)

### Goal

Analyze outcomes to improve team assembly recommendations over time.

### Deliverables

- Outcome tracking database
- Pattern analysis reports
- Recommendation algorithm refinement
- Quarterly optimization process

---

### Day 38–39: Outcome Tracking Model (Issue M5-1)

**Tasks:**

1. Design data model for outcomes
2. Define what to track per agent activation
3. Create database schema
4. Extract outcome data from pilot projects
5. Validate data quality

**Data to track:**

- Agent ID, task ID, team ID, session ID
- Execution time, quality score, blockers
- Success/failure, timeline accuracy
- Following agent's success (did they succeed given this agent's outputs?)

**Success criteria:**

- All pilot project outcomes captured
- No missing required fields
- Data quality validated

---

### Day 40–41: Pattern Analysis (Issue M5-2)

**Tasks:**

1. Run pattern analysis on pilot outcomes
2. Calculate pair success rates (Agent1 → Agent2)
3. Calculate team pattern success (full compositions)
4. Identify conflicts (which combinations fail?)
5. Generate dashboard/reports
6. Email reports (weekly summary)

**Success criteria:**

- Top-performing patterns identified
- Conflicts clearly documented
- Dashboard ready for stakeholder review

---

### Day 42–43: Recommendation Refinement (Issue M5-3)

**Tasks:**

1. Update assembleTeam() to use historical patterns
2. Boost scores for agents in successful combinations
3. Penalize agents in failed combinations
4. Incorporate confidence (only when n ≥ 5)
5. Unit tests verifying A/B improvement

**Success criteria:**

- Recommendations improve score vs. baseline
- Users prefer recommended teams
- Success rate improves by 30%+ in pilot phase

---

### Day 44: Quarterly Optimization Process (Issue M5-4)

**Tasks:**

1. Document quarterly review cycle
2. Create metrics dashboard (for reviews)
3. Automate report generation
4. Script registry updates (bulk update success rates)
5. Archive historical data

**Acceptance criteria:**

- First quarterly cycle documented and walkable
- Reports ready for team review

---

## DECISION POINTS & ESCALATION PATHS

### Decision Point 1: Schema Fits (Day 2–3)

**If:** Registry schema doesn't work for some agent types  
**Then:** Escalate to domain expert (Agent 02, 34)  
**Action:** Refine schema to be more generic or expand field set  
**Timeline impact:** +1 day

---

### Decision Point 2: SDLC Compliance (Day 12)

**If:** >30% of SDLC agents need updates to match new template  
**Then:** Decide: (A) Update all, or (B) Make template backward-compatible  
**Action:** Option A (updates faster), Option B (less work now, more later)  
**Timeline impact:** Option B saves 3 days in M2

---

### Decision Point 3: Matching Algorithm Accuracy (Day 18)

**If:** Algorithm produces teams that users reject >20% of the time  
**Then:** Refine scoring weights or add new criteria  
**Action:** Implement feedback loop; adjust formula  
**Timeline impact:** +2 days

---

### Decision Point 4: HYBRID Complexity (Day 30)

**If:** Context passing between SDLC/agency agents breaks too often  
**Then:** Decide: (A) Simplify design, or (B) Invest in robust translation layer  
**Action:** Option B (more time, more reliable)  
**Timeline impact:** +3 days

---

### Decision Point 5: Pilot Project Results (Day 37)

**If:** Pilot projects fail or produce poor quality outcomes  
**Then:** Root-cause analysis and fixes before proceeding to M5  
**Action:** Debug orchestrator, fix bugs, re-run pilots  
**Timeline impact:** +5–10 days (if significant issues)

---

## RISK MITIGATION

### Risk 1: Metadata Extraction Incomplete

**Probability:** Medium  
**Impact:** Downstream algorithms fail due to missing data  
**Mitigation:** Spot-check 10 agents daily; escalate UNCERTAIN fields immediately

### Risk 2: Handoff Template Too Restrictive

**Probability:** Medium  
**Impact:** Agents struggle to fit outputs into template; template updates required  
**Mitigation:** Pilot template on ≥5 real agents before finalizing (Days 9–12)

### Risk 3: Matching Algorithm Wrong

**Probability:** High (algorithms are finicky)  
**Impact:** Teams assembled are suboptimal or nonsensical  
**Mitigation:** Heavy unit testing (≥20 cases); feedback loop from pilots

### Risk 4: Multi-Agent Context Loss

**Probability:** High (sequential activation is complex)  
**Impact:** Agent 2 misses context from Agent 1; outputs diverge  
**Mitigation:** Explicit context passing contract; detailed integration tests

### Risk 5: Timeline Compression

**Probability:** Medium  
**Impact:** Phases rushed; bugs introduced; technical debt  
**Mitigation:** Clarify priorities upfront; cut non-essential features (e.g., defer M5-4 quarterly process to later)

---

## CONTINGENCY: Fast-Track Plan (If Timeline Compressed)

If timeline must be shortened:

1. **Cut M5 Phase 2 Entirely:** Launch with manual patterns, no automated learning (save 3 weeks)
   - Run pilot projects (M4-3 + M4-4)
   - Manually optimize team assembly based on outcomes
   - Defer quarterly cycles

2. **Simplify M4-4 (HYBRID):** Start with simpler injection points only
   - PHASE_2 injection only (e.g., add blockchain agent to architecture phase)
   - Expand to other phases in Phase 6

3. **Reduce Pilot Count:** 1 pilot per mode instead of 3
   - Speeds Day 33–37 to 3 days
   - Reduces outcome data for M5 (patterns less reliable)

4. **Defer M1-5 Documentation:** Document registry later
   - Focus on implementation until Day 8
   - Add docs in week 3

**Timeline with fast-track:** 8 weeks instead of 13 (saves ~38% time)  
**Trade-off:** Less learning phase, manual optimization required

---

## DAILY STANDUP TEMPLATE

```markdown
## Standup [Date]

**Completed**

- [Issue #]: [Description]
- [Issue #]: [Description]

**In Progress**

- [Issue #]: [Description] (E[D]ay N, on track / at risk)

**Upcoming**

- [Issue #]: [Description] (planned for Day N)

**Blockers**

- None / [Description with escalation]

**Risks Materialized**

- None / [Risk name: mitigation applied]

**Metrics**

- Tests passing: [N]
- Code coverage: [%]
- Registry completeness: [% agents]
```

---

## SUCCESS CHECKLIST (By Phase)

### Phase 1: Foundation

- [ ] 230-agent registry generated & validated
- [ ] Registry query API functional
- [ ] Documentation complete
- [ ] No UNCERTAIN fields in registry

### Phase 2: Standards

- [ ] Handoff template agreed upon
- [ ] ≥80% SDLC agents already compliant (or update plan in place)
- [ ] Validation schema implemented & CI/CD integrated
- [ ] ≥10 example handoffs (diverse types)

### Phase 3: Orchestrator

- [ ] assembleTeam() API functional
- [ ] ≥7 pre-built team templates
- [ ] Matching algorithm scoring makes sense
- [ ] ≥35 unit tests pass

### Phase 4: Hybrid Execution

- [ ] All three modes (SDLC_ONLY, AGENCY_ONLY, HYBRID) implemented
- [ ] ≥3 pilot projects completed successfully
- [ ] Critic Agent validates all agent types
- [ ] ≥35 integration tests pass

### Phase 5: Learning

- [ ] Outcome tracking database active
- [ ] Pattern analysis complete
- [ ] Recommendation refinement deployed
- [ ] Quarterly process documented

---

## HANDOFF TO PHASE 6

At completion of Phase 5:

- Orchestrator fully integrated with Agency Team
- All 230 agents (SDLC + agency) executable via unified interface
- Dynamic team assembly working
- Learning loop in place
- Ready for user onboarding and feature expansion

**Next phase:** Scale to 500+ users, advanced personalization, specialized domain teams
