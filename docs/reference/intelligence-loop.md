# PATTERNS M1: Close The Intelligence Loop

**Status:** IMPLEMENTATION STARTED
**Target Score Impact:**

- Learning and Adaptation: 7.1 → 8.8
- Goal Setting and Monitoring: 8.7 → 9.2
- Evaluation and Monitoring: 9.4 → 9.6

## Overview

Milestone M1 implements automatic learning from operational evidence. The platform already captures reevaluate triggers, retrospectives, benchmark artifacts, and runtime metrics, but M1 closes the loop by converting these into durable execution policy changes.

## Architecture Components

### Core Services

#### 1. **Lessons-to-Policy Pipeline** (`lessons-to-policy.ts`)

Transforms normalized lessons from reevaluate and retrospective artifacts into machine-readable policy change proposals.

**Key Classes:**

- `LessonsToPolicyService` - Main service for lessons extraction and policy generation

**Key Methods:**

- `extractLessons(reevaluateIds, retrospectiveIds)` - Parse artifacts for lessons
- `generatePolicyRecommendations(lessons)` - Create policy recommendations
- `createProposal(lessons, benchmarkRunIds, retrospectiveIds)` - Generate proposal artifact
- `applyProposal(proposal)` - Apply approved changes with audit trail
- `revertProposal(proposalId, reason)` - Rollback applied changes

**Data Flow:**

```
Reevaluate/Retrospective Artifacts
        ↓
    extractLessons()
        ↓
Normalized Lessons Registry
        ↓
generatePolicyRecommendations()
        ↓
Policy Recommendations
        ↓
createProposal()
        ↓
Policy Change Proposal (pending-review)
        ↓
Manual/Automated Approval
        ↓
applyProposal() → Policy Applied with Audit Trail
```

#### 2. **Failure Taxonomy & Remediation** (`failure-taxonomy.ts`)

Classifies agent failures into structured categories and tracks remediation effectiveness.

**Key Classes:**

- `FailureTaxonomyService` - Manages failure classification and remediation tracking

**Default Failure Classes:**

- `FAIL-TOOL-001` - Tool Loop Timeout (Remediations: reduce recursion depth, increase timeout)
- `FAIL-PROVIDER-001` - Provider Unavailable (Remediations: trigger fallback, defer to next window)
- `FAIL-EVIDENCE-001` - Missing RAG Evidence (Remediations: expand retrieval, broaden collection)
- `FAIL-CONTRACT-001` - Output Contract Violation (Remediations: retry with reminder)
- `FAIL-APPROVAL-001` - Approval Bottleneck (Remediations: escalate with summary)

**Key Methods:**

- `initializeTaxonomy()` - Create default taxonomy
- `classifyError(errorMessage, agent, phase)` - Auto-classify errors
- `recordFailure(instance)` - Log failure occurrence
- `recommendRemediations(failureClassId)` - Get sorted remediations
- `recordRemediationApplication(instanceId, remediationId, success)` - Track remediation outcome
- `getTaxonomyStats()` - Aggregate metrics

**Metrics Tracked per Failure Class:**

- Total occurrences (all-time, last 7 days, last 30 days)
- Remediation success rate
- Trend (improving/stable/degrading)

#### 3. **Objective Graph** (`objective-graph.ts`)

Machine-readable strategic goals, KPIs, epics, sprint items, responsible agents, and gate linkages.

**Key Classes:**

- `ObjectiveGraphService` - Maintains canonical objective graph

**Graph Structure:**

```
Objectives (strategic goals)
├── KPIs (key performance indicators)
├── Linked Epics
├── Linked Sprint Items
├── Linked Gates
├── Blocking Decisions
└── Health Score

Epics (features supporting objectives)
└── Status tracking
```

**Key Methods:**

- `addObjective(objective)` - Create new objective
- `updateObjective(id, updates)` - Update objective status/data
- `addEpic(epic)` - Link epic to objective
- `updateKPI(objectiveId, kpiId, value, drift)` - Update KPI metrics
- `getAtRiskObjectives()` - Filter by status
- `computeHealthSummary()` - Aggregate health metrics

#### 4. **Goal Health Scoring** (`goal-health.ts`)

Computes goal health status based on KPI drift, blockers, decisions, and benchmarks.

**Key Classes:**

- `GoalHealthScoringService` - Health assessment computation

**Health Factors (weighted):**

