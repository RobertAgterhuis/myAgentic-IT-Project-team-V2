#!/usr/bin/env pwsh
# Domain 02 - Identity & Authentication: Create epics + issues

$repo = "RobertAgterhuis/myAgentic-IT-Project-team-V2"
$ErrorActionPreference = "Continue"

function New-Issue($title, $body, [string[]]$labels, $msNum) {
    $p = @{ title=$title; body=$body; labels=$labels; milestone=$msNum } | ConvertTo-Json -Compress
    $r = ($p | gh api "repos/$repo/issues" --input -) | ConvertFrom-Json
    Write-Host "  #$($r.number) $title" -ForegroundColor Green
    return [int]$r.number
}
function B { param($lines) return ($lines -join "`n") }

$ms100=100; $ms105=105; $ms112=112

Write-Host "`n=== Domain 02: Identity & Authentication ===" -ForegroundColor Magenta

# ── M-INFRA-2a ──────────────────────────────────────
Write-Host "`n-- M-INFRA-2a (Auth Core Refactor) --"

$e11 = New-Issue "Epic: Provider Abstraction Layer" (B @(
    "## Epic 1.1 - Provider Abstraction Layer",
    "**Milestone:** M-INFRA-2a - Auth Core Refactor",
    "**Domain:** Identity & Authentication (Domain 02, Phase 1)",
    "",
    "Break the GitHub-only coupling in auth.ts. Introduce IAuthProvider interface and provider-agnostic User model.",
    "",
    "### Issues",
    "- [ ] Extract IAuthProvider interface from auth.ts",
    "- [ ] Migrate User model to provider-agnostic schema",
    "- [ ] Add ProviderRegistry to auth.ts",
    "- [ ] Schema migration: linked_accounts table"
)) @("epic","domain:identity","P0-critical","enhancement") $ms100

New-Issue "ID-1.1.1 - Extract IAuthProvider interface from auth.ts" (B @(
    "**Epic:** #$e11",
    "**Milestone:** M-INFRA-2a",
    "",
    "Extract IAuthProvider interface from src/webapp/auth.ts with methods:",
    "- authenticate(code, state): Promise<ProviderUser>",
    "- refreshToken(refreshToken): Promise<TokenPair>",
    "- revokeToken(accessToken): Promise<void>",
    "",
    "Refactor GitHubAuthProvider to implement interface.",
    "",
    "**Acceptance criteria:**",
    "- GitHubAuthProvider implements IAuthProvider",
    "- All existing GitHub auth tests pass",
    "- No regression in GitHub OAuth login flow",
    "",
    "**Effort:** M (2-3 days)"
)) @("domain:identity","P0-critical","enhancement","tech") $ms100

New-Issue "ID-1.1.2 - Migrate User model to provider-agnostic schema" (B @(
    "**Epic:** #$e11",
    "**Milestone:** M-INFRA-2a",
    "",
    "Replace github_id field with provider_id in User model.",
    "Add primary_provider and linked_accounts fields.",
    "New schema: { id, email, name, avatar_url, role, primary_provider, linked_accounts, created_at, last_login }",
    "",
    "**Acceptance criteria:**",
    "- Existing GitHub login still works after migration",
    "- DB migration is backward-compatible",
    "- No TypeScript type errors in existing code",
    "",
    "**Effort:** M (2-3 days)"
)) @("domain:identity","P0-critical","enhancement","tech") $ms100

New-Issue "ID-1.1.3 - Add ProviderRegistry to auth.ts" (B @(
    "**Epic:** #$e11",
    "**Milestone:** M-INFRA-2a",
    "",
    "Add ProviderRegistry class that allows registering and looking up auth providers by IdentityProvider enum.",
    "Usage: authManager.registerProvider('github', new GitHubAuthProvider(config))",
    "",
    "**Acceptance criteria:**",
    "- Multiple providers can be registered",
    "- Provider lookup by string key works",
    "- Unknown provider returns null (not throws)",
    "",
    "**Effort:** S (1 day)"
)) @("domain:identity","P0-critical","enhancement","tech") $ms100

New-Issue "ID-1.1.4 - Schema migration: identity_provider, linked_accounts table" (B @(
    "**Epic:** #$e11",
    "**Milestone:** M-INFRA-2a",
    "",
    "Create DB migration adding:",
    "- identity_provider column to users table",
    "- linked_accounts table: (user_id, provider, provider_id, provider_username, access_token_encrypted, refresh_token_encrypted, token_expires_at, tenant_id, scopes)",
    "- Rename github_id to provider_account_id",
    "",
    "**Acceptance criteria:**",
    "- Migration runs idempotently",
    "- Backward-compatible rollback path exists",
    "- All existing data preserved",
    "",
    "**Effort:** M (2 days)"
)) @("domain:identity","P0-critical","enhancement","tech") $ms100

