# Sprint 8: Table Interactions & Advanced Features

**Sprint Objective**: Deliver production-grade table interactions in Dashboard Home, including sorting, filtering, row actions, and export/pagination foundations, while preserving accessibility and responsive behavior from SP-7.

**Sprint Duration**: 1 sprint (assumed 2 weeks)
**Phase**: 5 (Implementation)
**Based on**: SP-7 dashboard implementation and FEAT-02-D scope (sorting/filtering/row actions)
**Date**: 2026-03-09

---

## Mandatory Assumptions

- **Team composition**: INSUFFICIENT_DATA: exact team roles and headcount.
- **Sprint duration**: Assumed 2 weeks.
- **Capacity per sprint**: Assumed 30 story points (matched SP-7 completed capacity).
- **Technology stack**: Node.js HTTP server + vanilla JS frontend + file-based data.
- **Prerequisites**:
  - SP-7 dashboard files exist and are stable.
  - `dashboard.html` table section remains the primary interaction surface.
  - `dashboard.js` owns table behavior orchestration.
- **Blocked items**:
  - None for baseline interactions.
  - CSV export schema standard is partially undefined (can proceed with MVP CSV).

**Assumption status**: Partially available (INSUFFICIENT_DATA items explicitly listed).

---

## Scope Overview

### In Scope
- Column sorting (Milestone, Status, Progress, Completion).
- Text/status filtering.
- Row actions (View, Edit placeholder, Delete with confirmation).
- Pagination for milestone table.
- CSV export for currently filtered rows.
- Keyboard and screen reader support for all interactions.

### Out of Scope
- Server-side sorting/filtering (client-side only in SP-8).
- Persisted user-specific table preferences.
- Bulk-edit workflow.
- Full CRUD backend for milestone edits/deletes.

---

## Sprint Stories

| Story ID | Description | Acceptance Criteria | Story Points | Dependencies | Recommendation Ref |
|----------|-------------|---------------------|--------------|--------------|--------------------|
| SP-8.1 | Interactive column sorting | Given table headers are visible, when user clicks a sortable header, then rows reorder ASC/DESC and active sort icon updates. | 5 | none | FEAT-02-D |
| SP-8.2 | Table filtering UI and logic | Given filter controls are set, when user applies filters, then only matching rows are shown and empty-state appears for zero matches. | 5 | SP-8.1 | FEAT-02-D |
| SP-8.3 | Row actions menu behavior | Given a row action button is clicked, when action menu opens, then user can trigger View/Edit/Delete and menu closes on outside click/Escape. | 4 | SP-8.1 | FEAT-02-D |
| SP-8.4 | Pagination + result count | Given dataset exceeds page size, when user navigates pages, then correct rows render and current page/total count stay accurate after sort/filter changes. | 3 | SP-8.2 | FEAT-02-D |
| SP-8.5 | Export filtered table data (CSV) | Given filtered/sorted rows are present, when user clicks Export, then a CSV file downloads reflecting current visible result set and column order. | 3 | SP-8.2 | FEAT-02-D |
| SP-8.6 | A11y, responsive, regression tests | Given all interactions are implemented, when tests run, then keyboard navigation, focus order, ARIA states, and responsive table behavior pass. | 5 | SP-8.1, SP-8.2, SP-8.3, SP-8.4, SP-8.5 | WCAG/Phase-5 QA |

**Total planned points**: 25

---

## Story Details

### SP-8.1: Interactive Column Sorting
**Goal**: Enable predictable sorting with clear visual state.

**Implementation targets**:
- `.github/webapp/dashboard.js`
- `.github/webapp/dashboard.html` (data attributes for sortable fields)

**Acceptance criteria**:
- Given user clicks `Milestone`, when first click occurs, then rows sort ascending by milestone label.
- Given same header is clicked again, when second click occurs, then rows sort descending.
- Given another header is clicked, when sorting changes, then previous header clears active state.
- Given keyboard user focuses a header, when pressing Enter/Space, then sort toggles identically to click.

---

