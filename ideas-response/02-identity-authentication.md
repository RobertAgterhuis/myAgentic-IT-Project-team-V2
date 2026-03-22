# Domain 02 — Identity & Authentication

> Source: `ideas/ideas.md` — Section "Azure Login" + `ideas/mcp_plugin_architecture_addendum_identity_consent.md`  
> Analysis date: March 22, 2026  
> Analyst: GitHub Copilot (based on consultant recommendations)

---

## 1. Executive Summary

The platform today has exclusively GitHub OAuth-based authentication (`src/webapp/auth.ts`), backed by SQLite with three RBAC roles (`admin`, `operator`, `viewer`). The consultant's verdict is clear and two-layered:

**Layer A — Web Identity:**  
Add **Microsoft Entra ID OIDC login** as a second identity provider alongside GitHub OAuth. Do NOT add "Azure DevOps OAuth" — that registration path is sunset as of April 23, 2025. The correct path is a **provider-agnostic auth core** with federated multi-provider identity.

**Layer B — MCP Workload Identity:**  
Each **agent role** that calls Microsoft APIs (Azure, Graph, Azure DevOps, SharePoint) must have its own dedicated **Entra ID workload identity** (app registration + service principal). Do NOT create one monolithic platform app registration. Consent, credential health, and permission grants must be tracked as first-class runtime state.

These are two separate but interdependent changes. The MCP workload identity layer depends on the Entra ID login layer being in place first.

---

## 2. Current State Analysis

### `src/webapp/auth.ts` audit

```typescript
// Current auth model (GitHub OAuth only):
export type Role = 'admin' | 'operator' | 'viewer';

export interface User {
  id: string;
  github_id: number; // ← GitHub-specific, no provider abstraction
  email: string;
  name: string;
  avatar_url: string;
  role: Role;
}

export interface AuthConfig {
  clientId: string; // GitHub OAuth client ID only
  clientSecret: string; // GitHub OAuth client secret only
  callbackUrl: string;
  stateSecret: string;
  sessionTtlMs?: number;
  dbPath?: string;
  enabled?: boolean;
  secureCookies?: boolean;
}
```

### Gaps identified in current auth.ts

| Gap                              | Severity | Details                                             |
| -------------------------------- | -------- | --------------------------------------------------- |
| Provider hard-coded to GitHub    | Critical | `github_id` field; no `provider` abstraction        |
| No OIDC support                  | Critical | Only OAuth code flow for GitHub                     |
| No provider-agnostic token model | High     | Tokens are GitHub-specific                          |
| No linked identity model         | High     | One user = one GitHub account                       |
| No tenant-awareness              | High     | No Entra tenant binding                             |
| No MCP workload identity         | Critical | No per-agent-role app registrations                 |
| No consent tracking              | Critical | No consent lifecycle state                          |
| RBAC roles are too coarse        | Medium   | `admin/operator/viewer` — no agent-role integration |

---

## 3. Architecture Design

### Federated Identity Model

```
┌──────────────────────────────────────────────────────────┐
│  IDENTITY PROVIDERS                                        │
│  ┌─────────────────┐   ┌────────────────────────────────┐ │
│  │  GitHub OAuth   │   │  Microsoft Entra ID OIDC       │ │
│  │  (existing)     │   │  (new)                         │ │
│  └────────┬────────┘   └──────────────┬─────────────────┘ │
└───────────┼──────────────────────────┼──────────────────┘
            │                          │
            ▼                          ▼
┌──────────────────────────────────────────────────────────┐
│  PROVIDER-AGNOSTIC AUTH CORE (new)                         │
│  ProviderAdapter interface → normalize to internal User    │
│  One UserAccount, One Session, One RBAC model             │
│  Linked provider accounts per user                         │
└──────────────────────────┬───────────────────────────────┘
                           │
            ┌──────────────┼────────────────────┐
            ▼              ▼                     ▼
     GitHub Connector   Entra Connector    Future connectors
     (SCM tokens)       (ADO/Azure/Graph)  (GitLab, etc.)
```

### User Model Changes