$e12 = New-Issue "Epic: Session and CSRF Hardening" (B @(
    "## Epic 1.2 - Session and CSRF Hardening",
    "**Milestone:** M-INFRA-2a - Auth Core Refactor",
    "**Domain:** Identity & Authentication (Domain 02, Phase 1)",
    "",
    "Harden session token storage and CSRF protection for multi-provider auth.",
    "",
    "### Issues",
    "- [ ] Envelope-encrypt tokens in linked_accounts table (AES-256-GCM)",
    "- [ ] Add provider field to session cookie; validate on every request"
)) @("epic","domain:identity","P0-critical","security") $ms100

New-Issue "ID-1.2.1 - Envelope-encrypt tokens in linked_accounts table" (B @(
    "**Epic:** #$e12",
    "**Milestone:** M-INFRA-2a",
    "",
    "Store OAuth tokens encrypted at rest using AES-256-GCM.",
    "Encryption key loaded from environment variable (not config file).",
    "Decryption only within GitService/AuthService boundary - never exposed in API responses.",
    "",
    "**Acceptance criteria:**",
    "- Tokens stored in DB are ciphertext (not plaintext)",
    "- Decryption via AES-256-GCM with key from env var",
    "- Key rotation does not break existing sessions",
    "",
    "**Security constraint:** No client secret storage in plaintext. AES-256-GCM at rest.",
    "",
    "**Effort:** M (2 days)"
)) @("domain:identity","P0-critical","security","tech") $ms100

New-Issue "ID-1.2.2 - Add provider field to session cookie; validate on every request" (B @(
    "**Epic:** #$e12",
    "**Milestone:** M-INFRA-2a",
    "",
    "Add primary_provider to session cookie payload.",
    "Validate provider field matches DB user record on every authenticated request.",
    "",
    "**Acceptance criteria:**",
    "- Session hijack test: mismatched provider (different provider in cookie vs DB) is rejected with 401",
    "- All existing authenticated routes still pass regression tests",
    "",
    "**Effort:** S (1 day)"
)) @("domain:identity","P0-critical","security","tech") $ms100

# ── M-INFRA-2b ──────────────────────────────────────
Write-Host "`n-- M-INFRA-2b (Entra ID OIDC) --"

$e21 = New-Issue "Epic: Entra OIDC Provider" (B @(
    "## Epic 2.1 - Entra OIDC Provider",
    "**Milestone:** M-INFRA-2b - Entra ID OIDC",
    "**Domain:** Identity & Authentication (Domain 02, Phase 2)",
    "",
    "Implement Microsoft Entra ID as a second identity provider via OIDC code+PKCE flow.",
    "",
    "### Issues",
    "- [ ] Implement EntraAuthProvider implementing IAuthProvider",
    "- [ ] Entra-specific claims extraction (oid, tid, upn)",
    "- [ ] Environment config for Entra",
    "- [ ] Login page provider selection UI"
)) @("epic","domain:identity","P0-critical","enhancement") $ms105

New-Issue "ID-2.1.1 - Implement EntraAuthProvider implementing IAuthProvider" (B @(
    "**Epic:** #$e21",
    "**Milestone:** M-INFRA-2b",
    "",
    "Implement EntraAuthProvider using @azure/msal-node or standard OIDC code+PKCE flow.",
    "Endpoints: GET /api/auth/entra/login, GET /api/auth/entra/callback",
    "",
    "**Acceptance criteria:**",
    "- Entra login flow works in dev environment with mock tenant",
    "- PKCE used (not implicit flow)",
    "- Provider only activates when ENTRA_CLIENT_ID env var is set",
    "",
    "**Effort:** L (3-4 days)"
)) @("domain:identity","P0-critical","enhancement","tech") $ms105

