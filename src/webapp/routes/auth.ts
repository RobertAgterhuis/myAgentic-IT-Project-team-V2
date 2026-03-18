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
import type { AuthManager, AuthenticatedRequest, Role } from '../auth';

import { structuredLog } from '../middleware';
import * as RS from '../route-schemas';

const VALID_ROLES: Role[] = ['admin', 'operator', 'viewer'];

// Validate redirectTo is a safe relative path (no open redirect)
function safeRedirect(url: string | undefined): string {
  if (!url || typeof url !== 'string') return '/';
  // Only allow paths starting with / and not // (protocol-relative)
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  return '/';
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
      const loginUrl = authManager.getLoginUrl(redirectTo);
      return reply.redirect(loginUrl, 302);
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
      const stateResult = authManager.verifyState(state);
      if (!stateResult.valid) {
        structuredLog('warn', 'oauth_state_invalid');
        return reply.redirect('/login?error=invalid_state', 302);
      }

      try {
        // Exchange code for token
        const accessToken = await authManager.exchangeCode(code);

        // Fetch GitHub user profile
        const ghUser = await authManager.fetchGitHubUser(accessToken);

        // Create or update user
        const user = authManager.store.upsertUser({
          githubId: ghUser.id,
          email: ghUser.email,
          name: ghUser.name,
          avatarUrl: ghUser.avatar_url,
        });

        // Create session (new ID — prevents session fixation)
        const session = authManager.createSession(user.id);
        authManager.setSessionCookie(reply.raw, session);

        structuredLog('info', 'user_login', {
          userId: user.id,
          githubLogin: ghUser.login,
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
          .send({ error: 'AUTH_DISABLED', message: 'Authentication not configured' });
      }

      const session = authManager.getSessionFromRequest(request.raw);
      if (!session) {
        return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Not authenticated' });
      }
      const user = authManager.getUserForSession(session);
      if (!user) {
        authManager.destroySession(session.id);
        authManager.clearSessionCookies(reply.raw);
        return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Session invalid' });
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

  /* ── GET /api/admin/users ─────────────────────────────────── */
  app.get(
    '/api/admin/users',
    { schema: { tags: ['auth'] } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!authManager || !authMiddleware) {
        return reply
          .code(503)
          .send({ error: 'AUTH_DISABLED', message: 'Authentication not configured' });
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
          .send({ error: 'AUTH_DISABLED', message: 'Authentication not configured' });
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
        return reply.code(400).send({ error: 'INVALID_INPUT', message: 'User ID required' });
      }

      const role = request.body?.role;
      if (!role || !VALID_ROLES.includes(role as Role)) {
        return reply.code(400).send({
          error: 'INVALID_INPUT',
          message: `Role must be one of: ${VALID_ROLES.join(', ')}`,
        });
      }

      const success = authManager.updateUserRole(userId, role as Role);
      if (!success) {
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'User not found' });
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
