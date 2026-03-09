# Sprint Plan — SP-10
## Milestone Management: Templates, Export, Bulk Operations & Dependencies

**Sprint ID:** SP-10  
**Sprint Goal:** Deliver milestone templates, data export, bulk operations, and dependency tracking  
**Duration:** 2 weeks (per project plan)  
**Capacity:** 18 story points (based on velocity: avg 11 SP/sprint, scaling to backlog size)  
**Started:** 2026-03-09  
**Status:** IN_PROGRESS  

---

## Sprint Scope

This sprint continues milestone management features with advanced capabilities deferred from Sprint 9 plus new enhancements.

### High Priority (Must-Have) — 12 Story Points

| Story | Title | Points | Owner | Description | Acceptance Criteria |
|-------|-------|--------|-------|-------------|---------------------|
| **SP-9.9** | Milestone Templates | 4 | Full-Stack | Allow users to save milestone configurations as reusable templates | 1. Backend: Template CRUD endpoints<br>2. Frontend: Template selector in Create Modal<br>3. Template includes: name pattern, status, progress defaults<br>4. Persist to `.github/data/milestone-templates.json`<br>5. Tests: template CRUD + apply template workflow |
| **SP-10.1** | Export Milestones to JSON/CSV | 3 | Full-Stack | Add export functionality for milestone data | 1. Backend: GET `/api/milestones/export?format=json\|csv`<br>2. Frontend: Export button with format selector<br>3. CSV: proper escaping, headers<br>4. JSON: formatted, complete object<br>5. Tests: both formats, edge cases (empty list, special chars) |
| **SP-10.3** | Milestone Dependencies | 5 | Full-Stack | Track and enforce dependencies between milestones | 1. Backend: `depends_on` field (array of milestone IDs)<br>2. Validation: prevent circular dependencies<br>3. Frontend: dependency picker in Edit Modal<br>4. Visual: show blocked/blocking status<br>5. Tests: dependency validation, circular detection |

### Medium Priority (Should-Have) — 6 Story Points

| Story | Title | Points | Owner | Description | Acceptance Criteria |
|-------|-------|--------|-------|-------------|---------------------|
| **SP-10.2** | Bulk Archive/Restore | 3 | Full-Stack | Batch operations for archiving and restoring milestones | 1. Backend: PATCH `/api/milestones/bulk-archive`, `/bulk-restore`<br>2. Request: `{ ids: [...] }`<br>3. Frontend: Multi-select checkboxes + bulk action dropdown<br>4. Audit trail: single log entry per bulk operation<br>5. Tests: bulk operations, partial failures |
| **SP-10.4** | Comments/Notes on Milestones | 3 | Full-Stack | Add comment/note field for milestone context | 1. Backend: `notes` field (string, max 1000 chars)<br>2. Frontend: Textarea in Create/Edit modals<br>3. Display: truncated in table (100 chars), full in modal<br>4. Validation: length limit, XSS prevention<br>5. Tests: notes CRUD, validation |

---

## Lessons Learned Injection (Top-3 from previous sprints)

Per RULE ORC-22, the following lessons are injected as mandatory context for all agents:

1. **LL-14 (SP-8):** For documentation rewrites >100 lines, use backup → delete → create workflow instead of in-place replacement.
2. **LL-15 (SP-8):** Verify session-state.json current_step matches expected state at session start before proceeding.
3. **LL-12 (SP-7):** When writing tests that validate CSS properties, match against `var(--token-name)` rather than raw computed values.

---

## Definition of Ready Checklist

- [x] All stories have clear acceptance criteria
- [x] All stories have story point estimates
- [x] All stories have owner assigned (Full-Stack)
- [x] No HIGH priority OPEN decisions blocking this sprint
- [x] Top-3 lessons learned documented and will be injected
- [x] Velocity data available (avg 11 SP/sprint)
- [x] Total sprint points (18) within capacity + 64% buffer
- [x] All must-have stories are independently implementable (no blocking dependencies)
- [x] Component inventory available for UI work (`.github/docs/storybook/component-inventory.md`)

---

## Technical Context

### Files to Modify
- `.github/webapp/routes/milestones.js` — Backend API endpoints
- `.github/webapp/dashboard.html` — UI for templates, export, bulk actions, dependencies
- `.github/webapp/dashboard.js` — Frontend logic
- `.github/tests/integration/milestones-api.test.js` — Test coverage

### New Files to Create
- `.github/data/milestone-templates.json` — Template persistence
- `.github/docs/api/milestones-export-api.md` — Export API documentation

### Dependencies from Previous Sprints
- SP-9: CRUD operations, modals, filters (all complete)
- Design tokens from `.github/docs/brand/design-tokens.json`
- Component inventory from `.github/docs/storybook/component-inventory.md`

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Circular dependency detection complexity | Use DFS traversal algorithm; extensive test coverage for edge cases |
| CSV escaping edge cases | Use standard CSV library (e.g., `csv-stringify`); test special characters |
| Bulk operation partial failures | Implement transaction-like rollback or detailed error reporting per item |
| Template schema evolution | Version template format; include schema version field |

---

## KPI Targets

| Metric | Target |
|--------|--------|
| **Test Coverage** | ≥90% statement coverage (workspace-wide) |
| **API Response Time** | <100ms (p95) for all CRUD endpoints |
| **Accessibility** | Zero violations in automated scan |
| **Secret Scan** | Zero secrets detected in PR |
| **Documentation Completeness** | 100% (user-manual.md and technical-manual.md updated) |
| **Velocity Ratio** | 0.9–1.1 (target: 1.0) |

---

## Sprint Completion Criteria

- [ ] All must-have stories (12 points) IMPLEMENTED and tests green
- [ ] Should-have stories attempted (6 points)
- [ ] All tests passing (integration + unit)
- [ ] Secret scan passed
- [ ] User manual and technical manual updated
- [ ] KPI report generated
- [ ] Retrospective complete
- [ ] GitHub board updated (issues closed)

---

## Notes

This sprint builds on the CRUD foundation from SP-9 and adds power-user features: templates for efficiency, export for data portability, bulk operations for scale, and dependencies for planning.
