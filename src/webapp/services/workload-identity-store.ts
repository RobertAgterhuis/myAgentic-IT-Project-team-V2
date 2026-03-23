// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Workload Identity Store - Database layer for AgentWorkloadIdentity
 * Extends auth persistence with workload identity schema, CRUD, and governance views.
 *
 * @module webapp/services/workload-identity-store
 */

import type Database from 'better-sqlite3';
import type {
  AgentWorkloadIdentity,
  AgentRoleId,
  AuditTrailEntry,
  ConsentCenterEntry,
  ConsentStatus,
  CredentialHealthEntry,
  IdentityCatalogEntry,
  PermissionDiffEntry,
  RequiredPermission,
} from '../plugins/identity/workload-identity-types';
import {
  isEffectivelyEnabled,
  WORKLOAD_IDENTITY_MIGRATIONS,
} from '../plugins/identity/workload-identity-types';

type SqlRow = Record<string, unknown>;

export class WorkloadIdentityStore {
  constructor(private readonly db: Database.Database) {}

  /** Initialize workload identity schema (idempotent). */
  migrate(): void {
    this.db.exec(WORKLOAD_IDENTITY_MIGRATIONS.createTable);
    this.db.exec(WORKLOAD_IDENTITY_MIGRATIONS.createAuditTable);
  }

  /** Get identity by agent role. */
  getIdentity(agentRole: AgentRoleId): AgentWorkloadIdentity | null {
    try {
      const row = this.db
        .prepare('SELECT * FROM agent_workload_identities WHERE agent_role = ?')
        .get(agentRole) as SqlRow | undefined;
      return row ? this._rowToIdentity(row) : null;
    } catch {
      return null;
    }
  }

  /** List all identities. */
  listIdentities(): AgentWorkloadIdentity[] {
    try {
      const rows = this.db.prepare('SELECT * FROM agent_workload_identities').all() as SqlRow[];
      return rows.map((row) => this._rowToIdentity(row));
    } catch {
      return [];
    }
  }

  /** Create or update an identity row (upsert semantics). */
  createOrUpdateIdentity(identity: AgentWorkloadIdentity): AgentWorkloadIdentity {
    const effectiveEnabled = isEffectivelyEnabled(identity);

    this.db
      .prepare(
        `INSERT INTO agent_workload_identities (
          id,
          agent_role,
          app_registration_id,
          app_registration_name,
          service_principal_id,
          tenant_id,
          required_permissions,
          consent_status,
          credential_type,
          credential_expires_at,
          effective_enabled,
          last_validated,
          created_at,
          updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
        ON CONFLICT(agent_role) DO UPDATE SET
          app_registration_id = excluded.app_registration_id,
          app_registration_name = excluded.app_registration_name,
          service_principal_id = excluded.service_principal_id,
          tenant_id = excluded.tenant_id,
          required_permissions = excluded.required_permissions,
          consent_status = excluded.consent_status,
          credential_type = excluded.credential_type,
          credential_expires_at = excluded.credential_expires_at,
          effective_enabled = excluded.effective_enabled,
          last_validated = excluded.last_validated,
          updated_at = excluded.updated_at`
      )
      .run(
        identity.id,
        identity.agent_role,
        identity.app_registration_id,
        identity.app_registration_name,
        identity.service_principal_id,
        identity.tenant_id,
        JSON.stringify(identity.required_permissions || []),
        identity.consent_status,
        identity.credential_type,
        identity.credential_expires_at,
        effectiveEnabled ? 1 : 0,
        identity.last_validated,
        identity.created_at,
        identity.updated_at
      );

    return {
      ...identity,
      effective_enabled: effectiveEnabled,
    };
  }

  /** Delete identity by role. */
  deleteIdentity(agentRole: AgentRoleId): boolean {
    try {
      const result = this.db
        .prepare('DELETE FROM agent_workload_identities WHERE agent_role = ?')
        .run(agentRole);
      return result.changes > 0;
    } catch {
      return false;
    }
  }

