// Copyright (c) 2026 Robert Agterhuis. MIT License.
// Unit tests for P2 adapters — mocked shell to exercise internal branches.

const { ContainerAdapter } = require('../../platform/sdlc/adapters/container-adapter');
const { CloudAdapter } = require('../../platform/sdlc/adapters/cloud-adapter');
const { LlmAdapter } = require('../../platform/sdlc/adapters/llm-adapter');
const { HEALTH_STATUS } = require('../../platform/sdlc/adapters/tool-adapter');

/**
 * Inject mock functions into an adapter's DI points.
 * Returns the mocks so tests can configure return values.
 */
function injectMocks(adapter) {
  const mockExec = vi.fn();
  const mockAvail = vi.fn();
  adapter._exec = mockExec;
  if ('_fetch' in adapter) {
    adapter._fetch = async (url, init = {}) => {
      const args = ['-X', init.method || 'POST'];
      const headers = init.headers || {};
      for (const [k, v] of Object.entries(headers)) {
        args.push('-H', `${k}: ${v}`);
      }
      if (typeof init.body === 'string') {
        args.push('-d', init.body);
      }
      args.push(url);

      const mocked = await mockExec('fetch', args, { signal: init.signal });

      if (mocked && typeof mocked.status === 'number' && typeof mocked.text === 'function') {
        return mocked;
      }

      const stdout = typeof mocked?.stdout === 'string' ? mocked.stdout : '';
      const lines = stdout.trimEnd().split('\n');
      const statusFromTail = Number.parseInt(lines[lines.length - 1], 10);
      const status = Number.isFinite(statusFromTail)
        ? statusFromTail
        : typeof mocked?.status === 'number'
          ? mocked.status
          : 500;
      const body = Number.isFinite(statusFromTail) ? lines.slice(0, -1).join('\n') : stdout;

      return {
        status,
        text: async () => body,
      };
    };
  }
  if ('_isAvail' in adapter) adapter._isAvail = mockAvail;
  return { mockExec, mockAvail };
}

// ─── ContainerAdapter ────────────────────────────────────────

