// Copyright (c) 2026 Robert Agterhuis. MIT License.

import * as __req_0 from '../../src/webapp/runtime-profiles';
const {
  detectProfile,
  validateProfile,
  hasAuthConfigured,
  PROFILE_CONTRACTS,
  assertScalePrerequisites,
} = __req_0;

describe('Runtime Profiles', () => {
  describe('detectProfile', () => {
    it('detects ci-test when NODE_ENV=test', () => {
      const profile = detectProfile({
        nodeEnv: 'test',
        host: '127.0.0.1',
        storageProvider: 'file',
        queueProvider: 'memory',
        sessionStore: 'sqlite',
        hasAuth: false,
      });
      expect(profile).toBe('ci-test');
    });

    it('detects local-dev when on localhost without production context', () => {
      const profile = detectProfile({
        nodeEnv: 'development',
        host: 'localhost',
        storageProvider: 'file',
        queueProvider: 'memory',
        sessionStore: 'sqlite',
        hasAuth: false,
      });
      expect(profile).toBe('local-dev');
    });

    it('detects production-single-node when NODE_ENV=production without distributed setup', () => {
      const profile = detectProfile({
        nodeEnv: 'production',
        host: '0.0.0.0',
        storageProvider: 'sqlite',
        queueProvider: 'persistent',
        sessionStore: 'sqlite',
        hasAuth: true,
      });
      expect(profile).toBe('production-single-node');
    });

    it('detects production-distributed when all conditions met (bullmq + redis)', () => {
      const profile = detectProfile({
        nodeEnv: 'production',
        host: '0.0.0.0',
        storageProvider: 'sqlite',
        queueProvider: 'bullmq',
        sessionStore: 'redis',
        redisUrl: 'redis://localhost:6379',
        hasAuth: true,
      });
      expect(profile).toBe('production-distributed');
    });

    it('detects production-single-node when non-localhost without distributed setup', () => {
      const profile = detectProfile({
        nodeEnv: undefined,
        host: '192.168.1.1',
        storageProvider: 'sqlite',
        queueProvider: 'persistent',
        sessionStore: 'sqlite',
        hasAuth: true,
      });
      expect(profile).toBe('production-single-node');
    });
  });

  describe('validateProfile', () => {
    describe('local-dev profile', () => {
      it('accepts standard local-dev config', () => {
        const result = validateProfile({
          nodeEnv: 'development',
          host: '127.0.0.1',
          storageProvider: 'file',
          queueProvider: 'memory',
          sessionStore: 'sqlite',
          hasAuth: false,
          trustProxy: false,
          toolIsolationLevel: 'process',
          toolExecMaxTimeoutMs: 120000,
          toolExecMaxOutputBytes: 1024,
          toolExecMaxMemoryMb: 512,
          toolExecRequireWorkspaceCwd: true,
        });
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.profile).toBe('local-dev');
      });

      it('allows optional services in local-dev', () => {
        const result = validateProfile({
          nodeEnv: 'development',
          host: 'localhost',
          storageProvider: 'sqlite',
          queueProvider: 'bullmq',
          sessionStore: 'redis',
          redisUrl: 'redis://localhost:6379',
          hasAuth: true,
          trustProxy: false,
          toolIsolationLevel: 'process',
          toolExecMaxTimeoutMs: 120000,
          toolExecMaxOutputBytes: 1024,
          toolExecMaxMemoryMb: 512,
          toolExecRequireWorkspaceCwd: true,
        });
        expect(result.valid).toBe(true);
        expect(result.profile).toBe('local-dev');
      });
    });

    describe('ci-test profile', () => {
      it('accepts standard ci-test config', () => {
        const result = validateProfile({
          nodeEnv: 'test',
          host: 'localhost',
          storageProvider: 'file',
          queueProvider: 'memory',
          sessionStore: 'sqlite',
          hasAuth: false,
          trustProxy: false,
          toolIsolationLevel: 'process',
          toolExecMaxTimeoutMs: 120000,
          toolExecMaxOutputBytes: 1024,
          toolExecMaxMemoryMb: 512,
          toolExecRequireWorkspaceCwd: true,
        });
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.profile).toBe('ci-test');
      });
    });

    describe('production-single-node profile', () => {
      it('accepts valid single-node config', () => {
        const result = validateProfile({
          nodeEnv: 'production',
          host: '0.0.0.0',
          storageProvider: 'sqlite',
          queueProvider: 'persistent',
          sessionStore: 'sqlite',
          hasAuth: true,
          trustProxy: 1,
          toolIsolationLevel: 'restricted',
          toolExecMaxTimeoutMs: 120000,
          toolExecMaxOutputBytes: 1024,
          toolExecMaxMemoryMb: 512,
          toolExecRequireWorkspaceCwd: true,
        });
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.profile).toBe('production-single-node');
      });

      it('rejects when storage provider is not sqlite', () => {
        const result = validateProfile({
          nodeEnv: 'production',
          host: '0.0.0.0',
          storageProvider: 'file',
          queueProvider: 'persistent',
          sessionStore: 'sqlite',
          hasAuth: true,
          trustProxy: 1,
          toolIsolationLevel: 'restricted',
          toolExecMaxTimeoutMs: 120000,
          toolExecMaxOutputBytes: 1024,
          toolExecMaxMemoryMb: 512,
          toolExecRequireWorkspaceCwd: true,
        });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('STORAGE_PROVIDER'))).toBe(true);
      });

      it('rejects when auth is not configured', () => {
        const result = validateProfile({
          nodeEnv: 'production',
          host: '0.0.0.0',
          storageProvider: 'sqlite',
          queueProvider: 'persistent',
          sessionStore: 'sqlite',
          hasAuth: false,
          trustProxy: 1,
          toolIsolationLevel: 'restricted',
          toolExecMaxTimeoutMs: 120000,
          toolExecMaxOutputBytes: 1024,
          toolExecMaxMemoryMb: 512,
          toolExecRequireWorkspaceCwd: true,
        });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('authentication'))).toBe(true);
      });

      it('rejects implicit trust proxy config (true)', () => {
        const result = validateProfile({
          nodeEnv: 'production',
          host: '0.0.0.0',
          storageProvider: 'sqlite',
          queueProvider: 'persistent',
          sessionStore: 'sqlite',
          hasAuth: true,
          trustProxy: true,
          toolIsolationLevel: 'restricted',
          toolExecMaxTimeoutMs: 120000,
          toolExecMaxOutputBytes: 1024,
          toolExecMaxMemoryMb: 512,
          toolExecRequireWorkspaceCwd: true,
        });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('explicit TRUST_PROXY'))).toBe(true);
      });

      it('accepts explicit trust proxy config (number)', () => {
        const result = validateProfile({
          nodeEnv: 'production',
          host: '0.0.0.0',
          storageProvider: 'sqlite',
          queueProvider: 'persistent',
          sessionStore: 'sqlite',
          hasAuth: true,
          trustProxy: 2,
          toolIsolationLevel: 'restricted',
          toolExecMaxTimeoutMs: 120000,
          toolExecMaxOutputBytes: 1024,
          toolExecMaxMemoryMb: 512,
          toolExecRequireWorkspaceCwd: true,
        });
        expect(result.valid).toBe(true);
      });

      it('accepts explicit trust proxy config (IP list)', () => {
        const result = validateProfile({
          nodeEnv: 'production',
          host: '0.0.0.0',
          storageProvider: 'sqlite',
          queueProvider: 'persistent',
          sessionStore: 'sqlite',
          hasAuth: true,
          trustProxy: ['10.0.0.1', '10.0.0.2'],
          toolIsolationLevel: 'restricted',
          toolExecMaxTimeoutMs: 120000,
          toolExecMaxOutputBytes: 1024,
          toolExecMaxMemoryMb: 512,
          toolExecRequireWorkspaceCwd: true,
        });
        expect(result.valid).toBe(true);
      });

      it('rejects unsafe tool isolation level in production', () => {
        const result = validateProfile({
          nodeEnv: 'production',
          host: '0.0.0.0',
          storageProvider: 'sqlite',
          queueProvider: 'persistent',
          sessionStore: 'sqlite',
          hasAuth: true,
          trustProxy: 1,
          toolIsolationLevel: 'process',
          toolExecMaxTimeoutMs: 120000,
          toolExecMaxOutputBytes: 1024,
          toolExecMaxMemoryMb: 512,
          toolExecRequireWorkspaceCwd: true,
        });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('AGENT_TOOL_ISOLATION_LEVEL'))).toBe(true);
      });
    });

    describe('production-distributed profile', () => {
      it('accepts valid distributed config', () => {
        const result = validateProfile({
          nodeEnv: 'production',
          host: '0.0.0.0',
          storageProvider: 'sqlite',
          queueProvider: 'bullmq',
          sessionStore: 'redis',
          redisUrl: 'redis://redis-cluster:6379',
          hasAuth: true,
          trustProxy: 1,
          toolIsolationLevel: 'restricted',
          toolExecMaxTimeoutMs: 120000,
          toolExecMaxOutputBytes: 1024,
          toolExecMaxMemoryMb: 512,
          toolExecRequireWorkspaceCwd: true,
        });
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.profile).toBe('production-distributed');
      });

      it('rejects when queue provider is not bullmq', () => {
        const result = validateProfile({
          nodeEnv: 'production',
          host: '0.0.0.0',
          storageProvider: 'sqlite',
          queueProvider: 'persistent',
          sessionStore: 'redis',
          redisUrl: 'redis://localhost:6379',
          hasAuth: true,
          trustProxy: 1,
          toolIsolationLevel: 'restricted',
          toolExecMaxTimeoutMs: 120000,
          toolExecMaxOutputBytes: 1024,
          toolExecMaxMemoryMb: 512,
          toolExecRequireWorkspaceCwd: true,
        });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('QUEUE_PROVIDER'))).toBe(true);
      });

      it('rejects when session store is not redis', () => {
        const result = validateProfile({
          nodeEnv: 'production',
          host: '0.0.0.0',
          storageProvider: 'sqlite',
          queueProvider: 'bullmq',
          sessionStore: 'sqlite',
          redisUrl: 'redis://localhost:6379',
          hasAuth: true,
          trustProxy: 1,
          toolIsolationLevel: 'restricted',
          toolExecMaxTimeoutMs: 120000,
          toolExecMaxOutputBytes: 1024,
          toolExecMaxMemoryMb: 512,
          toolExecRequireWorkspaceCwd: true,
        });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('SESSION_STORE'))).toBe(true);
      });

      it('rejects when redis URL is not set', () => {
        const result = validateProfile({
          nodeEnv: 'production',
          host: '0.0.0.0',
          storageProvider: 'sqlite',
          queueProvider: 'bullmq',
          sessionStore: 'redis',
          redisUrl: undefined,
          hasAuth: true,
          trustProxy: 1,
          toolIsolationLevel: 'restricted',
          toolExecMaxTimeoutMs: 120000,
          toolExecMaxOutputBytes: 1024,
          toolExecMaxMemoryMb: 512,
          toolExecRequireWorkspaceCwd: true,
        });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('REDIS_URL'))).toBe(true);
      });
    });
  });

  describe('hasAuthConfigured', () => {
    it('returns true for valid GitHub OAuth', () => {
      const result = hasAuthConfigured({
        githubClientId: 'Iv1.abc123',
        githubClientSecret: 'github-secret',
      });
      expect(result).toBe(true);
    });

    it('returns false for incomplete GitHub OAuth config', () => {
      const result = hasAuthConfigured({
        githubClientId: 'Iv1.abc123',
      });
      expect(result).toBe(false);
    });

    it('returns true for Entra auth config', () => {
      const result = hasAuthConfigured({
        entraClientId: 'entra-client-id',
      });
      expect(result).toBe(true);
    });

    it('returns true for valid API_KEY', () => {
      const result = hasAuthConfigured({
        apiKey: 'sk-1234567890ABCDEFGHIJKLMNOP',
      });
      expect(result).toBe(true);
    });

    it('returns true for both methods set', () => {
      const result = hasAuthConfigured({
        githubClientId: 'Iv1.abc123',
        githubClientSecret: 'github-secret',
        apiKey: 'sk-1234567890ABCDEFGHIJKLMNOP',
      });
      expect(result).toBe(true);
    });

    it('returns false when neither is set', () => {
      const result = hasAuthConfigured({});
      expect(result).toBe(false);
    });

    it('returns false for invalid API_KEY (< 24 chars)', () => {
      const result = hasAuthConfigured({
        apiKey: 'sk-tooshort',
      });
      expect(result).toBe(false);
    });

    it('returns false for empty GitHub client ID', () => {
      const result = hasAuthConfigured({
        githubClientId: '   ',
      });
      expect(result).toBe(false);
    });
  });

  describe('PROFILE_CONTRACTS', () => {
    it('defines contracts for all four profiles', () => {
      expect(Object.keys(PROFILE_CONTRACTS)).toEqual([
        'local-dev',
        'ci-test',
        'production-single-node',
        'production-distributed',
      ]);
    });

    it('local-dev contract has no required services', () => {
      const contract = PROFILE_CONTRACTS['local-dev'];
      expect(contract.storageProvider.required).toBe(false);
      expect(contract.queueProvider.required).toBe(false);
      expect(contract.sessionStore.required).toBe(false);
      expect(contract.redis.required).toBe(false);
      expect(contract.auth.required).toBe(false);
    });

    it('production-single-node requires storage and auth', () => {
      const contract = PROFILE_CONTRACTS['production-single-node'];
      expect(contract.storageProvider.required).toBe(true);
      expect(contract.auth.required).toBe(true);
      expect(contract.trustProxy.required).toBe(true);
    });

    it('production-distributed requires all services', () => {
      const contract = PROFILE_CONTRACTS['production-distributed'];
      expect(contract.storageProvider.required).toBe(true);
      expect(contract.queueProvider.required).toBe(true);
      expect(contract.sessionStore.required).toBe(true);
      expect(contract.redis.required).toBe(true);
      expect(contract.auth.required).toBe(true);
      expect(contract.trustProxy.required).toBe(true);
    });
  });

  describe('assertScalePrerequisites (M4/Epic-659)', () => {
    const distributedConfig = {
      nodeEnv: 'production',
      host: '0.0.0.0',
      storageProvider: 'sqlite',
      queueProvider: 'bullmq',
      sessionStore: 'redis',
      redisUrl: 'redis://localhost:6379',
      hasAuth: true,
    };

    it('throws REDIS_UNREACHABLE for production-distributed when ping fails', async () => {
      const logs = [];

      await expect(
        assertScalePrerequisites(
          distributedConfig,
          async () => {
            throw new Error('connection refused');
          },
          (level, event, data) => logs.push({ level, event, data })
        )
      ).rejects.toMatchObject({ code: 'REDIS_UNREACHABLE' });

      expect(logs.some((l) => l.event === 'startup_redis_unreachable')).toBe(true);
    });

    it('resolves for production-distributed when ping succeeds', async () => {
      const logs = [];

      await expect(
        assertScalePrerequisites(
          distributedConfig,
          async () => {
            return;
          },
          (level, event, data) => logs.push({ level, event, data })
        )
      ).resolves.toBeUndefined();

      expect(logs.some((l) => l.event === 'startup_redis_connectivity_ok')).toBe(true);
    });

    it('warns but continues for production-single-node with optional redis and failed ping', async () => {
      const logs = [];

      await expect(
        assertScalePrerequisites(
          {
            nodeEnv: 'production',
            host: '0.0.0.0',
            storageProvider: 'sqlite',
            queueProvider: 'persistent',
            sessionStore: 'sqlite',
            redisUrl: 'redis://localhost:6379',
            hasAuth: true,
          },
          async () => {
            throw new Error('redis unavailable');
          },
          (level, event, data) => logs.push({ level, event, data })
        )
      ).resolves.toBeUndefined();

      expect(
        logs.some((l) => l.level === 'warn' && l.event === 'startup_redis_unreachable_optional')
      ).toBe(true);
    });

    it('does not call ping for local-dev without redis URL', async () => {
      let pingCalls = 0;

      await expect(
        assertScalePrerequisites(
          {
            nodeEnv: 'development',
            host: '127.0.0.1',
            storageProvider: 'file',
            queueProvider: 'memory',
            sessionStore: 'sqlite',
            hasAuth: false,
          },
          async () => {
            pingCalls += 1;
          }
        )
      ).resolves.toBeUndefined();

      expect(pingCalls).toBe(0);
    });
  });
});