  /** Update consent status and recompute effective_enabled. */
  setConsentStatus(agentRole: AgentRoleId, status: ConsentStatus): AgentWorkloadIdentity | null {
    try {
      const current = this.getIdentity(agentRole);
      if (!current) return null;

      const updated: AgentWorkloadIdentity = {
        ...current,
        consent_status: status,
      };
      updated.effective_enabled = isEffectivelyEnabled(updated);

      this.db
        .prepare(
          `UPDATE agent_workload_identities
           SET consent_status = ?, effective_enabled = ?, updated_at = datetime('now')
           WHERE agent_role = ?`
        )
        .run(status, updated.effective_enabled ? 1 : 0, agentRole);

      this.recordAuditEvent(
        agentRole,
        status === 'consent_granted' ? 'consent_granted' : 'changed',
        'system',
        current.consent_status,
        status
      );

      return this.getIdentity(agentRole);
    } catch {
      return null;
    }
  }

  /** Update credential expiry and auto-transition to auth_pending on expiry. */
  setCredentialExpiry(agentRole: AgentRoleId, expiresAt: string): AgentWorkloadIdentity | null {
    try {
      const current = this.getIdentity(agentRole);
      if (!current) return null;

      const updated: AgentWorkloadIdentity = {
        ...current,
        credential_expires_at: expiresAt,
      };
      const expiresDate = new Date(expiresAt);
      const now = new Date();

      let newConsentStatus = current.consent_status;
      if (expiresDate < now && current.consent_status === 'consent_granted') {
        newConsentStatus = 'auth_pending';
      }

      updated.effective_enabled = isEffectivelyEnabled({
        ...updated,
        consent_status: newConsentStatus,
      });

      this.db
        .prepare(
          `UPDATE agent_workload_identities
           SET credential_expires_at = ?, consent_status = ?, effective_enabled = ?, updated_at = datetime('now')
           WHERE agent_role = ?`
        )
        .run(expiresAt, newConsentStatus, updated.effective_enabled ? 1 : 0, agentRole);

      if (newConsentStatus !== current.consent_status) {
        this.recordAuditEvent(
          agentRole,
          'credential_rotated',
          'system',
          current.consent_status,
          newConsentStatus
        );
      }

      return this.getIdentity(agentRole);
    } catch {
      return null;
    }
  }

  /** Consent Center view (all identities + consent metadata). */
  getConsentCenterData(): ConsentCenterEntry[] {
    try {
      const rows = this.db.prepare('SELECT * FROM agent_workload_identities').all() as SqlRow[];
      return rows.map((row) => {
        const identity = this._rowToIdentity(row);
        return {
          agent_role: identity.agent_role,
          consent_status: identity.consent_status,
          credential_type: identity.credential_type,
          credential_expires_at: identity.credential_expires_at,
          requires_admin_consent: identity.required_permissions.some(
            (permission) => permission.permissionType === 'application'
          ),
          user_consents_required: identity.required_permissions
            .filter((permission) => permission.permissionType === 'delegated')
            .map((permission) => permission.scope),
          effective_enabled: identity.effective_enabled,
          last_check: identity.last_validated,
        };
      });
    } catch {
      return [];
    }
  }

  /** Identity catalog view. */
  getIdentityCatalogData(): IdentityCatalogEntry[] {
    try {
      const rows = this.db.prepare('SELECT * FROM agent_workload_identities').all() as SqlRow[];
      return rows.map((row) => ({
        agent_role: this._asAgentRoleId(row.agent_role),
        app_registration_id: this._asString(row.app_registration_id),
        service_principal_id: this._asString(row.service_principal_id),
        credential_type: this._asCredentialType(row.credential_type),
        effective_enabled: this._asBoolean(row.effective_enabled),
      }));
    } catch {
      return [];
    }
  }

  /** Permission diff view (desired vs actual). */
  getPermissionDiff(): PermissionDiffEntry[] {
    try {
      const rows = this.db.prepare('SELECT * FROM agent_workload_identities').all() as SqlRow[];
      return rows.map((row) => {
        const desired = this._asRequiredPermissions(row.required_permissions);
        const actual = desired.map((permission) => permission.scope);
        return {
          agent_role: this._asAgentRoleId(row.agent_role),
          desired_permissions: desired,
          actual_permissions: actual,
          missing_permissions: [],
          excess_permissions: [],
        };
      });
    } catch {
      return [];
    }
  }

