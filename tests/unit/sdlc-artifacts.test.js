'use strict';

/**
 * SDLC Artifact Management — Unit Tests
 *
 * Validates the ArtifactRegistry (CRUD, versioning, lineage, filtering),
 * the createArtifact factory, and Store-based persistence.
 */

const {
  ArtifactRegistry,
  createArtifact,
  resetArtifactIdCounter,
  ARTIFACT_TYPES,
  ARTIFACT_STATUS,
} = require('../../platform/sdlc/artifacts');

/** Helper: minimal in-memory ArtifactStore */
function createMockStore() {
  const data = {};
  return {
    read: async (key) => data[key] ?? null,
    write: async (key, value) => {
      data[key] = value;
    },
  };
}

/** Helper: create a simple artifact with correct positional args */
function makeArtifact(name, type = 'DOCUMENT', overrides = {}) {
  return createArtifact(name, type, 'REQUIREMENTS', 'ENT-1', 'REQUIREMENT', overrides);
}

// ─── Enum Guards ─────────────────────────────────────────────

describe('Artifact enums', () => {
  it('ARTIFACT_TYPES has 8 entries', () => {
    expect(Object.keys(ARTIFACT_TYPES)).toHaveLength(8);
  });

  it('ARTIFACT_STATUS has 6 entries', () => {
    expect(Object.keys(ARTIFACT_STATUS)).toHaveLength(6);
  });

  it('enums are frozen', () => {
    expect(Object.isFrozen(ARTIFACT_TYPES)).toBe(true);
    expect(Object.isFrozen(ARTIFACT_STATUS)).toBe(true);
  });
});

// ─── createArtifact factory ──────────────────────────────────

describe('createArtifact', () => {
  beforeEach(() => resetArtifactIdCounter());

  it('creates an artifact with defaults', () => {
    const a = createArtifact('spec.md', 'DOCUMENT', 'REQUIREMENTS', 'ENT-1', 'REQUIREMENT');
    expect(a.name).toBe('spec.md');
    expect(a.artifact_type).toBe('DOCUMENT');
    expect(a.status).toBe('DRAFT');
    expect(a.stage).toBe('REQUIREMENTS');
    expect(a.source_entity_id).toBe('ENT-1');
    // Factory creates an initial version
    expect(a.versions).toHaveLength(1);
    expect(a.versions[0].version).toBe('0.1.0');
  });

  it('accepts override properties', () => {
    const a = createArtifact(
      'build.yaml',
      'CONFIGURATION',
      'IMPLEMENTATION',
      'ENT-2',
      'IMPLEMENTATION_TASK',
      {
        status: 'APPROVED',
        owner: 'ops-team',
      }
    );
    expect(a.status).toBe('APPROVED');
    expect(a.owner).toBe('ops-team');
  });
});

// ─── ArtifactRegistry — basic CRUD ──────────────────────────

describe('ArtifactRegistry CRUD', () => {
  let registry;

  beforeEach(() => {
    resetArtifactIdCounter();
    registry = new ArtifactRegistry(createMockStore());
  });

  it('register() stores an artifact', () => {
    const a = makeArtifact('readme.md');
    registry.register(a);
    expect(registry.get(a.id)).toBe(a);
  });

  it('register() throws on duplicate id', () => {
    const a = makeArtifact('readme.md');
    registry.register(a);
    expect(() => registry.register(a)).toThrow(/already registered/);
  });

  it('get() returns undefined for unknown id', () => {
    expect(registry.get('no-such-id')).toBeUndefined();
  });

  it('list() returns all artifacts', () => {
    registry.register(makeArtifact('a.md'));
    registry.register(makeArtifact('b.yaml', 'CONFIGURATION'));
    expect(registry.list()).toHaveLength(2);
  });

  it('update() patches an artifact', () => {
    const a = makeArtifact('readme.md');
    registry.register(a);
    const updated = registry.update(a.id, { status: 'APPROVED' });
    expect(updated.status).toBe('APPROVED');
    expect(updated.id).toBe(a.id);
  });

  it('update() throws for unknown id', () => {
    expect(() => registry.update('ghost', { status: 'APPROVED' })).toThrow(/not found/);
  });
});

// ─── ArtifactRegistry — versioning ──────────────────────────

