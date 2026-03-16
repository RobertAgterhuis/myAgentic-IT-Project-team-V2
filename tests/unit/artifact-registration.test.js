'use strict';

/**
 * Artifact Registration — Unit Tests (M2: Artifact Registration Integration)
 *
 * Covers:
 * - resolveCompletedPhase / resolvePhaseFromCritic helpers
 * - registerPhaseArtifacts: registers artifacts that exist on disk
 * - registerPhaseArtifacts: skips artifacts whose files don't exist
 * - registerPhaseArtifacts: idempotent (skips already-registered)
 * - registerPhaseArtifacts: computes content hash and stores in metadata
 * - registerPhaseArtifacts: creates PRODUCES lineage edges
 * - registerPhaseArtifacts: creates CONSUMES lineage edges per phaseLineage
 * - createArtifactRegistrationHook: fires on critic transitions
 * - createArtifactRegistrationHook: fires on synthesis transitions
 * - computeContentHash / verifyContentHash
 */

const {
  resolveCompletedPhase,
  resolvePhaseFromCritic,
  registerPhaseArtifacts,
  createArtifactRegistrationHook,
} = require('../../platform/engine/artifact-registration');

const {
  ArtifactRegistry,
  computeContentHash,
  verifyContentHash,
  resetArtifactIdCounter,
} = require('../../platform/sdlc/artifacts');

// ─── Helpers ─────────────────────────────────────────────────

function createMockArtifactStore() {
  const data = {};
  return {
    read: async (key) => data[key] ?? null,
    write: async (key, value) => {
      data[key] = value;
    },
  };
}

function createMockRegistrationStore(files = {}) {
  return {
    exists: (fp) => fp in files,
    readFile: (fp) => {
      if (!(fp in files)) throw new Error(`File not found: ${fp}`);
      return files[fp];
    },
  };
}

const SAMPLE_PHASE_ARTIFACTS = {
  PHASE_1: [
    {
      id: 'P1-BA-analysis',
      type: 'DOCUMENT',
      stage: 'REQUIREMENTS',
      path: 'BusinessDocs/Phase1-Business/analysis.md',
    },
    {
      id: 'P1-BA-recommendations',
      type: 'DOCUMENT',
      stage: 'REQUIREMENTS',
      path: 'BusinessDocs/Phase1-Business/recommendations.md',
    },
  ],
  PHASE_2: [
    {
      id: 'P2-SA-analysis',
      type: 'DOCUMENT',
      stage: 'ARCHITECTURE',
      path: 'BusinessDocs/Phase2-Tech/analysis.md',
    },
  ],
};

const SAMPLE_PHASE_LINEAGE = {
  PHASE_2: { consumes: ['PHASE_1'] },
};

// ─── resolveCompletedPhase ───────────────────────────────────

describe('resolveCompletedPhase', () => {
  it('returns phase name for PHASE_ states', () => {
    expect(resolveCompletedPhase('PHASE_1')).toBe('PHASE_1');
    expect(resolveCompletedPhase('PHASE_2')).toBe('PHASE_2');
    expect(resolveCompletedPhase('PHASE_3')).toBe('PHASE_3');
    expect(resolveCompletedPhase('PHASE_4')).toBe('PHASE_4');
  });

  it('returns SYNTHESIS for SYNTHESIS state', () => {
    expect(resolveCompletedPhase('SYNTHESIS')).toBe('SYNTHESIS');
  });

  it('returns null for non-phase states', () => {
    expect(resolveCompletedPhase('ONBOARDING')).toBeNull();
    expect(resolveCompletedPhase('CRITIC_1')).toBeNull();
    expect(resolveCompletedPhase('ERROR')).toBeNull();
  });
});

// ─── resolvePhaseFromCritic ──────────────────────────────────

describe('resolvePhaseFromCritic', () => {
  it('maps CRITIC_N to PHASE_N', () => {
    expect(resolvePhaseFromCritic('CRITIC_1')).toBe('PHASE_1');
    expect(resolvePhaseFromCritic('CRITIC_2')).toBe('PHASE_2');
    expect(resolvePhaseFromCritic('CRITIC_3')).toBe('PHASE_3');
    expect(resolvePhaseFromCritic('CRITIC_4')).toBe('PHASE_4');
  });

  it('returns null for non-critic states', () => {
    expect(resolvePhaseFromCritic('PHASE_1')).toBeNull();
    expect(resolvePhaseFromCritic('SYNTHESIS')).toBeNull();
    expect(resolvePhaseFromCritic('ERROR')).toBeNull();
  });
});

