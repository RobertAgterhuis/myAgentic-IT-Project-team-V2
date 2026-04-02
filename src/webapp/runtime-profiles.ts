// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Runtime Profile System (M2-001) — Explicit profile detection and validation.
 *
 * Formalizes four canonical runtime profiles:
 * - local-dev: developer workstation, all services optional
 * - ci-test: automated testing, deterministic in-process services
 * - production-single-node: single-instance production, requires persistent storage
 * - production-distributed: multi-instance production, requires Redis + persistent storage
 *
 * @module runtime-profiles
 */

import type {
  StorageProviderType,
  QueueProviderType,
  SessionStoreType,
  ToolIsolationLevel,
} from './config';

/**
 * Runtime profile identifier.
 */
export type RuntimeProfile =
  | 'local-dev'
  | 'ci-test'
  | 'production-single-node'
  | 'production-distributed';

/**
 * Profile-specific environment contract.
 */
export interface ProfileContract {
  profile: RuntimeProfile;
  name: string;
  description: string;
  storageProvider: {
    required: boolean;
    allowedValues: StorageProviderType[];
    recommended: StorageProviderType;
  };
  queueProvider: {
    required: boolean;
    allowedValues: QueueProviderType[];
    recommended: QueueProviderType;
  };
  sessionStore: {
    required: boolean;
    allowedValues: SessionStoreType[];
    recommended: SessionStoreType;
  };
  redis: {
    required: boolean;
    description: string;
  };
  auth: {
    required: boolean;
    description: string;
  };
  trustProxy: {
    required: boolean;
    description: string;
  };
  toolIsolation: {
    required: boolean;
    allowedValues: ToolIsolationLevel[];
    recommended: ToolIsolationLevel;
  };
  startupBehavior: string;
}

/**
 * All runtime profile contracts.
 */
export const PROFILE_CONTRACTS: Record<RuntimeProfile, ProfileContract> = {
  'local-dev': {
    profile: 'local-dev',
    name: 'Local Development',
    description: 'Developer workstation with zero external dependencies. All services optional.',
    storageProvider: {
      required: false,
      allowedValues: ['file', 'sqlite', 'remote'],
      recommended: 'file',
    },
    queueProvider: {
      required: false,
      allowedValues: ['memory', 'persistent', 'bullmq'],
      recommended: 'memory',
    },
    sessionStore: {
      required: false,
      allowedValues: ['sqlite', 'redis'],
      recommended: 'sqlite',
    },
    redis: {
      required: false,
      description:
        'Optional. If omitted, Redis-backed features (SSE, sessions, queueing) are disabled.',
    },
    auth: {
      required: false,
      description:
        'Optional. GitHub OAuth and API_KEY both optional. Unauthenticated access allowed on localhost.',
    },
    trustProxy: {
      required: false,
      description: 'Not applicable; localhost binding exempts from proxy requirements.',
    },
    toolIsolation: {
      required: false,
      allowedValues: ['none', 'process', 'restricted'],
      recommended: 'process',
    },
    startupBehavior:
      'Tolerates missing services. Logs warnings but continues with fallback modes. No data loss risk.',
  },

  'ci-test': {
    profile: 'ci-test',
    name: 'CI/Test',
    description: 'Automated testing environment. Deterministic, ephemeral state.',
    storageProvider: {
      required: false,
      allowedValues: ['file', 'sqlite', 'remote'],
      recommended: 'file',
    },
    queueProvider: {
      required: false,
      allowedValues: ['memory', 'persistent', 'bullmq'],
      recommended: 'memory',
    },
    sessionStore: {
      required: false,
      allowedValues: ['sqlite', 'redis'],
      recommended: 'sqlite',
    },
    redis: {
      required: false,
      description:
        'Optional. Omit for test isolation. Redis is not automatically seeded per test; stateful tests should provide fixtures.',
    },
    auth: {
      required: false,
      description:
        'Optional. Test harness can inject fake credentials or bypass auth. Configure GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET if testing OAuth paths.',
    },
    trustProxy: {
      required: false,
      description: 'Not applicable; CI runners typically bind to localhost.',
    },
    toolIsolation: {
      required: false,
      allowedValues: ['none', 'process', 'restricted'],
      recommended: 'process',
    },
    startupBehavior:
      'Tolerates missing services (same as local-dev). Tests run in isolation with minimal external state.',
  },

  'production-single-node': {
    profile: 'production-single-node',
    name: 'Production (Single Node)',
    description:
      'Single-instance production deployment. Persistent storage ' +
      'required, startup is fail-closed.',
    storageProvider: {
      required: true,
      allowedValues: ['sqlite', 'remote'],
      recommended: 'sqlite',
    },
    queueProvider: {
      required: false,
      allowedValues: ['persistent', 'bullmq'],
      recommended: 'persistent',
    },
    sessionStore: {
      required: false,
      allowedValues: ['sqlite', 'redis'],
      recommended: 'sqlite',
    },
    redis: {
      required: false,
      description:
        'Optional. If omitted, in-memory queue and local sessions used. If set, startup fails if Redis is unreachable.',
    },
    auth: {
      required: true,
      description:
        'Required. Must configure GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET OR API_KEY (min 24 chars). Non-local binding rejects unauthenticated requests.',
    },
    trustProxy: {
      required: true,
      description:
        'Required if accessed through a proxy or load balancer. Must be set to an explicit value (IP, count, or list) — never use trustProxy=true.',
    },
    toolIsolation: {
      required: true,
      allowedValues: ['restricted'],
      recommended: 'restricted',
    },
    startupBehavior:
      'Strict fail-closed. Storage provider initialization failure exits with code 1. No fallback. All services must be reachable.',
  },

  'production-distributed': {
    profile: 'production-distributed',
    name: 'Production (Distributed)',
    description:
      'Multi-instance production with shared state via Redis. High-availability, horizontal scale capable.',
    storageProvider: {
      required: true,
      allowedValues: ['sqlite', 'remote'],
      recommended: 'remote',
    },
    queueProvider: {
      required: true,
      allowedValues: ['bullmq'],
      recommended: 'bullmq',
    },
    sessionStore: {
      required: true,
      allowedValues: ['redis'],
      recommended: 'redis',
    },
    redis: {
      required: true,
      description:
        'Required. REDIS_URL must be set and point to accessible Redis instance. Startup fails if unreachable.',
    },
    auth: {
      required: true,
      description:
        'Required. Must configure GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET OR API_KEY (min 24 chars).',
    },
    trustProxy: {
      required: true,
      description:
        'Required. Load balancer in front; must set TRUST_PROXY to explicit proxy config (not true).',
    },
    toolIsolation: {
      required: true,
      allowedValues: ['restricted'],
      recommended: 'restricted',
    },
    startupBehavior:
      'Strict fail-closed. All infrastructure must be reachable: storage, Redis, auth. Any initialization failure exits with code 1.',
  },
};

