import * as __req_0 from '../../platform/sdlc/artifacts';
const {
  ARTIFACT_TYPES,
  ARTIFACT_STATUS,
  ArtifactRegistry,
  generateArtifactId,
  resetArtifactIdCounter,
  createArtifact,
  computeContentHash,
  verifyContentHash,
} = __req_0;

// ── helpers ──────────────────────────────────────────────────

function memoryStore() {
  const files = new Map();
  return {
    read: async (p) => files.get(p) ?? null,
    write: async (p, d) => files.set(p, d),
    _files: files,
  };
}

function makeArtifact(id, overrides = {}) {
  return createArtifact(
    overrides.name || 'doc-' + id,
    overrides.artifact_type || ARTIFACT_TYPES.DOCUMENT,
    overrides.stage || 'REQUIREMENTS',
    'SRC-1',
    'REQUIREMENT',
    { id, ...overrides }
  );
}

// ── Constants ────────────────────────────────────────────────

describe('artifact constants', () => {
  it('ARTIFACT_TYPES has expected keys', () => {
    expect(ARTIFACT_TYPES.DOCUMENT).toBe('DOCUMENT');
    expect(ARTIFACT_TYPES.CODE).toBe('CODE');
    expect(ARTIFACT_TYPES.BINARY).toBe('BINARY');
    expect(Object.keys(ARTIFACT_TYPES).length).toBeGreaterThanOrEqual(6);
  });

  it('ARTIFACT_STATUS has lifecycle statuses', () => {
    expect(ARTIFACT_STATUS.DRAFT).toBe('DRAFT');
    expect(ARTIFACT_STATUS.APPROVED).toBe('APPROVED');
    expect(ARTIFACT_STATUS.ARCHIVED).toBe('ARCHIVED');
    expect(ARTIFACT_STATUS.SUPERSEDED).toBe('SUPERSEDED');
  });
});

// ── Factory ──────────────────────────────────────────────────

describe('generateArtifactId', () => {
  it('produces unique IDs', () => {
    resetArtifactIdCounter();
    const a = generateArtifactId();
    const b = generateArtifactId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^ART-/);
  });

  it('respects custom prefix', () => {
    expect(generateArtifactId('DOC')).toMatch(/^DOC-/);
  });
});

describe('createArtifact', () => {
  it('creates with defaults', () => {
    const a = createArtifact('my-doc', ARTIFACT_TYPES.SCHEMA, 'ARCHITECTURE', 'E1', 'FEATURE');
    expect(a.name).toBe('my-doc');
    expect(a.artifact_type).toBe(ARTIFACT_TYPES.SCHEMA);
    expect(a.status).toBe(ARTIFACT_STATUS.DRAFT);
    expect(a.current_version).toBe('0.1.0');
    expect(a.versions).toHaveLength(1);
    expect(a.tags).toEqual([]);
  });

  it('merges overrides', () => {
    const a = createArtifact('x', ARTIFACT_TYPES.CODE, 'IMPLEMENTATION', 'E2', 'FEATURE', {
      status: ARTIFACT_STATUS.PUBLISHED,
      owner: 'alice',
      tags: ['infra'],
    });
    expect(a.status).toBe(ARTIFACT_STATUS.PUBLISHED);
    expect(a.owner).toBe('alice');
    expect(a.tags).toEqual(['infra']);
  });
});

// ── Content hashing ──────────────────────────────────────────