// ─── registerPhaseArtifacts ──────────────────────────────────

describe('registerPhaseArtifacts', () => {
  let registry;

  beforeEach(() => {
    resetArtifactIdCounter();
    registry = new ArtifactRegistry(createMockArtifactStore());
  });

  it('registers artifacts whose files exist on disk', () => {
    const store = createMockRegistrationStore({
      'BusinessDocs/Phase1-Business/analysis.md': '# Analysis\nContent here',
      'BusinessDocs/Phase1-Business/recommendations.md': '# Recommendations\nMore content',
    });

    const result = registerPhaseArtifacts('PHASE_1', registry, store, SAMPLE_PHASE_ARTIFACTS, {});
    expect(result.registered).toEqual(['P1-BA-analysis', 'P1-BA-recommendations']);
    expect(result.skipped).toEqual([]);
    expect(registry.list()).toHaveLength(2);
  });

  it('skips artifacts whose files do not exist', () => {
    const store = createMockRegistrationStore({
      'BusinessDocs/Phase1-Business/analysis.md': '# Analysis content',
    });

    const result = registerPhaseArtifacts('PHASE_1', registry, store, SAMPLE_PHASE_ARTIFACTS, {});
    expect(result.registered).toEqual(['P1-BA-analysis']);
    expect(result.skipped).toEqual(['P1-BA-recommendations']);
    expect(registry.list()).toHaveLength(1);
  });

  it('is idempotent — skips already-registered artifacts', () => {
    const store = createMockRegistrationStore({
      'BusinessDocs/Phase1-Business/analysis.md': '# Analysis content',
      'BusinessDocs/Phase1-Business/recommendations.md': '# Recommendations',
    });

    registerPhaseArtifacts('PHASE_1', registry, store, SAMPLE_PHASE_ARTIFACTS, {});
    const result = registerPhaseArtifacts('PHASE_1', registry, store, SAMPLE_PHASE_ARTIFACTS, {});
    expect(result.registered).toEqual([]);
    expect(result.skipped).toEqual(['P1-BA-analysis', 'P1-BA-recommendations']);
    expect(registry.list()).toHaveLength(2);
  });

  it('returns empty result for unknown phase', () => {
    const store = createMockRegistrationStore({});
    const result = registerPhaseArtifacts('PHASE_99', registry, store, SAMPLE_PHASE_ARTIFACTS, {});
    expect(result.registered).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(result.lineageEdges).toBe(0);
  });

  it('computes content hash and stores in metadata + version checksum', () => {
    const content = '# Analysis\nWith real content here';
    const store = createMockRegistrationStore({
      'BusinessDocs/Phase1-Business/analysis.md': content,
    });

    registerPhaseArtifacts('PHASE_1', registry, store, SAMPLE_PHASE_ARTIFACTS, {});
    const artifact = registry.get('P1-BA-analysis');
    const expectedHash = computeContentHash(content);

    expect(artifact.metadata.content_hash).toBe(expectedHash);
    expect(artifact.versions[0].checksum).toBe(expectedHash);
  });

  it('sets artifact status to REVIEW', () => {
    const store = createMockRegistrationStore({
      'BusinessDocs/Phase1-Business/analysis.md': '# Content',
    });

    registerPhaseArtifacts('PHASE_1', registry, store, SAMPLE_PHASE_ARTIFACTS, {});
    const artifact = registry.get('P1-BA-analysis');
    expect(artifact.status).toBe('REVIEW');
  });

  it('creates PRODUCES lineage edges', () => {
    const store = createMockRegistrationStore({
      'BusinessDocs/Phase1-Business/analysis.md': '# A',
      'BusinessDocs/Phase1-Business/recommendations.md': '# B',
    });

    const result = registerPhaseArtifacts('PHASE_1', registry, store, SAMPLE_PHASE_ARTIFACTS, {});
    expect(result.lineageEdges).toBe(2);

    const lineage = registry.getLineage('P1-BA-analysis');
    expect(lineage.upstream).toHaveLength(1);
    expect(lineage.upstream[0].from_artifact_id).toBe('PHASE_1');
    expect(lineage.upstream[0].relationship).toBe('PRODUCES');
  });

  it('creates CONSUMES lineage edges per phaseLineage', () => {
    // First register Phase 1 artifacts
    const store = createMockRegistrationStore({
      'BusinessDocs/Phase1-Business/analysis.md': '# P1 analysis',
      'BusinessDocs/Phase1-Business/recommendations.md': '# P1 recs',
      'BusinessDocs/Phase2-Tech/analysis.md': '# P2 analysis',
    });

    registerPhaseArtifacts(
      'PHASE_1',
      registry,
      store,
      SAMPLE_PHASE_ARTIFACTS,
      SAMPLE_PHASE_LINEAGE
    );

    // Now register Phase 2 which consumes Phase 1
    const result = registerPhaseArtifacts(
      'PHASE_2',
      registry,
      store,
      SAMPLE_PHASE_ARTIFACTS,
      SAMPLE_PHASE_LINEAGE
    );

    // P2 registered 1 artifact with 1 PRODUCES edge + 2 CONSUMES edges (from 2 P1 artifacts)
    expect(result.registered).toEqual(['P2-SA-analysis']);
    expect(result.lineageEdges).toBe(3); // 1 PRODUCES + 2 CONSUMES

    const p2Lineage = registry.getLineage('P2-SA-analysis');
    const consumesEdges = p2Lineage.upstream.filter((e) => e.relationship === 'CONSUMES');
    expect(consumesEdges).toHaveLength(2);
  });
});

