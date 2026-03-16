'use strict';

/**
 * P2 Adapters & Release Lifecycle — Integration Tests
 *
 * Tests for ContainerAdapter (requires Docker), CloudAdapter (mocked AZ CLI),
 * LlmAdapter (mocked API), version resolver, and release notes generator.
 */

const { ContainerAdapter } = require('../../platform/sdlc/adapters/container-adapter');
const { CloudAdapter } = require('../../platform/sdlc/adapters/cloud-adapter');
const { LlmAdapter } = require('../../platform/sdlc/adapters/llm-adapter');
const {
  parseSemVer,
  formatSemVer,
  parseCommitSubject,
  classifyChanges,
  resolveNextVersion,
  ReleaseHistory,
} = require('../../platform/engine/version-resolver');
const { generateReleaseNotes } = require('../../platform/engine/release-notes');
const { createReleaseFromSprint, createImplementationTask } = require('../../platform/sdlc');

// ═══════════════════════════════════════════════════════════════
// ContainerAdapter
// ═══════════════════════════════════════════════════════════════

describe('ContainerAdapter integration', () => {
  let adapter;

  beforeAll(() => {
    adapter = new ContainerAdapter({ runtime: 'docker' });
  });

  it('version is 2.0.0 (upgraded from stub)', () => {
    expect(adapter.version).toBe('2.0.0');
  });

  it('lists expected operations', () => {
    const ops = adapter.listOperations();
    expect(ops).toContain('build');
    expect(ops).toContain('push');
    expect(ops).toContain('list-images');
    expect(ops).toContain('inspect');
    expect(ops).toContain('scan');
  });

  it('healthCheck detects docker availability', async () => {
    const check = await adapter.healthCheck();
    // In CI without Docker, expect UNAVAILABLE or DEGRADED; with Docker → HEALTHY
    expect(['HEALTHY', 'DEGRADED', 'UNAVAILABLE']).toContain(check.status);
    expect(check.adapter).toBe('container');
  });

  it('build fails without image name', async () => {
    const result = await adapter.execute('build', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('image');
  });

  it('validateConfig rejects invalid runtime', () => {
    const result = adapter.validateConfig({ runtime: 'lxc' });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('validateConfig accepts docker runtime', () => {
    const result = adapter.validateConfig({ runtime: 'docker' });
    expect(result.valid).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// CloudAdapter
// ═══════════════════════════════════════════════════════════════

describe('CloudAdapter integration', () => {
  let adapter;

  beforeAll(() => {
    adapter = new CloudAdapter({
      provider: 'azure',
      resource_group: 'test-rg',
    });
  });

  it('version is 2.0.0 (upgraded from stub)', () => {
    expect(adapter.version).toBe('2.0.0');
  });

  it('lists expected operations', () => {
    const ops = adapter.listOperations();
    expect(ops).toContain('deploy');
    expect(ops).toContain('get-status');
    expect(ops).toContain('list-environments');
    expect(ops).toContain('rollback');
  });

  it('healthCheck verifies Azure CLI presence', async () => {
    const check = await adapter.healthCheck();
    // Without Azure CLI → UNAVAILABLE; with CLI but no auth → DEGRADED; fully configured → HEALTHY
    expect(['HEALTHY', 'DEGRADED', 'UNAVAILABLE']).toContain(check.status);
    expect(check.adapter).toBe('cloud');
  });

  it('deploy fails without environment', async () => {
    const result = await adapter.execute('deploy', { artifact: 'build.zip' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('environment');
  });

  it('deploy fails without artifact', async () => {
    const result = await adapter.execute('deploy', { environment: 'staging' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('artifact');
  });

  it('validateConfig rejects missing resource_group for Azure', () => {
    const result = adapter.validateConfig({ provider: 'azure' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('resource_group is required for Azure provider');
  });

  it('validateConfig accepts valid Azure config', () => {
    const result = adapter.validateConfig({ provider: 'azure', resource_group: 'rg-test' });
    expect(result.valid).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// LlmAdapter
// ═══════════════════════════════════════════════════════════════

describe('LlmAdapter integration', () => {
  it('version is 2.0.0', () => {
    const adapter = new LlmAdapter({ provider: 'openai', model: 'gpt-4o' });
    expect(adapter.version).toBe('2.0.0');
  });

  it('lists expected operations including prompt', () => {
    const adapter = new LlmAdapter({ provider: 'openai' });
    const ops = adapter.listOperations();
    expect(ops).toContain('prompt');
    expect(ops).toContain('analyze-code');
    expect(ops).toContain('generate-docs');
    expect(ops).toContain('review-architecture');
    expect(ops).toContain('generate-tests');
  });

  it('healthCheck reports DEGRADED without API key', async () => {
    // Temporarily clear the env var
    const saved = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const adapter = new LlmAdapter({ provider: 'openai' });
      const check = await adapter.healthCheck();
      expect(check.status).toBe('DEGRADED');
      expect(check.message).toContain('OPENAI_API_KEY');
    } finally {
      if (saved) process.env.OPENAI_API_KEY = saved;
    }
  });

  it('healthCheck reports UNCONFIGURED for generic provider', async () => {
    const adapter = new LlmAdapter({ provider: 'generic' });
    const check = await adapter.healthCheck();
    expect(check.status).toBe('UNCONFIGURED');
  });

  it('prompt fails without prompt text', async () => {
    const adapter = new LlmAdapter({ provider: 'openai' });
    const result = await adapter.execute('prompt', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('prompt');
  });

  it('validateConfig rejects invalid provider', () => {
    const adapter = new LlmAdapter({ provider: 'generic' });
    const result = adapter.validateConfig({ provider: 'unknown' });
    expect(result.valid).toBe(false);
  });

  it('validateConfig rejects azure-openai without endpoint', () => {
    const adapter = new LlmAdapter({
      provider: 'azure-openai',
      endpoint: 'https://test.openai.azure.com',
    });
    const result = adapter.validateConfig({ provider: 'azure-openai' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('endpoint is required for azure-openai provider');
  });
});

// ═══════════════════════════════════════════════════════════════
// Version Resolver
// ═══════════════════════════════════════════════════════════════

describe('Version Resolver', () => {
  describe('parseSemVer', () => {
    it('parses simple version', () => {
      expect(parseSemVer('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3, prerelease: undefined });
    });

    it('parses version with v prefix', () => {
      expect(parseSemVer('v2.0.0')).toEqual({
        major: 2,
        minor: 0,
        patch: 0,
        prerelease: undefined,
      });
    });

    it('parses version with prerelease', () => {
      expect(parseSemVer('1.0.0-beta.1')).toEqual({
        major: 1,
        minor: 0,
        patch: 0,
        prerelease: 'beta.1',
      });
    });
  });

  describe('formatSemVer', () => {
    it('formats basic version', () => {
      expect(formatSemVer({ major: 1, minor: 2, patch: 3 })).toBe('1.2.3');
    });

    it('formats version with prerelease', () => {
      expect(formatSemVer({ major: 1, minor: 0, patch: 0, prerelease: 'rc.1' })).toBe('1.0.0-rc.1');
    });
  });

  describe('parseCommitSubject', () => {
    it('parses feat commit', () => {
      const entry = parseCommitSubject('feat(auth): add OAuth2 support', 'abc123');
      expect(entry).toEqual({
        type: 'feature',
        scope: 'auth',
        description: 'add OAuth2 support',
        ref: 'abc123',
      });
    });

    it('parses fix commit', () => {
      const entry = parseCommitSubject('fix: resolve null pointer');
      expect(entry).toEqual({
        type: 'fix',
        scope: undefined,
        description: 'resolve null pointer',
        ref: undefined,
      });
    });

    it('parses breaking change via !', () => {
      const entry = parseCommitSubject('feat!: remove deprecated API');
      expect(entry).toEqual({
        type: 'breaking',
        scope: undefined,
        description: 'remove deprecated API',
        ref: undefined,
      });
    });

    it('returns null for non-conventional commit', () => {
      expect(parseCommitSubject('Update README')).toBeNull();
    });
  });

  describe('classifyChanges', () => {
    it('returns none for empty', () => {
      expect(classifyChanges([])).toBe('none');
    });

    it('returns major for breaking', () => {
      expect(classifyChanges([{ type: 'breaking', description: 'x' }])).toBe('major');
    });

    it('returns minor for feature', () => {
      expect(classifyChanges([{ type: 'feature', description: 'x' }])).toBe('minor');
    });

    it('returns patch for fix', () => {
      expect(classifyChanges([{ type: 'fix', description: 'x' }])).toBe('patch');
    });

    it('breaking trumps feature', () => {
      expect(
        classifyChanges([
          { type: 'feature', description: 'x' },
          { type: 'breaking', description: 'y' },
        ])
      ).toBe('major');
    });
  });

  describe('resolveNextVersion', () => {
    it('bumps major for breaking', () => {
      const result = resolveNextVersion('1.2.3', [{ type: 'breaking', description: 'x' }]);
      expect(result.next).toBe('2.0.0');
      expect(result.bump).toBe('major');
    });

    it('bumps minor for feature', () => {
      const result = resolveNextVersion('1.2.3', [{ type: 'feature', description: 'x' }]);
      expect(result.next).toBe('1.3.0');
      expect(result.bump).toBe('minor');
    });

    it('bumps patch for fix', () => {
      const result = resolveNextVersion('1.2.3', [{ type: 'fix', description: 'x' }]);
      expect(result.next).toBe('1.2.4');
      expect(result.bump).toBe('patch');
    });

    it('returns none for empty changes', () => {
      const result = resolveNextVersion('1.2.3', []);
      expect(result.next).toBe('1.2.3');
      expect(result.bump).toBe('none');
    });
  });

  describe('ReleaseHistory', () => {
    it('tracks releases in order', () => {
      const history = new ReleaseHistory();
      history.add({ version: '1.1.0', created_at: '2026-01-02', task_ids: [], changes: [] });
      history.add({ version: '1.0.0', created_at: '2026-01-01', task_ids: [], changes: [] });
      history.add({ version: '2.0.0', created_at: '2026-01-03', task_ids: [], changes: [] });

      expect(history.count()).toBe(3);
      expect(history.latest().version).toBe('2.0.0');
      expect(history.all()[0].version).toBe('1.0.0');
    });

    it('get() finds by version', () => {
      const history = new ReleaseHistory();
      history.add({ version: '1.0.0', created_at: '2026-01-01', task_ids: ['t1'], changes: [] });
      expect(history.get('1.0.0').task_ids).toEqual(['t1']);
      expect(history.get('v1.0.0').task_ids).toEqual(['t1']);
      expect(history.get('9.9.9')).toBeUndefined();
    });

    it('serializes and deserializes', () => {
      const history = new ReleaseHistory();
      history.add({ version: '1.0.0', created_at: '2026-01-01', task_ids: [], changes: [] });
      const json = history.toJSON();
      const restored = ReleaseHistory.fromJSON(json);
      expect(restored.count()).toBe(1);
      expect(restored.latest().version).toBe('1.0.0');
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// Release Notes Generator
// ═══════════════════════════════════════════════════════════════

describe('Release Notes Generator', () => {
  it('generates basic release notes', () => {
    const result = generateReleaseNotes({
      version: '1.0.0',
      date: '2026-03-15',
      sprint_id: 'SP-1',
      stories: [
        { id: 'STORY-1', title: 'User login', type: 'feature' },
        { id: 'STORY-2', title: 'Fix crash on logout', type: 'fix' },
      ],
      changes: [
        { type: 'feature', scope: 'auth', description: 'add OAuth2 provider', ref: 'abc123' },
        { type: 'fix', description: 'resolve memory leak' },
      ],
      contributors: ['alice', 'bob'],
    });

    expect(result.version).toBe('1.0.0');
    expect(result.markdown).toContain('# Release 1.0.0');
    expect(result.markdown).toContain('2026-03-15');
    expect(result.markdown).toContain('SP-1');
    expect(result.markdown).toContain('STORY-1');
    expect(result.markdown).toContain('User login');
    expect(result.markdown).toContain('Fix crash on logout');
    expect(result.markdown).toContain('add OAuth2 provider');
    expect(result.markdown).toContain('@alice');
    expect(result.markdown).toContain('@bob');
    expect(result.stats.features).toBeGreaterThan(0);
    expect(result.stats.fixes).toBeGreaterThan(0);
    expect(result.stats.contributors).toBe(2);
  });

  it('includes breaking changes section', () => {
    const result = generateReleaseNotes({
      version: '2.0.0',
      stories: [],
      changes: [{ type: 'breaking', description: 'remove legacy API' }],
      breaking_notes: ['The /v1 API endpoint has been removed'],
    });

    expect(result.markdown).toContain('Breaking Changes');
    expect(result.markdown).toContain('remove legacy API');
    expect(result.markdown).toContain('The /v1 API endpoint has been removed');
    expect(result.stats.breaking).toBe(2);
  });

  it('handles empty input gracefully', () => {
    const result = generateReleaseNotes({
      version: '0.1.0',
      stories: [],
      changes: [],
    });

    expect(result.markdown).toContain('# Release 0.1.0');
    expect(result.stats.features).toBe(0);
    expect(result.stats.fixes).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// Release Entity from Sprint
// ═══════════════════════════════════════════════════════════════

describe('createReleaseFromSprint', () => {
  it('creates release entity with links to tasks and tests', () => {
    const tasks = [
      createImplementationTask('Task 1', 'SP-1', { id: 'TASK-001' }),
      createImplementationTask('Task 2', 'SP-1', { id: 'TASK-002' }),
    ];

    const release = createReleaseFromSprint({
      sprint_id: 'SP-1',
      version: '1.0.0',
      completed_tasks: tasks,
      test_ids: ['TEST-001', 'TEST-002'],
      changelog: ['Added login feature', 'Fixed crash on startup'],
      owner: 'team-lead',
    });

    expect(release.version).toBe('1.0.0');
    expect(release.type).toBe('RELEASE');
    expect(release.status).toBe('DONE');
    expect(release.task_ids).toEqual(['TASK-001', 'TASK-002']);
    expect(release.test_ids).toEqual(['TEST-001', 'TEST-002']);
    expect(release.changelog).toHaveLength(2);
    expect(release.owner).toBe('team-lead');
    expect(release.tags).toContain('sprint');
    expect(release.tags).toContain('SP-1');
    expect(release.metadata.sprint_id).toBe('SP-1');

    // Check links
    const implLinks = release.links.filter((l) => l.type === 'IMPLEMENTS');
    const testLinks = release.links.filter((l) => l.type === 'TESTED_BY');
    expect(implLinks).toHaveLength(2);
    expect(testLinks).toHaveLength(2);
    expect(implLinks[0].target_id).toBe('TASK-001');
    expect(testLinks[0].target_id).toBe('TEST-001');
  });

  it('works with no tests', () => {
    const tasks = [createImplementationTask('Task 1', 'SP-2', { id: 'TASK-003' })];
    const release = createReleaseFromSprint({
      sprint_id: 'SP-2',
      version: '1.1.0',
      completed_tasks: tasks,
      test_ids: [],
      changelog: ['Minor update'],
    });

    expect(release.version).toBe('1.1.0');
    expect(release.test_ids).toHaveLength(0);
    expect(release.links.filter((l) => l.type === 'TESTED_BY')).toHaveLength(0);
  });
});