- **KPI Drift** (35% weight) - Status: on-track/warning/at-risk/critical
- **Blocker Count** (30% weight) - Number of blocking decisions
- **Decision Currency** (20% weight) - Percentage of open decisions
- **Benchmark Regression** (15% weight) - Performance regressions

**Health Formula:**

```
OverallScore = Σ(FactorScore × FactorWeight) / TotalWeight

Status Mapping:
- score >= 7.0 → "healthy"
- 4.0 ≤ score < 7.0 → "at-risk"
- score < 4.0 → "critical"
```

**Key Methods:**

- `assessObjectiveHealth(objective)` - Full assessment
- `generateRecommendedActions(objective, status, factors)` - What to do next
- `getLatestAssessment(objectiveId)` - Get most recent

**Recommended Actions:**

- Critical health → "Escalate to product manager immediately"
- High blockers → "Prioritize resolving open decisions"
- KPI drift → "Reassess targets or increase investment"
- Decision queue → "Notify stakeholders for prioritization"
- At-risk status → "Consider reevaluate run to adjust strategy"

#### 5. **Benchmark-Driven Tuning** (`benchmark-tuning.ts`)

Analyzes benchmark results and generates bounded tuning proposals for runtime behavior.

**Key Classes:**

- `BenchmarkTuningService` - Benchmark comparison and proposal generation

**Tuning Domains:**

- `concurrency` - Max parallel execution threads
- `retrieval-threshold` - RAG similarity threshold
- `retrieval-depth` - Number of RAG results (topK)
- `human-review-threshold` - Confidence threshold for human approval
- `cache-ttl` - Cache time-to-live
- `retry-attempts` - Max retry count
- `fallback-strategy` - Fallback provider selection

**Proposal Safety:**

- Each proposal includes `safetyBounds` (min/max/rollback values)
- All proposals require explicit approval
- All changes logged with rollback procedures
- Automatic revert if regression detected

**Key Methods:**

- `compareBenchmarks(currentId, previousId)` - Detect regressions
- `generateTuningProposals(comparison)` - Create bounded proposals
- `applyProposal(id)` - Accept and apply
- `rejectProposal(id, reason)` - Decline
- `revertProposal(id, reason)` - Rollback (only for applied)
- `getProposalsByStatus(status)` - Filter by status

**Metrics Analyzed:**

- avgLatencyMs (target: decrease)
- p95LatencyMs (target: decrease for consistency)
- throughputRequestsPerSec (target: increase)
- errorRate (target: decrease)
- approvalTimeMinutes (target: decrease)
- cacheMissRate (target: decrease)

## Schemas

### objective-graph.schema.json

Complete specification for machine-readable objectives with KPIs, linked resources, and health status.

### failure-taxonomy.schema.json

Failure classes, remediations, metrics, and instance tracking.

### policy-change-proposal.schema.json

Policy recommendations with impact analysis, safety bounds, and approval workflow.

### goal-health.schema.json

Health assessment with weighted factors, trends, and recommended actions.

### lessons-registry.schema.json

Normalized lessons extracted from artifacts with confidence, applicability, and policy associations.

## API Endpoints

### Objective Graph

- `GET /api/intelligence-loop/objectives` - List all objectives
- `POST /api/intelligence-loop/objectives` - Create objective
- `GET /api/intelligence-loop/objectives/:id` - Get specific objective
- `PUT /api/intelligence-loop/objectives/:id` - Update objective
- `GET /api/intelligence-loop/objectives/:id/health` - Current health assessment

### Health Summary

- `GET /api/intelligence-loop/health-summary` - Overall health across all objectives
- `GET /api/intelligence-loop/at-risk-objectives` - Filter to at-risk only

### Failure Taxonomy

- `GET /api/intelligence-loop/failure-taxonomy` - Full taxonomy + stats
- `GET /api/intelligence-loop/failure-taxonomy/:classId/remediations` - Recommended fixes
- `POST /api/intelligence-loop/failure-taxonomy/classify` - Auto-classify error message

### Lessons & Policy

- `POST /api/intelligence-loop/policy-proposals` - Generate from artifacts
- `POST /api/intelligence-loop/policy-proposals/:id/approve` - Approve + apply

### Benchmark Tuning

