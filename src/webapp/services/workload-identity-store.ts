// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Workload Identity Store - Database layer for AgentWorkloadIdentity
 * Extends AuthStore with workload identity schema, queries, and operations.
 *
 * @module webapp/services/workload-identity-store
 */

import type Database from 'better-sqlite3';
import type {
  AgentWorkloadIdentity,
  AgentRoleId,
  ConsentStatus,
  CredentialType,
  AuditTrailEntry,
  ConsentCenterEntry,
  IdentityCatalogEntry,
  PermissionDiffEntry,
  CredentialHealthEntry,
} from '../plugins/identity/workload-identity-types';
import { isEffectivelyEnabled, WORKLOAD_IDENTITY_MIGRATIONS } from '../plugins/identity/workload-identity-types';

export class WorkloadIdentityStore {
  constructor(private db: Database.Database) {}

  /**
   * Initialize workload identity schema (idempotent)
   */
  migrate(): void {
    this.db.exec(WORKLOAD_IDENTITY_MIGRATIONS.createTable);
    this.db.exec(WORKLOAD_IDENTITY_MIGRATIONS.createAuditTable);
  }

  /**
   * Get identity by agent role
   */
  getIdentity(agentRole: AgentRoleId): AgentWorkloadIdentity | null {
    try {
      const row = this.db
        .prepare('SELECT * FROM agent_workload_identities WHERE agent_role = ?')
        .get(agentRole);
      return row ? this._rowToIdentity(row) : null;
    } catch {
      return null;
    }
  }

  /**
   * List all identities
   */
  listIdentities(): AgentWorkloadIdentity[] {
    try {
      const rows = this.db.prepare('SELECT * FROM agent_workload_identities').all();
      return rows.map((row: any) => this._rowToIdentity(row));
    } catch {
      return [];
    }
  }

  /**
   * Update consent status (and effective_enabled)
   */
  setConsentStatus(agentRole: AgentRoleId, status: ConsentStatus): AgentWorkloadIdentity | null {
    try {
      const current = this.getIdentity(agentRole);
      if (!current) return null;

      const updated: AgentWorkloadIdentity = { ...current, consent_status: status };
      updated.effective_enabled = isEffectivelyEnabled(updated);

      this.db
        .prepare(
          `UPDATE agent_workload_identities
         SET consent_status = ?, effective_enabled = ?, updated_at = datetime('now')
         WHERE agent_role = ?`
        )
        .run(status, updated.effective_enabled ? 1 : 0, agentRole);

      // Record audit event
      this.recordAuditEvent(agentRole, 'consent_granted', 'system', current.consent_status, status);

      return this.getIdentity(agentRole);
    } catch {
      return null;
    }
  }

  /**
   * Update credential expiry and check health
   */
  setCredentialExpiry(agentRole: AgentRoleId, expiresAt: string): AgentWorkloadIdentity | null {
    try {
      const current = this.getIdentity(agentRole);
      if (!current) return null;

      const updated: AgentWorkloadIdentity = { ...current, credential_expires_at: expiresAt };
      const expiresDate = new Date(expiresAt);
      const now = new Date();

      // If credential already expired, set to auth_pending
      let newConsentStatus = current.consent_status;
      if (expiresDate < now && current.consent_status === 'consent_granted') {
        newConsentStatus = 'auth_pending';
      }

      updated.effective_enabled = isEffectivelyEnabled({ ...updated, consent_status: newConsentStatus });

      this.db
        .prepare(
          `UPDATE agent_workload_identities
         SET credential_expires_at = ?, consent_status = ?, effective_enabled = ?, updated_at = datetime('now')
         WHERE agent_role = ?`
        )
        .run(expiresAt, newConsentStatus, updated.effective_enabled ? 1 : 0, agentRole);

      if (newConsentStatus !== current.consent_status) {
        this.recordAuditEvent(agentRole, 'credential_rotated', 'system', current.consent_status, newConsentStatus);
      }

      return this.getIdentity(agentRole);
    } catch {
      return null;
    }
  }

