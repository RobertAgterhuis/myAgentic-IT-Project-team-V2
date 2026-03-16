/**
 * Lightweight Identity Resolver (M4: Governance Mode + Advisory Logging)
 *
 * Resolves the current user identity from environment variables or git config.
 * Used by governance checks to record who triggered gate transitions.
 *
 * Resolution order (configurable via governance-policies.json):
 *   1. Environment variable (default: SDLC_USER)
 *   2. Git config (user.name from `git config`)
 *   3. Fallback value (default: 'anonymous')
 *
 * Zero external dependencies beyond Node.js built-ins.
 *
 * @module engine/identity
 */

import { execSync } from 'child_process';

// ─── Types ───────────────────────────────────────────────────

export interface IdentityConfig {
  resolve_order?: string[];
  env_variable?: string;
  fallback?: string;
}

export interface ResolvedIdentity {
  user: string;
  source: 'env' | 'git_config' | 'fallback';
  resolved_at: string;
}

// ─── Resolvers ───────────────────────────────────────────────

const DEFAULT_ENV_VARIABLE = 'SDLC_USER';
const DEFAULT_FALLBACK = 'anonymous';
const DEFAULT_RESOLVE_ORDER = ['env', 'git_config'];

/**
 * Resolve identity from an environment variable.
 */
function resolveFromEnv(envVariable: string): string | null {
  const value = process.env[envVariable];
  return value && value.trim() ? value.trim() : null;
}

/**
 * Resolve identity from git config user.name.
 */
function resolveFromGitConfig(): string | null {
  try {
    const result = execSync('git config user.name', {
      encoding: 'utf8',
      timeout: 3000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result && result.trim() ? result.trim() : null;
  } catch {
    return null;
  }
}

// ─── Resolver map ────────────────────────────────────────────

const RESOLVERS: Record<string, (envVar: string) => string | null> = {
  env: (envVar) => resolveFromEnv(envVar),
  git_config: () => resolveFromGitConfig(),
};

// ─── Public API ──────────────────────────────────────────────

/**
 * Resolve the current user identity using the configured resolution order.
 *
 * @param config - Identity configuration from governance-policies.json
 * @returns Resolved identity with user string and source
 */
export function resolveIdentity(config: IdentityConfig = {}): ResolvedIdentity {
  const order = config.resolve_order || DEFAULT_RESOLVE_ORDER;
  const envVariable = config.env_variable || DEFAULT_ENV_VARIABLE;
  const fallback = config.fallback || DEFAULT_FALLBACK;

  for (const method of order) {
    const resolver = RESOLVERS[method];
    if (!resolver) continue;
    const result = resolver(envVariable);
    if (result) {
      return {
        user: result,
        source: method as ResolvedIdentity['source'],
        resolved_at: new Date().toISOString(),
      };
    }
  }

  return {
    user: fallback,
    source: 'fallback',
    resolved_at: new Date().toISOString(),
  };
}