  /** Credential health view. */
  getCredentialHealth(): CredentialHealthEntry[] {
    try {
      const rows = this.db.prepare('SELECT * FROM agent_workload_identities').all() as SqlRow[];
      const now = new Date();
      const expiryThresholdDays = 30;

      return rows.map((row) => {
        const credentialExpiresAt = this._asNullableString(row.credential_expires_at);
        const expiresAt = credentialExpiresAt ? new Date(credentialExpiresAt) : null;
        const daysUntilExpiry = expiresAt
          ? Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        let health: CredentialHealthEntry['health_status'] = 'healthy';
        if (expiresAt && expiresAt < now) {
          health = 'critical';
        } else if (daysUntilExpiry !== null && daysUntilExpiry < expiryThresholdDays) {
          health = 'warning';
        }

        const credentialType = this._asCredentialType(row.credential_type);

        return {
          agent_role: this._asAgentRoleId(row.agent_role),
          credential_type: credentialType,
          credential_expires_at: credentialExpiresAt,
          expiry_warning_threshold: expiryThresholdDays,
          days_until_expiry: daysUntilExpiry,
          federation_configured: credentialType === 'workload_federation',
          is_using_client_secret: credentialType === 'client_secret',
          health_status: health,
        };
      });
    } catch {
      return [];
    }
  }

  /** Audit trail view. */
  getAuditTrail(agentRole?: AgentRoleId, limit = 100): AuditTrailEntry[] {
    try {
      const query = agentRole
        ? 'SELECT * FROM identity_audit_trail WHERE agent_role = ? ORDER BY created_at DESC LIMIT ?'
        : 'SELECT * FROM identity_audit_trail ORDER BY created_at DESC LIMIT ?';

      const rows = agentRole
        ? (this.db.prepare(query).all(agentRole, limit) as SqlRow[])
        : (this.db.prepare(query).all(limit) as SqlRow[]);

      return rows.map((row) => ({
        id: this._asString(row.id),
        agent_role: this._asAgentRoleId(row.agent_role),
        event_type: this._asAuditEventType(row.event_type),
        actor_type: this._asActorType(row.actor_type),
        actor: this._asString(row.actor),
        previous_status: this._asConsentStatus(row.previous_status),
        new_status: this._asConsentStatus(row.new_status),
        metadata: this._asObject(row.metadata),
        created_at: this._asString(row.created_at),
      }));
    } catch {
      return [];
    }
  }