### SP-8.2: Table Filtering UI and Logic
**Goal**: Allow users to quickly narrow table contents.

**Implementation targets**:
- `.github/webapp/dashboard.html` (search input + status filter + reset button)
- `.github/webapp/dashboard.js` (filter pipeline)

**Acceptance criteria**:
- Given search text input, when user types, then results update with debounced filtering.
- Given status filter selected, when selection changes, then only matching status rows remain.
- Given both text and status filters are active, when applied, then filters combine with AND logic.
- Given no rows match, when filter is active, then table hides and contextual empty state appears.
- Given user clicks reset filters, when action completes, then all rows reappear and pagination resets to page 1.

---

### SP-8.3: Row Actions Menu Behavior
**Goal**: Provide safe, accessible per-row actions.

**Implementation targets**:
- `.github/webapp/dashboard.html` (action trigger + menu container)
- `.github/webapp/dashboard.js` (menu state machine + handlers)

**Acceptance criteria**:
- Given row action trigger is clicked, when menu opens, then it is anchored to that row and only one menu is open at a time.
- Given user selects `View`, when triggered, then row detail modal (or detail panel) opens with row metadata.
- Given user selects `Edit`, when triggered, then non-destructive placeholder flow appears (toast/modal) marking future SP item.
- Given user selects `Delete`, when confirmed, then row is removed from local dataset and table rerenders.
- Given user presses Escape or clicks outside menu, when menu is open, then it closes and focus returns to trigger.

---

### SP-8.4: Pagination + Result Count
**Goal**: Keep table usable for larger datasets.

**Implementation targets**:
- `.github/webapp/dashboard.js`
- Optional minor markup updates in `.github/webapp/dashboard.html`

**Acceptance criteria**:
- Given rows exceed page size (default 10), when table renders, then page controls appear.
- Given next/prev controls, when clicked, then expected page rows render and controls disable at boundaries.
- Given sort/filter changes, when result set changes, then page index clamps to valid range.
- Given page changes, when announced, then screen reader receives live update (aria-live region).

---

### SP-8.5: Export Filtered Data (CSV)
**Goal**: Export actionable table snapshots.

**Implementation targets**:
- `.github/webapp/dashboard.js`
- Reuse existing `#btn-export-metrics` hook or dedicated table export action

**Acceptance criteria**:
- Given filtered and sorted table state, when export is clicked, then CSV includes exactly visible rows in visible order.
- Given special characters in cells, when CSV is generated, then values are quoted and escaped correctly.
- Given no rows are visible, when export is clicked, then user gets warning toast and no empty file is downloaded.

---

### SP-8.6: A11y, Responsive, and Regression Testing
**Goal**: Maintain quality while adding interaction complexity.

**Implementation targets**:
- `.github/webapp/*.test.js` additions/updates
- `.github/docs/sprints/SP-8-responsive-test-report.md` (new)
- `.github/docs/sprints/SP-8-completion-report.md` (new)

**Acceptance criteria**:
- Given keyboard-only navigation, when traversing table controls, then all actions are reachable and operable.
- Given screen reader mode, when sort or page changes occur, then ARIA announcements are meaningful.
- Given viewport at 1024px and 768px, when interactions occur, then no clipping/overflow blocks usage.
- Given test suite execution, when complete, then no regressions in existing SP-7 dashboard behavior.

---

## Definition of Done (Sprint 8)

- [ ] All SP-8 stories meet acceptance criteria.
- [ ] Sort/filter/pagination/action flows operate with mouse and keyboard.
- [ ] No console errors in dashboard interaction path.
- [ ] Existing dashboard API endpoints continue to return valid payloads.
- [ ] Responsive verification completed at desktop, 1024px, 768px.
- [ ] Accessibility checks completed (focus, roles, aria-live announcements).
- [ ] Regression tests pass (`vitest`).
- [ ] Sprint docs updated (implementation + responsive report + completion report).

---

## Sprint KPIs

