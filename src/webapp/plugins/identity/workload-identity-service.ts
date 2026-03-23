// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * WorkloadIdentityService - Manages agent workload identity lifecycle
 * Provides plan(), bootstrap(), consentStatus(), and validate() operations.
 *
 * @module plugins/identity/workload-identity-service
 */

import type {
  AgentWorkloadIdentity,
  AgentRoleId,
  ConsentStatus,
  CredentialType,
  RequiredPermission,
  AuditTrailEntry,
} from './workload-identity-types';
import { isEffectivelyEnabled } from './workload-identity-types';

export interface PlanResult {
  success: boolean;
  requiredIdentities: Array<{
    agent_role: AgentRoleId;
    app_registration_name: string;
    required_permissions: RequiredPermission[];
    credential_type: CredentialType;
  }>;
  total_count: number;
}

export interface BootstrapResult {
  success: boolean;
  created: number;
  updated: number;
  failed: Array<{
    agent_role: AgentRoleId;
    error: string;
  }>;
}

export interface ConsentStatusResult {
  agent_role: AgentRoleId;
  consent_status: ConsentStatus;
  app_registration_id: string;
  service_principal_id: string;
  credential_type: CredentialType;
  credential_expires_at: string | null;
  effective_enabled: boolean;
  warning?: string;
}

export interface ValidationResult {
  agent_role: AgentRoleId;
  effective_enabled: boolean;
  reasons: string[];
}

export class WorkloadIdentityService {
  constructor(private db: any, private projectRoot: string) {}

  /**
   * Plan: List required app registrations per agent role
   */
  plan(): PlanResult {
    const requiredIdentities: PlanResult['requiredIdentities'] = [
      {
        agent_role: 'orchestrator',
        app_registration_name: 'Agentic-Orchestrator',
        required_permissions: [],
        credential_type: 'managed_identity',
      },
      {
        agent_role: 'infra',
        app_registration_name: 'Agentic-Infra',
        required_permissions: [
          {
            scope: 'https://management.azure.com/.default',
            permissionType: 'application',
            reason: 'Azure resource management',
          },
        ],
        credential_type: 'workload_federation',
      },
      {
        agent_role: 'devops',
        app_registration_name: 'Agentic-DevOps',
        required_permissions: [
          {
            scope: 'https://management.azure.com/.default',
            permissionType: 'application',
            reason: 'Azure pipelines and service connections',
          },
        ],
        credential_type: 'certificate',
      },
      {
        agent_role: 'security',
        app_registration_name: 'Agentic-Security',
        required_permissions: [
          {
            scope: 'https://graph.microsoft.com/.default',
            permissionType: 'application',
            reason: 'Tenant directory and security policy read',
          },
        ],
        credential_type: 'certificate',
      },
      {
        agent_role: 'data',
        app_registration_name: 'Agentic-Data',
        required_permissions: [
          {
            scope: 'https://management.azure.com/.default',
            permissionType: 'application',
            reason: 'Data layer and schema operations',
          },
        ],
        credential_type: 'certificate',
      },
    ];

    return {
      success: true,
      requiredIdentities,
      total_count: requiredIdentities.length,
    };
  }