- `POST /api/intelligence-loop/benchmark-comparison` - Compare runs + generate proposals
- `GET /api/intelligence-loop/tuning-proposals` - List all proposals (optionally filtered by status)
- `POST /api/intelligence-loop/tuning-proposals/:id/apply` - Apply proposal
- `POST /api/intelligence-loop/tuning-proposals/:id/revert` - Revert proposal

## Artifact Locations

All M1 artifacts are stored in `BusinessDocs/intelligence-loop/`:

```
BusinessDocs/intelligence-loop/
├── objective-graph.json                    # Current graph state
├── goal-health-assessments.jsonl           # Assessment history
├── failure-taxonomy.json                   # Failure classes + remediations
├── failure-instances.jsonl                 # Failure occurrence log
├── lessons-registry-*.json                 # Extracted lessons per run
├── policy-proposals/
│   ├── POLICYCHANGE-*.json                # Individual proposals
│   └── policy-application-audit.jsonl     # Approval/application history
├── tuning-proposals.jsonl                 # Benchmark tuning proposals
├── benchmark-comparisons.jsonl            # Benchmark analysis history
```

## Integration Points

### Engine Level

- Failure taxonomy integrated into error handling pipeline
- Health scoring runs on each phase gate
- Policy pipeline triggered by reevaluate completion

### Service Level

- Failures automatically classified and recorded
- Lessons extracted and policy proposals generated
- Health assessed for cockpit and approval views

### API Level

- All M1 services exposed through `/api/intelligence-loop/*` routes
- Health summaries integrated into session status
- At-risk objectives surface in sprint gate decision support

## Implementation Checklist

### Phase 1: Core Infrastructure ✅

- [x] Schema definitions (5 schemas)
- [x] Service implementations (5 services)
- [x] API route registration
- [x] Unit tests

### Phase 2: Engine Integration (TODO)

- [ ] Wire services into ServiceContext
- [ ] Register M1 routes in app manifest
- [ ] Hook failure capture into error handling
- [ ] Hook health assessment into gate validation
- [ ] Hook policy pipeline into reevaluate completion

### Phase 3: Testing & Validation (TODO)

- [ ] Integration tests with full context
- [ ] Load testing with benchmark tuning
- [ ] End-to-end workflow validation
- [ ] Documentation updates

### Phase 4: Deployment Ready (TODO)

- [ ] Architecture index updated
- [ ] API documentation published
- [ ] Observability/monitoring setup
- [ ] Rollback procedures documented

## Expected Score Improvements

After M1 implementation and integration:

| Pattern                     | Current | Target | Method                                                             |
| --------------------------- | ------- | ------ | ------------------------------------------------------------------ |
| Learning and Adaptation     | 7.1     | 8.8    | Lessons-to-policy + taxonomy + tuning automates adaptation         |
| Goal Setting and Monitoring | 8.7     | 9.2    | Objective graph + health scoring makes goals explicit + measurable |
| Evaluation and Monitoring   | 9.4     | 9.6    | Benchmark tuning closes feedback loop on metrics                   |

## Breaking Changes: None

M1 is purely additive. All existing systems continue to work unchanged. New functionality is opt-in through the `/api/intelligence-loop/*` routes.

## Rollout Strategy

1. **Week 1:** Deploy services and schemas, validate with synthetic data
2. **Week 2:** Hook into real reevaluate runs, start taxonomy population
3. **Week 3:** Enable health assessment for next gate cycle
4. **Week 4:** Enable benchmark tuning for next benchmark run

## Known Limitations

1. **Baseline Learning:** Taxonomy starts empty; remediations improve over time as failures are recorded
2. **Manual Approval:** Policy and tuning proposals require human approval (cannot apply automatically)
3. **Benchmark Dependency:** Tuning only works if benchmarks are run; defaults to conservative proposals
4. **Decision Inference:** Decision currency factor estimates open count (actual count requires decisions service lookup)

## Related Documents

- `/Patterns-Milestones.md` - Full M1, M2, M3, M4 roadmap
- `/Patterns-Synthesis.md` - Score audit and improvement rationale
- `/Patterns/09-learning-and-adaptation.md` - Learning pattern assessment
- `/Patterns/11-goal-setting-and-monitoring.md` - Goal monitoring assessment

## Next Milestone

**M2: Upgrade Reasoning And Collaboration** requires M1 to be complete. M2 will add:

- Explicit reasoning profiles (fast, critique-first, debate, verifier-heavy, synthesis-safe)
- Verifier pass for high-risk deliverables
- Typed A2A messaging for agent collaboration