| KPI | Baseline | Target after Sprint 8 | Measurement Method | Owner |
|-----|----------|------------------------|--------------------|-------|
| Sort action latency | INSUFFICIENT_DATA | <100ms local render | Browser performance timing in devtools | Engineering |
| Filter correctness | 0 automated checks for table interactions | 100% pass in SP-8 interaction tests | Unit/integration tests for filter pipeline | Engineering |
| Keyboard operability | Partial (SP-7 static table only) | 100% primary actions keyboard accessible | Manual a11y script + automated checks | Engineering |
| Responsive interaction defects | 0 tracked for SP-8 features | 0 blocker defects at 1024px/768px | Responsive test report | Engineering |

---

## Dependency Overview

| Story | Depends on | Reason |
|-------|------------|--------|
| SP-8.2 | SP-8.1 | Sorting/filtering share table state model. |
| SP-8.3 | SP-8.1 | Row action mapping requires stable row identity and render cycle. |
| SP-8.4 | SP-8.2 | Pagination must execute after filters produce active dataset. |
| SP-8.5 | SP-8.2 | Export should reflect post-filter/post-sort state. |
| SP-8.6 | SP-8.1..SP-8.5 | QA validates all completed interactive behaviors together. |

---

## Risk Log

| Risk | Probability | Impact | Mitigation | Sprint |
|------|-------------|--------|------------|--------|
| Interaction state complexity causes regressions | Medium | High | Centralize table state object (`sort`, `filters`, `page`) with single render pipeline. | SP-8 |
| A11y regressions from dynamic menus | Medium | High | Add explicit keyboard interaction map, Escape/outside-click handling, and focus return. | SP-8 |
| Mobile overflow in action menus | Medium | Medium | Use viewport-aware menu positioning and max-width constraints. | SP-8 |
| CSV export malformed for quoted values | Low | Medium | Implement RFC4180-safe escaping and add edge-case tests. | SP-8 |
| Scope creep into server-side CRUD | Medium | Medium | Keep SP-8 row actions local/UI-level only; defer backend CRUD to SP-9+. | SP-8 |

---

## Execution Order (Suggested)

1. SP-8.1 sorting
2. SP-8.2 filtering
3. SP-8.4 pagination
4. SP-8.3 row actions
5. SP-8.5 export
6. SP-8.6 QA + docs

---

## Handoff Checklist

- [x] Assumptions documented with INSUFFICIENT_DATA labels where needed.
- [x] Every story has SMART acceptance criteria.
- [x] Story points assigned.
- [x] Dependencies documented.
- [x] Risk log included.
- [x] Definition of Done included.
- [x] KPIs defined with baselines/targets.
- [x] Plan is implementation-ready for next coding pass.

**Status**: READY FOR EXECUTION

---

## JSON Export

```json
{
  "metadata": {
    "sprint_id": "SP-8",
    "phase": 5,
    "date": "2026-03-09",
    "objective": "Table interactions and advanced features in dashboard",
    "based_on": ["SP-7", "FEAT-02-D"]
  },
  "assumptions": {
    "team_composition": "INSUFFICIENT_DATA",
    "sprint_duration_weeks": 2,
    "capacity_points": 30,
    "stack": ["Node.js", "vanilla-js", "file-storage"],
    "blocked_items": []
  },
  "stories": [
    {"id": "SP-8.1", "name": "Interactive column sorting", "points": 5, "depends_on": []},
    {"id": "SP-8.2", "name": "Table filtering UI and logic", "points": 5, "depends_on": ["SP-8.1"]},
    {"id": "SP-8.3", "name": "Row actions menu behavior", "points": 4, "depends_on": ["SP-8.1"]},
    {"id": "SP-8.4", "name": "Pagination and result count", "points": 3, "depends_on": ["SP-8.2"]},
    {"id": "SP-8.5", "name": "Export filtered data CSV", "points": 3, "depends_on": ["SP-8.2"]},
    {"id": "SP-8.6", "name": "A11y responsive regression tests", "points": 5, "depends_on": ["SP-8.1", "SP-8.2", "SP-8.3", "SP-8.4", "SP-8.5"]}
  ],
  "total_points": 25,
  "status": "ready-for-execution"
}
```