/**
 * Detect the runtime profile from environment variables.
 *
 * Detection rules:
 * - If NODE_ENV=test → ci-test
 * - Else if NODE_ENV=production OR non-localhost binding → Check Redis + auth for distributed vs single-node
 * - Else → local-dev
 */
export function detectProfile(config: {
  nodeEnv?: string;
  host: string;
  storageProvider: StorageProviderType;
  queueProvider: QueueProviderType;
  sessionStore: SessionStoreType;
  redisUrl?: string;
  hasAuth: boolean;
}): RuntimeProfile {
  // CI/Test detection
  if (config.nodeEnv === 'test') {
    return 'ci-test';
  }

  const isProduction = config.nodeEnv === 'production' || !isLocalBinding(config.host);

  if (!isProduction) {
    return 'local-dev';
  }

  // Production: single-node or distributed?
  const isDistributed =
    config.queueProvider === 'bullmq' && config.sessionStore === 'redis' && config.redisUrl;

  return isDistributed ? 'production-distributed' : 'production-single-node';
}

/**
 * Check if a host binding is local.
 * @internal
 */
function isLocalBinding(host: string): boolean {
  const local = ['127.0.0.1', 'localhost', '::1', '0:0:0:0:0:0:0:1'];
  return local.includes(host);
}

/**
 * Validation result from validateProfile.
 */
export interface ProfileValidationResult {
  valid: boolean;
  profile: RuntimeProfile;
  errors: string[];
  warnings: string[];
}

/**
 * Validate provider configuration against the detected profile.
 *
 * Returns errors (blocking) and warnings (informational).
 * A profile is valid if all error conditions are false.
 */