```typescript
// New provider-agnostic user model
export type IdentityProvider = 'github' | 'entra';

export interface LinkedAccount {
  provider: IdentityProvider;
  provider_id: string; // GitHub user_id or Entra object_id
  provider_username: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: string;
  tenant_id?: string; // Entra only
  scopes: string[];
}

export interface User {
  id: string; // Internal UUID
  email: string;
  name: string;
  avatar_url: string;
  role: Role;
  primary_provider: IdentityProvider;
  linked_accounts: LinkedAccount[];
  created_at: string;
  last_login: string;
}
```

### MCP Workload Identity Model (from addendum)

```typescript
// Per agent-role workload identity
export type AgentRoleId =
  | 'orchestrator'
  | 'developer'
  | 'ui'
  | 'devops'
  | 'infra'
  | 'security'
  | 'data'
  | 'documentation'
  | 'sre';

export type ConsentStatus =
  | 'not_configured'
  | 'pending_consent'
  | 'consent_granted'
  | 'consent_revoked'
  | 'blocked_by_policy';

export type CredentialType =
  | 'managed_identity'
  | 'workload_federation'
  | 'certificate'
  | 'client_secret';

export interface AgentWorkloadIdentity {
  agent_role: AgentRoleId;
  app_registration_id: string;
  service_principal_id: string;
  tenant_id: string;
  required_permissions: MicrosoftApiPermission[];
  consent_status: ConsentStatus;
  credential_type: CredentialType;
  credential_expires_at?: string;
  last_validated: string;
  effective_enabled: boolean;
}

// effectiveEnabled = registryAvailable
//   AND tenantEnabled AND workspaceEnabled
//   AND agentPolicyAllows AND authReady
//   AND servicePrincipalReady AND consentGranted
//   AND credentialPolicyValid AND healthOk
```

### Recommended Agent Identity Granularity (from addendum)

| Agent Role     | Own App Registration? | Reason                                       |
| -------------- | --------------------- | -------------------------------------------- |
| Orchestrator   | No / very limited     | Planner; no broad execution rights           |
| Developer      | No (for tenant APIs)  | Repo/package work ≠ tenant admin             |
| UI Agent       | No                    | Playwright/code; no high Entra rights        |
| DevOps Agent   | Yes                   | Pipeline, service connections, deployment    |
| Infra Agent    | Yes                   | Azure resource actions; highest risk profile |
| Security Agent | Yes                   | Reads tenant/policy/directory data           |
| Data Agent     | Yes                   | Schema-impacting data operations             |
| Documentation  | No                    | Repository/docs only                         |
| SRE/Ops        | Conditional           | Observability = read; remediation = approval |

---

## 4. Phased Implementation Plan

### Phase 1 — Auth Core Refactor (Milestone: M-INFRA-2a)

**Goal:** Break the GitHub-only coupling in `auth.ts`; introduce `ProviderAdapter` abstraction.

#### Epic 1.1 — Provider Abstraction Layer

- **Issue 1.1.1** — Extract `IAuthProvider` interface from `auth.ts`
  - `authenticate(code: string, state: string): Promise<ProviderUser>`
  - `refreshToken(refreshToken: string): Promise<TokenPair>`
  - `revokeToken(accessToken: string): Promise<void>`
  - Acceptance: `GitHubAuthProvider` implements interface; all existing tests pass
  - Effort: M (2–3 days)

- **Issue 1.1.2** — Migrate `User` model to provider-agnostic schema
  - New columns: `primary_provider`, `linked_accounts` (JSONB or separate table)
  - Replace `github_id` with `provider_id` in lookups
  - Acceptance: existing GitHub login still works after migration
  - Effort: M (2–3 days)

- **Issue 1.1.3** — Add `ProviderRegistry` to `auth.ts`: register/lookup providers by `IdentityProvider` enum
  - Acceptance: `authManager.registerProvider('github', new GitHubAuthProvider(config))`
  - Effort: S (1 day)

- **Issue 1.1.4** — Schema migration: add `identity_provider`, `linked_accounts` table, rename `github_id` → `provider_account_id`
  - Acceptance: migration runs idempotently; backward-compatible rollback path
  - Effort: M (2 days)