describe('content hashing', () => {
  it('computeContentHash returns hex sha256', () => {
    const hash = computeContentHash('hello');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('verifyContentHash matches', () => {
    const hash = computeContentHash('data');
    expect(verifyContentHash('data', hash)).toBe(true);
    expect(verifyContentHash('other', hash)).toBe(false);
  });
});

// ── ArtifactRegistry CRUD ────────────────────────────────────

describe('ArtifactRegistry', () => {
  let registry;
  let store;

  beforeEach(() => {
    store = memoryStore();
    registry = new ArtifactRegistry(store);
  });

  it('register + get', () => {
    const a = makeArtifact('A1');
    registry.register(a);
    expect(registry.get('A1')).toEqual(a);
  });

  it('register duplicate throws', () => {
    registry.register(makeArtifact('A1'));
    expect(() => registry.register(makeArtifact('A1'))).toThrow(/already registered/);
  });

  it('get returns undefined for missing', () => {
    expect(registry.get('X')).toBeUndefined();
  });

  it('update merges patch', () => {
    registry.register(makeArtifact('A1'));
    const updated = registry.update('A1', { status: ARTIFACT_STATUS.APPROVED, owner: 'bob' });
    expect(updated.status).toBe(ARTIFACT_STATUS.APPROVED);
    expect(updated.owner).toBe('bob');
    expect(updated.id).toBe('A1');
  });

  it('update missing throws', () => {
    expect(() => registry.update('X', {})).toThrow(/not found/);
  });

  describe('list with filters', () => {
    beforeEach(() => {
      registry.register(
        makeArtifact('A1', {
          stage: 'REQUIREMENTS',
          artifact_type: ARTIFACT_TYPES.DOCUMENT,
          status: ARTIFACT_STATUS.DRAFT,
        })
      );
      registry.register(
        makeArtifact('A2', {
          stage: 'IMPLEMENTATION',
          artifact_type: ARTIFACT_TYPES.CODE,
          status: ARTIFACT_STATUS.PUBLISHED,
        })
      );
      registry.register(
        makeArtifact('A3', {
          stage: 'REQUIREMENTS',
          artifact_type: ARTIFACT_TYPES.CODE,
          status: ARTIFACT_STATUS.DRAFT,
        })
      );
    });

    it('no filter returns all', () => {
      expect(registry.list()).toHaveLength(3);
    });

    it('filter by stage', () => {
      expect(registry.list({ stage: 'REQUIREMENTS' })).toHaveLength(2);
    });

    it('filter by artifact_type', () => {
      expect(registry.list({ artifact_type: ARTIFACT_TYPES.CODE })).toHaveLength(2);
    });

    it('filter by status', () => {
      expect(registry.list({ status: ARTIFACT_STATUS.PUBLISHED })).toHaveLength(1);
    });

    it('combined filters', () => {
      expect(
        registry.list({ stage: 'REQUIREMENTS', artifact_type: ARTIFACT_TYPES.CODE })
      ).toHaveLength(1);
    });
  });

  // ── Versioning ─────────────────────────────────────────────

  describe('versioning', () => {
    it('addVersion appends and updates current_version', () => {
      registry.register(makeArtifact('A1'));
      const v = {
        version: '1.0.0',
        created_at: new Date().toISOString(),
        created_by: 'dev',
        summary: 'release',
        checksum: 'abc',
        size_bytes: 100,
      };
      const updated = registry.addVersion('A1', v);
      expect(updated.current_version).toBe('1.0.0');
      expect(updated.versions).toHaveLength(2);
    });

    it('addVersion duplicate version throws', () => {
      registry.register(makeArtifact('A1'));
      const v = {
        version: '0.1.0',
        created_at: '',
        created_by: '',
        summary: '',
        checksum: '',
        size_bytes: 0,
      };
      expect(() => registry.addVersion('A1', v)).toThrow(/already exists/);
    });

    it('addVersion missing artifact throws', () => {
      expect(() =>
        registry.addVersion('X', {
          version: '1.0',
          created_at: '',
          created_by: '',
          summary: '',
          checksum: '',
          size_bytes: 0,
        })
      ).toThrow(/not found/);
    });

    it('getVersionHistory returns copies', () => {
      registry.register(makeArtifact('A1'));
      const history = registry.getVersionHistory('A1');
      expect(history).toHaveLength(1);
      expect(history[0].version).toBe('0.1.0');
    });

    it('getVersionHistory returns empty for missing', () => {
      expect(registry.getVersionHistory('X')).toEqual([]);
    });
  });

  // ── Lineage ────────────────────────────────────────────────

  describe('lineage', () => {
    it('addLineageEdge and getLineage', () => {
      registry.register(makeArtifact('A1'));
      registry.register(makeArtifact('A2'));
      registry.addLineageEdge({
        from_artifact_id: 'A1',
        to_artifact_id: 'A2',
        relationship: 'PRODUCES',
        created_at: '',
      });
      const lineage = registry.getLineage('A2');
      expect(lineage.upstream).toHaveLength(1);
      expect(lineage.downstream).toHaveLength(0);
      const l1 = registry.getLineage('A1');
      expect(l1.downstream).toHaveLength(1);
    });
  });

  // ── Persistence ────────────────────────────────────────────

  describe('persistence', () => {
    it('save and load round-trip', async () => {
      registry.register(makeArtifact('A1'));
      registry.register(makeArtifact('A2'));
      registry.addLineageEdge({
        from_artifact_id: 'A1',
        to_artifact_id: 'A2',
        relationship: 'CONSUMES',
        created_at: '',
      });
      await registry.save();

      const reg2 = new ArtifactRegistry(store);
      await reg2.load();
      expect(reg2.get('A1')).toBeDefined();
      expect(reg2.get('A2')).toBeDefined();
      expect(reg2.getLineage('A2').upstream).toHaveLength(1);
    });

    it('load with no data is a no-op', async () => {
      await registry.load();
      expect(registry.list()).toEqual([]);
    });
  });

  // ── Cross-Repo (M25-004) ──────────────────────────────────

  describe('cross-repo', () => {
    it('listByRepo filters by origin.repoId', () => {
      const a = makeArtifact('A1');
      a.origin = { repoId: 'repo-x', branch: 'main', path: '/a' };
      registry.register(a);
      registry.register(makeArtifact('A2'));
      expect(registry.listByRepo('repo-x')).toHaveLength(1);
      expect(registry.listByRepo('repo-y')).toHaveLength(0);
    });

    it('reposContributingTo collects upstream repo IDs', () => {
      const a1 = makeArtifact('A1');
      a1.origin = { repoId: 'repo-1', branch: 'main', path: '/a' };
      const a2 = makeArtifact('A2');
      a2.origin = { repoId: 'repo-2', branch: 'main', path: '/b' };
      registry.register(a1);
      registry.register(a2);
      registry.addLineageEdge({
        from_artifact_id: 'A1',
        to_artifact_id: 'A2',
        relationship: 'PRODUCES',
        created_at: '',
      });
      const repos = registry.reposContributingTo('A2');
      expect(repos).toContain('repo-1');
      expect(repos).toContain('repo-2');
    });

    it('setOrigin updates artifact origin', () => {
      registry.register(makeArtifact('A1'));
      const updated = registry.setOrigin('A1', { repoId: 'r1', branch: 'dev', path: '/x' });
      expect(updated.origin.repoId).toBe('r1');
    });

    it('setOrigin missing artifact throws', () => {
      expect(() => registry.setOrigin('X', { repoId: 'r', branch: 'main', path: '/' })).toThrow(
        /not found/
      );
    });
  });

  // ── Stats ──────────────────────────────────────────────────

  describe('stats', () => {
    it('aggregates by type and status', () => {
      registry.register(
        makeArtifact('A1', { artifact_type: ARTIFACT_TYPES.CODE, status: ARTIFACT_STATUS.DRAFT })
      );
      registry.register(
        makeArtifact('A2', {
          artifact_type: ARTIFACT_TYPES.CODE,
          status: ARTIFACT_STATUS.PUBLISHED,
        })
      );
      registry.register(
        makeArtifact('A3', {
          artifact_type: ARTIFACT_TYPES.DOCUMENT,
          status: ARTIFACT_STATUS.DRAFT,
        })
      );
      const s = registry.stats();
      expect(s.total).toBe(3);
      expect(s.by_type[ARTIFACT_TYPES.CODE]).toBe(2);
      expect(s.by_status[ARTIFACT_STATUS.DRAFT]).toBe(2);
    });
  });
});