  /** Record an immutable audit event. */
  recordAuditEvent(
    agentRole: AgentRoleId,
    eventType: AuditTrailEntry['event_type'],
    actor: string,
    previousStatus: ConsentStatus,
    newStatus: ConsentStatus,
    metadata?: Record<string, unknown>
  ): void {
    try {
      const id = `audit-${agentRole}-${Date.now()}`;
      this.db
        .prepare(
          `INSERT INTO identity_audit_trail
           (id, agent_role, event_type, actor_type, actor, previous_status, new_status, metadata)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          agentRole,
          eventType,
          'system',
          actor,
          previousStatus,
          newStatus,
          JSON.stringify(metadata || {})
        );
    } catch {
      // intentionally no-op: audit write should not block runtime flow
    }
  }

  /** 24h cron-compatible credential expiry check. */
  checkExpiredCredentials(): { updated: number; transitioned: string[] } {
    try {
      const rows = this.db.prepare('SELECT * FROM agent_workload_identities').all() as SqlRow[];
      const now = new Date();
      let updated = 0;
      const transitioned: string[] = [];

      for (const row of rows) {
        const role = this._asAgentRoleId(row.agent_role);
        const expiresRaw = this._asNullableString(row.credential_expires_at);
        if (!expiresRaw) continue;

        const expiresAt = new Date(expiresRaw);
        const status = this._asConsentStatus(row.consent_status);
        if (expiresAt < now && status === 'consent_granted') {
          this.db
            .prepare(
              `UPDATE agent_workload_identities
               SET consent_status = ?, effective_enabled = 0, updated_at = datetime('now')
               WHERE agent_role = ?`
            )
            .run('auth_pending', role);

          this.recordAuditEvent(
            role,
            'changed',
            'cron-health-check',
            'consent_granted',
            'auth_pending',
            {
              reason: 'credential_expired',
            }
          );

          updated += 1;
          transitioned.push(role);
        }
      }

      return { updated, transitioned };
    } catch {
      return { updated: 0, transitioned: [] };
    }
  }

  /* ── Internal helpers ─────────────────────────────────────── */

  private _rowToIdentity(row: SqlRow): AgentWorkloadIdentity {
    return {
      id: this._asString(row.id),
      agent_role: this._asAgentRoleId(row.agent_role),
      app_registration_id: this._asString(row.app_registration_id),
      app_registration_name: this._asString(row.app_registration_name),
      service_principal_id: this._asString(row.service_principal_id),
      tenant_id: this._asString(row.tenant_id),
      required_permissions: this._asRequiredPermissions(row.required_permissions),
      consent_status: this._asConsentStatus(row.consent_status),
      credential_type: this._asCredentialType(row.credential_type),
      credential_expires_at: this._asNullableString(row.credential_expires_at),
      effective_enabled: this._asBoolean(row.effective_enabled),
      last_validated: this._asString(row.last_validated),
      created_at: this._asString(row.created_at),
      updated_at: this._asString(row.updated_at),
    };
  }

  private _asString(value: unknown): string {
    return typeof value === 'string' ? value : String(value ?? '');
  }

  private _asNullableString(value: unknown): string | null {
    if (value === null || value === undefined || value === '') return null;
    return this._asString(value);
  }

  private _asBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    return String(value) === '1' || String(value).toLowerCase() === 'true';
  }

  private _asObject(value: unknown): Record<string, unknown> {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown;
        return typeof parsed === 'object' && parsed !== null
          ? (parsed as Record<string, unknown>)
          : {};
      } catch {
        return {};
      }
    }

    if (typeof value === 'object' && value !== null) {
      return value as Record<string, unknown>;
    }

    return {};
  }

  private _asRequiredPermissions(value: unknown): RequiredPermission[] {
    const parsed = this._asObjectOrArray(value);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((entry) => typeof entry === 'object' && entry !== null)
      .map((entry) => {
        const candidate = entry as Record<string, unknown>;
        const permissionType =
          candidate.permissionType === 'application' ? 'application' : 'delegated';
        return {
          scope: this._asString(candidate.scope),
          permissionType,
          reason: this._asString(candidate.reason),
        } as RequiredPermission;
      })
      .filter((permission) => permission.scope.length > 0);
  }

  private _asObjectOrArray(value: unknown): unknown {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as unknown;
      } catch {
        return [];
      }
    }
    return value;
  }

  private _asAgentRoleId(value: unknown): AgentRoleId {
    const role = this._asString(value);
    const allowed: AgentRoleId[] = [
      'orchestrator',
      'product',
      'architect',
      'developer',
      'ui',
      'qa',
      'devops',
      'infra',
      'security',
      'data',
      'documentation',
      'sre',
    ];
    return (allowed.includes(role as AgentRoleId) ? role : 'orchestrator') as AgentRoleId;
  }

  private _asConsentStatus(value: unknown): ConsentStatus {
    const status = this._asString(value);
    const allowed: ConsentStatus[] = [
      'not_configured',
      'pending_consent',
      'consent_granted',
      'consent_revoked',
      'auth_pending',
      'blocked_by_policy',
    ];
    return (allowed.includes(status as ConsentStatus) ? status : 'not_configured') as ConsentStatus;
  }

  private _asCredentialType(value: unknown): AgentWorkloadIdentity['credential_type'] {
    const credentialType = this._asString(value);
    const allowed: AgentWorkloadIdentity['credential_type'][] = [
      'managed_identity',
      'workload_federation',
      'certificate',
      'client_secret',
    ];
    return (
      allowed.includes(credentialType as AgentWorkloadIdentity['credential_type'])
        ? credentialType
        : 'managed_identity'
    ) as AgentWorkloadIdentity['credential_type'];
  }

  private _asAuditEventType(value: unknown): AuditTrailEntry['event_type'] {
    const eventType = this._asString(value);
    const allowed: AuditTrailEntry['event_type'][] = [
      'activated',
      'changed',
      'revoked',
      'consent_granted',
      'consent_revoked',
      'credential_rotated',
    ];
    return (
      allowed.includes(eventType as AuditTrailEntry['event_type']) ? eventType : 'changed'
    ) as AuditTrailEntry['event_type'];
  }

  private _asActorType(value: unknown): AuditTrailEntry['actor_type'] {
    const actorType = this._asString(value);
    return actorType === 'human' ? 'human' : 'system';
  }
}