#### Epic 1.2 — Session and CSRF Hardening

- **Issue 1.2.1** — Move tokens to per-provider `linked_accounts` table with envelope encryption
  - Acceptance: tokens not stored as plaintext; decryption via AES-256-GCM key from env
  - Effort: M (2 days)

- **Issue 1.2.2** — Add `provider` field to session cookie payload; validate on every request
  - Acceptance: session hijack scenario test: mismatched provider rejected
  - Effort: S (1 day)

---

### Phase 2 — Entra ID OIDC Login (Milestone: M-INFRA-2b)

**Goal:** Add Microsoft Entra ID as a second identity provider via OIDC.

#### Epic 2.1 — Entra OIDC Provider

- **Issue 2.1.1** — Implement `EntraAuthProvider` implementing `IAuthProvider`
  - Use `@azure/msal-node` or standard OIDC `code + PKCE` flow
  - Endpoint: `GET /api/auth/entra/login`, `GET /api/auth/entra/callback`
  - Acceptance: Entra login flow complete in dev environment with mock tenant
  - Effort: L (3–4 days)

- **Issue 2.1.2** — Add Entra-specific claims extraction: `oid` (object ID), `tid` (tenant ID), `upn` (UPN)
  - Acceptance: `User.linked_accounts` entry for Entra contains `tenant_id`
  - Effort: S (1 day)

- **Issue 2.1.3** — Add environment config for Entra: `ENTRA_CLIENT_ID`, `ENTRA_TENANT_ID`, `ENTRA_CLIENT_SECRET`, `ENTRA_REDIRECT_URI`
  - Acceptance: providers activate only when corresponding env vars are set
  - Effort: S (1 day)

- **Issue 2.1.4** — Add login page provider selection UI: "Sign in with GitHub" / "Sign in with Microsoft"
  - Acceptance: both buttons visible; both flows work end-to-end
  - Effort: M (2 days)

#### Epic 2.2 — Linked Identity Management

- **Issue 2.2.1** — Add account linking: user logged in via GitHub can link Entra account
  - `POST /api/auth/link/entra` — initiates Entra OIDC flow; links on callback
  - Acceptance: single User record has two linked_accounts entries
  - Effort: M (2–3 days)

- **Issue 2.2.2** — Add provider-specific connector tokens: `GitHubConnector` uses GitHub token; `AzureDevOpsConnector` uses Entra token
  - Acceptance: workspace can be bound to Azure DevOps org via Entra-issued token
  - Effort: L (3 days)

- **Issue 2.2.3** — Extend RBAC: Entra group claims can map to platform roles (`admin`, `operator`, `viewer`)
  - Acceptance: `ENTRA_ADMIN_GROUP_ID` env var maps Entra group to `admin` role
  - Effort: M (2 days)

---

### Phase 3 — MCP Workload Identity (Milestone: M-INFRA-2c)

**Goal:** Implement per-agent-role app registrations, consent tracking, and runtime enforcement.

#### Epic 3.1 — Identity Catalog

- **Issue 3.1.1** — Create `AgentWorkloadIdentity` schema and DB table
  - Columns: `agent_role`, `app_registration_id`, `service_principal_id`, `tenant_id`, `consent_status`, `credential_type`, `last_validated`, `effective_enabled`
  - Acceptance: schema migration runs; CRUD operations tested
  - Effort: M (2 days)

- **Issue 3.1.2** — Create `WorkloadIdentityService` with `plan()`, `bootstrap()`, `consentStatus()`, `validate()` methods
  - Acceptance: each method returns structured result matching CLI command surface
  - Effort: L (3–4 days)

- **Issue 3.1.3** — Implement CLI commands:
  - `npx my-plugin identity plan` → prints required app registrations per agent role
  - `npx my-plugin identity bootstrap` → creates or registers Entra objects
  - `npx my-plugin identity consent status` → validates per-agent operational readiness
  - Acceptance: all three commands runnable; output matches schema
  - Effort: L (4 days)

#### Epic 3.2 — Consent Lifecycle

