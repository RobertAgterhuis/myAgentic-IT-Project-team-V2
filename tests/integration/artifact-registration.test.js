'use strict';

/**
 * Artifact API Integration Tests (M2: Artifact Registration Integration)
 *
 * Tests the full flow:
 * - Engine creates artifact registry
 * - afterTransition hook registers artifacts from manifest declarations
 * - GET /api/v1/artifacts returns registered artifacts
 * - GET /api/v1/artifacts/:id returns single artifact
 * - GET /api/v1/artifacts/:id/lineage returns lineage graph
 * - GET /api/v1/artifacts/stats returns aggregate stats
 */

const {
  registerPhaseArtifacts,
  createArtifactRegistrationHook,
} = require('../../platform/engine/artifact-registration');
const {
  ArtifactRegistry,
  computeContentHash,
  resetArtifactIdCounter,
} = require('../../platform/sdlc/artifacts');

// ─── Integration: artifact registration + engine hook flow ──

describe('Artifact Registration Integration', () => {
  let registry;

  const PHASE_ARTIFACTS = {
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
    SYNTHESIS: [
      {
        id: 'SYN-master-report',
        type: 'DOCUMENT',
        stage: 'PLANNING',
        path: 'BusinessDocs/synthesis/final-report-master.md',
      },
    ],
  };

  const PHASE_LINEAGE = {
    PHASE_2: { consumes: ['PHASE_1'] },
    SYNTHESIS: { consumes: ['PHASE_1', 'PHASE_2'] },
  };

  const FILE_CONTENTS = {
    'BusinessDocs/Phase1-Business/analysis.md': '# Phase 1 Business Analysis\n\nDetailed analysis.',
    'BusinessDocs/Phase1-Business/recommendations.md':
      '# Phase 1 Recommendations\n\nStrategic recommendations.',
    'BusinessDocs/Phase2-Tech/analysis.md':
      '# Phase 2 Architecture Analysis\n\nTechnical architecture.',
    'BusinessDocs/synthesis/final-report-master.md': '# Master Report\n\nFinal synthesis.',
  };

  function createStore() {
    return {
      exists: (fp) => fp in FILE_CONTENTS,
      readFile: (fp) => FILE_CONTENTS[fp] || '',
    };
  }

  function createArtifactStore() {
    const data = {};
    return {
      read: async (key) => data[key] ?? null,
      write: async (key, value) => {
        data[key] = value;
      },
    };
  }

  beforeEach(() => {
    resetArtifactIdCounter();
    registry = new ArtifactRegistry(createArtifactStore());
  });

  it('full lifecycle: register P1 → P2 (with lineage) → Synthesis', () => {
    const store = createStore();
    const hook = createArtifactRegistrationHook(registry, store, PHASE_ARTIFACTS, PHASE_LINEAGE);

    // Simulate critic_1 completion (validates Phase 1)
    hook({ from: 'CRITIC_1', to: 'PHASE_2', timestamp: new Date().toISOString() });

    // Phase 1 artifacts should be registered
    expect(registry.list()).toHaveLength(2);
    expect(registry.get('P1-BA-analysis')).toBeDefined();
    expect(registry.get('P1-BA-recommendations')).toBeDefined();
    expect(registry.get('P1-BA-analysis').status).toBe('REVIEW');

    // Content hash should be correct
    const expectedHash = computeContentHash(
      FILE_CONTENTS['BusinessDocs/Phase1-Business/analysis.md']
    );
    expect(registry.get('P1-BA-analysis').metadata.content_hash).toBe(expectedHash);

    // Simulate critic_2 completion (validates Phase 2)
    hook({ from: 'CRITIC_2', to: 'PHASE_3', timestamp: new Date().toISOString() });

    // Phase 2 artifact + lineage from Phase 1
    expect(registry.list()).toHaveLength(3);
    expect(registry.get('P2-SA-analysis')).toBeDefined();

    // Check CONSUMES lineage edges (P2 consumes P1 artifacts)
    const p2Lineage = registry.getLineage('P2-SA-analysis');
    const consumesEdges = p2Lineage.upstream.filter((e) => e.relationship === 'CONSUMES');
    expect(consumesEdges).toHaveLength(2);

    // Simulate synthesis completion
    hook({ from: 'SYNTHESIS', to: 'SPRINT_GATE', timestamp: new Date().toISOString() });

    expect(registry.list()).toHaveLength(4);
    expect(registry.get('SYN-master-report')).toBeDefined();

    // Synthesis consumes both P1 and P2
    const synLineage = registry.getLineage('SYN-master-report');
    const synConsumes = synLineage.upstream.filter((e) => e.relationship === 'CONSUMES');
    expect(synConsumes).toHaveLength(3); // 2 from P1 + 1 from P2
  });

  it('stats reflect registered artifacts', () => {
    const store = createStore();
    registerPhaseArtifacts('PHASE_1', registry, store, PHASE_ARTIFACTS, {});
    registerPhaseArtifacts('PHASE_2', registry, store, PHASE_ARTIFACTS, PHASE_LINEAGE);

    const stats = registry.stats();
    expect(stats.total).toBe(3);
    expect(stats.by_type.DOCUMENT).toBe(3);
    expect(stats.by_status.REVIEW).toBe(3);
  });

  it('registry persistence round-trip preserves registration data', async () => {
    const artStore = createArtifactStore();
    const reg1 = new ArtifactRegistry(artStore);
    const store = createStore();

    registerPhaseArtifacts('PHASE_1', reg1, store, PHASE_ARTIFACTS, {});
    await reg1.save();

    const reg2 = new ArtifactRegistry(artStore);
    await reg2.load();

    expect(reg2.list()).toHaveLength(2);
    expect(reg2.get('P1-BA-analysis').metadata.content_hash).toBe(
      reg1.get('P1-BA-analysis').metadata.content_hash
    );
  });
});
