# Sprint 9 Manual Testing Plan

## Milestone Management Features (SP-9.1 through SP-9.7)

**Test Date**: 2026-03-09  
**Tested By**: QA Team  
**Sprint Focus**: Backend CRUD + Advanced Filters

---

## Executive Summary

Sprint 9 delivered 8 high-priority features totaling 24 story points:

- **Backend CRUD**: POST (create), PUT (update), PATCH (archive) —
  SP-9.1/9.2/9.3
- **Frontend Modals**: Create, Edit, Delete with API integration —
  SP-9.8/9.4/9.5
- **Advanced Filters**: Date range and progress threshold — SP-9.6/9.7

This document outlines comprehensive test coverage for all features.

---

## 1. CREATE MODAL TESTING (SP-9.8)

### Test Case 1.1: Open Create Modal

- **Setup**: Dashboard loaded with milestone table visible
- **Action**: Click "Create Milestone" button
- **Expected Result**: Modal appears with title "New Milestone", form is empty,
  all fields visible
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 1.2: Form Validation - Missing Fields

- **Setup**: Create modal is open
- **Action**: Leave Name field empty, click Submit
- **Expected Result**: Error message displays "Name is required", form not
  submitted
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 1.3: Form Validation - Invalid Progress

- **Setup**: Create modal is open
- **Action**: Set Name="Test", try to submit with progress slider at 0%
- **Expected Result**: Should accept (0% is valid), milestone created with
  progress 0
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 1.4: Successful Creation

- **Setup**: Create modal is open
- **Action**: Fill Name="FEATURE-99 Testing", Status="in progress",
  Progress=50%, Completion="2026-04-15", click Submit
- **Expected Result**:
  - Modal closes
  - Toast: "Milestone created successfully"
  - New row appears in table with exact data
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 1.5: Duplicate Name Prevention

- **Setup**: Milestone "Sprint Planning" exists in table
- **Action**: Create modal open, enter Name="Sprint Planning", submit
- **Expected Result**: Error message "Milestone name already exists", form not
  submitted
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 1.6: Close Modal - Escape Key

- **Setup**: Create modal is open
- **Action**: Press Escape key
- **Expected Result**: Modal closes, form data is cleared if new form opened
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 1.7: Cancel Button

- **Setup**: Create modal is open with partially filled form
- **Action**: Click Cancel button
- **Expected Result**: Modal closes, no data submitted
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

---

## 2. EDIT MODAL TESTING (SP-9.4)

### Test Case 2.1: Open Edit Modal

- **Setup**: Milestone "DESIGN-01" exists in table
- **Action**: Click Edit button on the milestone row
- **Expected Result**:
  - Modal titled "Edit Milestone" appears
  - Name field populated with "DESIGN-01"
  - Status dropdown shows current status
  - Progress slider at current value
  - Completion date pre-filled
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 2.2: Update Single Field

- **Setup**: Edit modal open for "DESIGN-01", currently at progress 30%
- **Action**: Move progress slider to 75%, click Submit
- **Expected Result**:
  - Modal closes
  - Toast: "Milestone updated successfully"
  - Table row shows progress 75%
  - All other fields unchanged (name, status, completion date)
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 2.3: Update Multiple Fields

- **Setup**: Edit modal open for "DESIGN-01"
- **Action**: Change Status="complete", Progress=100%, Completion="2026-03-09",
  Submit
- **Expected Result**:
  - All three fields update in table
  - Toast confirms update
  - Immutable fields preserved (id, created_at, name if not changed)
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 2.4: Prevent Duplicate Name on Update

- **Setup**: Milestones "TASK-01" and "TASK-02" exist; Edit modal open for
  "TASK-02"
- **Action**: Change milestone Name to "TASK-01", click Submit
- **Expected Result**: Error "Milestone name already exists", form not submitted
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 2.5: Allow Name Reuse on Itself

- **Setup**: Edit modal open for "TASK-02"
- **Action**: Keep Name as "TASK-02", change Status="blocked", Submit
- **Expected Result**:
  - Update successful (name unchanged)
  - Status updated to "blocked"
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 2.6: Clear Error Messages

- **Setup**: Edit modal open, submit attempt shows error
- **Action**: Fix the error and resubmit (e.g., change duplicate name to unique
  one)