  /**
   * Bootstrap: Create or register Entra app registrations (idempotent)
   */
  bootstrap(): BootstrapResult {
    try {
      const { requiredIdentities } = this.plan();
      let created = 0;
      let updated = 0;
      const failed: BootstrapResult['failed'] = [];

      for (const item of requiredIdentities) {
        try {
          const existing = this.db
            .prepare('SELECT id FROM agent_workload_identities WHERE agent_role = ?')
            .get(item.agent_role);

          if (existing) {
            // Update: idempotent
            this.db
              .prepare(
                `UPDATE agent_workload_identities
               SET required_permissions = ?, updated_at = datetime('now')
               WHERE agent_role = ?`
              )
              .run(JSON.stringify(item.required_permissions), item.agent_role);
            updated++;
          } else {
            // Create: new record
            const id = `awid-${item.agent_role}-${Date.now()}`;
            this.db
              .prepare(
                `INSERT INTO agent_workload_identities
               (id, agent_role, app_registration_id, app_registration_name,
                service_principal_id, tenant_id, required_permissions, credential_type, consent_status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .run(
                id,
                item.agent_role,
                `app-reg-${item.agent_role}`,
                item.app_registration_name,
                `sp-${item.agent_role}`,
                'default-tenant',
                JSON.stringify(item.required_permissions),
                item.credential_type,
                'not_configured'
              );
            created++;
          }
        } catch (err) {
          failed.push({
            agent_role: item.agent_role,
            error: String(err),
          });
        }
      }

      return { success: failed.length === 0, created, updated, failed };
    } catch (err) {
      return {
        success: false,
        created: 0,
        updated: 0,
        failed: [{ agent_role: 'orchestrator' as AgentRoleId, error: String(err) }],
      };
    }
  }

  /**
   * ConsentStatus: Validate per-agent operational readiness
   */
  consentStatus(agentRole?: AgentRoleId): ConsentStatusResult[] {
    try {
      const query = agentRole
        ? 'SELECT * FROM agent_workload_identities WHERE agent_role = ?'
        : 'SELECT * FROM agent_workload_identities';

      const rows = agentRole
        ? this.db.prepare(query).all(agentRole)
        : this.db.prepare(query).all();

      return rows.map((row: any) => ({
        agent_role: row.agent_role,
        consent_status: row.consent_status,
        app_registration_id: row.app_registration_id,
        service_principal_id: row.service_principal_id,
        credential_type: row.credential_type,
        credential_expires_at: row.credential_expires_at,
        effective_enabled: !!row.effective_enabled,
        warning:
          row.consent_status === 'pending_consent'
            ? 'Consent pending - agent cannot execute'
            : row.consent_status === 'auth_pending'
              ? 'Credential expired - requires renewal'
              : undefined,
      }));
    } catch (err) {
      return [];
    }
  }

  /**
   * Validate: Check effectiveEnabled for a given agent role
   */
  validate(agentRole: AgentRoleId): ValidationResult {
    try {
      const row = this.db
        .prepare('SELECT * FROM agent_workload_identities WHERE agent_role = ?')
        .get(agentRole);

      if (!row) {
        return {
          agent_role: agentRole,
          effective_enabled: false,
          reasons: ['Identity not configured'],
        };
      }

      const reasons: string[] = [];
      const asIdentity: AgentWorkloadIdentity = {
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

      if (!asIdentity.service_principal_id) reasons.push('Service principal not provisioned');
      if (asIdentity.consent_status !== 'consent_granted') reasons.push('Consent not granted');
      if (asIdentity.credential_expires_at) {
        const expiresAt = new Date(asIdentity.credential_expires_at);
        if (expiresAt < new Date()) reasons.push('Credential expired');
      }

      const enabled = isEffectivelyEnabled(asIdentity);
      if (enabled && reasons.length === 0) reasons.push('Fully operational');

      return {
        agent_role: agentRole,
        effective_enabled: enabled,
        reasons,
      };
    } catch (err) {
      return {
        agent_role: agentRole,
        effective_enabled: false,
        reasons: [`Validation error: ${err}`],
      };
    }
  }

  /**
   * Record audit trail event
   */
  recordAuditEvent(
    agentRole: AgentRoleId,
    eventType: AuditTrailEntry['event_type'],
    actor: string,
    previousStatus: ConsentStatus,
    newStatus: ConsentStatus,
    metadata?: Record<string, unknown>
  ): AuditTrailEntry {
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

    return {
      id,
      agent_role: agentRole,
      event_type: eventType,
      actor_type: 'system',
      actor,
      previous_status: previousStatus,
      new_status: newStatus,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
    };
  }

  /**
   * List audit trail
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
    } catch (err) {
      return [];
    }
  }
}