// ─── createArtifactRegistrationHook ──────────────────────────

describe('createArtifactRegistrationHook', () => {
  let registry;

  beforeEach(() => {
    resetArtifactIdCounter();
    registry = new ArtifactRegistry(createMockArtifactStore());
  });

  it('registers artifacts when transitioning FROM a critic state', () => {
    const store = createMockRegistrationStore({
      'BusinessDocs/Phase1-Business/analysis.md': '# Analysis',
      'BusinessDocs/Phase1-Business/recommendations.md': '# Recs',
    });

    const hook = createArtifactRegistrationHook(registry, store, SAMPLE_PHASE_ARTIFACTS, {});
    hook({ from: 'CRITIC_1', to: 'PHASE_2', timestamp: new Date().toISOString() });

    expect(registry.list()).toHaveLength(2);
    expect(registry.get('P1-BA-analysis')).toBeDefined();
    expect(registry.get('P1-BA-recommendations')).toBeDefined();
  });

  it('does not register on non-phase transitions', () => {
    const store = createMockRegistrationStore({
      'BusinessDocs/Phase1-Business/analysis.md': '# Analysis',
    });

    const hook = createArtifactRegistrationHook(registry, store, SAMPLE_PHASE_ARTIFACTS, {});
    hook({ from: 'ONBOARDING', to: 'PHASE_1', timestamp: new Date().toISOString() });

    expect(registry.list()).toHaveLength(0);
  });

  it('registers on SYNTHESIS completion', () => {
    const synthArtifacts = {
      ...SAMPLE_PHASE_ARTIFACTS,
      SYNTHESIS: [
        {
          id: 'SYN-master-report',
          type: 'DOCUMENT',
          stage: 'PLANNING',
          path: 'BusinessDocs/synthesis/final-report-master.md',
        },
      ],
    };
    const store = createMockRegistrationStore({
      'BusinessDocs/synthesis/final-report-master.md': '# Master Report',
    });

    const hook = createArtifactRegistrationHook(registry, store, synthArtifacts, {});
    hook({ from: 'SYNTHESIS', to: 'SPRINT_GATE', timestamp: new Date().toISOString() });

    expect(registry.list()).toHaveLength(1);
    expect(registry.get('SYN-master-report')).toBeDefined();
  });
});

// ─── computeContentHash / verifyContentHash ──────────────────

describe('computeContentHash', () => {
  it('returns a SHA-256 hex string', () => {
    const hash = computeContentHash('hello world');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic', () => {
    expect(computeContentHash('same')).toBe(computeContentHash('same'));
  });

  it('different input produces different hash', () => {
    expect(computeContentHash('a')).not.toBe(computeContentHash('b'));
  });
});

describe('verifyContentHash', () => {
  it('returns true when hash matches', () => {
    const content = 'test content';
    const hash = computeContentHash(content);
    expect(verifyContentHash(content, hash)).toBe(true);
  });

  it('returns false when hash does not match', () => {
    expect(verifyContentHash('content', 'badhash')).toBe(false);
  });
});
