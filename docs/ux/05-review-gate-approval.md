# User Journey 5: Review Gate / Approval

> "Something is blocked and needs me"

## Entry Point

- **Overview page** shows "What's Next" guidance: "X governance approvals needed"
- SSE notification triggers a toast for new approval requests
- Sidebar navigation to Governance (`/governance`)

## Steps

| #   | User Action                              | UI State                                                     | Route         |
| --- | ---------------------------------------- | ------------------------------------------------------------ | ------------- |
| 1   | Sees "X governance approvals needed"     | What's Next section on Overview highlights pending approvals | `/`           |
| 2   | Clicks the guidance link                 | Navigates to Governance Dashboard                            | `/governance` |
| 3   | Reviews pending approvals list           | Table of pending items with type, requester, risk info       | `/governance` |
| 4   | Clicks on an approval item               | Detail view shows what needs approval, context, risk         | `/governance` |
| 5   | Reviews the evidence/context             | Links to related decision, session, or phase output          | `/governance` |
| 6   | Clicks Approve (with optional comment)   | `useApproveRequest` mutation fires; item transitions         | `/governance` |
| 7   | OR: Clicks Reject (with required reason) | `useRejectRequest` mutation fires; reason recorded           | `/governance` |
| 8   | Returns to Overview                      | Approval count decremented; blocked items may unblock        | `/`           |

## Expected State Changes

- Approval status transitions: `PENDING` → `APPROVED` or `REJECTED`
- If approved: blocked gate transitions, sprint may proceed
- If rejected: escalation may trigger, orchestrator may pause
- SSE event broadcasts the approval outcome to all connected clients

## Exit Point

- All pending approvals addressed
- Orchestrator resumes blocked operations (if approved)
- User returns to monitoring (Journey 3)

## UI Routes & Components Involved

| Component                 | Route           | Purpose                   |
| ------------------------- | --------------- | ------------------------- |
| `OverviewPage`            | `/`             | What's Next guidance      |
| `GovernanceDashboardPage` | `/governance`   | Approval list and actions |
| `SessionDetailPage`       | `/sessions/:id` | Context for approval      |
