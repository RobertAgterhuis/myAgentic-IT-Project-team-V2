// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Authentication route handlers (M29-003, M29-006 backend).
 *
 * - GET  /api/auth/login     — redirect to GitHub OAuth
 * - GET  /api/auth/callback  — handle OAuth callback
 * - POST /api/auth/logout    — destroy session
 * - GET  /api/auth/me        — current user info
 * - GET  /api/admin/users    — list users (admin)
 * - PUT  /api/admin/users/:id/role — update role (admin)
 *
 * @module routes/auth
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { ServerContext } from '../context';
import type {
  AuthManager,
  AuthenticatedRequest,
  ProviderUser,
  Role,
  IdentityProvider,
} from '../auth';
import path from 'path';
import fs from 'fs';

import { structuredLog } from '../middleware';
import { errorResponse } from '../utils/errors';
import { GitCredentialStore } from '../services/git/credential-store';
import * as RS from '../route-schemas';

const VALID_ROLES: Role[] = ['admin', 'operator', 'viewer'];
const ENTRA_LINK_REDIRECT_PREFIX = '/__auth/link/entra';

// Validate redirectTo is a safe relative path (no open redirect)
function safeRedirect(url: string | undefined): string {
  if (!url || typeof url !== 'string') return '/';
  // Only allow paths starting with / and not // (protocol-relative)
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  return '/';
}