describe('ContainerAdapter (mocked shell)', () => {
  let adapter;
  let mockExec;
  let mockAvail;

  beforeEach(() => {
    adapter = new ContainerAdapter({ runtime: 'docker' });
    ({ mockExec, mockAvail } = injectMocks(adapter));
    vi.clearAllMocks();
  });

  // ── metadata ─────────────────────────────────────────

  it('has correct name and version', () => {
    expect(adapter.name).toBe('container');
    expect(adapter.version).toBe('2.0.0');
    expect(adapter.category).toBe('CONTAINER');
  });

  it('lists all operations', () => {
    const ops = adapter.listOperations();
    expect(ops).toContain('build');
    expect(ops).toContain('push');
    expect(ops).toContain('list-images');
    expect(ops).toContain('inspect');
    expect(ops).toContain('scan');
  });

  // ── build ────────────────────────────────────────────

  it('build — success', async () => {
    mockExec.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
    const result = await adapter.execute('build', { image: 'myapp', tag: 'v1', context: '.' });
    expect(result.success).toBe(true);
    expect(result.data.image).toBe('myapp');
    expect(result.data.tag).toBe('v1');
    expect(mockExec).toHaveBeenCalledTimes(1);
    expect(mockExec.mock.calls[0][0]).toBe('docker');
    expect(mockExec.mock.calls[0][1]).toContain('-t');
  });

  it('build — with dockerfile and build_args', async () => {
    mockExec.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
    await adapter.execute('build', {
      image: 'app',
      dockerfile: 'Dockerfile.prod',
      build_args: { NODE_ENV: 'production' },
    });
    const args = mockExec.mock.calls[0][1];
    expect(args).toContain('-f');
    expect(args).toContain('Dockerfile.prod');
    expect(args).toContain('--build-arg');
    expect(args).toContain('NODE_ENV=production');
  });

  it('build — defaults tag to latest and context to .', async () => {
    mockExec.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
    const result = await adapter.execute('build', { image: 'app' });
    expect(result.data.tag).toBe('latest');
    expect(result.data.context).toBe('.');
  });

  it('build — missing image throws', async () => {
    const result = await adapter.execute('build', {});
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/image name is required/i);
  });

  it('build — non-zero exit code throws', async () => {
    mockExec.mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'build failed' });
    const result = await adapter.execute('build', { image: 'app' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('build failed');
  });

  // ── push ─────────────────────────────────────────────

  it('push — success without registry', async () => {
    mockExec.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
    const result = await adapter.execute('push', { image: 'myapp', tag: 'v1' });
    expect(result.success).toBe(true);
    expect(result.data.pushed).toBe(true);
    // Without registry, only push (no tag), so 1 call
    expect(mockExec).toHaveBeenCalledTimes(1);
    expect(mockExec.mock.calls[0][1][0]).toBe('push');
  });

  it('push — success with registry (tag + push)', async () => {
    adapter = new ContainerAdapter({ runtime: 'docker', registry_url: 'myregistry.io' });
    ({ mockExec, mockAvail } = injectMocks(adapter));
    mockExec.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
    const result = await adapter.execute('push', { image: 'app', tag: 'v2' });
    expect(result.success).toBe(true);
    // Two calls: tag + push
    expect(mockExec).toHaveBeenCalledTimes(2);
    expect(mockExec.mock.calls[0][1][0]).toBe('tag');
    expect(mockExec.mock.calls[1][1][0]).toBe('push');
    expect(result.data.image).toBe('myregistry.io/app:v2');
  });

  it('push — missing image throws', async () => {
    const result = await adapter.execute('push', {});
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/image name is required/i);
  });

  it('push — tag step failure', async () => {
    adapter = new ContainerAdapter({ runtime: 'docker', registry_url: 'reg.io' });
    ({ mockExec, mockAvail } = injectMocks(adapter));
    mockExec.mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'tag error' });
    const result = await adapter.execute('push', { image: 'app', tag: 'v1' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('tag');
  });

  it('push — push step failure', async () => {
    mockExec.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
    mockExec.mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }); // no registry, single call
    mockExec.mockReset();
    mockExec.mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'push denied' });
    const result = await adapter.execute('push', { image: 'app' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('push');
  });

  // ── list-images ──────────────────────────────────────

  it('list-images — parses output', async () => {
    mockExec.mockResolvedValue({
      exitCode: 0,
      stdout: 'myapp|v1|abc123|100MB\nnginx|latest|def456|50MB\n',
      stderr: '',
    });
    const result = await adapter.execute('list-images', {});
    expect(result.success).toBe(true);
    expect(result.data.count).toBe(2);
    expect(result.data.images[0].repository).toBe('myapp');
    expect(result.data.images[1].tag).toBe('latest');
  });

  it('list-images — with filter', async () => {
    mockExec.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
    await adapter.execute('list-images', { filter: 'myapp*' });
    const args = mockExec.mock.calls[0][1];
    expect(args).toContain('--filter');
    expect(args).toContain('reference=myapp*');
  });

  it('list-images — failure', async () => {
    mockExec.mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'daemon error' });
    const result = await adapter.execute('list-images', {});
    expect(result.success).toBe(false);
  });

  // ── inspect ──────────────────────────────────────────

  it('inspect — parses JSON manifest', async () => {
    mockExec.mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify([{ Id: 'sha256:abc' }]),
      stderr: '',
    });
    const result = await adapter.execute('inspect', { image: 'myapp' });
    expect(result.success).toBe(true);
    expect(result.data.image).toBe('myapp');
    expect(Array.isArray(result.data.manifest)).toBe(true);
  });

  it('inspect — non-JSON stdout', async () => {
    mockExec.mockResolvedValue({ exitCode: 0, stdout: 'not json', stderr: '' });
    const result = await adapter.execute('inspect', { image: 'myapp' });
    expect(result.success).toBe(true);
    expect(result.data.manifest).toEqual({ raw: 'not json' });
  });

  it('inspect — missing image', async () => {
    const result = await adapter.execute('inspect', {});
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/image name is required/i);
  });

  it('inspect — failure', async () => {
    mockExec.mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'not found' });
    const result = await adapter.execute('inspect', { image: 'bad' });
    expect(result.success).toBe(false);
  });

  // ── scan ─────────────────────────────────────────────

  it('scan — docker scout success', async () => {
    mockAvail.mockResolvedValue(true);
    mockExec.mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify({ vulnerabilities: [{ id: 'CVE-1' }] }),
      stderr: '',
    });
    const result = await adapter.execute('scan', { image: 'myapp' });
    expect(result.success).toBe(true);
    expect(result.data.scanner).toBe('docker-scout');
    expect(result.data.vulnerabilities).toHaveLength(1);
  });

  it('scan — docker scout returns array', async () => {
    mockAvail.mockResolvedValue(true);
    mockExec.mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify([{ id: 'CVE-2' }]),
      stderr: '',
    });
    const result = await adapter.execute('scan', { image: 'myapp' });
    expect(result.data.vulnerabilities).toHaveLength(1);
  });

  it('scan — docker scout non-JSON output', async () => {
    mockAvail.mockResolvedValue(true);
    mockExec.mockResolvedValue({ exitCode: 0, stdout: 'raw text', stderr: '' });
    const result = await adapter.execute('scan', { image: 'myapp' });
    expect(result.data.scanner).toBe('docker-scout');
    expect(result.data.vulnerabilities).toEqual([]);
  });

  it('scan — docker scout fails, falls back to none', async () => {
    mockAvail.mockResolvedValue(true);
    mockExec.mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'err' });
    const result = await adapter.execute('scan', { image: 'myapp' });
    expect(result.data.scanner).toBe('none');
    expect(result.data.note).toMatch(/No scanner/);
  });

  it('scan — no scanner available (podman)', async () => {
    adapter = new ContainerAdapter({ runtime: 'podman' });
    ({ mockExec, mockAvail } = injectMocks(adapter));
    mockAvail.mockResolvedValue(false);
    const result = await adapter.execute('scan', { image: 'myapp' });
    expect(result.data.scanner).toBe('none');
  });

  it('scan — missing image', async () => {
    const result = await adapter.execute('scan', {});
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/image name is required/i);
  });

  // ── healthCheck ──────────────────────────────────────

  it('healthCheck — healthy', async () => {
    mockAvail.mockResolvedValue(true);
    mockExec.mockResolvedValue({ exitCode: 0, stdout: '24.0.1', stderr: '' });
    const hc = await adapter.healthCheck();
    expect(hc.status).toBe(HEALTH_STATUS.HEALTHY);
    expect(hc.message).toContain('24.0.1');
  });

  it('healthCheck — binary not found', async () => {
    mockAvail.mockResolvedValue(false);
    const hc = await adapter.healthCheck();
    expect(hc.status).toBe(HEALTH_STATUS.UNAVAILABLE);
    expect(hc.message).toContain('not found');
  });

  it('healthCheck — daemon not responding', async () => {
    mockAvail.mockResolvedValue(true);
    mockExec.mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'socket error' });
    const hc = await adapter.healthCheck();
    expect(hc.status).toBe(HEALTH_STATUS.DEGRADED);
    expect(hc.message).toContain('socket error');
  });

  it('healthCheck — podman runtime', async () => {
    adapter = new ContainerAdapter({ runtime: 'podman' });
    ({ mockExec, mockAvail } = injectMocks(adapter));
    mockAvail.mockResolvedValue(true);
    mockExec.mockResolvedValue({ exitCode: 0, stdout: '4.5.0', stderr: '' });
    const hc = await adapter.healthCheck();
    expect(hc.status).toBe(HEALTH_STATUS.HEALTHY);
    expect(hc.message).toContain('podman');
  });

  // ── validateConfig ───────────────────────────────────

  it('validateConfig — valid', () => {
    expect(adapter.validateConfig({ runtime: 'docker' }).valid).toBe(true);
    expect(adapter.validateConfig({ runtime: 'podman' }).valid).toBe(true);
    expect(adapter.validateConfig({ runtime: 'generic' }).valid).toBe(true);
  });

  it('validateConfig — invalid runtime', () => {
    const r = adapter.validateConfig({ runtime: 'nope' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('runtime');
  });

  it('validateConfig — missing runtime', () => {
    expect(adapter.validateConfig({}).valid).toBe(false);
  });

  // ── unknown operation ────────────────────────────────

  it('unknown operation returns error', async () => {
    const result = await adapter.execute('nope', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown operation');
  });
});

// ─── CloudAdapter ────────────────────────────────────────────

describe('CloudAdapter (mocked shell)', () => {
  let adapter;
  let mockExec;
  let mockAvail;

  beforeEach(() => {
    adapter = new CloudAdapter({
      provider: 'azure',
      resource_group: 'my-rg',
      subscription_id: 'sub-123',
    });
    ({ mockExec, mockAvail } = injectMocks(adapter));
    vi.clearAllMocks();
  });

  // ── metadata ─────────────────────────────────────────

  it('has correct name and version', () => {
    expect(adapter.name).toBe('cloud');
    expect(adapter.version).toBe('2.0.0');
    expect(adapter.category).toBe('CLOUD');
  });

  it('lists all operations', () => {
    const ops = adapter.listOperations();
    expect(ops).toContain('deploy');
    expect(ops).toContain('get-status');
    expect(ops).toContain('list-environments');
    expect(ops).toContain('rollback');
  });

  // ── deploy ───────────────────────────────────────────

  it('deploy — success (production)', async () => {
    mockExec.mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify({ status: 'ok' }),
      stderr: '',
    });
    const result = await adapter.execute('deploy', {
      environment: 'production',
      artifact: 'app.zip',
      app_name: 'myapp',
    });
    expect(result.success).toBe(true);
    expect(result.data.deployed).toBe(true);
    expect(result.data.app_name).toBe('myapp');
    const args = mockExec.mock.calls[0][1];
    expect(args).not.toContain('--slot');
  });

  it('deploy — success (staging slot)', async () => {
    mockExec.mockResolvedValue({ exitCode: 0, stdout: '{}', stderr: '' });
    const result = await adapter.execute('deploy', {
      environment: 'staging',
      artifact: 'app.zip',
      app_name: 'myapp',
    });
    expect(result.success).toBe(true);
    const args = mockExec.mock.calls[0][1];
    expect(args).toContain('--slot');
    expect(args).toContain('staging');
  });

  it('deploy — non-JSON stdout still succeeds', async () => {
    mockExec.mockResolvedValue({ exitCode: 0, stdout: 'ok', stderr: '' });
    const result = await adapter.execute('deploy', {
      environment: 'production',
      artifact: 'app.zip',
      app_name: 'myapp',
    });
    expect(result.success).toBe(true);
    expect(result.data.response).toEqual({});
  });

  it('deploy — missing environment', async () => {
    const result = await adapter.execute('deploy', { artifact: 'a.zip' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/environment is required/i);
  });

  it('deploy — missing artifact', async () => {
    const result = await adapter.execute('deploy', { environment: 'prod' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/artifact is required/i);
  });

  it('deploy — missing resource_group', async () => {
    adapter = new CloudAdapter({ provider: 'azure' });
    ({ mockExec, mockAvail } = injectMocks(adapter));
    const result = await adapter.execute('deploy', {
      environment: 'prod',
      artifact: 'a.zip',
      app_name: 'app',
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/resource_group/i);
  });

  it('deploy — falls back to artifact when app_name omitted', async () => {
    mockExec.mockResolvedValue({ exitCode: 0, stdout: '{}', stderr: '' });
    const result = await adapter.execute('deploy', {
      environment: 'production',
      artifact: 'a.zip',
    });
    expect(result.success).toBe(true);
    expect(result.data.app_name).toBe('a.zip');
  });

  it('deploy — az failure', async () => {
    mockExec.mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'deployment failed' });
    const result = await adapter.execute('deploy', {
      environment: 'prod',
      artifact: 'a.zip',
      app_name: 'app',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('deployment failed');
  });

  it('deploy — unsupported provider', async () => {
    adapter = new CloudAdapter({ provider: 'aws' });
    ({ mockExec, mockAvail } = injectMocks(adapter));
    const result = await adapter.execute('deploy', {
      environment: 'prod',
      artifact: 'a.zip',
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not yet implemented/i);
  });

  // ── get-status ───────────────────────────────────────

  it('get-status — success', async () => {
    mockExec.mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify({ state: 'Running' }),
      stderr: '',
    });
    const result = await adapter.execute('get-status', {
      environment: 'prod',
      app_name: 'myapp',
    });
    expect(result.success).toBe(true);
    expect(result.data.app_name).toBe('myapp');
  });

  it('get-status — non-JSON stdout', async () => {
    mockExec.mockResolvedValue({ exitCode: 0, stdout: 'not-json', stderr: '' });
    const result = await adapter.execute('get-status', {
      environment: 'prod',
      app_name: 'myapp',
    });
    expect(result.success).toBe(true);
    expect(result.data.status).toEqual({});
  });

  it('get-status — missing environment', async () => {
    const result = await adapter.execute('get-status', { app_name: 'x' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/environment is required/i);
  });

  it('get-status — missing resource_group', async () => {
    adapter = new CloudAdapter({ provider: 'azure' });
    ({ mockExec, mockAvail } = injectMocks(adapter));
    const result = await adapter.execute('get-status', {
      environment: 'prod',
      app_name: 'app',
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/resource_group/i);
  });

  it('get-status — az failure', async () => {
    mockExec.mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'not found' });
    const result = await adapter.execute('get-status', {
      environment: 'prod',
      app_name: 'app',
    });
    expect(result.success).toBe(false);
  });

  it('get-status — unsupported provider', async () => {
    adapter = new CloudAdapter({ provider: 'gcp' });
    ({ mockExec, mockAvail } = injectMocks(adapter));
    const result = await adapter.execute('get-status', {
      environment: 'prod',
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not yet implemented/i);
  });

  // ── list-environments ────────────────────────────────

  it('list-environments — success', async () => {
    mockExec.mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify([
        { name: 'app1', state: 'Running' },
        { name: 'app2', state: 'Stopped' },
      ]),
      stderr: '',
    });
    const result = await adapter.execute('list-environments', {});
    expect(result.success).toBe(true);
    expect(result.data.environments).toHaveLength(2);
    expect(result.data.environments[0].name).toBe('app1');
  });

  it('list-environments — no resource_group', async () => {
    adapter = new CloudAdapter({ provider: 'azure' });
    ({ mockExec, mockAvail } = injectMocks(adapter));
    const result = await adapter.execute('list-environments', {});
    expect(result.success).toBe(true);
    expect(result.data.note).toMatch(/resource_group not configured/);
  });

  it('list-environments — non-JSON', async () => {
    mockExec.mockResolvedValue({ exitCode: 0, stdout: 'nojson', stderr: '' });
    const result = await adapter.execute('list-environments', {});
    expect(result.success).toBe(true);
    expect(result.data.environments).toEqual([]);
  });

  it('list-environments — az failure', async () => {
    mockExec.mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'err' });
    const result = await adapter.execute('list-environments', {});
    expect(result.success).toBe(false);
  });

  it('list-environments — unsupported provider', async () => {
    adapter = new CloudAdapter({ provider: 'aws' });
    ({ mockExec, mockAvail } = injectMocks(adapter));
    const result = await adapter.execute('list-environments', {});
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not yet implemented/i);
  });

  // ── rollback ─────────────────────────────────────────

  it('rollback — success', async () => {
    mockExec.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
    const result = await adapter.execute('rollback', {
      environment: 'prod',
      app_name: 'myapp',
      version: 'v1',
    });
    expect(result.success).toBe(true);
    expect(result.data.rolled_back).toBe(true);
    expect(result.data.version).toBe('v1');
    const args = mockExec.mock.calls[0][1];
    expect(args).toContain('swap');
  });

  it('rollback — version defaults to previous-slot', async () => {
    mockExec.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
    const result = await adapter.execute('rollback', {
      environment: 'prod',
      app_name: 'myapp',
    });
    expect(result.data.version).toBe('previous-slot');
  });

  it('rollback — missing environment', async () => {
    const result = await adapter.execute('rollback', { app_name: 'x' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/environment is required/i);
  });

  it('rollback — missing resource_group', async () => {
    adapter = new CloudAdapter({ provider: 'azure' });
    ({ mockExec, mockAvail } = injectMocks(adapter));
    const result = await adapter.execute('rollback', {
      environment: 'prod',
      app_name: 'app',
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/resource_group/i);
  });

  it('rollback — az failure', async () => {
    mockExec.mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'swap failed' });
    const result = await adapter.execute('rollback', {
      environment: 'prod',
      app_name: 'app',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('swap failed');
  });

  it('rollback — unsupported provider', async () => {
    adapter = new CloudAdapter({ provider: 'gcp' });
    ({ mockExec, mockAvail } = injectMocks(adapter));
    const result = await adapter.execute('rollback', {
      environment: 'prod',
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not yet implemented/i);
  });

  // ── healthCheck ──────────────────────────────────────

  it('healthCheck — healthy (azure authenticated)', async () => {
    mockAvail.mockResolvedValue(true);
    mockExec.mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify({ name: 'MySub', user: { name: 'me@example.com' } }),
      stderr: '',
    });
    const hc = await adapter.healthCheck();
    expect(hc.status).toBe(HEALTH_STATUS.HEALTHY);
    expect(hc.message).toContain('MySub');
    expect(hc.message).toContain('me@example.com');
  });

  it('healthCheck — non-JSON az output still healthy', async () => {
    mockAvail.mockResolvedValue(true);
    mockExec.mockResolvedValue({ exitCode: 0, stdout: 'not-json', stderr: '' });
    const hc = await adapter.healthCheck();
    expect(hc.status).toBe(HEALTH_STATUS.HEALTHY);
  });

  it('healthCheck — az not found', async () => {
    mockAvail.mockResolvedValue(false);
    const hc = await adapter.healthCheck();
    expect(hc.status).toBe(HEALTH_STATUS.UNAVAILABLE);
    expect(hc.message).toContain('not found');
  });

  it('healthCheck — az not authenticated', async () => {
    mockAvail.mockResolvedValue(true);
    mockExec.mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'not logged in' });
    const hc = await adapter.healthCheck();
    expect(hc.status).toBe(HEALTH_STATUS.DEGRADED);
    expect(hc.message).toContain('not authenticated');
  });

  it('healthCheck — az exec throws (EINVAL guard)', async () => {
    mockAvail.mockResolvedValue(true);
    mockExec.mockRejectedValue(new Error('EINVAL'));
    const hc = await adapter.healthCheck();
    expect(hc.status).toBe(HEALTH_STATUS.DEGRADED);
    expect(hc.message).toContain('failed to execute');
  });

  it('healthCheck — non-azure provider (degraded)', async () => {
    adapter = new CloudAdapter({ provider: 'aws' });
    ({ mockExec, mockAvail } = injectMocks(adapter));
    const hc = await adapter.healthCheck();
    expect(hc.status).toBe(HEALTH_STATUS.DEGRADED);
    expect(hc.message).toContain('aws');
  });

  it('healthCheck — no provider (unconfigured)', async () => {
    adapter = new CloudAdapter({ provider: 'generic' });
    ({ mockExec, mockAvail } = injectMocks(adapter));
    // generic is truthy but not azure
    const hc = await adapter.healthCheck();
    expect(hc.status).toBe(HEALTH_STATUS.DEGRADED);
  });

  // ── validateConfig ───────────────────────────────────

  it('validateConfig — valid azure', () => {
    const r = adapter.validateConfig({ provider: 'azure', resource_group: 'rg1' });
    expect(r.valid).toBe(true);
  });

  it('validateConfig — azure missing resource_group', () => {
    const r = adapter.validateConfig({ provider: 'azure' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('resource_group');
  });

  it('validateConfig — invalid provider', () => {
    expect(adapter.validateConfig({ provider: 'bad' }).valid).toBe(false);
  });

  it('validateConfig — missing provider', () => {
    expect(adapter.validateConfig({}).valid).toBe(false);
  });

  it('validateConfig — generic valid', () => {
    expect(adapter.validateConfig({ provider: 'generic' }).valid).toBe(true);
  });

  // ── unknown operation ────────────────────────────────

  it('unknown operation returns error', async () => {
    const result = await adapter.execute('nope', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown operation');
  });
});

// ─── LlmAdapter ──────────────────────────────────────────────

describe('LlmAdapter (mocked shell)', () => {
  /** Helper: create adapter with provider and inject mocks */
  function makeLlm(config = {}) {
    const a = new LlmAdapter({
      provider: 'openai',
      model: 'gpt-4o',
      max_tokens: 100,
      ...config,
    });
    const { mockExec } = injectMocks(a);
    return { adapter: a, mockExec };
  }

  /** Successful curl response (HTTP 200 with OpenAI format) */
  function okResponse(content = 'Hello', model = 'gpt-4o') {
    const body = {
      choices: [{ message: { content }, finish_reason: 'stop' }],
      model,
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    };
    return {
      exitCode: 0,
      stdout: `${JSON.stringify(body)}\n200`,
      stderr: '',
    };
  }

  // ── metadata ─────────────────────────────────────────

  it('has correct name and version', () => {
    const { adapter } = makeLlm();
    expect(adapter.name).toBe('llm');
    expect(adapter.version).toBe('2.0.0');
    expect(adapter.category).toBe('LLM');
  });

  it('lists all operations', () => {
    const { adapter } = makeLlm();
    const ops = adapter.listOperations();
    expect(ops).toContain('prompt');
    expect(ops).toContain('analyze-code');
    expect(ops).toContain('generate-docs');
    expect(ops).toContain('review-architecture');
    expect(ops).toContain('generate-tests');
  });

  // ── prompt ───────────────────────────────────────────

  it('prompt — success', async () => {
    const { adapter, mockExec } = makeLlm();
    mockExec.mockResolvedValue(okResponse('Hi there'));
    const result = await adapter.execute('prompt', { prompt: 'Say hi' });
    expect(result.success).toBe(true);
    expect(result.data.content).toBe('Hi there');
    expect(result.data.usage.total_tokens).toBe(15);
    // Verify curl was called with correct URL
    const curlArgs = mockExec.mock.calls[0][1];
    expect(curlArgs).toContain('https://api.openai.com/v1/chat/completions');
  });

  it('prompt — custom system prompt', async () => {
    const { adapter, mockExec } = makeLlm();
    mockExec.mockResolvedValue(okResponse());
    await adapter.execute('prompt', { prompt: 'x', system: 'You are a pirate.' });
    const body = JSON.parse(mockExec.mock.calls[0][1][mockExec.mock.calls[0][1].indexOf('-d') + 1]);
    expect(body.messages[0].content).toBe('You are a pirate.');
  });

  it('prompt — missing prompt throws', async () => {
    const { adapter } = makeLlm();
    const result = await adapter.execute('prompt', {});
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/prompt is required/i);
  });

  it('prompt — generic provider throws (no provider configured)', async () => {
    const { adapter } = makeLlm({ provider: 'generic' });
    const result = await adapter.execute('prompt', { prompt: 'hi' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not configured/i);
  });

  // ── analyze-code ─────────────────────────────────────

  it('analyze-code — success', async () => {
    const { adapter, mockExec } = makeLlm();
    mockExec.mockResolvedValue(okResponse('Looks good'));
    const result = await adapter.execute('analyze-code', {
      code: 'const x = 1;',
      path: 'test.ts',
    });
    expect(result.success).toBe(true);
    expect(result.data.path).toBe('test.ts');
    expect(result.data.analysis).toBe('Looks good');
  });

  it('analyze-code — missing code', async () => {
    const { adapter } = makeLlm();
    const result = await adapter.execute('analyze-code', { path: 'x' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/code content is required/i);
  });

  // ── generate-docs ────────────────────────────────────

  it('generate-docs — success', async () => {
    const { adapter, mockExec } = makeLlm();
    mockExec.mockResolvedValue(okResponse('## Docs'));
    const result = await adapter.execute('generate-docs', {
      code: 'function f() {}',
      path: 'lib.ts',
    });
    expect(result.success).toBe(true);
    expect(result.data.documentation).toBe('## Docs');
  });

  it('generate-docs — missing code', async () => {
    const { adapter } = makeLlm();
    const result = await adapter.execute('generate-docs', {});
    expect(result.success).toBe(false);
  });

  // ── review-architecture ──────────────────────────────

  it('review-architecture — success', async () => {
    const { adapter, mockExec } = makeLlm();
    mockExec.mockResolvedValue(okResponse('Architecture is sound'));
    const result = await adapter.execute('review-architecture', {
      context: 'Microservices with gRPC',
    });
    expect(result.success).toBe(true);
    expect(result.data.review).toBe('Architecture is sound');
  });

  it('review-architecture — missing context', async () => {
    const { adapter } = makeLlm();
    const result = await adapter.execute('review-architecture', {});
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/context is required/i);
  });

  // ── generate-tests ─────────────────────────────────

  it('generate-tests — success', async () => {
    const { adapter, mockExec } = makeLlm();
    mockExec.mockResolvedValue(okResponse('it("works", () => {})'));
    const result = await adapter.execute('generate-tests', {
      code: 'function add(a, b) { return a + b; }',
      path: 'math.ts',
      framework: 'jest',
    });
    expect(result.success).toBe(true);
    expect(result.data.framework).toBe('jest');
    expect(result.data.tests).toContain('works');
  });

  it('generate-tests — missing code', async () => {
    const { adapter } = makeLlm();
    const result = await adapter.execute('generate-tests', {});
    expect(result.success).toBe(false);
  });

  it('generate-tests — defaults framework to vitest', async () => {
    const { adapter, mockExec } = makeLlm();
    mockExec.mockResolvedValue(okResponse('test'));
    const result = await adapter.execute('generate-tests', {
      code: 'x',
      path: 'a.ts',
    });
    expect(result.data.framework).toBe('vitest');
  });

  // ── rate-limit retry ─────────────────────────────────

  it('retries on 429, then succeeds', async () => {
    const { adapter, mockExec } = makeLlm();
    // First call: 429, second call: 200
    mockExec
      .mockResolvedValueOnce({ exitCode: 0, stdout: '{}\n429', stderr: '' })
      .mockResolvedValueOnce(okResponse('ok'));
    const result = await adapter.execute('prompt', { prompt: 'hi' });
    expect(result.success).toBe(true);
    expect(result.data.content).toBe('ok');
    expect(mockExec).toHaveBeenCalledTimes(2);
  });

  it('retries on 503, then succeeds', async () => {
    const { adapter, mockExec } = makeLlm();
    mockExec
      .mockResolvedValueOnce({ exitCode: 0, stdout: '{}\n503', stderr: '' })
      .mockResolvedValueOnce(okResponse('recovered'));
    const result = await adapter.execute('prompt', { prompt: 'hi' });
    expect(result.success).toBe(true);
    expect(result.data.content).toBe('recovered');
  });

  it('max retries exhausted throws', async () => {
    const { adapter, mockExec } = makeLlm();
    // 4 calls: initial + 3 retries, all 429
    mockExec.mockResolvedValue({ exitCode: 0, stdout: '{}\n429', stderr: '' });
    const result = await adapter.execute('prompt', { prompt: 'hi' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/rate limited/i);
    expect(mockExec).toHaveBeenCalledTimes(4); // 1 + MAX_RETRIES
  }, 15_000);

  it('non-retryable error (400) throws immediately', async () => {
    const { adapter, mockExec } = makeLlm();
    mockExec.mockResolvedValue({
      exitCode: 0,
      stdout: '{"error":"bad request"}\n400',
      stderr: '',
    });
    const result = await adapter.execute('prompt', { prompt: 'hi' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('400');
    expect(mockExec).toHaveBeenCalledTimes(1);
  });

  // ── Azure OpenAI provider ───────────────────────────

  it('azure-openai — builds correct url', async () => {
    const { adapter, mockExec } = makeLlm({
      provider: 'azure-openai',
      endpoint: 'https://myres.openai.azure.com',
      deployment: 'gpt4',
    });
    mockExec.mockResolvedValue(okResponse('azure'));
    await adapter.execute('prompt', { prompt: 'hi' });
    const curlArgs = mockExec.mock.calls[0][1];
    const url = curlArgs[curlArgs.length - 1];
    expect(url).toContain('myres.openai.azure.com');
    expect(url).toContain('gpt4');
    expect(url).toContain('api-version');
  });

  it('azure-openai — missing endpoint returns null provider', async () => {
    const { adapter } = makeLlm({
      provider: 'azure-openai',
    });
    const result = await adapter.execute('prompt', { prompt: 'hi' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not configured/i);
  });

  // ── Anthropic provider ──────────────────────────────

  it('anthropic — builds correct request', async () => {
    const { adapter, mockExec } = makeLlm({ provider: 'anthropic', model: 'claude-3' });
    const anthropicResp = {
      content: [{ text: 'Hello from Claude' }],
      model: 'claude-3',
      usage: { input_tokens: 5, output_tokens: 10 },
      stop_reason: 'end_turn',
    };
    mockExec.mockResolvedValue({
      exitCode: 0,
      stdout: `${JSON.stringify(anthropicResp)}\n200`,
      stderr: '',
    });
    const result = await adapter.execute('prompt', { prompt: 'hi' });
    expect(result.success).toBe(true);
    expect(result.data.content).toBe('Hello from Claude');
    expect(result.data.usage.total_tokens).toBe(15);
    // Verify anthropic headers
    const curlArgs = mockExec.mock.calls[0][1];
    expect(curlArgs).toContain('https://api.anthropic.com/v1/messages');
  });

  // ── httpPost edge cases ──────────────────────────────

  it('httpPost — non-JSON curl response', async () => {
    const { adapter, mockExec } = makeLlm();
    mockExec.mockResolvedValue({ exitCode: 0, stdout: 'not-json\n500', stderr: '' });
    const result = await adapter.execute('prompt', { prompt: 'hi' });
    expect(result.success).toBe(false);
  });

  // ── healthCheck ──────────────────────────────────────

  it('healthCheck — healthy (openai with env var)', async () => {
    const origKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'sk-test';
    try {
      const { adapter } = makeLlm();
      const hc = await adapter.healthCheck();
      expect(hc.status).toBe(HEALTH_STATUS.HEALTHY);
      expect(hc.message).toContain('openai');
    } finally {
      if (origKey === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = origKey;
    }
  });

  it('healthCheck — degraded (missing API key)', async () => {
    const origKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const { adapter } = makeLlm();
      const hc = await adapter.healthCheck();
      expect(hc.status).toBe(HEALTH_STATUS.DEGRADED);
      expect(hc.message).toContain('OPENAI_API_KEY');
    } finally {
      if (origKey !== undefined) process.env.OPENAI_API_KEY = origKey;
    }
  });

  it('healthCheck — unconfigured (generic provider)', async () => {
    const { adapter } = makeLlm({ provider: 'generic' });
    const hc = await adapter.healthCheck();
    expect(hc.status).toBe(HEALTH_STATUS.UNCONFIGURED);
  });

  it('healthCheck — anthropic missing key', async () => {
    const origKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const { adapter } = makeLlm({ provider: 'anthropic' });
      const hc = await adapter.healthCheck();
      expect(hc.status).toBe(HEALTH_STATUS.DEGRADED);
      expect(hc.message).toContain('ANTHROPIC_API_KEY');
    } finally {
      if (origKey !== undefined) process.env.ANTHROPIC_API_KEY = origKey;
    }
  });

  it('healthCheck — azure-openai missing key', async () => {
    const origKey = process.env.AZURE_OPENAI_API_KEY;
    delete process.env.AZURE_OPENAI_API_KEY;
    try {
      const { adapter } = makeLlm({
        provider: 'azure-openai',
        endpoint: 'https://x.openai.azure.com',
      });
      const hc = await adapter.healthCheck();
      expect(hc.status).toBe(HEALTH_STATUS.DEGRADED);
    } finally {
      if (origKey !== undefined) process.env.AZURE_OPENAI_API_KEY = origKey;
    }
  });

  // ── validateConfig ───────────────────────────────────

  it('validateConfig — valid openai', () => {
    const { adapter } = makeLlm();
    expect(adapter.validateConfig({ provider: 'openai' }).valid).toBe(true);
  });

  it('validateConfig — invalid provider', () => {
    const { adapter } = makeLlm();
    expect(adapter.validateConfig({ provider: 'bad' }).valid).toBe(false);
  });

  it('validateConfig — missing provider', () => {
    const { adapter } = makeLlm();
    expect(adapter.validateConfig({}).valid).toBe(false);
  });

  it('validateConfig — azure-openai needs endpoint', () => {
    const { adapter } = makeLlm();
    const r = adapter.validateConfig({ provider: 'azure-openai' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('endpoint');
  });

  it('validateConfig — azure-openai with endpoint valid', () => {
    const { adapter } = makeLlm();
    expect(
      adapter.validateConfig({
        provider: 'azure-openai',
        endpoint: 'https://x.openai.azure.com',
      }).valid
    ).toBe(true);
  });

  it('validateConfig — invalid max_tokens', () => {
    const { adapter } = makeLlm();
    expect(adapter.validateConfig({ provider: 'openai', max_tokens: -1 }).valid).toBe(false);
    expect(adapter.validateConfig({ provider: 'openai', max_tokens: 'abc' }).valid).toBe(false);
  });

  // ── unknown operation ────────────────────────────────

  it('unknown operation returns error', async () => {
    const { adapter } = makeLlm();
    const result = await adapter.execute('nope', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown operation');
  });
});
