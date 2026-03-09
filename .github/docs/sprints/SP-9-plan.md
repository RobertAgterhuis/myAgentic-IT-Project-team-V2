# Sprint 9 Plan: Backend CRUD & Advanced Milestone Features

**Sprint ID**: SP-9  
**Phase**: 5 (Implementation)  
**Date**: 2026-03-16 (estimated)  
**Team**: Backend + Frontend engineers  
**Capacity**: 30 points (estimated 2-week sprint)  
**Objective**: Implement backend CRUD operations, advanced filtering, and soft-delete for milestone management system. Upgrade table interaction patterns from SP-8 with persistent data layer.

**Predecessor**: SP-8 (Table Interactions & Advanced Features)  
**Based on**: SP-8-completion-report.md recommendations + SP-7/SP-8 dashboards

---

## Context & Motivation

### From SP-8 Completion Report
> "SP-9: Implement backend CRUD for Edit/Delete actions (currently UI-only placeholders)"
> "SP-9: Add milestone creation/editing forms (POST/PUT endpoints)"
> "SP-9: Implement soft-delete (preserve audit trail)"

### User Needs
- Dashboard users need ability to **create and edit milestones** (currently read-only table)
- Users need **confirmation of deletions** with audit trail (currently soft-delete only in frontend)
- Large project teams need **advanced filtering** (date range, progress slider) to find milestones quickly
- Admin users need **milestone templates** to standardize naming and status workflows

### Technical Debt
- SP-8.3 Edit/Delete actions are UI-only; backend placeholders return toast messages
- No POST/PUT/DELETE endpoints; all milestones static from `/api/milestones`
- No soft-delete mechanism; deletion is not recoverable
- No audit trail for changes
- Filter panel limited to text + status (no date range, progress slider)

---

## Stories

### SP-9.1: Backend Milestone Creation (POST Endpoint)
**Points**: 5  
**Tier**: High Priority  
**Complexity**: Medium  

**Goal**: Create milestone via API with validation and audit trail.

**Description**:
Implement POST `/api/milestones` endpoint that accepts milestone creation requests with required fields (name, status, progress, completion date). Validate inputs server-side, assign unique ID, and log creation event for audit trail. Return 201 Created with new milestone object.

**Implementation targets**:
- `.github/webapp/server.js` (POST handler)
- New file: `.github/docs/api/milestones-api.md` (endpoint reference)
- Database layer (file-based storage in `data/milestones.json` or similar)

**Acceptance criteria**:
- Given valid milestone data, when POST is sent, then 201 Created returned with milestone ID assigned.
- Given missing required field (name, status, progress, completion date), when POST is sent, then 400 Bad Request with error message.
- Given duplicate milestone name, when POST is sent, then 409 Conflict with message "Milestone already exists".
- Given valid creation, when milestone list is fetched, then new milestone appears in `/api/milestones` response.
- Given milestone creation event, when audit log is reviewed, then creation timestamp and user (if auth implemented) are recorded.

**Dependencies**:
- None (can proceed in parallel with other SP-9 stories)

---

### SP-9.2: Backend Milestone Update (PUT Endpoint)
**Points**: 4  
**Tier**: High Priority  
**Complexity**: Medium  

**Goal**: Update milestone via API with partial field support.

**Description**:
Implement PUT `/api/milestones/:id` endpoint that accepts milestone update requests (name, status, progress, completion date). Support partial updates (e.g., update status only without sending all fields). Validate inputs, preserve immutable fields (creation date, ID), and log change event. Return 200 OK with updated milestone.

**Implementation targets**:
- `.github/webapp/server.js` (PUT handler)
- `.github/docs/api/milestones-api.md` (endpoint reference)
- Database layer (persistence)

**Acceptance criteria**:
- Given valid update data and existing milestone ID, when PUT is sent, then 200 OK returned with updated milestone.
- Given partial update (e.g., status only), when PUT is sent, then other fields remain unchanged.
- Given invalid milestone ID, when PUT is sent, then 404 Not Found.
- Given invalid status value, when PUT is sent, then 400 Bad Request with validation error.
- Given milestone update, when milestone is fetched, then updated values are returned.
- Given update event, when audit log is reviewed, then change timestamp and previous/new values are recorded.

**Dependencies**:
- SP-9.1 (POST endpoint for initial data structure)

---

### SP-9.3: Backend Soft-Delete (PATCH → Archived State)
**Points**: 3  
**Tier**: High Priority  
**Complexity**: Low  

**Goal**: Archive milestones instead of hard-delete; preserve audit trail.