function appendQuery(url: string, key: string, value: string): string {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function buildEntraLinkRedirect(userId: string, redirectTo: string): string {
  const params = new URLSearchParams({ uid: userId, redirect: redirectTo });
  return `${ENTRA_LINK_REDIRECT_PREFIX}?${params.toString()}`;
}

function parseEntraLinkRedirect(
  redirectTo: string | undefined
): { userId: string; redirectTo: string } | null {
  if (!redirectTo || !redirectTo.startsWith(ENTRA_LINK_REDIRECT_PREFIX)) {
    return null;
  }

  try {
    const fake = new URL(`http://localhost${redirectTo}`);
    const userId = fake.searchParams.get('uid') || '';
    const next = safeRedirect(fake.searchParams.get('redirect') || '/');
    if (!userId) return null;
    return { userId, redirectTo: next };
  } catch {
    return null;
  }
}

function resolveEntraMappedRole(authManager: AuthManager, providerUser: ProviderUser): Role | null {
  if (providerUser.provider !== 'entra') return null;
  const configuredAdminGroups = authManager.config.entraAdminGroupIds || [];
  if (!configuredAdminGroups.length) return null;
  const userGroups = providerUser.groups || [];
  return userGroups.some((groupId) => configuredAdminGroups.includes(groupId)) ? 'admin' : 'viewer';
}

function syncProviderTokenToCredentialStore(
  ctx: ServerContext,
  userId: string,
  provider: IdentityProvider,
  providerUser: ProviderUser
): void {
  const token = providerUser.tokenPair?.accessToken;
  if (!token) return;

  const gitProvider = provider === 'entra' ? 'entra' : provider === 'github' ? 'github' : null;
  if (!gitProvider) return;

  try {
    const projectRoot = ctx.PROJECT_ROOT || process.cwd();
    const dbPath =
      process.env.GIT_CREDENTIAL_DB_PATH ||
      path.join(projectRoot, '.agentic', 'git', 'credentials.sqlite');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const store = new GitCredentialStore(dbPath);
    try {
      store.setCredential(`user:${userId}`, gitProvider, {
        token,
        expiresAt: providerUser.tokenPair?.expiresAt || null,
      });
    } finally {
      store.close();
    }
  } catch (err) {
    structuredLog('warn', 'auth_provider_token_sync_skipped', {
      provider,
      userId,
      error: (err as Error).message,
    });
  }
}

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  const authManager = ctx._authManager as AuthManager | undefined;
  const authMiddleware = ctx._authMiddleware as
    | {
        requireRole: (
          req: AuthenticatedRequest,
          res: import('http').ServerResponse,
          role: Role,
          path?: string
        ) => boolean;
      }
    | undefined;

  /* ── GET /api/auth/login ──────────────────────────────────── */
  app.get(
    '/api/auth/login',
    { schema: { tags: ['auth'] } },
    async (
      request: FastifyRequest<{ Querystring: { redirect?: string } }>,
      reply: FastifyReply
    ) => {
      if (!authManager) {
        return reply
          .code(503)
          .send({ error: 'AUTH_DISABLED', message: 'Authentication not configured' });
      }
      const redirectTo = request.query.redirect || undefined;
      const loginUrl = authManager.getLoginUrlForProvider('github', redirectTo);
      return reply.redirect(loginUrl, 302);
    }
  );

  /* ── GET /api/auth/entra/login ─────────────────────────────── */
  app.get(
    '/api/auth/entra/login',
    { schema: { tags: ['auth'] } },
    async (
      request: FastifyRequest<{ Querystring: { redirect?: string } }>,
      reply: FastifyReply
    ) => {
      if (!authManager) {
        return reply
          .code(503)
          .send({ error: 'AUTH_DISABLED', message: 'Authentication not configured' });
      }

      if (!authManager.getProvider('entra')) {
        return reply.code(503).send({
          error: 'AUTH_PROVIDER_DISABLED',
          message: 'Entra authentication is not configured',
        });
      }

      const redirectTo = request.query.redirect || undefined;
      const loginUrl = authManager.getLoginUrlForProvider('entra', redirectTo);
      return reply.redirect(loginUrl, 302);
    }
  );

  /* ── POST /api/auth/link/entra ─────────────────────────────── */
  app.post(
    '/api/auth/link/entra',
    { schema: { tags: ['auth'] } },
    async (request: FastifyRequest<{ Body: { redirect?: string } }>, reply: FastifyReply) => {
      if (!authManager) {
        return reply
          .code(503)
          .send({ error: 'AUTH_DISABLED', message: 'Authentication not configured' });
      }

      if (!authManager.getProvider('entra')) {
        return reply.code(503).send({
          error: 'AUTH_PROVIDER_DISABLED',
          message: 'Entra authentication is not configured',
        });
      }

      const session = authManager.getSessionFromRequest(request.raw);
      if (!session) {
        return reply.code(401).send(errorResponse('UNAUTHORIZED', 'Not authenticated'));
      }

      const user = authManager.getUserForSession(session);
      if (!user) {
        authManager.destroySession(session.id);
        authManager.clearSessionCookies(reply.raw);
        return reply.code(401).send(errorResponse('UNAUTHORIZED', 'Session invalid'));
      }

      if (authManager.store.hasLinkedProvider(user.id, 'entra')) {
        return reply
          .code(409)
          .send(errorResponse('CONFLICT', 'Entra account already linked for this user'));
      }

      const redirectTo = safeRedirect(request.body?.redirect || '/');
      const linkStateRedirect = buildEntraLinkRedirect(user.id, redirectTo);
      const loginUrl = authManager.getLoginUrlForProvider('entra', linkStateRedirect);

      return reply.send({ ok: true, provider: 'entra', url: loginUrl });
    }
  );

  /* ── GET /api/auth/callback ───────────────────────────────── */
  app.get(
    '/api/auth/callback',
    { schema: { tags: ['auth'] } },
    async (
      request: FastifyRequest<{ Querystring: { code?: string; state?: string } }>,
      reply: FastifyReply
    ) => {
      if (!authManager) {
        return reply
          .code(503)
          .send({ error: 'AUTH_DISABLED', message: 'Authentication not configured' });
      }

      const code = request.query.code;
      const state = request.query.state;

      if (!code || !state) {
        structuredLog('warn', 'oauth_callback_missing_params');
        return reply.redirect('/login?error=missing_params', 302);
      }

      // Verify state (CSRF protection for OAuth)
      const stateResult = authManager.verifyProviderState('github', state);
      if (!stateResult.valid) {
        structuredLog('warn', 'oauth_state_invalid');
        return reply.redirect('/login?error=invalid_state', 302);
      }

      try {
        const providerUser = await authManager.authenticateProvider('github', code, state);

        // Create or update user
        const user = authManager.store.upsertUser({
          provider: providerUser.provider,
          providerId: providerUser.providerId,
          providerUsername: providerUser.username,
          email: providerUser.email,
          name: providerUser.name,
          avatarUrl: providerUser.avatarUrl,
          tokenPair: providerUser.tokenPair,
          tenantId: providerUser.tenantId,
        });

        syncProviderTokenToCredentialStore(ctx, user.id, providerUser.provider, providerUser);

        // Create session (new ID — prevents session fixation)
        const session = authManager.createSession(user.id, user.primary_provider);
        authManager.setSessionCookie(reply.raw, session);

        structuredLog('info', 'user_login', {
          userId: user.id,
          provider: providerUser.provider,
          providerUsername: providerUser.username,
          role: user.role,
        });

        const redirectTo = safeRedirect(stateResult.redirectTo);
        return reply.redirect(redirectTo, 302);
      } catch (err) {
        structuredLog('error', 'oauth_callback_failed', { error: (err as Error).message });
        return reply.redirect('/login?error=auth_failed', 302);
      }
    }
  );

  /* ── GET /api/auth/entra/callback ──────────────────────────── */
  app.get(
    '/api/auth/entra/callback',
    { schema: { tags: ['auth'] } },
    async (
      request: FastifyRequest<{ Querystring: { code?: string; state?: string } }>,
      reply: FastifyReply
    ) => {
      if (!authManager) {
        return reply
          .code(503)
          .send({ error: 'AUTH_DISABLED', message: 'Authentication not configured' });
      }

      if (!authManager.getProvider('entra')) {
        return reply.code(503).send({
          error: 'AUTH_PROVIDER_DISABLED',
          message: 'Entra authentication is not configured',
        });
      }

      const code = request.query.code;
      const state = request.query.state;

      if (!code || !state) {
        structuredLog('warn', 'entra_callback_missing_params');
        return reply.redirect('/login?error=missing_params', 302);
      }

      const stateResult = authManager.verifyProviderState('entra', state);
      if (!stateResult.valid) {
        structuredLog('warn', 'entra_state_invalid');
        return reply.redirect('/login?error=invalid_state', 302);
      }

      try {
        const providerUser = await authManager.authenticateProvider('entra', code, state);
        const linkIntent = parseEntraLinkRedirect(stateResult.redirectTo);

        if (linkIntent) {
          const currentSession = authManager.getSessionFromRequest(request.raw);
          if (!currentSession) {
            return reply.redirect(
              appendQuery(linkIntent.redirectTo, 'error', 'link_requires_session'),
              302
            );
          }

          const currentUser = authManager.getUserForSession(currentSession);
          if (!currentUser || currentUser.id !== linkIntent.userId) {
            return reply.redirect(
              appendQuery(linkIntent.redirectTo, 'error', 'link_session_mismatch'),
              302
            );
          }

          if (authManager.store.hasLinkedProvider(currentUser.id, 'entra')) {
            return reply.redirect(
              appendQuery(linkIntent.redirectTo, 'error', 'already_linked'),
              302
            );
          }

          const existingOwner = authManager.store.findUserByProvider(
            'entra',
            providerUser.providerId
          );
          if (existingOwner && existingOwner.id !== currentUser.id) {
            return reply.redirect(
              appendQuery(linkIntent.redirectTo, 'error', 'account_already_in_use'),
              302
            );
          }

          const linkedUser = authManager.store.linkProviderAccount({
            userId: currentUser.id,
            provider: providerUser.provider,
            providerId: providerUser.providerId,
            providerUsername: providerUser.username,
            tokenPair: providerUser.tokenPair,
            tenantId: providerUser.tenantId,
          });

          const mappedRole = resolveEntraMappedRole(authManager, providerUser);
          if (mappedRole) {
            authManager.updateUserRole(linkedUser.id, mappedRole);
          }

          syncProviderTokenToCredentialStore(
            ctx,
            linkedUser.id,
            providerUser.provider,
            providerUser
          );

          structuredLog('info', 'entra_account_linked', {
            userId: linkedUser.id,
            providerId: providerUser.providerId,
            providerUsername: providerUser.username,
          });

          return reply.redirect(appendQuery(linkIntent.redirectTo, 'linked', 'entra'), 302);
        }

        const user = authManager.store.upsertUser({
          provider: providerUser.provider,
          providerId: providerUser.providerId,
          providerUsername: providerUser.username,
          email: providerUser.email,
          name: providerUser.name,
          avatarUrl: providerUser.avatarUrl,
          tokenPair: providerUser.tokenPair,
          tenantId: providerUser.tenantId,
        });

        const mappedRole = resolveEntraMappedRole(authManager, providerUser);
        if (mappedRole) {
          authManager.updateUserRole(user.id, mappedRole);
        }

        syncProviderTokenToCredentialStore(ctx, user.id, providerUser.provider, providerUser);

        const session = authManager.createSession(user.id, user.primary_provider);
        authManager.setSessionCookie(reply.raw, session);

        structuredLog('info', 'user_login', {
          userId: user.id,
          provider: providerUser.provider,
          providerUsername: providerUser.username,
          role: mappedRole || user.role,
        });

        const redirectTo = safeRedirect(stateResult.redirectTo);
        return reply.redirect(redirectTo, 302);
      } catch (err) {
        structuredLog('error', 'entra_callback_failed', { error: (err as Error).message });
        return reply.redirect('/login?error=auth_failed', 302);
      }
    }
  );

  /* ── POST /api/auth/logout ────────────────────────────────── */
  app.post(
    '/api/auth/logout',
    { schema: { tags: ['auth'] } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!authManager) {
        return reply
          .code(503)
          .send({ error: 'AUTH_DISABLED', message: 'Authentication not configured' });
      }

      const session = authManager.getSessionFromRequest(request.raw);
      if (session) {
        authManager.destroySession(session.id);
        structuredLog('info', 'user_logout', { sessionId: session.id.slice(0, 8) + '...' });
      }
      authManager.clearSessionCookies(reply.raw);
      return reply.send({ ok: true, message: 'Logged out' });
    }
  );

  /* ── GET /api/auth/me ─────────────────────────────────────── */
  app.get(
    '/api/auth/me',
    { schema: { tags: ['auth'] } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!authManager) {
        return reply
          .code(503)
          .send(errorResponse('AUTH_DISABLED', 'Authentication not configured'));
      }

      const session = authManager.getSessionFromRequest(request.raw);
      if (!session) {
        return reply.code(401).send(errorResponse('UNAUTHORIZED', 'Not authenticated'));
      }
      const user = authManager.getUserForSession(session);
      if (!user) {
        authManager.destroySession(session.id);
        authManager.clearSessionCookies(reply.raw);
        return reply.code(401).send(errorResponse('UNAUTHORIZED', 'Session invalid'));
      }

      return reply.send({
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        role: user.role,
        csrf_token: session.csrf_token,
      });
    }
  );

  /* ── GET /api/auth/providers ─────────────────────────────── */
  app.get(
    '/api/auth/providers',
    { schema: { tags: ['auth'] } },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      if (!authManager) {
        return reply
          .code(503)
          .send({ error: 'AUTH_DISABLED', message: 'Authentication not configured' });
      }
      return reply.send({
        github: authManager.getProvider('github') !== null,
        entra: authManager.getProvider('entra') !== null,
      });
    }
  );

  /* ── GET /api/auth/config/validate ───────────────────────── */
  app.get(
    '/api/auth/config/validate',
    { schema: { tags: ['auth'] } },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const host = process.env.HOST || '127.0.0.1';
      const port = process.env.PORT || '3000';
      const callbackBase = process.env.AUTH_CALLBACK_URL || `http://${host}:${port}`;
      const githubExpectedCallback = `${callbackBase}/api/auth/callback`;
      const entraExpectedCallback =
        process.env.ENTRA_REDIRECT_URI || `${callbackBase}/api/auth/entra/callback`;

      const githubVars = [
        { name: 'GITHUB_CLIENT_ID', present: Boolean(process.env.GITHUB_CLIENT_ID) },
        { name: 'GITHUB_CLIENT_SECRET', present: Boolean(process.env.GITHUB_CLIENT_SECRET) },
      ];
      const githubConfigured = githubVars.every((entry) => entry.present);

      const entraVars = [
        { name: 'ENTRA_CLIENT_ID', present: Boolean(process.env.ENTRA_CLIENT_ID) },
        { name: 'ENTRA_TENANT_ID', present: Boolean(process.env.ENTRA_TENANT_ID) },
        { name: 'ENTRA_CLIENT_SECRET', present: Boolean(process.env.ENTRA_CLIENT_SECRET) },
      ];
      const entraConfigured = entraVars.every((entry) => entry.present);

      return reply.send({
        allConfigured: githubConfigured && entraConfigured,
        github: {
          configured: githubConfigured,
          providerEnabled: authManager ? authManager.getProvider('github') !== null : false,
          requiredVariables: githubVars,
          callback: {
            envName: 'AUTH_CALLBACK_URL',
            effectiveBaseUrl: callbackBase,
            callbackUrl: githubExpectedCallback,
          },
        },
        entra: {
          configured: entraConfigured,
          providerEnabled: authManager ? authManager.getProvider('entra') !== null : false,
          requiredVariables: entraVars,
          callback: {
            envName: 'ENTRA_REDIRECT_URI',
            callbackUrl: entraExpectedCallback,
          },
        },
      });
    }
  );

  /* ── GET /api/admin/users ─────────────────────────────────── */
  app.get(
    '/api/admin/users',
    { schema: { tags: ['auth'] } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!authManager || !authMiddleware) {
        return reply
          .code(503)
          .send(errorResponse('AUTH_DISABLED', 'Authentication not configured'));
      }
      if (
        !authMiddleware.requireRole(
          request.raw as AuthenticatedRequest,
          reply.raw,
          'admin',
          '/api/admin/users'
        )
      ) {
        return;
      }
      const users = authManager.listUsers().map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        avatar_url: u.avatar_url,
        role: u.role,
        created_at: u.created_at,
        last_login: u.last_login,
      }));
      return reply.send({ users });
    }
  );

  /* ── PUT /api/admin/users/:id/role ────────────────────────── */
  app.put<{ Params: { id: string }; Body: { role?: string } }>(
    '/api/admin/users/:id/role',
    { schema: RS.authUpdateRole },
    async (request, reply) => {
      if (!authManager || !authMiddleware) {
        return reply
          .code(503)
          .send(errorResponse('AUTH_DISABLED', 'Authentication not configured'));
      }
      if (
        !authMiddleware.requireRole(
          request.raw as AuthenticatedRequest,
          reply.raw,
          'admin',
          '/api/admin/users/:id/role'
        )
      ) {
        return;
      }

      const userId = decodeURIComponent(request.params.id);
      if (!userId) {
        return reply.code(400).send(errorResponse('INVALID_INPUT', 'User ID required'));
      }

      const role = request.body?.role;
      if (!role || !VALID_ROLES.includes(role as Role)) {
        return reply
          .code(400)
          .send(errorResponse('INVALID_INPUT', `Role must be one of: ${VALID_ROLES.join(', ')}`));
      }

      const success = authManager.updateUserRole(userId, role as Role);
      if (!success) {
        return reply.code(404).send(errorResponse('NOT_FOUND', 'User not found'));
      }

      structuredLog('info', 'user_role_updated', {
        targetUser: userId,
        newRole: role,
        updatedBy: (request.raw as AuthenticatedRequest).user?.id,
      });

      return reply.send({ ok: true, userId, role });
    }
  );
}
