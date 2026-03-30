# Agency Team Integration — Architectural Decision Records

> ADRs justify design choices, trade-offs, and why alternatives were rejected  
> Format: Markdown architecture notes for onboarding and future reference  
> Based on: Synthesis document, Phase leaders' feedback, constraint analysis

---

## ADR-1: Metadata-First Approach (vs. Code-First)

**Status:** ACCEPTED  
**Date:** Phase M1  
**Participants:** Software Architect (05), Domain Expert (02)

### Decision

Build a queryable agent registry (JSON/database) with structured metadata _before_ implementing orchestrator logic. Do not generate metadata on-the-fly from agent code.

### Rationale

**Metadata-First:**

- Enables fast queries (O(1) lookup vs. O(n) code parse)
- Allows augmentation (success rates, team patterns not in agent code)
- Decouples discovery from agent implementation
- Enables learning loop (track outcomes, refine metadata)

**Code-First Alternative:**

- Agent code is source of truth → less duplication
- Auto-generate metadata by analyzing code (introspection)
- Challenge: not all metadata extractable (e.g., "works well with Agent X")
- Challenge: parsing 230 diverse codebases is fragile

### Trade-Offs

| Aspect           | Metadata-First                     | Code-First                          |
| ---------------- | ---------------------------------- | ----------------------------------- |
| Initial effort   | Higher (extract 230 agents)        | Lower (just introspect)             |
| Query speed      | Fast                               | Medium (real-time parsing)          |
| Learning loop    | Supported (track outcomes)         | Difficult (metadata changes slowly) |
| Agent authorship | Lighter (no metadata requirements) | Heavy (must expose metadata)        |

### Implications

- M1 timeline: manual extraction required
- Registry becomes critical artifact (must keep in sync with agent code)
- Tooling: validate registry against code (quarterly audit)

---

## ADR-2: Registry Schema: Flexible vs. Strict

**Status:** ACCEPTED  
**Date:** Phase M1  
**Participants:** Software Architect (05), Data Architect (09)

### Decision

Registry schema is **flexible but validated**: required core fields (name, domain, capabilities), optional fields (color, vibe, relatedAgents[]). Use Zod or similar for runtime validation, not rigid SQL schema.

### Rationale

**Flexible approach:**

- Accommodates diverse agent types (SDLC engineers, game designers, compliance auditors)
- New agents can be added without schema migration
- Optional metadata (e.g., emoji) non-blocking

**Strict approach:**

- All agents must fit exact schema
- Simpler validation logic
- Challenge: forces artificial fields on agents that don't need them

### Trade-Offs