describe('ArtifactRegistry versioning', () => {
  let registry;

  beforeEach(() => {
    resetArtifactIdCounter();
    registry = new ArtifactRegistry(createMockStore());
  });

  it('addVersion() appends version to artifact', () => {
    const a = makeArtifact('arch.md');
    registry.register(a);
    // artifact already has 0.1.0 from factory
    const version = {
      version: '0.2.0',
      created_at: new Date().toISOString(),
      created_by: 'dev',
      summary: 'Second draft',
      checksum: 'abc123',
      size_bytes: 1024,
    };
    registry.addVersion(a.id, version);
    const found = registry.get(a.id);
    expect(found.versions).toHaveLength(2);
    expect(found.versions[1].version).toBe('0.2.0');
    expect(found.current_version).toBe('0.2.0');
  });

  it('addVersion() throws for duplicate version string', () => {
    const a = makeArtifact('arch.md');
    registry.register(a);
    // 0.1.0 already exists from factory
    expect(() =>
      registry.addVersion(a.id, {
        version: '0.1.0',
        created_at: new Date().toISOString(),
        created_by: 'dev',
        summary: 'dup',
        checksum: '',
        size_bytes: 0,
      })
    ).toThrow(/already exists/);
  });

  it('addVersion() throws for unknown artifact', () => {
    expect(() =>
      registry.addVersion('ghost', {
        version: '1.0.0',
        created_at: new Date().toISOString(),
        created_by: 'dev',
        summary: '',
        checksum: '',
        size_bytes: 0,
      })
    ).toThrow(/not found/);
  });

  it('getVersionHistory() returns ordered versions', () => {
    const a = makeArtifact('doc.md');
    registry.register(a);
    registry.addVersion(a.id, {
      version: '0.2.0',
      created_at: new Date().toISOString(),
      created_by: 'dev',
      summary: 'v2',
      checksum: '',
      size_bytes: 0,
    });
    const history = registry.getVersionHistory(a.id);
    expect(history).toHaveLength(2);
    expect(history[0].version).toBe('0.1.0');
    expect(history[1].version).toBe('0.2.0');
  });
});

// ─── ArtifactRegistry — lineage ─────────────────────────────

describe('ArtifactRegistry lineage', () => {
  let registry;

  beforeEach(() => {
    resetArtifactIdCounter();
    registry = new ArtifactRegistry(createMockStore());
  });

  it('addLineageEdge() records upstream/downstream relationship', () => {
    const parent = makeArtifact('spec.md');
    const child = makeArtifact('impl.ts', 'CODE');
    registry.register(parent);
    registry.register(child);

    registry.addLineageEdge({
      from_artifact_id: parent.id,
      to_artifact_id: child.id,
      relationship: 'PRODUCES',
      created_at: new Date().toISOString(),
    });

    const lineage = registry.getLineage(parent.id);
    expect(lineage.downstream).toHaveLength(1);
    expect(lineage.downstream[0].to_artifact_id).toBe(child.id);
    expect(lineage.upstream).toHaveLength(0);

    const childLineage = registry.getLineage(child.id);
    expect(childLineage.upstream).toHaveLength(1);
    expect(childLineage.upstream[0].from_artifact_id).toBe(parent.id);
  });
});

// ─── ArtifactRegistry — filtering ───────────────────────────

describe('ArtifactRegistry filtering', () => {
  let registry;

  beforeEach(() => {
    resetArtifactIdCounter();
    registry = new ArtifactRegistry(createMockStore());
    registry.register(makeArtifact('a.md', 'DOCUMENT', { status: 'DRAFT' }));
    registry.register(makeArtifact('b.ts', 'CODE', { status: 'APPROVED' }));
    registry.register(makeArtifact('c.md', 'DOCUMENT', { status: 'APPROVED' }));
  });

  it('list({ artifact_type }) filters by type', () => {
    const docs = registry.list({ artifact_type: 'DOCUMENT' });
    expect(docs).toHaveLength(2);
  });

  it('list({ status }) filters by status', () => {
    const approved = registry.list({ status: 'APPROVED' });
    expect(approved).toHaveLength(2);
  });
});

// ─── ArtifactRegistry — persistence ─────────────────────────

describe('ArtifactRegistry persistence', () => {
  it('save() and load() round-trip through a Store', async () => {
    const store = createMockStore();

    resetArtifactIdCounter();
    const reg1 = new ArtifactRegistry(store);
    reg1.register(makeArtifact('round-trip.md'));
    await reg1.save();

    const reg2 = new ArtifactRegistry(store);
    await reg2.load();
    expect(reg2.list()).toHaveLength(1);
    expect(reg2.list()[0].name).toBe('round-trip.md');
  });
});

// ─── ArtifactRegistry — stats ────────────────────────────────

describe('ArtifactRegistry stats', () => {
  it('returns counts by type and status', () => {
    resetArtifactIdCounter();
    const registry = new ArtifactRegistry(createMockStore());
    registry.register(makeArtifact('a.md', 'DOCUMENT', { status: 'DRAFT' }));
    registry.register(makeArtifact('b.md', 'DOCUMENT', { status: 'APPROVED' }));
    registry.register(makeArtifact('c.ts', 'CODE', { status: 'DRAFT' }));

    const s = registry.stats();
    expect(s.total).toBe(3);
    expect(s.by_type.DOCUMENT).toBe(2);
    expect(s.by_type.CODE).toBe(1);
    expect(s.by_status.DRAFT).toBe(2);
    expect(s.by_status.APPROVED).toBe(1);
  });
});