New-Issue "ID-2.1.2 - Entra-specific claims extraction (oid, tid, upn)" (B @(
    "**Epic:** #$e21",
    "**Milestone:** M-INFRA-2b",
    "",
    "Extract and persist Entra-specific OIDC claims:",
    "- oid: object ID (maps to provider_id)",
    "- tid: tenant ID (stored in linked_accounts.tenant_id)",
    "- upn: User Principal Name",
    "",
    "**Acceptance criteria:**",
    "- User.linked_accounts entry for Entra contains tenant_id",
    "- UPN stored as provider_username",
    "",
    "**Effort:** S (1 day)"
)) @("domain:identity","P0-critical","enhancement","tech") $ms105

New-Issue "ID-2.1.3 - Environment config for Entra (ENTRA_CLIENT_ID, ENTRA_TENANT_ID)" (B @(
    "**Epic:** #$e21",
    "**Milestone:** M-INFRA-2b",
    "",
    "Add environment variable definitions and validation for Entra OIDC config:",
    "ENTRA_CLIENT_ID, ENTRA_TENANT_ID, ENTRA_CLIENT_SECRET, ENTRA_REDIRECT_URI",
    "",
    "Providers only activate when corresponding env vars are set.",
    "Document in .env.example.",
    "",
    "**Acceptance criteria:**",
    "- Entra provider disabled when vars not set (no startup crash)",
    "- All four vars documented in .env.example",
    "",
    "**Effort:** S (1 day)"
)) @("domain:identity","P0-critical","enhancement","tech") $ms105

New-Issue "ID-2.1.4 - Login page provider selection UI" (B @(
    "**Epic:** #$e21",
    "**Milestone:** M-INFRA-2b",
    "",
    "Update login page to show provider selector: 'Sign in with GitHub' / 'Sign in with Microsoft'.",
    "Microsoft button only visible when Entra env vars are configured.",
    "",
    "**Acceptance criteria:**",
    "- Both provider buttons visible in dev env with Entra configured",
    "- Both flows work end-to-end",
    "- Microsoft button hidden when Entra not configured",
    "",
    "**Effort:** M (2 days)"
)) @("domain:identity","P0-critical","enhancement","ux","ui") $ms105

$e22 = New-Issue "Epic: Linked Identity Management" (B @(
    "## Epic 2.2 - Linked Identity Management",
    "**Milestone:** M-INFRA-2b - Entra ID OIDC",
    "**Domain:** Identity & Authentication (Domain 02, Phase 2)",
    "",
    "Enable users to link multiple provider accounts; connector tokens routed by provider.",
    "",
    "### Issues",
    "- [ ] Account linking: GitHub user can link Entra account",
    "- [ ] Provider-specific connector tokens",
    "- [ ] Entra group claims map to platform roles"
)) @("epic","domain:identity","P1-high","enhancement") $ms105

New-Issue "ID-2.2.1 - Account linking: GitHub user can link Entra account" (B @(
    "**Epic:** #$e22",
    "**Milestone:** M-INFRA-2b",
    "",
    "Add account linking flow: a user logged in via GitHub can link their Entra account.",
    "POST /api/auth/link/entra: initiates Entra OIDC flow; links on callback.",
    "",
    "**Acceptance criteria:**",
    "- Single User record has two linked_accounts entries after linking",
    "- Linking works without requiring logout",
    "- Duplicate Entra-provider entry on same user rejected",
    "",
    "**Effort:** M (2-3 days)"
)) @("domain:identity","P1-high","enhancement","tech") $ms105

New-Issue "ID-2.2.2 - Provider-specific connector tokens for Azure DevOps" (B @(
    "**Epic:** #$e22",
    "**Milestone:** M-INFRA-2b",
    "",
    "GitHubConnector uses GitHub token from linked_accounts.",
    "AzureDevOpsConnector uses Entra token from linked_accounts.",
    "Workspace bound to Azure DevOps org uses Entra-issued token automatically.",
    "",
    "**Acceptance criteria:**",
    "- Workspace can be bound to Azure DevOps org via Entra-issued token",
    "- No token cross-contamination between providers",
    "",
    "**Effort:** L (3 days)"
)) @("domain:identity","P1-high","enhancement","tech") $ms105

New-Issue "ID-2.2.3 - Entra group claims map to platform roles" (B @(
    "**Epic:** #$e22",
    "**Milestone:** M-INFRA-2b",
    "",
    "Support ENTRA_ADMIN_GROUP_ID env var that maps Entra group membership to admin platform role.",
    "Claim: groups[] in OIDC token matched against env var values.",
    "",
    "**Acceptance criteria:**",
    "- ENTRA_ADMIN_GROUP_ID env var maps Entra group to admin role",
    "- Group membership checked on login and re-validated on token refresh",
    "",
    "**Effort:** M (2 days)"
)) @("domain:identity","P1-high","enhancement","tech") $ms105