| Aspect         | Flexible                                       | Strict                               |
| -------------- | ---------------------------------------------- | ------------------------------------ |
| Extensibility  | High (easy to add agents)                      | Low (schema changes needed)          |
| Validation     | JSON Schema + runtime checks                   | SQL constraints                      |
| Error handling | Graceful (optional fields missing)             | Strict (fail on missing field)       |
| Documentation  | Easier (each agent's metadata self-documented) | Harder (schema changes require docs) |

### Implications

- Validation logic must handle missing optional fields gracefully
- Registry examples needed (show min vs. full schemas)

---

## ADR-3: Unified Handoff Template vs. Agent-Specific Templates

**Status:** ACCEPTED  
**Date:** Phase M2  
**Participants:** Senior Developer (06), Process Lead

### Decision

Single unified handoff template for all 269 agents (39 SDLC + 191 agency), with guidance on which sections apply to different agent types. Not agent-specific templates.

### Rationale

**Unified:**

- Composability: next agent knows what to expect from previous agent
- Consistency: quality gates apply uniformly
- Learning: pattern analysis looks at like-for-like outputs

**Agent-Specific:**

- Architect handoff different from Game Designer handoff
- Challenge: Critic Agent must learn 39+ different formats
- Challenge: composability breaks (outputs don't align)

### Trade-Offs

| Aspect                  | Unified                         | Agent-Specific                           |
| ----------------------- | ------------------------------- | ---------------------------------------- |
| Composability           | High (all outputs compatible)   | Low (format mismatch)                    |
| Flexibility             | Medium (some sections optional) | High (each agent customizes)             |
| Quality gate complexity | Low (one validation schema)     | High (39 validators)                     |
| Agent onboarding        | Easy (follow one template)      | Difficult (learn template for your role) |

### Implications

- Template must be generic enough for architects, designers, auditors, etc.
- Guidance docs essential (which sections apply to which agents)
- Critic Agent validates against single schema (not agent-aware)

---

## ADR-4: Orchestrator Enhancement vs. New Orchestrator

**Status:** ACCEPTED  
**Date:** Phase M3  
**Participants:** Software Architect (05), Senior Developer (06)

### Decision

Enhance the existing SDLC orchestrator to support multiple execution modes (SDLC_ONLY, AGENCY_ONLY, HYBRID) rather than build a separate orchestrator for agency teams.

### Rationale

**Enhancement:**

- Single orchestrator: lower complexity
- Leverages existing error handling, session management
- Easy to add hybrid scenarios later
- Learning loop applies to all agent types

**Separate Orchestrator:**

- No risk of SDLC regressions
- Clean separation of concerns
- Challenge: duplicate logic (session management, quality gates, escalation)
- Challenge: learning loop requires synchronizing datasets

### Trade-Offs

| Aspect             | Enhanced                          | Separate                         |
| ------------------ | --------------------------------- | -------------------------------- |
| Code complexity    | Medium (3 execution paths)        | High (3 paths + duplicate logic) |
| Maintenance        | Low (single codebase)             | High (sync two orchestrators)    |
| Risk of regression | Medium (must test SDLC path)      | Low (isolated)                   |
| Learning loop      | Unified (all outcomes in same DB) | Complex (sync outcomes)          |

### Implications

- M4-2 must ensure SDLC mode behavior unchanged (regression testing critical)
- All quality gates must work with all agent types
- Session state schema updated to track execution mode

---

## ADR-5: Sequential vs. Parallel Agent Activation

**Status:** ACCEPTED (with Caveats)  
**Date:** Phase M4  
**Participants:** Software Architect (05), DevOps Engineer (07)

### Decision

Default: sequential activation (Agent 1 finishes → Agent 2 starts). Allow parallelization where dependencies permit (e.g., in SDLC, PHASE_2 parallelizes: Architect + Data Architect + Security Architect run in parallel).

### Rationale

**Sequential:**

- Simplicity: Agent N+1 has full output from Agent N
- Context preserved: no information loss
- Easier to debug: failures clearly traced to specific agent
- Matches SDLC phases (phases sequential by design)

**Full Parallelization:**

- Faster timeline: multiple agents work simultaneously
- Challenge: merging outputs from parallel agents is complex
- Challenge: Agent X's output depends on Agent Y, but they run in parallel
- Challenge: context passing is ambiguous

### Trade-Offs

| Aspect                | Sequential | Full Parallel                     |
| --------------------- | ---------- | --------------------------------- |
| Timeline              | Longer     | Shorter                           |
| Context preservation  | High       | Medium (must merge)               |
| Debugging             | Easy       | Complex                           |
| Coordination overhead | Low        | High (merge, conflict resolution) |

### Implications

- Define parallelization boundaries (within phases, not across phases)
- Team template specifies which agents can run in parallel
- Example: Game Developer + Audio Engineer can work in parallel; Audio Engineer must wait for Environment Design

---

## ADR-6: File-Based Context Passing vs. API-Based

**Status:** ACCEPTED  
**Date:** Phase M4  
**Participants:** Software Architect (05), Senior Developer (06)

### Decision

Use file-based context passing: Agent 1 writes handoff.md to session folder; Agent 2 reads it. Not API calls between agents.

### Rationale

**File-Based:**

- Traceable: all outputs stored in session folder (audit trail)
- Simple integration: agents are independent processes (can be remote)
- Versioning: easy to see Agent 1 → Agent 2 → Agent 3 progression in git
- Fault tolerance: if Agent 2 crashes, Agent 1's output safe in file

**API-Based:**

- Faster: direct calls vs. disk I/O
- Challenge: tight coupling (orchestrator must know all agents)
- Challenge: remote agents require network (latency, reliability)

### Trade-Offs

| Aspect           | File-Based              | API-Based                       |
| ---------------- | ----------------------- | ------------------------------- |
| Speed            | Slower (disk I/O)       | Faster (direct call)            |
| Traceability     | High (files in session) | Medium (logs only)              |
| Independence     | High (agents isolated)  | Low (orchestrator couples them) |
| Fault tolerance  | High (files persist)    | Low (only logs)                 |
| Remote execution | Supported               | Requires network                |

### Implications

- Session folder structure well-defined (naming conventions for agent outputs)
- File watching logic (orchestrator polls for handoff completion)
- Validation happens on file content, not API contract

---

## ADR-7: Registry as Source of Truth vs. Dynamic Discovery

**Status:** ACCEPTED  
**Date:** Phase M3  
**Participants:** Software Architect (05), Data Architect (09)

### Decision

Registry is source of truth for agent metadata. Do not dynamically discover agents at runtime by traversing the codebase.

### Rationale

**Registry as Source:**

- Query performance (O(1) lookup)
- Supports learning loop (success rates stored in registry)
- Supports augmentation (manually add metadata not in code)
- Enables team pre-planning (know before activating)

**Dynamic Discovery:**

- No duplication (registry is code)
- Challenge: slow (codepaths scanned each query)
- Challenge: success rates not in code (must track separately anyway)
- Challenge: augmentations (team patterns) not discoverable

### Trade-Offs

| Aspect               | Registry                    | Dynamic                      |
| -------------------- | --------------------------- | ---------------------------- |
| Query speed          | Fast                        | Slow                         |
| Discoverability      | Complete (registry is spec) | Incomplete (code-based only) |
| Learning support     | High (metadata updated)     | Low (code rarely changes)    |
| - Maintenance burden | Medium (keep in sync)       | Low (code is source)         |

### Implications

- Quarterly audit: verify registry matches code (agents renamed, moved, deleted)
- Registry updates are deployments (no code changes needed)

---

## ADR-8: Critic Agent Role vs. Multiple Validators

**Status:** ACCEPTED  
**Date:** Phase M4  
**Participants:** Quality Lead, Senior Developer (06)

### Decision

Single Critic Agent validates outputs from both SDLC and agency agents. Not role-specific validators.

### Rationale

**Single Critic:**

- Consistency: all outputs held to same standard
- Learning: single quality bar is trainable (improves over time)
- Simplicity: orchestrator has one quality endpoint

**Role-Specific Validators:**

- Specialized feedback: architect's output validated by architecture expert
- Challenge: 39+ validators needed (scaling problem)
- Challenge: metrics not comparable (architect's bar vs. designer's bar)

### Trade-Offs

| Aspect               | Single                 | Role-Specific            |
| -------------------- | ---------------------- | ------------------------ |
| Consistency          | High (single standard) | Low (multiple standards) |
| Feedback quality     | Medium (generic)       | High (specialized)       |
| Scaling              | Easy (one validator)   | Hard (many validators)   |
| Metric comparability | High (same scorer)     | Low (different scorers)  |

### Implications

- Critic Agent must understand all agent types (training included)
- Quality feedback generic (not role-specific)
- Metrics (success rate) comparable across all agents

---

## ADR-9: Pre-Built vs. Generated Team Compositions

**Status:** ACCEPTED  
**Date:** Phase M3  
**Participants:** Software Architect (05), Product Manager (34)

### Decision

Start with pre-built team templates (curated by experts). Matching algorithm refines from there, not generates from scratch.

### Rationale

**Pre-Built:**

- Domain expert knowledge captured upfront (game dev teams, product dev teams, etc.)
- Faster first deployment (don't wait for learning loop)
- Reliable baseline (expert-validated patterns)

**Generated from Scratch:**

- Unbiased (algorithm-driven, no human assumptions)
- Challenge: algorithm must learn from failures (takes time)
- Challenge: risky (first teams may be suboptimal)

### Trade-Offs

| Aspect             | Pre-Built                    | Generated                   |
| ------------------ | ---------------------------- | --------------------------- |
| Time to production | Fast (experts know patterns) | Slow (algorithm learns)     |
| Domain expertise   | High (captured)              | Low (ignored)               |
| Flexibility        | Medium (templates are rigid) | High (generated on-the-fly) |
| Robustness         | High (expert-validated)      | Medium (unproven initially) |

### Implications

- Template maintenance: quarterly review of templates (do they still work?)
- Feedback loop: user feedback on templates → refinement
- Matching algorithm refines templates, doesn't replace them

---

## ADR-10: Outcome Tracking: Granular vs. Aggregated

**Status:** ACCEPTED  
**Date:** Phase M5  
**Participants:** Data Architect (09), KPI Agent (29)

### Decision

Track outcomes at two levels:

1. **Granular:** Each agent activation (inputs, outputs, quality score, timeline)
2. **Aggregated:** Success rates per agent, per team composition, per task type

### Rationale

**Granular + Aggregated:**

- Granular enables root-cause analysis (why did Agent X fail?)
- Aggregated enables pattern analysis (which teams succeed?)
- Complements each other for learning loop

**Granular Only:**

- Storage bloat (large datasets)
- Challenge: harder to see patterns (manual analysis)

**Aggregated Only:**

- Low storage overhead
- Challenge: losing details (can't debug failures)

### Trade-Offs

| Aspect               | Both   | Granular Only | Aggregated Only |
| -------------------- | ------ | ------------- | --------------- |
| Storage              | Medium | High          | Low             |
| Pattern analysis     | Easy   | Difficult     | Easy            |
| Root-cause debugging | Easy   | Easy          | Difficult       |
| Learning speed       | Fast   | Medium        | Medium          |

### Implications

- Database schema supports both granular and aggregated queries
- Data retention policy: granular data kept for 90 days, aggregated for 1 year
- Analysis tools operate on aggregates (for performance)

---

## ADR-11: Confidence Scoring for Recommendations

**Status:** ACCEPTED  
**Date:** Phase M3  
**Participants:** Software Architect (05), Data Architect (09)

### Decision

Recommendation confidence = MIN(historical precedents, matching score) on scale 0–100.

- High confidence (80+): ≥5 successful historical precedents + good match score
- Medium confidence (60–80): 2–4 precedents or weaker match
- Low confidence (<60): <2 precedents or poor match

### Rationale

**Confidence metric:**

- Transparent (users see why recommendation is strong/weak)
- Learning-enabled (more precedents → higher confidence)
- Actionable (low confidence → user can override; high confidence → follow recommendation)

**Alternative (No Confidence):**

- Users don't know reliability of recommendations
- No way to surface uncertainty

### Trade-Offs

| Aspect       | With Confidence                           | Without              |
| ------------ | ----------------------------------------- | -------------------- |
| Transparency | High                                      | No                   |
| Adoption     | Medium (users trust high-confidence recs) | Medium (hit-or-miss) |
| Complexity   | Medium (tracking precedents)              | Low                  |

### Implications

- Precedent counter: for each (Agent1, Agent2) pair, track successful activations
- Confidence shown to users (UI displays confidence % next to recommendations)
- Low-confidence recommendations flag for human review

---

## ADR-12: Execution Mode as Orchestrator State vs. User Input

**Status:** ACCEPTED  
**Date:** Phase M4  
**Participants:** Product Manager (34), Software Architect (05)

### Decision

Execution mode (`SDLC_ONLY`, `AGENCY_ONLY`, `HYBRID`) set at task submission time, not orchestrator config. User specifies mode as part of task input.

### Rationale

**Mode as Task Input:**

- Per-task flexibility (same orchestrator, different modes for different tasks)
- User intent explicit (task goal implies mode)
- Learning loop captures outcomes per mode

**Mode as Orchestrator Config:**

- Simpler (one setting per run)
- Challenge: all tasks forced into same mode
- Challenge: can't mix modes in single project

### Trade-Offs

| Aspect              | Task Input               | Config                  |
| ------------------- | ------------------------ | ----------------------- |
| Flexibility         | High (per-task)          | Low (global)            |
| User intent clarity | High (explicit)          | Low (implicit)          |
| Complexity          | Medium                   | Low                     |
| Learning per mode   | High (separate datasets) | Medium (mixed outcomes) |

### Implications

- Task schema includes mode parameter
- Orchestrator validates mode + task combo (e.g., can't do HYBRID with single-domain task)

---

## ADR-13: Reality Checker Role in All Modes

**Status:** ACCEPTED  
**Date:** Phase M4  
**Participants:** Senior Developer (06), Critic Agent (18)

### Decision

Reality Checker validates final output in AGENCY_ONLY and HYBRID modes (replaces role of Sprint Gate in SDLC_ONLY).

### Rationale

**Reality Checker in All Modes:**

- Lightweight validation (questions sanity, not technical correctness)
- Consistent across modes (same endpoint)
- Fast feedback (doesn't require full Critic review)

**Different Validators per Mode:**

- Specialized validation
- Challenge: harder to compare outcomes across modes

### Trade-Offs

| Aspect           | Single Validator      | Mode-Specific        |
| ---------------- | --------------------- | -------------------- |
| Consistency      | High                  | Low                  |
| Feedback quality | Good (general sanity) | Better (specialized) |
| Complexity       | Low                   | High                 |
| Speed            | Fast                  | Variable             |

### Implications

- Reality Checker trained to handle all output types (code, design, marketing copy, etc.)
- Metrics show Reality Checker effectiveness across modes

---

## ADR-14: Agent Database (vs. Filesystem)

**Status:** ACCEPTED  
**Date:** Phase M1  
**Participants:** Data Architect (09), Software Architect (05)

### Decision

Registry stored in structured database (SQL or NoSQL), not flat JSON filesystem. JSON import/export for compatibility.

### Rationale

**Database:**

- Queryable (indexed, fast lookups)
- Updateable (success rates, outcomes tracked)
- Scalable (supports 1000s of agents)
- Transactional (consistent updates)

**Filesystem (JSON):**

- Simplicity (JSON files in git)
- Challenge: queries require parsing all files
- Challenge: updates require careful merging (git conflicts)

### Trade-Offs

| Aspect          | Database                    | Filesystem                     |
| --------------- | --------------------------- | ------------------------------ |
| Queryability    | High                        | Low                            |
| Simplicity      | Medium                      | High                           |
| Scalability     | High (handles 100Ks agents) | Low (degrades with file count) |
| Version control | Difficult (binary)          | Easy (JSON in git)             |

### Implications

- Database schema follows registry schema (TypeScript interfaces map to tables)
- Export to JSON for version control, import for production
- Quarterly syncs: verify prod DB matches source-controlled JSON

---

## DECISION MATRIX: Which ADR Applies?

| Scenario                            | ADR                 | Decision                                                          |
| ----------------------------------- | ------------------- | ----------------------------------------------------------------- |
| New agent added to registry         | ADR-2               | Use flexible schema, validate against Zod                         |
| Designing output format for Agent X | ADR-3               | Follow unified handoff template                                   |
| Orchestrator needs to assemble team | ADR-4, ADR-5, ADR-7 | Enhanced SDLC orchestrator, sequential activation, query registry |
| Passing context between agents      | ADR-6               | File-based in session folder                                      |
| Validating agent output             | ADR-8               | Single Critic Agent                                               |
| Choosing team for task "Build game" | ADR-9, ADR-11       | Use pre-built game dev template, show confidence score            |
| Running compliance audit task       | ADR-12              | User specifies `mode: AGENCY_ONLY` in task                        |
| Analyzing outcomes                  | ADR-10              | Granular + aggregated tracking                                    |

---

## FUTURE ADRs (Placeholder)

- ADR-15: Agent Training & Fine-Tuning (deferred to Phase 6)
- ADR-16: Federated Orchestrator (supporting multiple teams) (deferred to Phase 6)
- ADR-17: Pricing Model for Agent Usage (deferred to Phase 6)