**Description**:
Implement PATCH `/api/milestones/:id/archive` endpoint that marks a milestone as archived (soft-delete). Updates a `status: archived` field instead of removing record. Archived milestones are excluded from default `/api/milestones` list but recoverable via `/api/milestones?include_archived=true`. Log archival event with timestamp.

**Implementation targets**:
- `.github/webapp/server.js` (PATCH handler)
- `.github/docs/api/milestones-api.md` (soft-delete pattern)
- Database layer (flag field: `archived: true/false`)

**Acceptance criteria**:
- Given valid milestone ID, when PATCH /archive is sent, then 200 OK returned with `status: archived`.
- Given archived milestone, when `/api/milestones` is fetched, then archived milestone not included.
- Given archived milestone, when `/api/milestones?include_archived=true` is fetched, then archived milestone included with `archived: true` flag.
- Given archived milestone, when recovery is performed (clearing archived flag), then milestone returns to active list.
- Given soft-delete event, when audit log is reviewed, then deletion timestamp is recorded (not lost).

**Dependencies**:
- SP-9.2 (PUT endpoint for update pattern compatibility)

---

### SP-9.4: Frontend Edit Modal & Form Validation
**Points**: 5  
**Tier**: High Priority  
**Complexity**: Medium  

**Goal**: Replace Edit action placeholder with functional edit modal and form.

**Description**:
Create edit milestone modal (reusing `.github/webapp/dashboard.html` modal-overlay pattern from SP-8) with form fields for name, status dropdown, progress slider, completion date picker. Bind modal to "Edit" action in row action menu. Implement client-side validation (required fields, progress 0-100, date format) and submit via PUT endpoint (SP-9.2). Show success/error toast and update table on success.

**Implementation targets**:
- `.github/webapp/dashboard.html` (edit modal template)
- `.github/webapp/dashboard.js` (edit handler, form binding, PUT call)

**Acceptance criteria**:
- Given Edit action in row menu, when clicked, then edit modal opens with current milestone values pre-filled.
- Given required field empty, when Save is clicked, then validation message shown and form not submitted.
- Given invalid progress (>100), when Save is clicked, then validation message shown.
- Given valid form data, when Save is clicked, then PUT request sent to `/api/milestones/:id`.
- Given successful PUT response, when form completes, then modal closes, table updates, success toast shown.
- Given PUT error, when request fails, then error toast shown and modal remains open for retry.
- Given form already filled, when Cancel is clicked, then modal closes without changes.

**Dependencies**:
- SP-9.2 (PUT endpoint for form submission)
- SP-8.3 (Edit action row menu already exists)

---

### SP-9.5: Frontend Delete Confirmation & API Integration
**Points**: 3  
**Tier**: High Priority  
**Complexity**: Low  

**Goal**: Wire Delete action to backend soft-delete with confirmation.

**Description**:
Update Delete action in row menu to call PATCH `/api/milestones/:id/archive` instead of local-only removal. Replace browser confirm dialog with custom confirmation modal (reusing FEAT-02 modal template) with milestone name in confirmation text. Show success toast on archive completion.

**Implementation targets**:
- `.github/webapp/dashboard.js` (update `removeMilestoneRow()` to call DELETE endpoint)
- `.github/webapp/dashboard.html` (add delete confirmation modal)

**Acceptance criteria**:
- Given Delete action clickled, when confirmed, then PATCH /archive request sent to backend.
- Given successful archive, when response received, then row removed from table and success toast shown.
- Given archive failure, when response error received, then error toast shown and row remains visible.
- Given archive event, when audit log reviewed, then deletion event recorded.
- Given row deleted, when page refreshed, then deleted row does not reappear (persisted soft-delete).

**Dependencies**:
- SP-9.3 (PATCH soft-delete endpoint)
- SP-8.3 (Delete action already exists in row menu)

---

### SP-9.6: Advanced Filtering - Date Range
**Points**: 4  
**Tier**: Medium Priority  
**Complexity**: Medium  

**Goal**: Add "from" and "to" date inputs to filter panel for completion date range filtering.

**Description**:
Extend filter panel with date range controls (two date input fields: "From Date" and "To Date"). Implement client-side date range filter logic that combines with existing text + status filters (AND logic). Filter rows where completion date is within selected range (inclusive). Show filtered result count dynamically as dates change.

**Implementation targets**:
- `.github/webapp/dashboard.html` (date range input fields in filter panel)
- `.github/webapp/dashboard.js` (filter pipeline updated to include date range logic)

