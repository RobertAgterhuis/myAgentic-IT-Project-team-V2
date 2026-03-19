// Copyright (c) 2026 Robert Agentic SDLC Platform. MIT License.

/**
 * Machine-to-Machine (M2M) API Authentication Security Policy (M1#658-T3).
 *
 * Defines the scope, allowed routes, audit behavior, and constraints for API_KEY
 * authentication in non-local production deployments.
 *
 * @module m2m-api-policy
 */

/**
 * M2M API Routes Policy Matrix.
 *
 * Routes are categorized by sensitivity level. The API_KEY credential
 * is valid only for routes explicitly marked as `allowed: true`.
 *
 * Sensitivity levels:
 * - PUBLIC: No authentication required (health checks, help, public static)
 * - READ: Read-only data access (questionnaires, decisions, audit logs)
 * - WRITE: Data mutations (answers, decisions, commands)
 * - ADMIN: Administrative operations (policy management, workspace config)
 *
 * API_KEY holders are treated as "service" accounts with operator-level
 * permission by default, subject to the route matrix below.
 * @see docs/api/system-api.md#machine-to-machine-api
 */

export const M2M_API_POLICY = {
  /**
   * PUBLIC routes: No API_KEY required. Open to all callers.
   */
  public: {
    GET: [
      '/api/health', // Readiness probe
      '/api/help', // Help documentation
      '/health', // Liveness probe
      '/events', // SSE stream (browser-only, but no auth check)
    ],
  },

  /**
   * READ routes: Allowed with valid API_KEY for non-local bindings.
   * Semantics: Read-only access to collected data.
   */
  read: {
    GET: [
      '/api/questionnaires', // List all questionnaires
      '/api/questionnaires/:id', // Get single questionnaire
      '/api/decisions', // List all decisions
      '/api/decisions/:id', // Get specific decision
      '/api/audit', // Mutation audit trail (M2M can review)
      '/api/session', // Current session state
      '/api/export', // Export data as JSON
      '/api/dashboard', // Dashboard aggregates
      '/api/metrics-dashboard', // Runtime metrics
      '/api/progress', // Phase/agent progress
      '/api/commands', // Retrieve queued command
    ],
  },

  /**
   * WRITE routes: Allowed with valid API_KEY AND operator role.
   * Semantics: Data mutations that require audit trail entry.
   *
   * Each WRITE request generates an HTTP audit log entry with:
   * - request_id: Unique correlation ID
   * - api_key_id: Identifier for the API key (hashed for security)
   * - route: The endpoint called
   * - method: HTTP method (POST, PATCH, etc.)
   * - status: Response status code
   * - timestamp: ISO 8601
   * - user_agent: Caller's user agent
   */
  write: {
    POST: [
      '/api/save', // Save questionnaire answers
      '/api/reevaluate', // Trigger reevaluation
      '/api/decisions', // Create or mutate decisions
      '/api/command', // Queue agentic command
      '/api/analytics', // Submit analytics event
    ],
    PATCH: [
      // Potential additions for partial updates
    ],
    DELETE: [
      // Potential additions for deletions
    ],
  },

  /**
   * ADMIN routes: Explicitly forbidden for API_KEY callers.
   * Semantics: Only authenticated users (OAuth) can perform admin actions.
   *
   * This prevents API keys from unintentionally gaining admin permissions
   * through privilege escalation bugs or misconfiguration.
   */
  admin: {
    POST: [
      '/api/admin/**', // All admin endpoints
      '/api/policies/**', // Policy management (not /api/governance/policies/evaluate)
      '/api/workspaces/**', // Workspace config
      '/api/sessions/**', // Session administration
    ],
  },

  /**
   * DISABLED routes: Not accessible via API_KEY, even with other auth.
   * For future use: routes that should never be exposed to M2M.
   */
  disabled: {
    GET: [],
    POST: [],
  },
} as const;

/**
 * Helper: Check if a route is allowed for API_KEY authentication.
 *
 * @param method HTTP method (GET, POST, etc.)
 * @param pathname Request path (e.g., '/api/save')
 * @param hasApiKey Whether the request provided a valid API_KEY
 * @returns true if route is allowed; false otherwise
 */
export function isM2MRouteAllowed(method: string, pathname: string, hasApiKey: boolean): boolean {
  if (!hasApiKey) return false;

  // Admin routes are never allowed for API keys
  for (const adminRoute of M2M_API_POLICY.admin.POST) {
    if (matchRoute(pathname, adminRoute)) return false;
  }

  // Check if route is in READ or WRITE whitelist
  const readRoutes = M2M_API_POLICY.read[method as keyof typeof M2M_API_POLICY.read] || [];
  for (const route of readRoutes) {
    if (matchRoute(pathname, route)) return true;
  }

  const writeRoutes = M2M_API_POLICY.write[method as keyof typeof M2M_API_POLICY.write] || [];
  for (const route of writeRoutes) {
    if (matchRoute(pathname, route)) return true;
  }

  return false;
}

/**
 * Helper: Simple route pattern matcher (supports * and ** wildcards).
 * @internal
 */
function matchRoute(pathname: string, pattern: string): boolean {
  if (pattern === pathname) return true;
  if (pattern.endsWith('/**')) {
    const prefix = pattern.slice(0, -3);
    return pathname.startsWith(prefix + '/') || pathname === prefix;
  }
  if (pattern.includes('*')) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '[^/]*').replace(/\//g, '\\/') + '$');
    return regex.test(pathname);
  }
  return false;
}

/**
 * API Key authentication event (for audit logging).
 * @see audit.ts
 */
export interface ApiKeyAuthEvent {
  operation: 'api_key_auth_success' | 'api_key_auth_failed' | 'api_key_auth_blocked';
  apiKeyId: string; // Hashed/masked API key identifier
  method: string;
  route: string;
  allowed: boolean;
  reason?: string; // e.g., "ADMIN_ROUTE", "INVALID_KEY", "RATE_LIMITED"
  clientIp?: string;
  userAgent?: string;
}

/**
 * Reference: For full documentation and examples, see:
 * - docs/api/system-api.md#machine-to-machine-api
 * - docs/reference/runtime-profiles-env-contract.md (API_KEY reference)
 */