export function validateProfile(config: {
  nodeEnv?: string;
  host: string;
  storageProvider: StorageProviderType;
  queueProvider: QueueProviderType;
  sessionStore: SessionStoreType;
  redisUrl?: string;
  hasAuth: boolean;
  trustProxy: boolean | number | string | string[];
  toolIsolationLevel: ToolIsolationLevel;
  toolExecMaxTimeoutMs: number;
  toolExecMaxOutputBytes: number;
  toolExecMaxMemoryMb: number;
  toolExecRequireWorkspaceCwd: boolean;
}): ProfileValidationResult {
  const profile = detectProfile(config as Parameters<typeof detectProfile>[0]);
  const contract = PROFILE_CONTRACTS[profile];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate storage provider
  if (contract.storageProvider.required && !config.storageProvider) {
    errors.push(
      `Profile '${profile}' requires STORAGE_PROVIDER; got undefined. ` +
        `Allowed: ${contract.storageProvider.allowedValues.join(', ')}.`
    );
  }
  if (
    config.storageProvider &&
    !contract.storageProvider.allowedValues.includes(config.storageProvider)
  ) {
    errors.push(
      `Profile '${profile}' does not allow STORAGE_PROVIDER='${config.storageProvider}'. ` +
        `Allowed: ${contract.storageProvider.allowedValues.join(', ')}.`
    );
  }

  // Validate queue provider
  if (contract.queueProvider.required && !config.queueProvider) {
    errors.push(
      `Profile '${profile}' requires QUEUE_PROVIDER; got undefined. ` +
        `Allowed: ${contract.queueProvider.allowedValues.join(', ')}.`
    );
  }
  if (
    config.queueProvider &&
    !contract.queueProvider.allowedValues.includes(config.queueProvider)
  ) {
    errors.push(
      `Profile '${profile}' does not allow QUEUE_PROVIDER='${config.queueProvider}'. ` +
        `Allowed: ${contract.queueProvider.allowedValues.join(', ')}.`
    );
  }

  // Validate session store
  if (contract.sessionStore.required && !config.sessionStore) {
    errors.push(
      `Profile '${profile}' requires SESSION_STORE; got undefined. ` +
        `Allowed: ${contract.sessionStore.allowedValues.join(', ')}.`
    );
  }
  if (config.sessionStore && !contract.sessionStore.allowedValues.includes(config.sessionStore)) {
    errors.push(
      `Profile '${profile}' does not allow SESSION_STORE='${config.sessionStore}'. ` +
        `Allowed: ${contract.sessionStore.allowedValues.join(', ')}.`
    );
  }

  // Validate Redis requirement
  if (contract.redis.required && !config.redisUrl) {
    errors.push(`Profile '${profile}' requires REDIS_URL to be set. ${contract.redis.description}`);
  }
  if (!contract.redis.required && config.queueProvider === 'bullmq' && !config.redisUrl) {
    warnings.push(
      `Profile '${profile}' has QUEUE_PROVIDER='bullmq' but REDIS_URL is not set. BullMQ requires Redis.`
    );
  }

  // Validate auth requirement
  if (contract.auth.required && !config.hasAuth) {
    errors.push(`Profile '${profile}' requires authentication. ${contract.auth.description}`);
  }

  if (
    config.toolIsolationLevel &&
    !contract.toolIsolation.allowedValues.includes(config.toolIsolationLevel)
  ) {
    errors.push(
      `Profile '${profile}' does not allow AGENT_TOOL_ISOLATION_LEVEL='${config.toolIsolationLevel}'. ` +
        `Allowed: ${contract.toolIsolation.allowedValues.join(', ')}.`
    );
  }

  if (contract.toolIsolation.required && !config.toolIsolationLevel) {
    errors.push(
      `Profile '${profile}' requires AGENT_TOOL_ISOLATION_LEVEL. ` +
        `Allowed: ${contract.toolIsolation.allowedValues.join(', ')}.`
    );
  }

  if (profile.startsWith('production-')) {
    if (!config.toolExecRequireWorkspaceCwd) {
      errors.push(
        `Profile '${profile}' requires TOOL_EXEC_REQUIRE_WORKSPACE_CWD=true so tool execution stays workspace-bound.`
      );
    }
    if (!Number.isFinite(config.toolExecMaxTimeoutMs) || config.toolExecMaxTimeoutMs <= 0) {
      errors.push(
        `Profile '${profile}' requires TOOL_EXEC_MAX_TIMEOUT_MS to be a positive integer.`
      );
    }
    if (!Number.isFinite(config.toolExecMaxOutputBytes) || config.toolExecMaxOutputBytes <= 0) {
      errors.push(
        `Profile '${profile}' requires TOOL_EXEC_MAX_OUTPUT_BYTES to be a positive integer.`
      );
    }
    if (!Number.isFinite(config.toolExecMaxMemoryMb) || config.toolExecMaxMemoryMb <= 0) {
      errors.push(
        `Profile '${profile}' requires TOOL_EXEC_MAX_MEMORY_MB to be a positive integer.`
      );
    }
  }

  // Validate trustProxy requirement
  if (contract.trustProxy.required) {
    const trustProxyIsExplicit =
      typeof config.trustProxy === 'number' ||
      (typeof config.trustProxy === 'string' &&
        config.trustProxy !== 'false' &&
        config.trustProxy !== 'true') ||
      (Array.isArray(config.trustProxy) && config.trustProxy.length > 0);

    if (!trustProxyIsExplicit) {
      errors.push(
        `Profile '${profile}' requires explicit TRUST_PROXY config ` +
          '(IP address, count, or list). ' +
          `Got: ${String(config.trustProxy)}. ${contract.trustProxy.description}`
      );
    }
  }

  // Cross-validate: partial distributed config is always an error.
  // If any distributed indicator is set (bullmq queue, redis session, REDIS_URL),
  // all three must be consistently configured.
  if (profile === 'production-single-node') {
    const hasDistributedQueue = config.queueProvider === 'bullmq';
    const hasRedisSession = config.sessionStore === 'redis';
    const hasRedisUrl = Boolean(config.redisUrl);
    const distributedIndicators = [hasDistributedQueue, hasRedisSession, hasRedisUrl];
    if (distributedIndicators.some(Boolean) && !distributedIndicators.every(Boolean)) {
      if (!hasDistributedQueue) {
        errors.push(
          `Partial distributed config: QUEUE_PROVIDER must be 'bullmq' when SESSION_STORE='redis' or REDIS_URL is set.`
        );
      }
      if (!hasRedisSession) {
        errors.push(
          `Partial distributed config: SESSION_STORE must be 'redis' when QUEUE_PROVIDER='bullmq' or REDIS_URL is set.`
        );
      }
      if (!hasRedisUrl) {
        errors.push(
          `Partial distributed config: REDIS_URL must be set when QUEUE_PROVIDER='bullmq' or SESSION_STORE='redis'.`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    profile,
    errors,
    warnings,
  };
}

/**
 * Helper: check if the config has any auth method configured.
 */
export function hasAuthConfigured(config: {
  githubClientId?: string;
  githubClientSecret?: string;
  entraClientId?: string;
  apiKey?: string;
}): boolean {
  const hasGithub =
    Boolean(config.githubClientId && config.githubClientId.trim().length > 0) &&
    Boolean(config.githubClientSecret && config.githubClientSecret.trim().length > 0);
  const hasEntra = Boolean(config.entraClientId && config.entraClientId.trim().length > 0);
  const hasApiKey = config.apiKey && config.apiKey.length >= 24;
  return !!(hasGithub || hasEntra || hasApiKey);
}

/**
 * Scale prerequisites check (M4/Epic-659).
 *
 * Verifies that infrastructure required by the detected runtime profile is
 * actually reachable at startup — not just that the right env vars are set.
 *
 * For `production-distributed`: Redis connectivity is mandatory. If the ping
 * fails, this function throws so the process exits before accepting traffic.
 *
 * For `production-single-node` with Redis configured: Redis connectivity is
 * checked but only logged as a warning on failure (Redis is optional there).
 *
 * A `ping` function is injected for testability.
 *
 * @param config  - Same shape as the one used for detectProfile.
 * @param ping    - Async function that resolves on success or rejects on failure.
 * @param log     - Optional structured logger (level, event, data).
 */
export async function assertScalePrerequisites(
  config: {
    nodeEnv?: string;
    host: string;
    storageProvider: StorageProviderType;
    queueProvider: QueueProviderType;
    sessionStore: SessionStoreType;
    redisUrl?: string;
    hasAuth: boolean;
  },
  ping: () => Promise<void>,
  log?: (level: string, event: string, data: Record<string, unknown>) => void
): Promise<void> {
  const profile = detectProfile(config);
  const _log = log ?? (() => {});

  if (profile === 'production-distributed') {
    // Redis is required — fail startup if unreachable
    try {
      await ping();
      _log('info', 'startup_redis_connectivity_ok', { profile });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      _log('error', 'startup_redis_unreachable', { profile, error: message });
      throw Object.assign(
        new Error(
          `Profile '${profile}' requires Redis but the connectivity check failed: ${message}`
        ),
        { code: 'REDIS_UNREACHABLE', profile }
      );
    }
  } else if ((profile === 'production-single-node' || profile === 'local-dev') && config.redisUrl) {
    // Redis is configured but optional — warn on failure, continue
    try {
      await ping();
      _log('info', 'startup_redis_connectivity_ok', { profile });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      _log('warn', 'startup_redis_unreachable_optional', {
        profile,
        error: message,
        consequence: 'Redis-backed SSE and queueing will not be available',
      });
    }
  }
}