# ── M-INFRA-2c ──────────────────────────────────────
Write-Host "`n-- M-INFRA-2c (MCP Workload Identity) --"

$e31 = New-Issue "Epic: Agent Workload Identity Catalog" (B @(
    "## Epic 3.1 - Agent Workload Identity Catalog",
    "**Milestone:** M-INFRA-2c - Agent Workload Identity",
    "**Domain:** Identity & Authentication (Domain 02, Phase 3)",
    "",
    "Per-agent-role app registrations, consent tracking, and WorkloadIdentityService.",
    "",
    "### Issues",
    "- [ ] AgentWorkloadIdentity schema + DB table",
    "- [ ] WorkloadIdentityService with plan/bootstrap/consentStatus/validate",
    "- [ ] Identity CLI commands (plan, bootstrap, consent status)"
)) @("epic","domain:identity","P0-critical","enhancement") $ms112

New-Issue "ID-3.1.1 - AgentWorkloadIdentity schema and DB table" (B @(
    "**Epic:** #$e31",
    "**Milestone:** M-INFRA-2c",
    "",
    "Create agent_workload_identities table with columns:",
    "agent_role, app_registration_id, service_principal_id, tenant_id,",
    "consent_status, credential_type, credential_expires_at, last_validated, effective_enabled",
    "",
    "TypeScript types: AgentRoleId, ConsentStatus, CredentialType, AgentWorkloadIdentity",
    "",
    "**Acceptance criteria:**",
    "- Schema migration runs clean",
    "- CRUD operations tested",
    "- effectiveEnabled formula implemented (9 conditions ANDed)",
    "",
    "**Effort:** M (2 days)"
)) @("domain:identity","P0-critical","enhancement","tech") $ms112

New-Issue "ID-3.1.2 - WorkloadIdentityService with plan/bootstrap/consentStatus/validate methods" (B @(
    "**Epic:** #$e31",
    "**Milestone:** M-INFRA-2c",
    "",
    "Create WorkloadIdentityService with four methods:",
    "- plan(): list required app registrations by agent role",
    "- bootstrap(): create or register Entra app registrations",
    "- consentStatus(): validate per-agent operational readiness",
    "- validate(): check effectiveEnabled for a given agent role",
    "",
    "**Acceptance criteria:**",
    "- Each method returns structured result matching CLI output surface",
    "- bootstrap() is idempotent",
    "",
    "**Effort:** L (3-4 days)"
)) @("domain:identity","P0-critical","enhancement","tech") $ms112

New-Issue "ID-3.1.3 - Identity CLI commands: plan, bootstrap, consent status" (B @(
    "**Epic:** #$e31",
    "**Milestone:** M-INFRA-2c",
    "",
    "Implement three CLI commands:",
    "- npx my-plugin identity plan: prints required app registrations per agent role",
    "- npx my-plugin identity bootstrap: creates or registers Entra objects",
    "- npx my-plugin identity consent status: validates per-agent operational readiness",
    "",
    "**Acceptance criteria:**",
    "- All three commands runnable",
    "- Output matches AgentWorkloadIdentity schema",
    "- bootstrap is idempotent",
    "",
    "**Effort:** L (4 days)"
)) @("domain:identity","P0-critical","enhancement","tech") $ms112

$e32 = New-Issue "Epic: Consent Lifecycle Management" (B @(
    "## Epic 3.2 - Consent Lifecycle",
    "**Milestone:** M-INFRA-2c - Agent Workload Identity",
    "**Domain:** Identity & Authentication (Domain 02, Phase 3)",
    "",
    "ConsentCenter UI, enforcement in agent execution, automated expiry detection.",
    "",
    "### Issues",
    "- [ ] ConsentCenter admin page per-agent-role consent status",
    "- [ ] Consent state in effectiveEnabled formula",
    "- [ ] Automated consent expiry detection cron"
)) @("epic","domain:identity","P0-critical","enhancement") $ms112

New-Issue "ID-3.2.1 - ConsentCenter admin page: per-agent-role consent status" (B @(
    "**Epic:** #$e32",
    "**Milestone:** M-INFRA-2c",
    "",
    "Admin page at /admin/identity/consent showing all agent roles with current consent_status.",
    "Actions: grant consent (opens Entra admin consent URL), revoke, refresh status.",
    "Distinguish user_consent vs admin_consent required per permission.",
    "",
    "**Acceptance criteria:**",
    "- Table shows all agent roles with consent_status",
    "- Grant and revoke actions work",
    "- Clear visual distinction between user and admin consent requirements",
    "",
    "**Effort:** M (2-3 days)"
)) @("domain:identity","P0-critical","enhancement","ux","ui") $ms112