- **Issue 3.2.1** — Add `ConsentCenter` admin page: per-agent-role consent status, grant/revoke actions
  - Acceptance: table shows all agent roles with current `consent_status`
  - Effort: M (2–3 days)

- **Issue 3.2.2** — Add consent state to `effectiveEnabled` formula for agent execution
  - Acceptance: agent with `ConsentPending` status returns `403` when invoked
  - Effort: M (2 days)

- **Issue 3.2.3** — Add automated consent expiry detection: `credential_expires_at` triggers status change to `AuthPending`
  - Acceptance: cron-style health check runs every 24h; updates DB status
  - Effort: M (2 days)

#### Epic 3.3 — Governance UI Screens

- **Issue 3.3.1** — **Agent Identity Catalog** — per-agent-role app registration, service principal, credential type
  - Effort: M (2 days)
- **Issue 3.3.2** — **Permission Diff** — desired vs. actual API permissions per agent role
  - Effort: M (2 days)
- **Issue 3.3.3** — **Credential Health** — certificate expiry, federation settings, secret exceptions
  - Effort: M (2 days)
- **Issue 3.3.4** — **Audit Trail** — who activated/changed/revoked which identity and when
  - Effort: S (1 day)

---

## 5. Milestones

### M-INFRA-2a — Auth Core Refactor

- **Deliverables:** `IAuthProvider` interface; provider-agnostic `User` model; GitHub provider migrated; all existing tests pass
- **Exit criteria:** GitHub OAuth login works identically post-migration; new schema in production

### M-INFRA-2b — Entra ID OIDC

- **Deliverables:** `EntraAuthProvider`; login page with provider selector; linked accounts; workspace Azure DevOps binding via Entra token
- **Exit criteria:** Full Entra login flow demonstrated; linked identity works; workspace bound to Azure DevOps org

### M-INFRA-2c — MCP Workload Identity

- **Deliverables:** `AgentWorkloadIdentity` schema; CLI identity commands; ConsentCenter UI; `effectiveEnabled` includes consent check
- **Exit criteria:** `identity plan` outputs correct agent-role list; agent invocation blocked when consent missing

---

## 6. Security Constraints (Mandatory)

1. **No client secret storage in plaintext** — AES-256-GCM encryption at rest, key from environment.
2. **Prefer workload identity federation or certificates over client secrets** — secrets only as controlled exception.
3. **Admin consent for restricted permissions** — consent UI must clearly distinguish `user_consent` vs `admin_consent` required.
4. **Tenant isolation** — service principals are tenant-specific; no cross-tenant assumption.
5. **Separation of duties** — DevOps/Infra/Security/Data agent identities are distinct; Orchestrator has no broad execution rights.
6. **Token binding** — CSRF state parameter validated; PKCE used in Entra OIDC flow; session tokens scoped per provider.

---

## 7. Risks

| Risk                                                   | Likelihood                | Impact   | Mitigation                                                                                   |
| ------------------------------------------------------ | ------------------------- | -------- | -------------------------------------------------------------------------------------------- |
| Azure DevOps OAuth deprecation creates urgent timeline | High (already deprecated) | High     | Build Entra OIDC now; never start Azure DevOps OAuth                                         |
| Provider abstraction breaks existing GitHub login      | Medium                    | Critical | Keep `GitHubAuthProvider` as first implementation; full regression test suite before release |
| Client secrets leaked via env vars                     | Medium                    | Critical | Mandatory secrets management documentation; enforce `ENTRA_*` via Vault or Key Vault         |
| Consent management UI complexity underestimated        | High                      | Medium   | Phase 3 is explicit about consent lifecycle UX; allocate buffer time                         |
| Multi-provider login increases session attack surface  | Low                       | High     | PKCE, CSRF state, provider-scoped session cookies, audit logging                             |

---

## HANDOFF CHECKLIST

- [x] All required sections are filled
- [x] Codebase-specific gaps documented (auth.ts audit)
- [x] Provider abstraction design provided with TypeScript types
- [x] MCP workload identity model from addendum integrated
- [x] `effectiveEnabled` formula documented
- [x] Security constraints explicit
- [x] Phased plan actionable with effort estimates
- [x] Deliverable written to file