  /**
   * Get Consent Center view (all identities with status)
   */
  getConsentCenterData(): ConsentCenterEntry[] {
    try {
      const rows = this.db.prepare('SELECT * FROM agent_workload_identities').all();
      return rows.map((row: any) => {
        const identity = this._rowToIdentity(row);
        return {
          agent_role: identity.agent_role,
          consent_status: identity.consent_status,
          credential_type: identity.credential_type,
          credential_expires_at: identity.credential_expires_at,
          requires_admin_consent: true,
          user_consents_required: [],
          effective_enabled: identity.effective_enabled,
          last_check: identity.last_validated,
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Get Identity Catalog view
   */
  getIdentityCatalogData(): IdentityCatalogEntry[] {
    try {
      const rows = this.db.prepare('SELECT * FROM agent_workload_identities').all();
      return rows.map((row: any) => ({
        agent_role: row.agent_role,
        app_registration_id: row.app_registration_id,
        service_principal_id: row.service_principal_id,
        credential_type: row.credential_type,
        effective_enabled: !!row.effective_enabled,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get Credential Health view
   */
  getCredentialHealth(): CredentialHealthEntry[] {
    try {
      const rows = this.db.prepare('SELECT * FROM agent_workload_identities').all();
      const now = new Date();
      const EXPIRY_THRESHOLD_DAYS = 30;

      return rows.map((row: any) => {
        const expiresAt = row.credential_expires_at ? new Date(row.credential_expires_at) : null;
        const daysUntilExpiry = expiresAt ? Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

        let health = 'healthy';
        if (expiresAt && expiresAt < now) {
          health = 'critical';
        } else if (daysUntilExpiry && daysUntilExpiry < EXPIRY_THRESHOLD_DAYS) {
          health = 'warning';
        }

        return {
          agent_role: row.agent_role,
          credential_type: row.credential_type,
          credential_expires_at: row.credential_expires_at,
          expiry_warning_threshold: EXPIRY_THRESHOLD_DAYS,
          days_until_expiry: daysUntilExpiry,
          federation_configured: row.credential_type === 'workload_federation',
          is_using_client_secret: row.credential_type === 'client_secret',
          health_status: health as any,
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Get Audit Trail view
   */
  getAuditTrail(agentRole?: AgentRoleId, limit = 100): AuditTrailEntry[] {
    try {
      const query = agentRole
        ? 'SELECT * FROM identity_audit_trail WHERE agent_role = ? ORDER BY created_at DESC LIMIT ?'
        : 'SELECT * FROM identity_audit_trail ORDER BY created_at DESC LIMIT ?';

      const rows = agentRole ? this.db.prepare(query).all(agentRole, limit) : this.db.prepare(query).all(limit);

      return rows.map((row: any) => ({
        id: row.id,
        agent_role: row.agent_role,
        event_type: row.event_type,
        actor_type: row.actor_type,
        actor: row.actor,
        previous_status: row.previous_status,
        new_status: row.new_status,
        metadata: JSON.parse(row.metadata || '{}'),
        created_at: row.created_at,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Record audit event
   */
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
        .run(id, agentRole, eventType, 'system', actor, previousStatus, newStatus, JSON.stringify(metadata || {}));
    } catch {
      // Silently fail audit recording
    }
  }

  /**
   * Check for expired credentials (24h cron)
   */
  checkExpiredCredentials(): { updated: number; transitioned: string[] } {
    try {
      const rows = this.db.prepare('SELECT * FROM agent_workload_identities').all();
      const now = new Date();
      let updated = 0;
      const transitioned: string[] = [];

      for (const row of rows) {
        if (row.credential_expires_at && new Date(row.credential_expires_at) < now) {
          if (row.consent_status === 'consent_granted') {
            // Transition to auth_pending
            this.db
              .prepare(
                `UPDATE agent_workload_identities
               SET consent_status = ?, effective_enabled = 0, updated_at = datetime('now')
               WHERE agent_role = ?`
              )
              .run('auth_pending', row.agent_role);

            this.recordAuditEvent(row.agent_role, 'changed', 'cron-health-check', 'consent_granted', 'auth_pending', {
              reason: 'credential_expired',
            });

            updated++;
            transitioned.push(row.agent_role);
          }
        }
      }

      return { updated, transitioned };
    } catch {
      return { updated: 0, transitioned: [] };
    }
  }

  /* ── Internal helpers ────────────────────────────────────────── */

  private _rowToIdentity(row: any): AgentWorkloadIdentity {
    return {
      id: row.id,
      agent_role: row.agent_role,
      app_registration_id: row.app_registration_id,
      app_registration_name: row.app_registration_name,
      service_principal_id: row.service_principal_id,
      tenant_id: row.tenant_id,
      required_permissions: JSON.parse(row.required_permissions || '[]'),
      consent_status: row.consent_status,
      credential_type: row.credential_type,
      credential_expires_at: row.credential_expires_at,
      effective_enabled: !!row.effective_enabled,
      last_validated: row.last_validated,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
