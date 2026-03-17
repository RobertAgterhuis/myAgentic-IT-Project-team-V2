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

import type { IncomingMessage, ServerResponse } from 'http';
import type { AuthManager, AuthenticatedRequest, Role } from '../auth';

import { structuredLog, json, parseBody } from '../middleware';

const VALID_ROLES: Role[] = ['admin', 'operator', 'viewer'];

// Validate redirectTo is a safe relative path (no open redirect)
function safeRedirect(url: string | undefined): string {
  if (!url || typeof url !== 'string') return '/';
  // Only allow paths starting with / and not // (protocol-relative)
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  return '/';
}

export = function createAuthRoutes(ctx: Record<string, unknown>): Record<string, unknown> {
  const authManager = ctx._authManager as AuthManager | undefined;
  const authMiddleware = ctx._authMiddleware as
    | {
        requireRole: (
          req: AuthenticatedRequest,
          res: ServerResponse,
          role: Role,
          path?: string
        ) => boolean;
      }
    | undefined;

  /* ── GET /api/auth/login ──────────────────────────────────── */
  async function authLogin(req: IncomingMessage, res: ServerResponse) {
    if (!authManager) {
      return json(res, 503, { error: 'AUTH_DISABLED', message: 'Authentication not configured' });
    }
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const redirectTo = url.searchParams.get('redirect') || undefined;
    const loginUrl = authManager.getLoginUrl(redirectTo);
    res.writeHead(302, { Location: loginUrl });
    res.end();
  }

  /* ── GET /api/auth/callback ───────────────────────────────── */
  async function authCallback(req: IncomingMessage, res: ServerResponse) {
    if (!authManager) {
      return json(res, 503, { error: 'AUTH_DISABLED', message: 'Authentication not configured' });
    }

    const url = new URL(req.url!, `http://${req.headers.host}`);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code || !state) {
      structuredLog('warn', 'oauth_callback_missing_params');
      res.writeHead(302, { Location: '/login?error=missing_params' });
      res.end();
      return;
    }

    // Verify state (CSRF protection for OAuth)
    const stateResult = authManager.verifyState(state);
    if (!stateResult.valid) {
      structuredLog('warn', 'oauth_state_invalid');
      res.writeHead(302, { Location: '/login?error=invalid_state' });
      res.end();
      return;
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
      authManager.setSessionCookie(res, session);

      structuredLog('info', 'user_login', {
        userId: user.id,
        githubLogin: ghUser.login,
        role: user.role,
      });

      const redirectTo = safeRedirect(stateResult.redirectTo);
      res.writeHead(302, { Location: redirectTo });
      res.end();
    } catch (err) {
      structuredLog('error', 'oauth_callback_failed', { error: (err as Error).message });
      res.writeHead(302, { Location: '/login?error=auth_failed' });
      res.end();
    }
  }

  /* ── POST /api/auth/logout ────────────────────────────────── */
  async function authLogout(req: IncomingMessage, res: ServerResponse) {
    if (!authManager) {
      return json(res, 503, { error: 'AUTH_DISABLED', message: 'Authentication not configured' });
    }

    const session = authManager.getSessionFromRequest(req);
    if (session) {
      authManager.destroySession(session.id);
      structuredLog('info', 'user_logout', { sessionId: session.id.slice(0, 8) + '...' });
    }
    authManager.clearSessionCookies(res);
    return json(res, 200, { ok: true, message: 'Logged out' });
  }

  /* ── GET /api/auth/me ─────────────────────────────────────── */
  async function authMe(req: IncomingMessage, res: ServerResponse) {
    if (!authManager) {
      return json(res, 503, { error: 'AUTH_DISABLED', message: 'Authentication not configured' });
    }

    const session = authManager.getSessionFromRequest(req);
    if (!session) {
      return json(res, 401, { error: 'UNAUTHORIZED', message: 'Not authenticated' });
    }
    const user = authManager.getUserForSession(session);
    if (!user) {
      authManager.destroySession(session.id);
      authManager.clearSessionCookies(res);
      return json(res, 401, { error: 'UNAUTHORIZED', message: 'Session invalid' });
    }

    return json(res, 200, {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      role: user.role,
      csrf_token: session.csrf_token,
    });
  }

  /* ── GET /api/admin/users ─────────────────────────────────── */
  async function listUsers(req: IncomingMessage, res: ServerResponse) {
    if (!authManager || !authMiddleware) {
      return json(res, 503, { error: 'AUTH_DISABLED', message: 'Authentication not configured' });
    }
    if (
      !authMiddleware.requireRole(req as AuthenticatedRequest, res, 'admin', '/api/admin/users')
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
    return json(res, 200, { users });
  }

  /* ── PUT /api/admin/users/:id/role ────────────────────────── */
  async function updateUserRole(req: IncomingMessage, res: ServerResponse) {
    if (!authManager || !authMiddleware) {
      return json(res, 503, { error: 'AUTH_DISABLED', message: 'Authentication not configured' });
    }
    if (
      !authMiddleware.requireRole(
        req as AuthenticatedRequest,
        res,
        'admin',
        '/api/admin/users/:id/role'
      )
    ) {
      return;
    }

    const url = new URL(req.url!, `http://${req.headers.host}`);
    const segments = url.pathname.split('/').filter(Boolean);
    // /api/admin/users/:id/role → ['api','admin','users',':id','role']
    const userId = segments[3];
    if (!userId) {
      return json(res, 400, { error: 'INVALID_INPUT', message: 'User ID required' });
    }

    const body = await parseBody(req);
    const role = body.role as string;
    if (!role || !VALID_ROLES.includes(role as Role)) {
      return json(res, 400, {
        error: 'INVALID_INPUT',
        message: `Role must be one of: ${VALID_ROLES.join(', ')}`,
      });
    }

    const success = authManager.updateUserRole(userId, role as Role);
    if (!success) {
      return json(res, 404, { error: 'NOT_FOUND', message: 'User not found' });
    }

    structuredLog('info', 'user_role_updated', {
      targetUser: userId,
      newRole: role,
      updatedBy: (req as AuthenticatedRequest).user?.id,
    });

    return json(res, 200, { ok: true, userId, role });
  }

  return {
    'GET /api/auth/login': authLogin,
    'GET /api/auth/callback': authCallback,
    'POST /api/auth/logout': authLogout,
    'GET /api/auth/me': authMe,
    'GET /api/admin/users': listUsers,
    'PUT /api/admin/users/:id/role': updateUserRole,
  };
};
