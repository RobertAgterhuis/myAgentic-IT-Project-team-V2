# GitHub Project Board Setup Guide

**Date:** 2026-03-10  
**Status:** Partial (Labels ✅, Milestones ✅, Project Board ⚠️)  
**Context:** GitHub Integration Agent (28) - Project Board Configuration

---

## ✅ Completed Automatically

### 1. Labels Created

All standard labels are now available in the repository:

| Label         | Color         | Description                     |
| ------------- | ------------- | ------------------------------- |
| `sprint-item` | 🟢 Green      | Sprint plan item from synthesis |
| `P1`          | 🔴 Red        | Priority 1 - Critical           |
| `P2`          | 🟡 Yellow     | Priority 2 - High               |
| `business`    | 🟣 Purple     | Business discipline             |
| `tech`        | 🔵 Blue       | Tech discipline                 |
| `ux`          | 🔷 Light Blue | UX discipline                   |
| `marketing`   | 🟪 Magenta    | Marketing discipline            |
| `BLOCKED`     | ⛔ Dark Red   | Blocked - requires resolution   |

### 2. Milestones Created

Two sprint milestones are configured:

| Milestone          | Due Date       | Description                                           | Issues    |
| ------------------ | -------------- | ----------------------------------------------------- | --------- |
| **Sprint 1** (#23) | March 24, 2026 | First implementation sprint - P1 critical path items  | 14 issues |
| **Sprint 2** (#24) | April 7, 2026  | Second implementation sprint - P2 and follow-up items | 3 issues  |

### 3. Issues Assigned to Milestones

**Sprint 1 (14 issues):**

- Business: #113, #118
- Tech: #120, #106, #116
- UX: #105, #111, #119 (BLOCKED), #117 (BLOCKED)
- Marketing: #108, #121, #109, #114 (BLOCKED), #115

**Sprint 2 (3 issues):**

- Business: #107, #110
- Tech: #112

---

## ⚠️ Manual Setup Required

GitHub Projects v2 creation requires additional token scopes that are not
currently available.

### Option 1: Create Project via Web UI (Recommended)

1. **Navigate to Projects:**
   - Go to: https://github.com/RobertAgterhuis?tab=projects
   - Or: Repository → Projects tab

2. **Create New Project:**
   - Click "New project"
   - Template: "Board" (Kanban-style)
   - Title: `Agentic SDLC Platform - Implementation Board`
   - Description:
     `Sprint tracking board for Phases 1-5 implementation work items`

3. **Configure Board Columns:** Create the following columns (left to right):
   - **Backlog** - Not yet started, awaiting prioritization
   - **Ready** - Meets Definition of Ready, can be picked up
   - **In Progress** - Currently being worked on
   - **Review** - Awaiting PR review or validation
   - **Blocked** - Waiting on external dependency
   - **Done** - Completed and merged

4. **Add Issues to Project:**
   - Select all 17 issues (#105-121)
   - Add to project
   - Move BLOCKED issues (#119, #117, #114) to "Blocked" column
   - Move remaining Sprint 1 items to "Ready" column
   - Move Sprint 2 items to "Backlog" column

5. **Configure Views:**
   - Create "By Sprint" view (group by milestone)
   - Create "By Discipline" view (group by label: business/tech/ux/marketing)
   - Create "By Priority" view (group by label: P1/P2)
   - Create "Blockers Only" view (filter: label = BLOCKED)

### Option 2: GitHub CLI with Extended Permissions

If you prefer CLI automation:

```powershell
# 1. Refresh authentication with project scopes
gh auth refresh -s project,read:project,write:project

# 2. Create project
$projectUrl = gh project create `
  --owner RobertAgterhuis `
  --title "Agentic SDLC Platform - Implementation Board" `
  --format json | ConvertFrom-Json | Select-Object -ExpandProperty url

# 3. Get project number
$projectNumber = ($projectUrl -split '/')[-1]

# 4. Add all issues to project
105..121 | ForEach-Object {
  gh project item-add $projectNumber --owner RobertAgterhuis --url "https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/issues/$_"
}

# 5. Configure custom fields and views via GraphQL API
# (See GitHub Projects v2 documentation for advanced configuration)
```

### Option 3: GitHub API Direct (Advanced)

Use GraphQL API for full programmatic control:

- Endpoint: `https://api.github.com/graphql`
- Required mutation: `createProjectV2`
- See: https://docs.github.com/en/graphql/reference/mutations#createprojectv2

---

## 📋 Project Board Best Practices

### Definition of Ready (before moving to "Ready" column)

- [ ] Acceptance criteria are clear and testable
- [ ] Dependencies are identified and resolved (or marked BLOCKED)
- [ ] Sprint capacity is available
- [ ] Technical design is understood
- [ ] No open questions remain

### Definition of Done (before moving to "Done" column)

- [ ] Code implemented per acceptance criteria
- [ ] Unit tests written and passing
- [ ] Integration tests passing (where applicable)
- [ ] Code review completed and approved
- [ ] Documentation updated
- [ ] PR merged to main branch
- [ ] No regressions in CI/CD pipeline

### Workflow Automation Recommendations

Enable GitHub Actions workflows to automatically:

- Move issues to "In Progress" when PR is opened
- Move to "Review" when PR is marked ready for review
- Move to "Done" when PR is merged
- Add "needs-triage" label when issue is created
- Auto-assign based on discipline labels

---

## 🔗 References

- Synthesis Master Report: `docs/synthesis/final-report-master.md`
- Cross-Team Blocker Matrix:
  `docs/synthesis/cross-team-blocker-matrix.md`
- GitHub Integration Sync Report:
  `docs/github/sync-report-2026-03-10T19-00-00Z.md`
- Session State: `docs/session/session-state.json`

---

## ✅ Next Steps After Board Creation

1. **Sprint Gate Execution** - Validate Definition of Ready for all Sprint 1
   items
2. **Blocker Resolution Plan** - Address 3 BLOCKED items:
   - BLK-1-501: Locale prioritization decision
   - BLK-2-501: TMS procurement
   - BLOCKER-1-502: Analytics infrastructure readiness
3. **Phase 5 Kickoff** - Begin implementation of non-blocked Sprint 1 items
4. **Velocity Tracking** - Establish baseline metrics for sprint planning

**Created by:** GitHub Integration Agent (28)  
**Date:** 2026-03-10T19:15:00Z