**Acceptance criteria**:
- Given date range inputs, when both dates selected, then rows filtered to matching date range.
- Given start date only, when applied, then rows with completion ≥ start date shown.
- Given end date only, when applied, then rows with completion ≤ end date shown.
- Given date range reset button, when clicked, then date filters cleared and all dates shown.
- Given multiple filters active (text + status + date range), when all applied, then AND logic combines all criteria.
- Given 0 rows match date range, when applied, then empty state shown.

**Dependencies**:
- SP-8.2 (filter pipeline already exists; extends existing logic)

---

### SP-9.7: Advanced Filtering - Progress Slider
**Points**: 3  
**Tier**: Medium Priority  
**Complexity**: Low  

**Goal**: Add progress range slider to filter panel (0-100%).

**Description**:
Add slider input to filter panel for progress range selection (min/max percentage). Implement filter logic to show milestones where progress falls within selected range. Combine with existing text + status + date filters (AND logic).

**Implementation targets**:
- `.github/webapp/dashboard.html` (progress slider with min/max labels)
- `.github/webapp/dashboard.js` (progress range filter logic)

**Acceptance criteria**:
- Given progress slider, when min/max set to 50-75, then only milestones with 50-75% progress shown.
- Given progress 0-100 (default), then all milestones shown (no filter).
- Given progress slider and other active filters, then AND logic combines all criteria.
- Given result count, when progress range changed, then count updates in real-time.

**Dependencies**:
- SP-8.2 (filter pipeline; extends existing logic)

---

### SP-9.8: Create Milestone Modal & Form
**Points**: 5  
**Tier**: High Priority (released with SP-9.1)  
**Complexity**: Medium  

**Goal**: Add "Create New Milestone" button and form modal.

**Description**:
Add "Create Milestone" button to milestone table header (near "Export"). Clicking button opens create modal with empty form (name, status, progress, completion date fields). Client-side validation (required fields, progress 0-100, future date). On submit, calls POST `/api/milestones`. On success, closes modal, adds new row to table, shows success toast.

**Implementation targets**:
- `.github/webapp/dashboard.html` (create button + modal template)
- `.github/webapp/dashboard.js` (create handler, form binding, POST call)

**Acceptance criteria**:
- Given Create button, when clicked, then create modal opens with empty form.
- Given required field empty, when Save clicked, then validation message shown.
- Given invalid progress, when Save clicked, then validation error shown.
- Given valid form, when Save clicked, then POST sent to `/api/milestones`.
- Given successful POST, when response received, then modal closes, new row added to table, success toast shown.
- Given POST error, when request fails, then error toast shown and modal remains open.

**Dependencies**:
- SP-9.1 (POST endpoint for form submission)

---

### SP-9.9: Milestone Templates (Optional, Lower Priority)
**Points**: 4  
**Tier**: Low Priority  
**Complexity**: Medium  

**Goal**: Provide predefined milestone templates for faster creation.

**Description**:
Create `/api/milestone-templates` endpoint returning list of common milestone templates (e.g., "Feature Release", "Bug Fix Drop", "Maintenance Window" with default status/progress/dates). Add "Use Template" option in create modal dropdown. Auto-fill form fields from selected template; user can customize before saving.

**Implementation targets**:
- `.github/webapp/server.js` (GET /api/milestone-templates endpoint)
- `.github/webapp/dashboard.html` (template dropdown in create modal)
- `.github/webapp/dashboard.js` (template selection handler)
- Data file: `data/milestone-templates.json`

**Acceptance criteria**:
- Given template list in create modal, when template selected, then form fields pre-filled from template.
- Given pre-filled form, when user modifies fields, then changes applied without resetting.
- Given template-created milestone, when saved, then all customized values persisted (template is starting point only).

**Dependencies**:
- SP-9.8 (create modal form already exists)

---

## Definition of Done (Sprint 9)

- [ ] All SP-9 stories meet acceptance criteria.
- [ ] POST/PUT/PATCH endpoints implemented and tested with Postman or curl.
- [ ] Database/file storage layer implements persistence (milestones.json or similar).
- [ ] Frontend forms (Create, Edit) validate client-side and handle server errors.
- [ ] All API responses follow consistent JSON structure (status, data, error fields).
- [ ] Soft-delete preserves archived milestones; audit trail maintained.
- [ ] Filter pipeline combines text + status + date range + progress with AND logic.
- [ ] Create, Edit, Delete flows end-to-end tested in browser.
- [ ] No console errors in dashboard or server logs.
- [ ] vitest regression suite passes (existing 788 tests + new SP-9 tests if added).
- [ ] API documentation updated (`.github/docs/api/milestones-api.md`).
- [ ] Sprint docs created (SP-9-plan.md, SP-9-completion-report.md, SP-9-api-changes.md).

