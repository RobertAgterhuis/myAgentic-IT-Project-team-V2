// Copyright (c) 2026 Robert Agterhuis. MIT License.

import path from 'node:path';
import Database from 'better-sqlite3';
import type { FastifyInstance } from 'fastify';
import type { ServerContext } from '../context';
import { WorkloadIdentityStore } from '../services/workload-identity-store';
import type { AgentRoleId } from '../plugins/identity/workload-identity-types';
import { errorResponse } from '../utils/errors';

const AGENT_ROLES: AgentRoleId[] = [
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

function resolveDbPath(projectRoot: string): string {
  return process.env.STORAGE_PATH || path.join(projectRoot, '.agentic', 'data.db');
}

function toRole(value: string): AgentRoleId | null {
  return AGENT_ROLES.includes(value as AgentRoleId) ? (value as AgentRoleId) : null;
}

function withStore<T>(ctx: ServerContext, fn: (store: WorkloadIdentityStore) => T): T {
  const db = new Database(resolveDbPath(ctx.PROJECT_ROOT));
  try {
    const store = new WorkloadIdentityStore(db);
    store.migrate();
    return fn(store);
  } finally {
    db.close();
  }
}

function getConsentUrl(tenantId: string, appRegistrationId: string): string {
  const tenant = tenantId || 'organizations';
  return `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/adminconsent?client_id=${encodeURIComponent(appRegistrationId)}`;
}

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  app.get(
    '/api/v1/identity/consent-center',
    { schema: { tags: ['identity'] } },
    async (_req, reply) => {
      const entries = withStore(ctx, (store) => store.getConsentCenterData());
      return reply.send({ ok: true, count: entries.length, entries });
    }
  );

  app.get('/api/v1/identity/catalog', { schema: { tags: ['identity'] } }, async (_req, reply) => {
    const entries = withStore(ctx, (store) => store.getIdentityCatalogData());
    return reply.send({ ok: true, count: entries.length, entries });
  });

  app.get(
    '/api/v1/identity/permissions',
    { schema: { tags: ['identity'] } },
    async (_req, reply) => {
      const entries = withStore(ctx, (store) => store.getPermissionDiff());
      return reply.send({ ok: true, count: entries.length, entries });
    }
  );

  app.get('/api/v1/identity/health', { schema: { tags: ['identity'] } }, async (_req, reply) => {
    const entries = withStore(ctx, (store) => store.getCredentialHealth());
    return reply.send({ ok: true, count: entries.length, entries });
  });

  app.get(
    '/api/v1/identity/audit-trail',
    { schema: { tags: ['identity'] } },
    async (req, reply) => {
      const query = (req.query || {}) as Record<string, unknown>;
      const role = typeof query.agent_role === 'string' ? toRole(query.agent_role) : null;
      const limit = typeof query.limit === 'string' ? Number(query.limit) : 100;
      const entries = withStore(ctx, (store) => store.getAuditTrail(role ?? undefined, limit));
      return reply.send({ ok: true, count: entries.length, entries });
    }
  );

  app.post<{ Params: { role: string } }>(
    '/api/v1/identity/consent/:role/grant',
    { schema: { tags: ['identity'] } },
    async (req, reply) => {
      const role = toRole(req.params.role);
      if (!role) {
        return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Invalid agent role'));
      }

      const result = withStore(ctx, (store) => {
        const before = store.getIdentity(role);
        if (!before) return null;

        const after = store.setConsentStatus(role, 'consent_granted');
        if (!after) return null;

        return {
          role,
          identity: after,
          admin_consent_url: getConsentUrl(after.tenant_id, after.app_registration_id),
        };
      });

      if (!result) {
        return reply.code(404).send(errorResponse('NOT_FOUND', 'Identity not found for role'));
      }

      ctx.sseNotify('identity.consent.changed', {
        role: result.role,
        consent_status: result.identity.consent_status,
      });

      return reply.send({ ok: true, action: 'grant', ...result });
    }
  );

  app.post<{ Params: { role: string } }>(
    '/api/v1/identity/consent/:role/revoke',
    { schema: { tags: ['identity'] } },
    async (req, reply) => {
      const role = toRole(req.params.role);
      if (!role) {
        return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Invalid agent role'));
      }

      const identity = withStore(ctx, (store) => store.setConsentStatus(role, 'consent_revoked'));
      if (!identity) {
        return reply.code(404).send(errorResponse('NOT_FOUND', 'Identity not found for role'));
      }

      ctx.sseNotify('identity.consent.changed', {
        role,
        consent_status: identity.consent_status,
      });

      return reply.send({ ok: true, action: 'revoke', role, identity });
    }
  );

  app.post<{ Params: { role: string } }>(
    '/api/v1/identity/consent/:role/refresh',
    { schema: { tags: ['identity'] } },
    async (req, reply) => {
      const role = toRole(req.params.role);
      if (!role) {
        return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Invalid agent role'));
      }

      const result = withStore(ctx, (store) => {
        store.checkExpiredCredentials();
        const identity = store.getIdentity(role);
        if (!identity) return null;

        return {
          role,
          identity,
          effective_enabled: identity.effective_enabled,
        };
      });

      if (!result) {
        return reply.code(404).send(errorResponse('NOT_FOUND', 'Identity not found for role'));
      }

      return reply.send({ ok: true, action: 'refresh', ...result });
    }
  );
}