- **Expected Result**:
  - Error message clears
  - New attempt succeeds
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

---

## 3. DELETE/ARCHIVE TESTING (SP-9.5)

### Test Case 3.1: Open Delete Confirmation

- **Setup**: Milestone "CLEANUP-01" exists in table visible
- **Action**: Click Delete button (trash icon) on the row
- **Expected Result**:
  - Confirmation dialog appears with text "Archive milestone CLEANUP-01?"
  - Two buttons: "Cancel" and "Archive"
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 3.2: Cancel Delete

- **Setup**: Delete confirmation dialog open for "CLEANUP-01"
- **Action**: Click "Cancel" button
- **Expected Result**:
  - Dialog closes
  - Milestone still visible in table
  - No changes to data
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 3.3: Confirm Archive

- **Setup**: Delete confirmation dialog open for "CLEANUP-01"
- **Action**: Click "Archive" button
- **Expected Result**:
  - Dialog closes
  - Milestone row disappears from table (unless filter shows archived)
  - Toast: "Milestone archived successfully"
  - API PATCH call executed to `/api/milestones/[id]/archive`
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 3.4: Soft-Delete Audit Trail

- **Setup**: Milestone archived via delete button
- **Action**: Check `.github/docs/audit/` for event log
- **Expected Result**:
  - New entry in audit log with event="archived"
  - Includes milestone id, name, timestamp, archived_at
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

---

## 4. SEARCH FILTER TESTING (SP-8+, carried forward)

### Test Case 4.1: Search by Milestone Name

- **Setup**: Table has milestones: "FEATURE-01 Auth", "FEATURE-02 Dashboard",
  "TESTING Phase 3"
- **Action**: Type "Auth" in search box
- **Expected Result**: Only "FEATURE-01 Auth" displayed, others hidden
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 4.2: Search Partial Match

- **Setup**: Same milestones as 4.1
- **Action**: Type "Feature" in search box
- **Expected Result**: "FEATURE-01 Auth" and "FEATURE-02 Dashboard" displayed,
  case-insensitive
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 4.3: Search with No Results

- **Setup**: Table loaded with milestones
- **Action**: Type "NONEXISTENT01" in search box
- **Expected Result**:
  - No rows displayed
  - Result count shows "0 results"
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 4.4: Clear Search

- **Setup**: Search active with results filtered
- **Action**: Clear search box (delete text)
- **Expected Result**: All milestones reappear, pagination resets to page 1
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

---

## 5. STATUS FILTER TESTING (SP-8+, carried forward)

### Test Case 5.1: Filter by Status

- **Setup**: Table has milestones with various statuses (not started, in
  progress, complete, blocked)
- **Action**: Select "complete" from Status dropdown
- **Expected Result**: Only milestone rows with status "complete" displayed
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 5.2: Filter All Status

- **Setup**: Status filter set to "in progress"
- **Action**: Select "All" from Status dropdown
- **Expected Result**: All milestones displayed regardless of status
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

---

## 6. DATE RANGE FILTER TESTING (SP-9.6)

### Test Case 6.1: Filter by Start Date Only

- **Setup**: Table has milestones with completion dates: 2026-02-15, 2026-03-01,
  2026-03-15, 2026-04-01
- **Action**: Set "From" date to "2026-03-01", leave "To" empty
- **Expected Result**:
  - Only milestones with completion >= 2026-03-01 displayed
  - Counts: 3 milestones (03-01, 03-15, 04-01)
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 6.2: Filter by End Date Only

- **Setup**: Same milestones as 6.1
- **Action**: Leave "From" empty, set "To" date to "2026-03-15"
- **Expected Result**:
  - Only milestones with completion <= 2026-03-15 displayed
  - Counts: 3 milestones (02-15, 03-01, 03-15)
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 6.3: Filter by Date Range

- **Setup**: Same milestones as 6.1
- **Action**: Set "From" to "2026-03-01", "To" to "2026-03-15"
- **Expected Result**:
  - Only milestones with completion between dates displayed
  - Counts: 2 milestones (03-01, 03-15)
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 6.4: Clear Date Range Filter

- **Setup**: Date range filter active
- **Action**: Click "Reset Filters" button
- **Expected Result**:
  - Both date inputs cleared
  - milestoneState.completionStart/completionEnd reset to ""
  - All milestones displayed again
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 6.5: Date Range with Missing Completion Dates