---

## Sprint KPIs

| KPI | Baseline (SP-8) | Target (SP-9) | Measurement Method | Owner |
|-----|-----------------|---------------|-------------------|-------|
| Milestone Create/Edit latency | N/A (no CRUD yet) | <500ms end-to-end | Network DevTools + server timing | Backend |
| Form validation accuracy | N/A | 100% (client + server validation) | Manual testing + unit tests | Frontend |
| Soft-delete audit trail completeness | N/A (frontend-only) | 100% events logged | Audit log review | Backend |
| Advanced filter correctness | N/A (limited filters only) | 100% AND logic correctness | Filter logic unit tests | Frontend |
| API test coverage | N/A | 80%+ new endpoint coverage | Unit + integration tests | QA |
| Regression test pass rate | 788/788 (100%) | 788+/788+ (100%) | vitest suite execution | QA |

---

## Risk Log

| Risk | Likelihood | Impact | Mitigation | Owner |
|------|-----------|--------|-----------|-------|
| **File-based storage scaling** | Medium | High | Pre-test with 100+ milestones; plan DB migration path for SP-10 | Backend |
| **Date picker browser compatibility** | Low | Medium | Use standard HTML5 `<input type="date">`; test on target browsers | Frontend |
| **Soft-delete recovery workflow unclear** | Medium | Medium | Document soft-delete & recovery process in API docs; consider admin restore UI for SP-10 | Backend |
| **Form validation mismatch** | Medium | Medium | Server-side validation mirrors client-side rules; unit tests for both | Full Stack |
| **Concurrent edit conflicts** | Low | High | Document conflict handling; consider last-write-wins or optimistic locking for SP-10 | Backend |
| **Audit trail performance** | Low | Medium | Log writes async; monitor file I/O performance with large datasets | Backend |

---

## Execution Order

**Phase 1 (Parallel - Backend Foundation)**:
1. SP-9.1 (POST endpoint)
2. SP-9.2 (PUT endpoint)
3. SP-9.3 (PATCH soft-delete)

**Phase 2 (Parallel - Frontend Forms)**:
4. SP-9.4 (Edit modal)
5. SP-9.5 (Delete confirmation)
6. SP-9.8 (Create modal)

**Phase 3 (Advanced Features)**:
7. SP-9.6 (Date range filter)
8. SP-9.7 (Progress slider filter)

**Phase 4 (Optional)**:
9. SP-9.9 (Milestone templates) — only if time permits

---

## Story Point Breakdown

| Tier | Stories | Total Points | Confidence |
|------|---------|--------------|-----------|
| **High Priority (Must-Have)** | SP-9.1, 9.2, 9.3, 9.4, 9.5, 9.8 | 25 | ⭐⭐⭐⭐ High |
| **Medium Priority (Should-Have)** | SP-9.6, 9.7 | 7 | ⭐⭐⭐⭐ High |
| **Low Priority (Nice-to-Have)** | SP-9.9 | 4 | ⭐⭐⭐ Medium |
| **TOTAL CAPACITY** | — | **30** (estimated) | ⭐⭐⭐⭐ High |

**Recommendation**: Plan 25 points for high-priority delivery in 2-week sprint. Medium-priority stories (7 pts) as backlog overflow if velocity permits. SP-9.9 deferred to SP-10 backlog unless team completes high-priority work early.

---

## Data Model Changes

### Milestone Object (New Fields)

```json
{
  "id": "milestone-01",
  "name": "FEAT-03 Mobile Optimization",
  "status": "in progress",
  "progress": 45,
  "completion": "2026-04-15",
  "created_at": "2026-03-09T12:00:00Z",
  "updated_at": "2026-03-09T14:30:00Z",
  "archived": false
}
```

**New Fields**:
- `id`: Unique identifier (UUID or auto-increment)
- `created_at`: ISO 8601 timestamp of creation
- `updated_at`: ISO 8601 timestamp of last modification
- `archived`: Boolean flag for soft-delete (default: false)

### Audit Log Entry

```json
{
  "id": "audit-001",
  "event_type": "milestone_created|milestone_updated|milestone_archived",
  "milestone_id": "milestone-01",
  "timestamp": "2026-03-09T12:00:00Z",
  "changes": {
    "name": { "before": null, "after": "FEAT-03 Mobile Optimization" },
    "status": { "before": null, "after": "in progress" }
  },
  "user": "system"
}
```

