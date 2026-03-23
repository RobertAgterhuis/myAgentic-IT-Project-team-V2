// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * WorkloadIdentityService - Manages agent workload identity lifecycle.
 * Provides plan(), bootstrap(), consentStatus(), and validate() operations.
 *
 * @module plugins/identity/workload-identity-service
 */

import type {
  AgentRoleId,
  AuditTrailEntry,
  ConsentStatus,
  CredentialType,
  RequiredPermission,
} from './workload-identity-types';
import { isEffectivelyEnabled } from './workload-identity-types';
import { WorkloadIdentityStore } from '../../services/workload-identity-store';

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

const ROLE_PLANS: PlanResult['requiredIdentities'] = [
  {
    agent_role: 'orchestrator',
    app_registration_name: 'Agentic-Orchestrator',
    required_permissions: [],
    credential_type: 'managed_identity',
  },
  {
    agent_role: 'product',
    app_registration_name: 'Agentic-Product',
    required_permissions: [],
    credential_type: 'workload_federation',
  },
  {
    agent_role: 'architect',
    app_registration_name: 'Agentic-Architect',
    required_permissions: [],
    credential_type: 'workload_federation',
  },
  {
    agent_role: 'developer',
    app_registration_name: 'Agentic-Developer',
    required_permissions: [],
    credential_type: 'workload_federation',
  },
  {
    agent_role: 'ui',
    app_registration_name: 'Agentic-UI',
    required_permissions: [],
    credential_type: 'workload_federation',
  },
  {
    agent_role: 'qa',
    app_registration_name: 'Agentic-QA',
    required_permissions: [],
    credential_type: 'workload_federation',
  },
  {
    agent_role: 'devops',
    app_registration_name: 'Agentic-DevOps',
    required_permissions: [
      {
        scope: 'https://management.azure.com/.default',
        permissionType: 'application',
        reason: 'Azure pipelines and runtime infrastructure operations',
      },
    ],
    credential_type: 'certificate',
  },
  {
    agent_role: 'infra',
    app_registration_name: 'Agentic-Infra',
    required_permissions: [
      {
        scope: 'https://management.azure.com/.default',
        permissionType: 'application',
        reason: 'Azure resource management and environment provisioning',
      },
    ],
    credential_type: 'workload_federation',
  },
  {
    agent_role: 'security',
    app_registration_name: 'Agentic-Security',
    required_permissions: [
      {
        scope: 'https://graph.microsoft.com/.default',
        permissionType: 'application',
        reason: 'Directory and security posture validation',
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
        reason: 'Data infrastructure orchestration',
      },
    ],
    credential_type: 'certificate',
  },
  {
    agent_role: 'documentation',
    app_registration_name: 'Agentic-Documentation',
    required_permissions: [],
    credential_type: 'managed_identity',
  },
  {
    agent_role: 'sre',
    app_registration_name: 'Agentic-SRE',
    required_permissions: [
      {
        scope: 'https://management.azure.com/.default',
        permissionType: 'application',
        reason: 'Production reliability operations and diagnostics',
      },
    ],
    credential_type: 'certificate',
  },
];

export class WorkloadIdentityService {
  constructor(private readonly store: WorkloadIdentityStore) {}

  /** Plan: List required app registrations per agent role. */
  plan(): PlanResult {
    return {
      success: true,
      requiredIdentities: [...ROLE_PLANS],
      total_count: ROLE_PLANS.length,
    };
  }

  /** Bootstrap: Create or register Entra app registrations (idempotent). */
  bootstrap(): BootstrapResult {
    const plan = this.plan();
    let created = 0;
    let updated = 0;
    const failed: BootstrapResult['failed'] = [];

    for (const target of plan.requiredIdentities) {
      try {
        const existing = this.store.getIdentity(target.agent_role);

        if (existing) {
          this.store.createOrUpdateIdentity({
            ...existing,
            required_permissions: target.required_permissions,
            credential_type: target.credential_type,
          });
          updated += 1;
          continue;
        }

        this.store.createOrUpdateIdentity({
          id: `awid-${target.agent_role}`,
          agent_role: target.agent_role,
          app_registration_id: `app-reg-${target.agent_role}`,
          app_registration_name: target.app_registration_name,
          service_principal_id: `sp-${target.agent_role}`,
          tenant_id: 'default-tenant',
          required_permissions: target.required_permissions,
          consent_status: 'not_configured',
          credential_type: target.credential_type,
          credential_expires_at: null,
          effective_enabled: false,
          last_validated: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        created += 1;
      } catch (error) {
        failed.push({
          agent_role: target.agent_role,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { success: failed.length === 0, created, updated, failed };
  }

  /** ConsentStatus: Validate per-agent operational readiness. */
  consentStatus(agentRole?: AgentRoleId): ConsentStatusResult[] {
    const rows = this.store.getConsentCenterData();
    const filtered = agentRole ? rows.filter((row) => row.agent_role === agentRole) : rows;

    return filtered.map((row) => ({
      agent_role: row.agent_role,
      consent_status: row.consent_status,
      app_registration_id: `app-reg-${row.agent_role}`,
      service_principal_id: `sp-${row.agent_role}`,
      credential_type: row.credential_type,
      credential_expires_at: row.credential_expires_at,
      effective_enabled: row.effective_enabled,
      warning:
        row.consent_status === 'pending_consent'
          ? 'Consent pending - agent cannot execute'
          : row.consent_status === 'auth_pending'
            ? 'Credential expired - requires renewal'
            : undefined,
    }));
  }

  /** Validate: Check effectiveEnabled for a given agent role. */
  validate(agentRole: AgentRoleId): ValidationResult {
    const identity = this.store.getIdentity(agentRole);

    if (!identity) {
      return {
        agent_role: agentRole,
        effective_enabled: false,
        reasons: ['Identity not configured'],
      };
    }

    const reasons: string[] = [];
    if (!identity.service_principal_id) reasons.push('Service principal not provisioned');
    if (identity.consent_status !== 'consent_granted') reasons.push('Consent not granted');
    if (identity.credential_expires_at && new Date(identity.credential_expires_at) < new Date()) {
      reasons.push('Credential expired');
    }

    const enabled = isEffectivelyEnabled(identity);
    if (enabled && reasons.length === 0) {
      reasons.push('Fully operational');
    }

    return {
      agent_role: agentRole,
      effective_enabled: enabled,
      reasons,
    };
  }

  recordAuditEvent(
    agentRole: AgentRoleId,
    eventType: AuditTrailEntry['event_type'],
    actor: string,
    previousStatus: ConsentStatus,
    newStatus: ConsentStatus,
    metadata?: Record<string, unknown>
  ): AuditTrailEntry {
    this.store.recordAuditEvent(agentRole, eventType, actor, previousStatus, newStatus, metadata);

    return {
      id: `audit-${agentRole}-${Date.now()}`,
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

  getAuditTrail(agentRole?: AgentRoleId, limit = 100): AuditTrailEntry[] {
    return this.store.getAuditTrail(agentRole, limit);
  }
}