- **Setup**: Some milestones have completion date, some don't
- **Action**: Set "From" date to "2026-03-01"
- **Expected Result**:
  - Only milestones with completion date >= 2026-03-01 shown
  - Milestones with no completion date excluded
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

---

## 7. PROGRESS SLIDER FILTER TESTING (SP-9.7)

### Test Case 7.1: Filter by Progress Threshold

- **Setup**: Table has milestones: P=0%, 25%, 50%, 75%, 100%
- **Action**: Set progress slider to 50%
- **Expected Result**:
  - Only milestones with progress >= 50% displayed (50%, 75%, 100%)
  - Label shows "50%–100%"
  - 3 rows shown
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 7.2: Slider at 0% (No Filter)

- **Setup**: Progress slider at 0%
- **Action**: Observe table display
- **Expected Result**:
  - All milestones displayed (progress 0-100%)
  - Label shows "All progress"
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 7.3: Slider at 100%

- **Setup**: Table has milestones with varying progress
- **Action**: Move slider to 100%
- **Expected Result**:
  - Only milestones with progress == 100% displayed
  - Label shows "100%–100%"
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 7.4: Real-time Slider Label Update

- **Setup**: Progress slider is 0% (shows "All progress")
- **Action**: Drag slider to 75%
- **Expected Result**:
  - Label updates immediately to "75%–100%"
  - Table filters in real-time
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 7.5: Clear Progress Filter

- **Setup**: Progress slider set to 60%
- **Action**: Click "Reset Filters" button
- **Expected Result**:
  - Slider returns to 0%
  - Label changes to "All progress"
  - All milestones displayed
  - milestoneState.progressMin reset to 0
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

---

## 8. COMBINED FILTER TESTING

### Test Case 8.1: Search + Status Filter

- **Setup**: Table loaded with mixed data
- **Action**: Search for "FEATURE", Status="in progress"
- **Expected Result**: Only milestones containing "FEATURE" AND status="in
  progress" shown
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 8.2: Date Range + Progress Filter

- **Setup**: Table loaded
- **Action**: Set date range 2026-03-01 to 2026-03-31, progress slider to 50%
- **Expected Result**: Only milestones with completion in March AND progress >=
  50% shown
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 8.3: All Four Filters Active

- **Setup**: Table loaded with diverse data
- **Action**: Activate search="API", status="complete", date from=2026-03-01,
  progress=75%
- **Expected Result**: Only milestones matching ALL four criteria displayed
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

---

## 9. RESET FILTERS TESTING

### Test Case 9.1: Reset All Filters

- **Setup**: All filters active (search, status, date range, progress)
- **Action**: Click "Reset Filters" button
- **Expected Result**:
  - Search box cleared
  - Status dropdown to "All"
  - Date inputs cleared
  - Progress slider to 0%
  - All milestones displayed (page 1)
  - milestoneState properties reset
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

---

## 10. EDGE CASES & ERROR HANDLING

### Test Case 10.1: Empty Table

- **Setup**: No milestones exist (all archived or deleted)
- **Action**: Dashboard loads
- **Expected Result**:
  - Table displays but with no data rows
  - Result count shows "0 milestones"
  - Buttons still functional
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 10.2: Network Error on Create

- **Setup**: Create modal open, server disconnected
- **Action**: Submit form
- **Expected Result**: Error toast displays "Failed to create milestone" or
  similar
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 10.3: Stale Data Recovery

- **Setup**: Edit modal open, data updated by another user in background
- **Action**: Submit old data
- **Expected Result**:
  - API validation catches conflict or overwrites with latest (per business
    rule)
  - User notified appropriately
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 10.4: Large Milestone Name

- **Setup**: Create modal open
- **Action**: Enter 300-character name, submit
- **Expected Result**: Validation error "Name must be 255 characters or less"
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 10.5: Special Characters in Name

- **Setup**: Create modal open
- **Action**: Enter Name="PROJ@#$%^&\*()", submit
- **Expected Result**: Should accept (no validation restriction on special chars
  per spec)
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

---

## 11. ACCESSIBILITY TESTING

### Test Case 11.1: Keyboard Navigation - Tab Through Form