New-Issue "ID-3.2.2 - Consent state in effectiveEnabled: block agent if ConsentPending" (B @(
    "**Epic:** #$e32",
    "**Milestone:** M-INFRA-2c",
    "",
    "Include consent_granted check in effectiveEnabled formula.",
    "Agent invocation where consent_status = pending_consent returns 403 with CONSENT_PENDING reason.",
    "",
    "**Acceptance criteria:**",
    "- Agent with ConsentPending status returns 403 when invoked",
    "- Error includes reason code CONSENT_PENDING and link to ConsentCenter",
    "",
    "**Effort:** M (2 days)"
)) @("domain:identity","P0-critical","security","tech") $ms112

New-Issue "ID-3.2.3 - Automated consent expiry detection (24h cron)" (B @(
    "**Epic:** #$e32",
    "**Milestone:** M-INFRA-2c",
    "",
    "Cron-style health check runs every 24h.",
    "Checks credential_expires_at for all agent workload identities.",
    "Sets consent_status to auth_pending when credential expires.",
    "Notifies admin via SSE event when any identity transitions to auth_pending.",
    "",
    "**Acceptance criteria:**",
    "- Cron updates DB status within 24h of expiry",
    "- Notification fires on status transition",
    "- No impact on identities with no expiry set",
    "",
    "**Effort:** M (2 days)"
)) @("domain:identity","P1-high","enhancement","tech") $ms112

$e33 = New-Issue "Epic: Agent Identity Governance UI Screens" (B @(
    "## Epic 3.3 - Identity Governance UI Screens",
    "**Milestone:** M-INFRA-2c - Agent Workload Identity",
    "**Domain:** Identity & Authentication (Domain 02, Phase 3)",
    "",
    "Four admin screens for identity governance: Catalog, Permission Diff, Credential Health, Audit Trail.",
    "",
    "### Issues",
    "- [ ] Agent Identity Catalog screen",
    "- [ ] Permission Diff screen (desired vs actual)",
    "- [ ] Credential Health screen",
    "- [ ] Identity Audit Trail"
)) @("epic","domain:identity","P1-high","enhancement") $ms112

New-Issue "ID-3.3.1 - Agent Identity Catalog screen" (B @(
    "**Epic:** #$e33",
    "**Milestone:** M-INFRA-2c",
    "",
    "Admin screen at /admin/identity/catalog showing per-agent-role:",
    "app_registration_id, service_principal_id, credential_type, effective_enabled status.",
    "",
    "**Effort:** M (2 days)"
)) @("domain:identity","P1-high","enhancement","ux","ui") $ms112

New-Issue "ID-3.3.2 - Permission Diff screen: desired vs actual API permissions" (B @(
    "**Epic:** #$e33",
    "**Milestone:** M-INFRA-2c",
    "",
    "Admin screen showing diff between desired API permissions (from code) and actual permissions granted",
    "in Azure Entra per agent role. Highlights missing or excess permissions.",
    "",
    "**Effort:** M (2 days)"
)) @("domain:identity","P1-high","enhancement","ux","ui") $ms112

New-Issue "ID-3.3.3 - Credential Health screen: expiry and federation settings" (B @(
    "**Epic:** #$e33",
    "**Milestone:** M-INFRA-2c",
    "",
    "Admin screen showing per-agent credential health:",
    "- Certificate expiry dates with warning threshold (30 days)",
    "- Federation settings status",
    "- Secret exceptions (flagged when using client secret instead of cert/federation)",
    "",
    "**Effort:** M (2 days)"
)) @("domain:identity","P1-high","enhancement","ux","ui") $ms112

New-Issue "ID-3.3.4 - Identity Audit Trail" (B @(
    "**Epic:** #$e33",
    "**Milestone:** M-INFRA-2c",
    "",
    "Audit trail recording every identity lifecycle event: activation, change, revocation.",
    "Fields: timestamp, actor (user/system), agent_role, action, previous_status, new_status.",
    "",
    "**Effort:** S (1 day)"
)) @("domain:identity","P1-high","enhancement","tech") $ms112

Write-Host "`nDomain 02 complete!" -ForegroundColor Cyan
