// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Agent Workload Identity Types & Schema
 * Per-agent-role Entra app registrations, consent lifecycle, credential management.
 *
 * @module plugins/identity/workload-identity-types
 */

export type AgentRoleId =
  | 'orchestrator'
  | 'product'
  | 'architect'
  | 'developer'
  | 'ui'
  | 'qa'
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
  | 'auth_pending'
  | 'blocked_by_policy';

export type CredentialType =
  | 'managed_identity'
  | 'workload_federation'
  | 'certificate'
  | 'client_secret';

export interface RequiredPermission {
  scope: string;
  permissionType: 'delegated' | 'application';
  reason: string;
}

export interface AgentWorkloadIdentity {
  id: string;
  agent_role: AgentRoleId;
  app_registration_id: string;
  app_registration_name: string;
  service_principal_id: string;
  tenant_id: string;
  required_permissions: RequiredPermission[];
  consent_status: ConsentStatus;
  credential_type: CredentialType;
  credential_expires_at: string | null;
  effective_enabled: boolean;
  last_validated: string;
  created_at: string;
  updated_at: string;
}

export interface ConsentCenterEntry {
  agent_role: AgentRoleId;
  consent_status: ConsentStatus;
  credential_type: CredentialType;
  credential_expires_at: string | null;
  requires_admin_consent: boolean;
  user_consents_required: string[];
  effective_enabled: boolean;
  last_check: string;
}

export interface IdentityCatalogEntry {
  agent_role: AgentRoleId;
  app_registration_id: string;
  service_principal_id: string;
  credential_type: CredentialType;
  effective_enabled: boolean;
}

export interface PermissionDiffEntry {
  agent_role: AgentRoleId;
  desired_permissions: RequiredPermission[];
  actual_permissions: string[];
  missing_permissions: RequiredPermission[];
  excess_permissions: string[];
}

export interface CredentialHealthEntry {
  agent_role: AgentRoleId;
  credential_type: CredentialType;
  credential_expires_at: string | null;
  expiry_warning_threshold: number; // days
  days_until_expiry: number | null;
  federation_configured: boolean;
  is_using_client_secret: boolean;
  health_status: 'healthy' | 'warning' | 'critical';
}

export interface AuditTrailEntry {
  id: string;
  agent_role: AgentRoleId;
  event_type:
    | 'activated'
    | 'changed'
    | 'revoked'
    | 'consent_granted'
    | 'consent_revoked'
    | 'credential_rotated';
  actor_type: 'human' | 'system';
  actor: string;
  previous_status: ConsentStatus;
  new_status: ConsentStatus;
  metadata: Record<string, unknown>;
  created_at: string;
}

// effectiveEnabled formula:
// = (registryAvailable)
// && (tenantEnabled)
// && (workspaceEnabled)
// && (agentPolicyAllows)
// && (consentGranted)
// && (servicePrincipalReady)
// && (credentialPolicyValid)
// && (credentialNotExpired)
// && (healthOk)

export function isEffectivelyEnabled(identity: AgentWorkloadIdentity): boolean {
  const registryAvailable = true;
  const tenantEnabled = identity.tenant_id.trim().length > 0;
  const workspaceEnabled = true;
  const agentPolicyAllows = identity.consent_status !== 'blocked_by_policy';
  const consentGranted = identity.consent_status === 'consent_granted';
  const servicePrincipalReady = identity.service_principal_id.trim().length > 0;
  const credentialPolicyValid = identity.credential_type.trim().length > 0;
  const credentialNotExpired =
    !identity.credential_expires_at || new Date(identity.credential_expires_at) >= new Date();
  const healthOk = identity.consent_status !== 'auth_pending';

  return (
    registryAvailable &&
    tenantEnabled &&
    workspaceEnabled &&
    agentPolicyAllows &&
    consentGranted &&
    servicePrincipalReady &&
    credentialPolicyValid &&
    credentialNotExpired &&
    healthOk
  );
}

export const WORKLOAD_IDENTITY_MIGRATIONS = {
  createTable: `
    CREATE TABLE IF NOT EXISTS agent_workload_identities (
      id TEXT PRIMARY KEY NOT NULL,
      agent_role TEXT NOT NULL UNIQUE CHECK(agent_role IN (
        'orchestrator', 'product', 'architect', 'developer', 'ui', 'qa',
        'devops', 'infra', 'security', 'data', 'documentation', 'sre'
      )),
      app_registration_id TEXT NOT NULL,
      app_registration_name TEXT NOT NULL,
      service_principal_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      required_permissions JSON DEFAULT '[]',
      consent_status TEXT NOT NULL DEFAULT 'not_configured' CHECK(consent_status IN (
        'not_configured', 'pending_consent', 'consent_granted',
        'consent_revoked', 'auth_pending', 'blocked_by_policy'
      )),
      credential_type TEXT NOT NULL CHECK(credential_type IN (
        'managed_identity', 'workload_federation', 'certificate', 'client_secret'
      )),
      credential_expires_at TEXT,
      effective_enabled INTEGER NOT NULL DEFAULT 0,
      last_validated TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `,

  createAuditTable: `
    CREATE TABLE IF NOT EXISTS identity_audit_trail (
      id TEXT PRIMARY KEY NOT NULL,
      agent_role TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK(event_type IN (
        'activated', 'changed', 'revoked', 'consent_granted', 'consent_revoked', 'credential_rotated'
      )),
      actor_type TEXT NOT NULL CHECK(actor_type IN ('human', 'system')),
      actor TEXT NOT NULL,
      previous_status TEXT NOT NULL,
      new_status TEXT NOT NULL,
      metadata JSON DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(agent_role) REFERENCES agent_workload_identities(agent_role)
    );
  `,
};
