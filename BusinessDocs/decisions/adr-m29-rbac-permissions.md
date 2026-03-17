# Role Hierarchy & Permissions Matrix (M29-007)

> Status: **DECIDED** | Date: 2026-03-17
> Source: Security Assessment GAP-3

## Role Hierarchy

```
admin > operator > viewer
```

- **admin**: Full system access. Can manage users, policies, sessions, governance.
- **operator**: Can execute commands, approve requests, manage decisions & questionnaires.
- **viewer**: Read-only access to dashboards, decisions, progress, and reports.

### Role Inheritance

Each role inherits **all permissions of lower roles**:

- `admin` inherits all `operator` permissions
- `operator` inherits all `viewer` permissions

### Default Role Assignment

- First user to register: `admin` (bootstrap)
- Subsequent users: `viewer` (must be promoted by admin)

## Permissions Matrix

| Endpoint Pattern            | Method | viewer | operator | admin  |
| --------------------------- | ------ | ------ | -------- | ------ |
| `/api/health`               | GET    | public | public   | public |
| `/api/auth/*`               | ALL    | public | public   | public |
| `/api/dashboard/*`          | GET    | yes    | yes      | yes    |
| `/api/decisions`            | GET    | yes    | yes      | yes    |
| `/api/decisions`            | POST   | no     | yes      | yes    |
| `/api/decisions/:id`        | PUT    | no     | yes      | yes    |
| `/api/questionnaires`       | GET    | yes    | yes      | yes    |
| `/api/questionnaires/*`     | POST   | no     | yes      | yes    |
| `/api/commands`             | GET    | yes    | yes      | yes    |
| `/api/commands`             | POST   | no     | yes      | yes    |
| `/api/progress`             | GET    | yes    | yes      | yes    |
| `/api/milestones`           | GET    | yes    | yes      | yes    |
| `/api/drift`                | GET    | yes    | yes      | yes    |
| `/api/metrics/*`            | GET    | yes    | yes      | yes    |
| `/api/events`               | GET    | yes    | yes      | yes    |
| `/api/approvals`            | GET    | yes    | yes      | yes    |
| `/api/approvals/:id/*`      | POST   | no     | yes      | yes    |
| `/api/policies`             | GET    | yes    | yes      | yes    |
| `/api/policies/*`           | POST   | no     | no       | yes    |
| `/api/v1/policies/evaluate` | POST   | no     | yes      | yes    |
| `/api/sessions`             | GET    | yes    | yes      | yes    |
| `/api/sessions`             | POST   | no     | no       | yes    |
| `/api/sessions/:id`         | PUT    | no     | no       | yes    |
| `/api/agents/*`             | GET    | yes    | yes      | yes    |
| `/api/orchestrator/*`       | POST   | no     | yes      | yes    |
| `/api/analytics`            | GET    | yes    | yes      | yes    |
| `/api/analytics`            | POST   | no     | yes      | yes    |
| `/api/artifacts/*`          | GET    | yes    | yes      | yes    |
| `/api/artifacts/*`          | POST   | no     | yes      | yes    |
| `/api/workspaces/*`         | GET    | yes    | yes      | yes    |
| `/api/workspaces/*`         | POST   | no     | no       | yes    |
| `/api/cockpit/*`            | GET    | yes    | yes      | yes    |
| `/api/admin/users`          | GET    | no     | no       | yes    |
| `/api/admin/users/:id/role` | PUT    | no     | no       | yes    |

## RBAC Rules Summary

1. **GET endpoints**: All authenticated users (viewer+)
2. **POST/PUT/DELETE on business data**: operator+
3. **Policy management & session admin**: admin only
4. **User & role management**: admin only
5. **Auth endpoints & health**: public (no auth)
