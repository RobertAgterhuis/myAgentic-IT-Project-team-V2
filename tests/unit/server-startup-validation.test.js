// Copyright (c) 2026 Robert Agterhuis. MIT License.

const ENV_KEYS = [
  'NODE_ENV',
  'HOST',
  'STORAGE_PROVIDER',
  'STORAGE_PATH',
  'QUEUE_PROVIDER',
  'SESSION_STORE',
  'REDIS_URL',
  'API_KEY',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'ENTRA_CLIENT_ID',
  'TRUST_PROXY',
  'AGENT_TOOL_ISOLATION_LEVEL',
  'TOOL_EXEC_MAX_TIMEOUT_MS',
  'TOOL_EXEC_MAX_OUTPUT_BYTES',
  'TOOL_EXEC_MAX_MEMORY_MB',
  'TOOL_EXEC_REQUIRE_WORKSPACE_CWD',
  'ENFORCE_PREDECESSOR_CONTRACT_CONTINUITY',
];

function setEnv(next) {
  for (const key of ENV_KEYS) {
    if (Object.prototype.hasOwnProperty.call(next, key)) {
      const value = next[key];
      if (value === undefined || value === null) delete process.env[key];
      else process.env[key] = String(value);
    }
  }
}

let _serverImportCounter = 0;
const _serverLoaders = [
  () => import('../../src/webapp/server.ts?ssv0'),
  () => import('../../src/webapp/server.ts?ssv1'),
  () => import('../../src/webapp/server.ts?ssv2'),
  () => import('../../src/webapp/server.ts?ssv3'),
  () => import('../../src/webapp/server.ts?ssv4'),
  () => import('../../src/webapp/server.ts?ssv5'),
  () => import('../../src/webapp/server.ts?ssv6'),
  () => import('../../src/webapp/server.ts?ssv7'),
];

async function loadServerModule() {
  vi.resetModules();
  const mod = await _serverLoaders[_serverImportCounter % _serverLoaders.length]();
  _serverImportCounter += 1;
  return mod;
}

describe('startup runtime profile validation', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = {};
    for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  it('accepts local-dev defaults', async () => {
    setEnv({
      NODE_ENV: 'development',
      HOST: '127.0.0.1',
      STORAGE_PROVIDER: 'file',
      QUEUE_PROVIDER: 'memory',
      SESSION_STORE: 'sqlite',
      API_KEY: undefined,
      GITHUB_CLIENT_ID: undefined,
      GITHUB_CLIENT_SECRET: undefined,
      TRUST_PROXY: undefined,
      AGENT_TOOL_ISOLATION_LEVEL: 'process',
      TOOL_EXEC_REQUIRE_WORKSPACE_CWD: 'true',
    });

    const { validateStartupRuntimeProfile } = await loadServerModule();
    expect(() => validateStartupRuntimeProfile()).not.toThrow();
  }, 15000);

  it('rejects production profile when storage provider is invalid', async () => {
    setEnv({
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      STORAGE_PROVIDER: 'file',
      QUEUE_PROVIDER: 'persistent',
      SESSION_STORE: 'sqlite',
      API_KEY: 'abcdefghijklmnopqrstuvwxyz123456',
      TRUST_PROXY: '1',
      AGENT_TOOL_ISOLATION_LEVEL: 'restricted',
      TOOL_EXEC_REQUIRE_WORKSPACE_CWD: 'true',
    });

    const { validateStartupRuntimeProfile } = await loadServerModule();
    expect(() => validateStartupRuntimeProfile()).toThrow(
      /RUNTIME_PROFILE_INVALID|STORAGE_PROVIDER/
    );
  });

  it('rejects production profile when TRUST_PROXY is implicit', async () => {
    setEnv({
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      STORAGE_PROVIDER: 'sqlite',
      QUEUE_PROVIDER: 'persistent',
      SESSION_STORE: 'sqlite',
      API_KEY: 'abcdefghijklmnopqrstuvwxyz123456',
      TRUST_PROXY: 'true',
      AGENT_TOOL_ISOLATION_LEVEL: 'restricted',
      TOOL_EXEC_REQUIRE_WORKSPACE_CWD: 'true',
    });

    const { validateStartupRuntimeProfile } = await loadServerModule();
    expect(() => validateStartupRuntimeProfile()).toThrow(/RUNTIME_PROFILE_INVALID|TRUST_PROXY/);
  });

  it('accepts valid production-single-node profile', async () => {
    setEnv({
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      STORAGE_PROVIDER: 'sqlite',
      QUEUE_PROVIDER: 'persistent',
      SESSION_STORE: 'sqlite',
      API_KEY: 'abcdefghijklmnopqrstuvwxyz123456',
      TRUST_PROXY: '1',
      AGENT_TOOL_ISOLATION_LEVEL: 'restricted',
      TOOL_EXEC_REQUIRE_WORKSPACE_CWD: 'true',
    });

    const { validateStartupRuntimeProfile } = await loadServerModule();
    expect(() => validateStartupRuntimeProfile()).not.toThrow();
  });

  it('rejects production profile when GitHub auth env is incomplete', async () => {
    setEnv({
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      STORAGE_PROVIDER: 'sqlite',
      QUEUE_PROVIDER: 'persistent',
      SESSION_STORE: 'sqlite',
      API_KEY: undefined,
      GITHUB_CLIENT_ID: 'github-client-id',
      GITHUB_CLIENT_SECRET: undefined,
      ENTRA_CLIENT_ID: undefined,
      TRUST_PROXY: '1',
      AGENT_TOOL_ISOLATION_LEVEL: 'restricted',
      TOOL_EXEC_REQUIRE_WORKSPACE_CWD: 'true',
    });

    const { validateStartupRuntimeProfile } = await loadServerModule();
    expect(() => validateStartupRuntimeProfile()).toThrow(/RUNTIME_PROFILE_INVALID|authentication/);
  });

  it('returns strict predecessor continuity by default in production profile', async () => {
    setEnv({
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      STORAGE_PROVIDER: 'sqlite',
      QUEUE_PROVIDER: 'persistent',
      SESSION_STORE: 'sqlite',
      API_KEY: 'abcdefghijklmnopqrstuvwxyz123456',
      TRUST_PROXY: '1',
      AGENT_TOOL_ISOLATION_LEVEL: 'restricted',
      TOOL_EXEC_REQUIRE_WORKSPACE_CWD: 'true',
      ENFORCE_PREDECESSOR_CONTRACT_CONTINUITY: undefined,
    });

    const { validateStartupRuntimeProfile } = await loadServerModule();
    const result = validateStartupRuntimeProfile();

    expect(result.profile).toBe('production-single-node');
    expect(result.predecessorContractContinuity).toEqual({
      mode: true,
      source: 'profile-default',
    });
  });

  it('rejects production profile when tool isolation is unsafe', async () => {
    setEnv({
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      STORAGE_PROVIDER: 'sqlite',
      QUEUE_PROVIDER: 'persistent',
      SESSION_STORE: 'sqlite',
      API_KEY: 'abcdefghijklmnopqrstuvwxyz123456',
      TRUST_PROXY: '1',
      AGENT_TOOL_ISOLATION_LEVEL: 'process',
      TOOL_EXEC_REQUIRE_WORKSPACE_CWD: 'true',
    });

    const { validateStartupRuntimeProfile } = await loadServerModule();
    expect(() => validateStartupRuntimeProfile()).toThrow(
      /RUNTIME_PROFILE_INVALID|AGENT_TOOL_ISOLATION_LEVEL/
    );
  });
});
