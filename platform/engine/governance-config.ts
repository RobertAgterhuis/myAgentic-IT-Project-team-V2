/**
 * Governance Configuration (M4: Governance Mode + Advisory Logging)
 *
 * Loads governance-policies.json and provides the governance mode setting.
 * Modes:
 *   - 'off'       → No governance checks (current/legacy behavior)
 *   - 'advisory'  → Gate results include governance report, non-blocking
 *   - 'enforcing' → Gate results include governance report, blocking (future)
 *
 * @module engine/governance-config
 */

import path from 'path';

// ─── Types ───────────────────────────────────────────────────

export type GovernanceMode = 'off' | 'advisory' | 'enforcing';

export interface GovernancePolicy {
  id: string;
  gate_pattern: string;
  description: string;
  required_roles: string[];
  min_approvals: number;
  auto_approve: boolean;
  advisory_message: string;
}

export interface GovernancePoliciesConfig {
  governance_mode: GovernanceMode;
  policies: GovernancePolicy[];
  identity: {
    resolve_order: string[];
    env_variable: string;
    fallback: string;
  };
  audit: {
    log_governance_checks: boolean;
    log_identity_resolution: boolean;
    include_advisory_in_gate_result: boolean;
  };
}

// ─── Defaults ────────────────────────────────────────────────

const DEFAULT_POLICIES_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'templates',
  'sdlc',
  'governance-policies.json'
);

const DEFAULT_CONFIG: GovernancePoliciesConfig = {
  governance_mode: 'off',
  policies: [],
  identity: {
    resolve_order: ['env', 'git_config'],
    env_variable: 'SDLC_USER',
    fallback: 'anonymous',
  },
  audit: {
    log_governance_checks: false,
    log_identity_resolution: false,
    include_advisory_in_gate_result: false,
  },
};

// ─── Store interface ─────────────────────────────────────────

interface ConfigStore {
  exists(path: string): boolean;
  readFile(path: string): string;
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Load governance policies from disk.
 * Returns default (mode=off) config if file does not exist.
 *
 * @param store - File store abstraction
 * @param policiesPath - Override path to governance-policies.json
 */
export function loadGovernancePolicies(
  store: ConfigStore,
  policiesPath?: string
): GovernancePoliciesConfig {
  const target = policiesPath || DEFAULT_POLICIES_PATH;

  if (!store.exists(target)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = store.readFile(target);
    const parsed = JSON.parse(raw);

    // Validate governance_mode
    const mode = parsed.governance_mode;
    if (mode !== 'off' && mode !== 'advisory' && mode !== 'enforcing') {
      return { ...DEFAULT_CONFIG };
    }

    return {
      governance_mode: mode,
      policies: Array.isArray(parsed.policies) ? parsed.policies : [],
      identity: {
        resolve_order: parsed.identity?.resolve_order || DEFAULT_CONFIG.identity.resolve_order,
        env_variable: parsed.identity?.env_variable || DEFAULT_CONFIG.identity.env_variable,
        fallback: parsed.identity?.fallback || DEFAULT_CONFIG.identity.fallback,
      },
      audit: {
        log_governance_checks:
          parsed.audit?.log_governance_checks ?? DEFAULT_CONFIG.audit.log_governance_checks,
        log_identity_resolution:
          parsed.audit?.log_identity_resolution ?? DEFAULT_CONFIG.audit.log_identity_resolution,
        include_advisory_in_gate_result:
          parsed.audit?.include_advisory_in_gate_result ??
          DEFAULT_CONFIG.audit.include_advisory_in_gate_result,
      },
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Find policies that match a given gate/state name.
 * Supports wildcard patterns like 'CRITIC_*'.
 *
 * @param policies - Array of governance policies
 * @param gateName - The gate state name, e.g. 'CRITIC_1', 'SPRINT_GATE'
 */
export function matchPolicies(policies: GovernancePolicy[], gateName: string): GovernancePolicy[] {
  return policies.filter((p) => {
    const pattern = p.gate_pattern;
    if (pattern === gateName) return true;
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return gateName.startsWith(prefix);
    }
    return false;
  });
}