---

## API Reference (Skeleton)

```
POST   /api/milestones               → Create new milestone
GET    /api/milestones               → List active milestones (archived: false)
GET    /api/milestones?include_archived=true  → List all milestones
GET    /api/milestones/:id           → Get single milestone
PUT    /api/milestones/:id           → Update milestone fields
PATCH  /api/milestones/:id/archive   → Soft-delete (mark archived)
GET    /api/milestone-templates      → List predefined templates
```

Full documentation to be created in `.github/docs/api/milestones-api.md` during SP-9.1.

---

## Handoff Checklist

- [x] Sprint objectives clearly defined and linked to SP-8 recommendations.
- [x] All 9 stories have SMART acceptance criteria.
- [x] Story points assigned and justified.
- [x] Dependencies documented.
- [x] High-priority stories (SP-9.1-9.5, 9.8) target 2-week sprint capacity.
- [x] Medium/low-priority stories (SP-9.6-9.9) identified as backlog overflow.
- [x] Data model and API skeleton documented.
- [x] Risk log with mitigation strategies included.
- [x] Definition of Done covers backend + frontend + testing.
- [x] KPIs defined with baseline/target measurements.
- [x] Execution order suggests parallel workstreams (backend + frontend).

**Status**: READY FOR SPRINT PLANNING

---

## JSON Export

```json
{
  "metadata": {
    "sprint_id": "SP-9",
    "phase": 5,
    "date": "2026-03-16",
    "objective": "Backend CRUD & advanced milestone features",
    "based_on": ["SP-8-completion-report.md", "customer recommendations"]
  },
  "assumptions": {
    "team_composition": "2 backend + 2 frontend engineers",
    "sprint_duration_weeks": 2,
    "capacity_points": 30,
    "stack": ["Node.js", "vanilla-js", "file-storage (JSON)"],
    "blocked_items": [],
    "prerequisites": ["SP-8 completion", "FEAT-02 modal templates available"]
  },
  "stories": [
    {
      "id": "SP-9.1",
      "name": "Backend Milestone Creation (POST)",
      "points": 5,
      "tier": "high",
      "depends_on": [],
      "acceptance_criteria_count": 5
    },
    {
      "id": "SP-9.2",
      "name": "Backend Milestone Update (PUT)",
      "points": 4,
      "tier": "high",
      "depends_on": ["SP-9.1"],
      "acceptance_criteria_count": 6
    },
    {
      "id": "SP-9.3",
      "name": "Soft-Delete & Archive (PATCH)",
      "points": 3,
      "tier": "high",
      "depends_on": ["SP-9.2"],
      "acceptance_criteria_count": 5
    },
    {
      "id": "SP-9.4",
      "name": "Frontend Edit Modal & Form",
      "points": 5,
      "tier": "high",
      "depends_on": ["SP-9.2"],
      "acceptance_criteria_count": 7
    },
    {
      "id": "SP-9.5",
      "name": "Delete Confirmation & API Integration",
      "points": 3,
      "tier": "high",
      "depends_on": ["SP-9.3"],
      "acceptance_criteria_count": 5
    },
    {
      "id": "SP-9.6",
      "name": "Advanced Filter: Date Range",
      "points": 4,
      "tier": "medium",
      "depends_on": ["SP-8.2"],
      "acceptance_criteria_count": 6
    },
    {
      "id": "SP-9.7",
      "name": "Advanced Filter: Progress Slider",
      "points": 3,
      "tier": "medium",
      "depends_on": ["SP-8.2"],
      "acceptance_criteria_count": 4
    },
    {
      "id": "SP-9.8",
      "name": "Frontend Create Milestone Modal",
      "points": 5,
      "tier": "high",
      "depends_on": ["SP-9.1"],
      "acceptance_criteria_count": 7
    },
    {
      "id": "SP-9.9",
      "name": "Milestone Templates (Optional)",
      "points": 4,
      "tier": "low",
      "depends_on": ["SP-9.8"],
      "acceptance_criteria_count": 3
    }
  ],
  "total_points": 36,
  "high_priority_points": 25,
  "medium_priority_points": 7,
  "low_priority_points": 4,
  "sprint_capacity": 30,
  "status": "ready-for-planning"
}
```

---

**End of SP-9 Plan**

**Version**: 1.0  
**Created**: 2026-03-09  
**Next Review**: At SP-9 kickoff (sprint planning meeting)