- **Setup**: Create modal open
- **Action**: Tab through all form fields, Shift+Tab to go backward
- **Expected Result**:
  - Focus visible on each field
  - Tab order logical (Name → Status → Progress → Completion → Buttons)
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 11.2: Screen Reader Test

- **Setup**: NVDA/JAWS active, Create modal open
- **Action**: Navigate modal with screen reader
- **Expected Result**:
  - Modal title announced
  - Form labels associated with inputs
  - Error messages announced
  - Button purposes clear
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

---

## 12. PERFORMANCE TESTING

### Test Case 12.1: Filter Performance - 1000 Milestones

- **Setup**: Table loaded with 1000 milestone records
- **Action**: Apply complex filter (date range + status + search)
- **Expected Result**:
  - Table updates within < 500ms
  - No UI freeze
  - Pagination works correctly
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 12.2: Rapid Filter Changes

- **Setup**: Table loaded
- **Action**: Quickly drag progress slider back and forth 10 times
- **Expected Result**:
  - Label updates smoothly
  - No memory leaks
  - No orphaned listeners
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

---

## 13. DATA PERSISTENCE TESTING

### Test Case 13.1: Create Persists After Refresh

- **Setup**: New milestone created
- **Action**: Refresh page (F5)
- **Expected Result**: Created milestone still present in table with all data
  intact
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 13.2: Edit Persists After Refresh

- **Setup**: Milestone edited (e.g., status changed), page refreshed
- **Action**: Check API data directly
- **Expected Result**: Changes persisted to `.github/data/milestones.json`
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 13.3: Archive Persists

- **Setup**: Milestone archived via delete
- **Action**: Refresh page
- **Expected Result**:
  - Archived milestone not in normal view
  - File shows `archived: true`
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

---

## 14. SORTING & PAGINATION (SP-8, Integration Check)

### Test Case 14.1: Sort with Filters Active

- **Setup**: Table has filters active (search, status, date)
- **Action**: Click column header to sort (e.g., Progress)
- **Expected Result**: Filtered results sorted correctly by that column
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

### Test Case 14.2: Pagination with Filtered Results

- **Setup**: Date range filter showing 25 results, page size 10
- **Action**: Navigate to page 2
- **Expected Result**: Page 2 shows next 10 filtered results
- **Status**: [ ] PASS / [ ] FAIL
- **Notes**:

---

## Summary of Test Results

### Overall Results

- **Total Test Cases**: 68
- **Passed**: [ ]
- **Failed**: [ ]
- **Blocked**: [ ]
- **N/A**: [ ]

### By Feature

| Feature                    | Test Cases | Passed | Failed | Status    |
| -------------------------- | ---------- | ------ | ------ | --------- |
| Create Modal (SP-9.8)      | 7          | [ ]    | [ ]    | [ ] READY |
| Edit Modal (SP-9.4)        | 6          | [ ]    | [ ]    | [ ] READY |
| Delete/Archive (SP-9.5)    | 4          | [ ]    | [ ]    | [ ] READY |
| Search (SP-8)              | 4          | [ ]    | [ ]    | [ ] READY |
| Status Filter (SP-8)       | 2          | [ ]    | [ ]    | [ ] READY |
| Date Range Filter (SP-9.6) | 5          | [ ]    | [ ]    | [ ] READY |
| Progress Slider (SP-9.7)   | 5          | [ ]    | [ ]    | [ ] READY |
| Combined Filters           | 3          | [ ]    | [ ]    | [ ] READY |
| Reset Filters              | 1          | [ ]    | [ ]    | [ ] READY |
| Edge Cases                 | 5          | [ ]    | [ ]    | [ ] READY |
| Accessibility              | 2          | [ ]    | [ ]    | [ ] READY |
| Performance                | 2          | [ ]    | [ ]    | [ ] READY |
| Data Persistence           | 3          | [ ]    | [ ]    | [ ] READY |
| Sorting/Pagination         | 2          | [ ]    | [ ]    | [ ] READY |

### Critical Issues Found

(To be filled during testing)

### Recommendations

(To be filled after testing completion)

---

## Sign-Off

- **QA Lead**: ********\_******** Date: **\_\_\_**
- **Product Owner**: ********\_******** Date: **\_\_\_**
- **Sprint Retrospective**: Ready for review
