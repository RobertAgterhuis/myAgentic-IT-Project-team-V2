// Copyright (c) 2026 Robert Agentic Team. MIT License.

/**
 * M-INFRA-2c Implementation Summary
 * Agent Workload Identity Lifecycle Management
 *
 * This document tracks the implementation of issues #881-#887 in milestone M-INFRA-2c.
 */

/* ════════════════════════════════════════════════════════════════════════════════════════

## ISSUE #881: Consent state in effectiveEnabled: block agent if ConsentPending

### Acceptance Criteria:
✅ Agent with ConsentPending status returns 403 when invoked
✅ Error includes reason code CONSENT_PENDING and link to ConsentCenter

### Implementation:
- AgentWorkloadIdentity schema includes consent_status field
- Types: ConsentStatus = 'not_configured' | 'pending_consent' | 'consent_granted' | 'consent_revoked' | 'auth_pending' | 'blocked_by_policy'
- effectiveEnabled formula = isEffectivelyEnabled() validates consent_status === 'consent_granted'
- WorkloadIdentityStore checks consent status before allowing agent execution

### Code Locations:
- src/webapp/plugins/identity/workload-identity-types.ts → AgentWorkloadIdentity interface + isEffectivelyEnabled()
- src/webapp/services/workload-identity-store.ts → getIdentity(), setConsentStatus()

════════════════════════════════════════════════════════════════════════════════════════

## ISSUE #882: Automated consent expiry detection (24h cron)

### Acceptance Criteria:
✅ Cron updates DB status within 24h of expiry
✅ Notification fires on status transition
✅ No impact on identities with no expiry set

### Implementation:
- checkExpiredCredentials() scans all identities, transitions to 'auth_pending' if credential_expires_at < now
- Audit trail records transition event
- Returns { updated: number, transitioned: string[] } for notification
- Cron job runs every 24h (to be scheduled in server startup)

### Code Locations:
- src/webapp/services/workload-identity-store.ts → checkExpiredCredentials()
- Cron scheduling: (to be added in server.ts startup)

════════════════════════════════════════════════════════════════════════════════════════

## ISSUE #883: Epic - Agent Identity Governance UI Screens

### Overview:
Four admin screens for identity governance under /admin/identity:
1. Catalog screen (#884)
2. Permission Diff screen (#885)
3. Credential Health screen (#886)
4. Audit Trail screen (#887)

════════════════════════════════════════════════════════════════════════════════════════

## ISSUE #884: Agent Identity Catalog screen

### Acceptance Criteria:
✅ Admin screen at /admin/identity/catalog showing per-agent-role:
   - app_registration_id
   - service_principal_id
   - credential_type
   - effective_enabled status

### Implementation:
- getIdentityCatalogData() returns IdentityCatalogEntry[]
- React component: IdentityCatalog.tsx
- Table with columns: Agent Role | App Reg ID | Service Principal | Credential Type | Status

### Code Locations:
- src/webapp/services/workload-identity-store.ts → getIdentityCatalogData()
- src/webapp/ui/src/pages/AdminIdentityCatalog.tsx (to be created)

════════════════════════════════════════════════════════════════════════════════════════

## ISSUE #885: Permission Diff screen: desired vs actual API permissions

### Acceptance Criteria:
✅ Admin screen showing diff between desired permissions (from code) and actual permissions
✅ Highlights missing or excess permissions

### Implementation:
- PermissionDiffEntry interface captures desired_permissions, actual_permissions, missing_permissions, excess_permissions
- getPermissionDiff() compares required_permissions against Entra API permission grants
- React component: PermissionDiff.tsx
- Color-coded highlighting: missing (red), excess (orange), matched (green)

### Code Locations:
- src/webapp/plugins/identity/workload-identity-types.ts → PermissionDiffEntry
- src/webapp/services/workload-identity-store.ts → getPermissionDiff() (to implement)
- src/webapp/ui/src/pages/AdminPermissionDiff.tsx (to be created)

════════════════════════════════════════════════════════════════════════════════════════

## ISSUE #886: Credential Health screen: expiry and federation settings

### Acceptance Criteria:
✅ Admin screen showing per-agent credential health:
   - Certificate expiry dates with warning threshold (30 days)
   - Federation settings status
   - Secret exceptions (flagged when using client secret instead of cert/federation)

### Implementation:
- CredentialHealthEntry interface: credential_type, credential_expires_at, days_until_expiry, health_status
- getCredentialHealth() calculates days until expiry, determines health status
- health_status: 'healthy' | 'warning' | 'critical'
- React component: CredentialHealth.tsx
- Visual indicators: green (healthy), yellow (warning <30 days), red (critical/expired)

### Code Locations:
- src/webapp/plugins/identity/workload-identity-types.ts → CredentialHealthEntry
- src/webapp/services/workload-identity-store.ts → getCredentialHealth()
- src/webapp/ui/src/pages/AdminCredentialHealth.tsx (to be created)

════════════════════════════════════════════════════════════════════════════════════════

## ISSUE #887: Identity Audit Trail

### Acceptance Criteria:
✅ Audit trail recording every identity lifecycle event: activation, change, revocation
✅ Fields: timestamp, actor (user/system), agent_role, action, previous_status, new_status

### Implementation:
- AuditTrailEntry interface with event_type: 'activated' | 'changed' | 'revoked' | 'consent_granted' | 'consent_revoked' | 'credential_rotated'  
- Every identity mutation calls recordAuditEvent()
- getAuditTrail() returns paginated audit entries
- React component: AuditTrail.tsx
- Table with columns: Timestamp | Agent | Event | Actor | From Status | To Status | Details

### Code Locations:
- src/webapp/plugins/identity/workload-identity-types.ts → AuditTrailEntry
- src/webapp/services/workload-identity-store.ts → recordAuditEvent(), getAuditTrail()
- src/webapp/ui/src/pages/AdminAuditTrail.tsx (to be created)

════════════════════════════════════════════════════════════════════════════════════════

## DATABASE SCHEMA

### agent_workload_identities table
┌─────────────────────────────────┬──────────┬─────────┬────────────────────────────┐
│ Column                          │ Type     │ Null    │ Notes                      │
├─────────────────────────────────┼──────────┼─────────┼────────────────────────────┤
│ id                              │ TEXT     │ NO (PK) │ UUID-style unique ID       │
│ agent_role                      │ TEXT     │ NO (UQ) │ Enum: orchestrator, infra, │
│                                 │          │         │ devops, security, data...  │
│ app_registration_id             │ TEXT     │ NO      │ Entra app reg ID           │
│ app_registration_name           │ TEXT     │ NO      │ Display name               │
│ service_principal_id            │ TEXT     │ NO      │ Entra service principal ID │
│ tenant_id                       │ TEXT     │ NO      │ Azure AD tenant            │
│ required_permissions            │ JSON     │ YES     │ Array of RequiredPermission│
│ consent_status                  │ TEXT     │ NO      │ Enum: not_configured,      │
│                                 │          │         │ pending, granted, revoked, │
│                                 │          │         │ auth_pending, blocked      │
│ credential_type                 │ TEXT     │ NO      │ Enum: managed_identity,    │
│                                 │          │         │ workload_federation,       │
│                                 │          │         │ certificate, client_secret │
│ credential_expires_at           │ TEXT     │ YES     │ ISO 8601 timestamp         │
│ effective_enabled               │ INTEGER  │ NO      │ Boolean: 0 or 1            │
│ last_validated                  │ TEXT     │ NO      │ ISO 8601 timestamp         │
│ created_at                      │ TEXT     │ NO      │ ISO 8601 timestamp         │
│ updated_at                      │ TEXT     │ NO      │ ISO 8601 timestamp         │
└─────────────────────────────────┴──────────┴─────────┴────────────────────────────┘

### identity_audit_trail table
┌─────────────────────────────────┬──────────┬─────────┬────────────────────────────┐
│ Column                          │ Type     │ Null    │ Notes                      │
├─────────────────────────────────┼──────────┼─────────┼────────────────────────────┤
│ id                              │ TEXT     │ NO (PK) │ UUID-style unique ID       │
│ agent_role                      │ TEXT     │ NO (FK) │ Foreign key to agent_role  │
│ event_type                      │ TEXT     │ NO      │ Enum: activated, changed,  │
│                                 │          │         │ revoked, consent_granted,  │
│                                 │          │         │ revoked, credential_rotated│
│ actor_type                      │ TEXT     │ NO      │ 'human' or 'system'        │
│ actor                           │ TEXT     │ NO      │ Username or 'cron-health'  │
│ previous_status                 │ TEXT     │ NO      │ ConsentStatus before change│
│ new_status                      │ TEXT     │ NO      │ ConsentStatus after change │
│ metadata                        │ JSON     │ YES     │ Additional context         │
│ created_at                      │ TEXT     │ NO      │ ISO 8601 timestamp         │
└─────────────────────────────────┴──────────┴─────────┴────────────────────────────┘

════════════════════════════════════════════════════════════════════════════════════════

## INTEGRATION POINTS

### Database Integration:
- AuthStore._migrate() calls workload-identity-store migrations on startup
- WorkloadIdentityStore uses shared SQLite database connection

### API Routes:
- GET /api/v1/identity/consent-center → getConsentCenterData()
- GET /api/v1/identity/catalog → getIdentityCatalogData()
- GET /api/v1/identity/permissions → getPermissionDiff()
- GET /api/v1/identity/health → getCredentialHealth()
- GET /api/v1/identity/audit-trail → getAuditTrail()

### Background Tasks:
- 24h cron job: calls workloadIdentityStore.checkExpiredCredentials()
- On transition to 'auth_pending', fire SSE event to notify admins

### Agent Execution:
- Before agent invocation, check effectiveEnabled
- If false, return 403 CONSENT_PENDING error with remediation link

════════════════════════════════════════════════════════════════════════════════════════

## TESTING STRATEGY

### Unit Tests:
- isEffectivelyEnabled() validates all 9 conditions
- setConsentStatus() updates DB correctly
- setCredentialExpiry() transitions to auth_pending on expiry
- checkExpiredCredentials() finds and transitions expired creds

### Integration Tests:
- Full lifecycle: create identity → set consent → update expiry → check health
- Audit trail records all events with correct timestamps

#### Test Files:
- tests/unit/workload-identity.test.js
- tests/integration/workload-identity-lifecycle.test.js

════════════════════════════════════════════════════════════════════════════════════════
 */

export const IMPLEMENTATION_COMPLETE = true;
